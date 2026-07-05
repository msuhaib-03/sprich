import {
  Injectable,
  ServiceUnavailableException,
  HttpException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { AiService } from '../ai/ai.service'
import { SpeakingScenario } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// A current PREMADE ElevenLabs voice (George). IMPORTANT: the free tier can
// only use premade voices via the API — Voice Library voices return HTTP 402.
// Override with ELEVENLABS_VOICE_ID using another *premade* voice id.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

const TTS_MODEL = 'eleven_multilingual_v2'

@Injectable()
export class SpeakingService {
  // Same text + voice ⇒ same audio, so cache generated MP3s on disk. Repeat
  // plays (any user, any session) cost zero ElevenLabs credits. Swap this
  // layer for R2/S3 when deploying multi-instance.
  private cacheDir: string

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private ai: AiService,
  ) {
    this.cacheDir =
      this.config.get<string>('AUDIO_CACHE_DIR') || path.join(process.cwd(), '.audio-cache')
    fs.mkdirSync(this.cacheDir, { recursive: true })
  }

  /**
   * Generate German speech audio via ElevenLabs and return the raw MP3 bytes.
   * The API key stays server-side; the browser only ever receives audio.
   * Disk-cached by (voice, model, text) — cache hits never touch ElevenLabs.
   */
  async textToSpeech(
    text: string,
    voiceId?: string,
  ): Promise<{ audio: Buffer; cached: boolean }> {
    const voice = voiceId || this.config.get<string>('ELEVENLABS_VOICE_ID') || DEFAULT_VOICE_ID

    const key = crypto.createHash('sha256').update(`${voice}|${TTS_MODEL}|${text}`).digest('hex')
    const cachePath = path.join(this.cacheDir, `${key}.mp3`)

    // Cache first — works even if the key/quota is dead for already-heard audio.
    try {
      const audio = await fs.promises.readFile(cachePath)
      return { audio, cached: true }
    } catch {
      /* miss — generate below */
    }

    const apiKey = this.config.get<string>('ELEVENLABS_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException('Text-to-speech is not configured yet.')
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        // Multilingual model so German is pronounced correctly.
        model_id: TTS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new HttpException(
        `Text-to-speech failed (${res.status}). ${detail.slice(0, 200)}`,
        502,
      )
    }

    const audio = Buffer.from(await res.arrayBuffer())
    // Persist for next time — fire and forget; a failed write only means a miss later.
    fs.promises.writeFile(cachePath, audio).catch(() => {})
    return { audio, cached: false }
  }

  /**
   * Transcribe recorded German speech via Groq's Whisper (free tier).
   * Much more reliable than the browser Web Speech API, which streams to
   * Google servers and often fails silently.
   */
  async speechToText(audio: Buffer, mimeType: string): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Speech-to-text is not configured (GROQ_API_KEY missing).',
      )
    }

    const ext = mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('mp4')
        ? 'mp4'
        : mimeType.includes('wav')
          ? 'wav'
          : 'webm'

    const form = new FormData()
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimeType || 'audio/webm' }),
      `speech.${ext}`,
    )
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'de')
    // verbose_json exposes per-segment no_speech_prob so we can drop
    // hallucinations — Whisper invents phrases like "Vielen Dank" on silence.
    form.append('response_format', 'verbose_json')
    form.append('temperature', '0')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new HttpException(
        `Speech-to-text failed (${res.status}). ${detail.slice(0, 200)}`,
        502,
      )
    }

    const data = (await res.json()) as {
      text?: string
      segments?: { text?: string; no_speech_prob?: number }[]
    }

    if (data.segments?.length) {
      const spoken = data.segments.filter((s) => (s.no_speech_prob ?? 0) < 0.6)
      return spoken
        .map((s) => s.text ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
    return (data.text ?? '').trim()
  }

  /**
   * Persist a finished practice conversation: AI-score the transcript,
   * store a SpeakingSession row, and award XP.
   */
  async createSession(
    userId: string,
    params: {
      scenario: SpeakingScenario
      messages: { role: string; content: string }[]
      durationSeconds: number
      level: string
    },
  ) {
    const userTurns = params.messages.filter((m) => m.role === 'user')
    if (userTurns.length === 0) {
      throw new BadRequestException('Say something first — then finish the session.')
    }

    const userWords = userTurns.reduce(
      (sum, m) => sum + m.content.trim().split(/\s+/).filter(Boolean).length,
      0,
    )
    const wordsPerMinute =
      params.durationSeconds > 0
        ? Math.round((userWords / (params.durationSeconds / 60)) * 10) / 10
        : 0

    const transcript = params.messages
      .map((m) => `${m.role === 'user' ? 'USER' : 'PARTNER'}: ${m.content}`)
      .join('\n')

    const scores = await this.ai.evaluateSession({ level: params.level, transcript })
    const xpEarned = Math.min(50, 20 + userTurns.length * 3)

    const [session] = await Promise.all([
      this.prisma.speakingSession.create({
        data: {
          userId,
          scenario: params.scenario,
          transcript,
          overallScore: scores.overall,
          // 0 = not yet measured — real pronunciation scoring needs audio analysis.
          pronunciationScore: 0,
          grammarScore: scores.grammar,
          vocabularyScore: scores.vocabulary,
          fluencyScore: scores.fluency,
          hesitationCount: 0,
          wordsPerMinute,
          aiFeedback: scores.feedback,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpEarned } },
        select: { id: true },
      }),
    ])

    return {
      id: session.id,
      overallScore: session.overallScore,
      grammarScore: session.grammarScore,
      vocabularyScore: session.vocabularyScore,
      fluencyScore: session.fluencyScore,
      wordsPerMinute: session.wordsPerMinute,
      aiFeedback: session.aiFeedback,
      xpEarned,
    }
  }
}
