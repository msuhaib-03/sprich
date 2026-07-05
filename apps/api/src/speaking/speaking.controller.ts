import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsString, IsOptional, MaxLength, IsArray, IsEnum, IsInt, Min } from 'class-validator'
import type { Response } from 'express'
import { SpeakingScenario } from '@prisma/client'
import { SpeakingService } from './speaking.service'

class TtsDto {
  @IsString()
  @MaxLength(1000)
  text!: string

  @IsOptional()
  @IsString()
  voiceId?: string
}

class CreateSessionDto {
  @IsEnum(SpeakingScenario)
  scenario!: SpeakingScenario

  @IsArray()
  messages!: Array<{ role: 'user' | 'assistant'; content: string }>

  @IsInt()
  @Min(0)
  durationSeconds!: number

  @IsOptional()
  @IsString()
  level?: string
}

interface UploadedAudio {
  buffer: Buffer
  mimetype: string
  size: number
}

@UseGuards(AuthGuard('jwt'))
@Controller('speaking')
export class SpeakingController {
  constructor(private speakingService: SpeakingService) {}

  @Post('tts')
  async tts(@Body() dto: TtsDto, @Res() res: Response) {
    const { audio, cached } = await this.speakingService.textToSpeech(dto.text, dto.voiceId)
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audio.length),
      'Cache-Control': 'no-store',
      // Debug: HIT = served from disk, zero ElevenLabs credits spent.
      'X-Audio-Cache': cached ? 'HIT' : 'MISS',
    })
    res.send(audio)
  }

  @Post('stt')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async stt(@UploadedFile() file?: UploadedAudio) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No audio uploaded.')
    }
    const text = await this.speakingService.speechToText(file.buffer, file.mimetype)
    return { text }
  }

  @Post('sessions')
  createSession(
    @Request() req: { user: { id: string; level?: string } },
    @Body() dto: CreateSessionDto,
  ) {
    return this.speakingService.createSession(req.user.id, {
      scenario: dto.scenario,
      messages: dto.messages,
      durationSeconds: dto.durationSeconds,
      level: dto.level ?? req.user.level ?? 'A1',
    })
  }
}
