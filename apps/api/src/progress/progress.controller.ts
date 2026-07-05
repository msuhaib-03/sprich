import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsString, IsInt, Min, Max } from 'class-validator'
import { ProgressService } from './progress.service'

class CompleteLessonDto {
  @IsString()
  lessonId!: string

  @IsInt()
  @Min(0)
  @Max(100)
  score!: number

  @IsInt()
  @Min(0)
  timeSpentSeconds!: number
}

@UseGuards(AuthGuard('jwt'))
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post('complete')
  complete(@Request() req: { user: { id: string } }, @Body() dto: CompleteLessonDto) {
    return this.progressService.completeLesson({
      userId: req.user.id,
      lessonId: dto.lessonId,
      score: dto.score,
      timeSpentSeconds: dto.timeSpentSeconds,
    })
  }

  @Get()
  getMyProgress(@Request() req: { user: { id: string } }) {
    return this.progressService.getUserProgress(req.user.id)
  }

  @Get('summary')
  getSummary(@Request() req: { user: { id: string } }) {
    return this.progressService.getSummary(req.user.id)
  }

  @Get('leaderboard')
  getLeaderboard(@Request() req: { user: { id: string } }) {
    return this.progressService.getLeaderboard(req.user.id)
  }

  @Get('badges')
  getBadges(@Request() req: { user: { id: string } }) {
    return this.progressService.getBadges(req.user.id)
  }

  @Post('weekly-report')
  weeklyReport(@Request() req: { user: { id: string } }) {
    return this.progressService.generateWeeklyReport(req.user.id)
  }
}
