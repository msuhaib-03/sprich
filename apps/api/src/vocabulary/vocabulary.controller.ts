import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, IsInt, Min, Max } from 'class-validator'
import { GermanLevel } from '@prisma/client'
import { VocabularyService } from './vocabulary.service'

class ReviewDto {
  @IsString()
  vocabId!: string

  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number
}

@UseGuards(AuthGuard('jwt'))
@Controller('vocabulary')
export class VocabularyController {
  constructor(private vocabularyService: VocabularyService) {}

  @Get('review')
  getReviewQueue(@Request() req: { user: { id: string } }) {
    return this.vocabularyService.getDueCards(req.user.id)
  }

  @Post('review')
  submitReview(@Request() req: { user: { id: string } }, @Body() dto: ReviewDto) {
    return this.vocabularyService.review(req.user.id, dto.vocabId, dto.quality)
  }

  @Get('dictionary')
  getDictionary(
    @Request() req: { user: { id: string } },
    @Query('search') search?: string,
    @Query('level') level?: GermanLevel,
  ) {
    return this.vocabularyService.getDictionary(req.user.id, search, level)
  }

  @Get('word-of-the-day')
  getWordOfTheDay() {
    return this.vocabularyService.getWordOfTheDay()
  }

  @Get('stats')
  getStats(@Request() req: { user: { id: string } }) {
    return this.vocabularyService.getStats(req.user.id)
  }
}
