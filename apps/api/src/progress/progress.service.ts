import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AiService } from '../ai/ai.service'

const DAY_MS = 86_400_000
const MASTERED_REPETITIONS = 5

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

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

  /** Aggregated stats for the Progress dashboard. */
  async getSummary(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        level: true,
        streak: true,
        longestStreak: true,
        xp: true,
        dailyMinutes: true,
      },
    })

    const [entries, totalLessonsAtLevel, vocabTotal, vocabMastered] = await Promise.all([
      this.prisma.userProgress.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        select: {
          score: true,
          completedAt: true,
          lesson: {
            select: { title: true, chapter: { select: { level: true, number: true } } },
          },
        },
      }),
      this.prisma.lesson.count({ where: { chapter: { level: user.level } } }),
      this.prisma.sRSCard.count({ where: { userId } }),
      this.prisma.sRSCard.count({
        where: { userId, repetitions: { gte: MASTERED_REPETITIONS } },
      }),
    ])

    // Completion at the user's current level.
    const completedAtLevel = entries.filter((e) => e.lesson.chapter.level === user.level).length
    const completionPct =
      totalLessonsAtLevel > 0 ? Math.round((completedAtLevel / totalLessonsAtLevel) * 100) : 0

    // Last-7-days activity buckets (oldest → newest).
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today.getTime() - (6 - i) * DAY_MS)
      const next = new Date(day.getTime() + DAY_MS)
      const count = entries.filter((e) => {
        const c = new Date(e.completedAt)
        return c >= day && c < next
      }).length
      return { label: weekdays[day.getDay()], count }
    })

    const avgScore =
      entries.length > 0
        ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
        : 0

    return {
      name: user.name,
      level: user.level,
      streak: user.streak,
      longestStreak: user.longestStreak,
      xp: user.xp,
      dailyMinutes: user.dailyMinutes,
      totalCompleted: entries.length,
      completedAtLevel,
      totalLessonsAtLevel,
      completionPct,
      avgScore,
      vocab: { total: vocabTotal, mastered: vocabMastered },
      weeklyActivity,
      recent: entries.slice(0, 5).map((e) => ({
        title: e.lesson.title,
        score: e.score,
        completedAt: e.completedAt,
      })),
    }
  }

  /** On-demand AI motivational insight based on the last 7 days. */
  async generateWeeklyReport(userId: string) {
    const summary = await this.getSummary(userId)
    const weekLessons = summary.weeklyActivity.reduce((s, d) => s + d.count, 0)
    const remaining = Math.max(0, summary.totalLessonsAtLevel - summary.completedAtLevel)
    // Rough estimate: pace = lessons/week; weeks left = remaining / pace.
    const weeksUntilLevelComplete = weekLessons > 0 ? Math.ceil(remaining / weekLessons) : remaining

    const message = await this.ai.generateWeeklyReport({
      name: summary.name,
      level: summary.level,
      lessonsCompleted: weekLessons,
      vocabularyLearned: summary.vocab.total,
      hesitationImprovement: 0,
      weeksUntilLevelComplete,
    })

    return { message }
  }
}
