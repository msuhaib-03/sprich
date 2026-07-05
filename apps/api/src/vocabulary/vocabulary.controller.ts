import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator'
import { VocabularyService } from './vocabulary.service'

class ReviewDto {
  @IsString()
  vocabId!: string

  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number
}

class AddWordDto {
  @IsString()
  vocabId!: string
}

class AddDictionaryDto {
  @IsString()
  german!: string

  @IsString()
  english!: string

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  example?: string
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

  @Post('deck/word')
  addWordToDeck(@Request() req: { user: { id: string } }, @Body() dto: AddWordDto) {
    return this.vocabularyService.addWordToDeck(req.user.id, dto.vocabId)
  }

  @Post('deck/dictionary')
  addDictionaryToDeck(@Request() req: { user: { id: string } }, @Body() dto: AddDictionaryDto) {
    return this.vocabularyService.addDictionaryToDeck(req.user.id, dto)
  }

  @Get('dictionary')
  searchDictionary(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vocabularyService.searchDictionary(search, limit ? parseInt(limit, 10) : 50)
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
