import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AiService } from './ai.service'
import { IsString, IsArray, IsOptional, MaxLength } from 'class-validator'

class SpeakingTurnDto {
  @IsString()
  scenario!: string

  @IsString()
  userMessage!: string

  @IsArray()
  history!: Array<{ role: 'user' | 'assistant'; content: string }>

  @IsOptional()
  @IsString()
  level?: string
}

class ExplainGrammarDto {
  @IsString()
  rule!: string

  @IsString()
  example!: string
}

class TranslateDto {
  @IsString()
  @MaxLength(1000)
  text!: string
}

class ExplainSentenceDto {
  @IsString()
  @MaxLength(1000)
  sentence!: string

  @IsOptional()
  @IsString()
  level?: string
}

@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('speaking/turn')
  speakingTurn(
    @Request() req: { user: { id: string; level?: string } },
    @Body() dto: SpeakingTurnDto,
  ) {
    return this.aiService.speakingTurn({
      scenario: dto.scenario,
      level: dto.level ?? req.user.level ?? 'A1',
      history: dto.history,
      userMessage: dto.userMessage,
    })
  }

  @Post('grammar/explain')
  explainGrammar(
    @Request() req: { user: { level?: string } },
    @Body() dto: ExplainGrammarDto,
  ) {
    return this.aiService.explainGrammar(dto.rule, dto.example, req.user.level ?? 'A1')
  }

  @Post('translate')
  async translate(@Body() dto: TranslateDto) {
    return { translation: await this.aiService.translateText(dto.text) }
  }

  @Post('sentence/explain')
  async explainSentence(
    @Request() req: { user: { level?: string } },
    @Body() dto: ExplainSentenceDto,
  ) {
    return {
      explanation: await this.aiService.explainSentence(
        dto.sentence,
        dto.level ?? req.user.level ?? 'A1',
      ),
    }
  }
}
