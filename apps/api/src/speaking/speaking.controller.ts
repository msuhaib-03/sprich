import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, IsOptional, MaxLength } from 'class-validator'
import type { Response } from 'express'
import { SpeakingService } from './speaking.service'

class TtsDto {
  @IsString()
  @MaxLength(1000)
  text!: string

  @IsOptional()
  @IsString()
  voiceId?: string
}

@UseGuards(AuthGuard('jwt'))
@Controller('speaking')
export class SpeakingController {
  constructor(private speakingService: SpeakingService) {}

  @Post('tts')
  async tts(@Body() dto: TtsDto, @Res() res: Response) {
    const audio = await this.speakingService.textToSpeech(dto.text, dto.voiceId)
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audio.length),
      'Cache-Control': 'no-store',
    })
    res.send(audio)
  }
}
