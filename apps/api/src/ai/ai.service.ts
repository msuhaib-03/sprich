import { Injectable, ServiceUnavailableException, HttpException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Provider = 'anthropic' | 'gemini' | 'groq'

// Anthropic model ids (used when ANTHROPIC_API_KEY is present).
const CLAUDE_SMART = 'claude-sonnet-4-6'
const CLAUDE_CHEAP = 'claude-haiku-4-5-20251001'

@Injectable()
export class AiService {
  private anthropic: Anthropic | null
  private geminiKey?: string
  private geminiModel: string
  private groqKey?: string
  private groqModel: string
  private provider: Provider

  constructor(private config: ConfigService) {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY')
    this.geminiKey = this.config.get<string>('GEMINI_API_KEY') || undefined
    this.geminiModel = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash'
    this.groqKey = this.config.get<string>('GROQ_API_KEY') || undefined
    this.groqModel = this.config.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile'
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null

    // Explicit override wins; otherwise prefer Claude → Gemini → Groq by key presence.
    const forced = this.config.get<string>('AI_PROVIDER')
    if (forced === 'anthropic' || forced === 'gemini' || forced === 'groq') {
      this.provider = forced
    } else if (this.anthropic) {
      this.provider = 'anthropic'
    } else if (this.geminiKey) {
      this.provider = 'gemini'
    } else if (this.groqKey) {
      this.provider = 'groq'
    } else {
      this.provider = 'anthropic' // nothing configured — calls will error clearly
    }
  }

  // ── Provider-agnostic completion ──────────────────────────────────────────

  private async complete(params: {
    system?: string
    messages: ChatMessage[]
    maxTokens: number
    cheap?: boolean
    temperature?: number
  }): Promise<string> {
    if (this.provider === 'gemini') return this.completeGemini(params)
    if (this.provider === 'groq') return this.completeGroq(params)
    return this.completeAnthropic(params)
  }

  private async completeGroq(params: {
    system?: string
    messages: ChatMessage[]
    maxTokens: number
    temperature?: number
  }): Promise<string> {
    if (!this.groqKey) {
      throw new ServiceUnavailableException(
        'AI is not configured. Set GROQ_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY.',
      )
    }

    // Groq is OpenAI-compatible: a flat messages array with a system role.
    const messages = [
      ...(params.system ? [{ role: 'system', content: params.system }] : []),
      ...params.messages,
    ]

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.groqModel,
        messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature ?? 0.7,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new HttpException(`AI request failed (${res.status}). ${detail.slice(0, 200)}`, 502)
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return (data.choices?.[0]?.message?.content ?? '').trim()
  }

  private async completeAnthropic(params: {
    system?: string
    messages: ChatMessage[]
    maxTokens: number
    cheap?: boolean
    temperature?: number
  }): Promise<string> {
    if (!this.anthropic) {
      throw new ServiceUnavailableException(
        'AI is not configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY on the API.',
      )
    }
    const res = await this.anthropic.messages.create({
      model: params.cheap ? CLAUDE_CHEAP : CLAUDE_SMART,
      max_tokens: params.maxTokens,
      ...(params.temperature != null ? { temperature: params.temperature } : {}),
      ...(params.system ? { system: params.system } : {}),
      messages: params.messages,
    })
    return res.content[0].type === 'text' ? res.content[0].text : ''
  }

  private async completeGemini(params: {
    system?: string
    messages: ChatMessage[]
    maxTokens: number
    temperature?: number
  }): Promise<string> {
    if (!this.geminiKey) {
      throw new ServiceUnavailableException(
        'AI is not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY on the API.',
      )
    }

    // Gemini uses roles 'user' / 'model', and the conversation must start with
    // a user turn — drop a leading assistant (greeting) message if present.
    const msgs = [...params.messages]
    while (msgs.length && msgs[0].role === 'assistant') msgs.shift()
    const contents = msgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(params.system ? { system_instruction: { parts: [{ text: params.system }] } } : {}),
        contents,
        generationConfig: {
          maxOutputTokens: params.maxTokens,
          temperature: params.temperature ?? 0.7,
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new HttpException(`AI request failed (${res.status}). ${detail.slice(0, 200)}`, 502)
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const parts = data.candidates?.[0]?.content?.parts ?? []
    return parts.map((p) => p.text ?? '').join('').trim()
  }

  // ── Features ──────────────────────────────────────────────────────────────

  /**
   * Generate AI conversation for speaking practice. The system prompt embeds
   * the scenario and learner level so the AI adapts complexity and corrections.
   */
  async speakingTurn(params: {
    scenario: string
    level: string
    history: ChatMessage[]
    userMessage: string
  }) {
    const systemPrompt = `You are a native German conversation partner helping a ${params.level} learner practice the "${params.scenario}" scenario.

Rules:
- Respond PRIMARILY in German, at a complexity appropriate for ${params.level}
- After your German response, add a JSON block: {"corrections": [...], "vocabulary": [...], "encouragement": "..."}
- corrections: array of {original, corrected, explanation} for any grammar/vocab errors
- vocabulary: array of {german, english} for new words you used
- encouragement: one short motivational line in English
- Keep responses conversational, natural — not textbook perfect
- If the user freezes or makes big errors, gently guide them back`

    const messages: ChatMessage[] = [
      ...params.history,
      { role: 'user', content: params.userMessage },
    ]

    const raw = await this.complete({
      system: systemPrompt,
      messages,
      maxTokens: 1024,
      temperature: 0.8,
    })

    // Split the prose reply from the trailing JSON block (tolerate code fences).
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}\s*$/)
    const prose = jsonMatch ? cleaned.slice(0, cleaned.lastIndexOf(jsonMatch[0])).trim() : cleaned
    let meta: Record<string, unknown> = {}
    if (jsonMatch) {
      try {
        meta = JSON.parse(jsonMatch[0])
      } catch {
        /* malformed — ignore */
      }
    }

    return { response: prose || cleaned, meta }
  }

  /** Explain a grammar rule with the WHY — the core differentiator. */
  async explainGrammar(rule: string, example: string, level: string) {
    return this.complete({
      maxTokens: 600,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: `You are a world-class German grammar professor. Explain "${rule}" using the example "${example}" for a ${level} learner. Focus on the WHY — the historical/logical reason this rule exists. Keep it under 120 words, conversational, and memorable. No bullet points. Just clear, direct explanation.`,
        },
      ],
    })
  }

  /** Generate a short weekly motivational report for the user. */
  async generateWeeklyReport(stats: {
    name: string
    level: string
    lessonsCompleted: number
    vocabularyLearned: number
    hesitationImprovement: number
    weeksUntilLevelComplete: number
  }) {
    return this.complete({
      maxTokens: 200,
      cheap: true,
      messages: [
        {
          role: 'user',
          content: `Write a 2-sentence motivational weekly progress message for ${stats.name}, a German ${stats.level} learner. They completed ${stats.lessonsCompleted} lessons, learned ${stats.vocabularyLearned} new words, and their hesitation dropped by ${stats.hesitationImprovement}%. They're ~${stats.weeksUntilLevelComplete} weeks from their next level. Be specific, warm, and energizing. No emojis.`,
        },
      ],
    })
  }
}
