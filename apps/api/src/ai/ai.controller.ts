import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AiService } from './ai.service'
import { IsString, IsArray, IsEnum } from 'class-validator'

class SpeakingTurnDto {
  @IsString()
  scenario: string

  @IsString()
  userMessage: string

  @IsArray()
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

class ExplainGrammarDto {
  @IsString()
  rule: string

  @IsString()
  example: string
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
      level: req.user.level ?? 'A1',
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
}
