import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LessonsService } from './lessons.service'
import { GermanLevel } from '@prisma/client'

@UseGuards(AuthGuard('jwt'))
@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  @Get('chapters')
  getChapters(@Query('level') level: GermanLevel) {
    return this.lessonsService.getChaptersByLevel(level)
  }

  @Get(':id')
  getLesson(@Param('id') id: string) {
    return this.lessonsService.getLessonById(id)
  }
}
