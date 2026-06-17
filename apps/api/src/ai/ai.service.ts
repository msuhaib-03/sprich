import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'

@Injectable()
export class AiService {
  private client: Anthropic

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  /**
   * Generate AI conversation for speaking practice.
   * The system prompt embeds the scenario and current learner level
   * so the AI adapts vocabulary complexity, speed, and corrections.
   */
  async speakingTurn(params: {
    scenario: string
    level: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
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

    const messages = [
      ...params.history,
      { role: 'user' as const, content: params.userMessage },
    ]

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Split prose response from JSON block
    const jsonMatch = raw.match(/\{[\s\S]*\}$/)
    const prose = jsonMatch ? raw.slice(0, raw.lastIndexOf(jsonMatch[0])).trim() : raw
    let meta: Record<string, unknown> = {}
    if (jsonMatch) {
      try { meta = JSON.parse(jsonMatch[0]) } catch { /* malformed — ignore */ }
    }

    return { response: prose, meta }
  }

  /**
   * Explain a grammar rule with the WHY — the core differentiator.
   */
  async explainGrammar(rule: string, example: string, level: string) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a world-class German grammar professor. Explain "${rule}" using the example "${example}" for a ${level} learner. Focus on the WHY — the historical/logical reason this rule exists. Keep it under 120 words, conversational, and memorable. No bullet points. Just clear, direct explanation.`,
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  /**
   * Generate a weekly motivational report for the user.
   */
  async generateWeeklyReport(stats: {
    name: string
    level: string
    lessonsCompleted: number
    vocabularyLearned: number
    hesitationImprovement: number
    weeksUntilLevelComplete: number
  }) {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a 2-sentence motivational weekly progress message for ${stats.name}, a German ${stats.level} learner. They completed ${stats.lessonsCompleted} lessons, learned ${stats.vocabularyLearned} new words, and their hesitation dropped by ${stats.hesitationImprovement}%. They're ~${stats.weeksUntilLevelComplete} weeks from their next level. Be specific, warm, and energizing. No emojis.`,
        },
      ],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }
}
