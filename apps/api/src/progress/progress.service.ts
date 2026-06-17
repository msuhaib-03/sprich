import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a completed lesson. Idempotent — XP is only awarded the first time
   * a lesson is completed. Streak is updated based on last active date.
   */
  async completeLesson(params: {
    userId: string
    lessonId: string
    score: number
    timeSpentSeconds: number
  }) {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: params.lessonId },
      select: { xpReward: true },
    })

    const existing = await this.prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId: params.userId, lessonId: params.lessonId } },
    })

    const isFirstCompletion = !existing
    const xpEarned = isFirstCompletion ? lesson.xpReward : 0

    await this.prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: params.userId, lessonId: params.lessonId } },
      create: {
        userId: params.userId,
        lessonId: params.lessonId,
        score: params.score,
        xpEarned,
        timeSpentSeconds: params.timeSpentSeconds,
      },
      update: {
        // Keep the best score on replay
        score: Math.max(existing?.score ?? 0, params.score),
      },
    })

    const streak = await this.updateStreak(params.userId)

    const user = await this.prisma.user.update({
      where: { id: params.userId },
      data: { xp: { increment: xpEarned } },
      select: { xp: true, streak: true, longestStreak: true, level: true },
    })

    return { xpEarned, isFirstCompletion, ...user, streak }
  }

  /** Smart streak: increment if last active yesterday, keep if today, reset otherwise. */
  private async updateStreak(userId: string): Promise<number> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { streak: true, longestStreak: true, lastActiveDate: true },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null
    if (last) last.setHours(0, 0, 0, 0)

    let newStreak = user.streak
    if (!last) {
      newStreak = 1
    } else {
      const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000)
      if (diffDays === 0) {
        // already active today — no change
      } else if (diffDays === 1) {
        newStreak = user.streak + 1
      } else {
        newStreak = 1 // missed a day — reset
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        streak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastActiveDate: new Date(),
      },
    })

    return newStreak
  }

  /** All progress for a user — used to mark lessons complete in the UI. */
  getUserProgress(userId: string) {
    return this.prisma.userProgress.findMany({
      where: { userId },
      select: { lessonId: true, score: true, completedAt: true },
    })
  }
}
