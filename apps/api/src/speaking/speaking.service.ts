import { Injectable, ServiceUnavailableException, HttpException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// A widely-available prebuilt ElevenLabs voice; override via ELEVENLABS_VOICE_ID
// with a German/multilingual voice from your Voice Library for best results.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

@Injectable()
export class SpeakingService {
  constructor(private config: ConfigService) {}

  /**
   * Generate German speech audio via ElevenLabs and return the raw MP3 bytes.
   * The API key stays server-side; the browser only ever receives audio.
   */
  async textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
    const apiKey = this.config.get<string>('ELEVENLABS_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException('Text-to-speech is not configured yet.')
    }

    const voice = voiceId || this.config.get<string>('ELEVENLABS_VOICE_ID') || DEFAULT_VOICE_ID

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
        model_id: 'eleven_multilingual_v2',
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

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}
