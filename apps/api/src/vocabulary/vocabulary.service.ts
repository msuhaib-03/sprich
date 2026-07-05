import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GermanLevel, Prisma } from '@prisma/client'

const DAY_MS = 86_400_000

/** A card is "mastered" once it has survived several successful reviews. */
const MASTERED_REPETITIONS = 5

@Injectable()
export class VocabularyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Return the review queue: SRS cards that are due now. Lazily creates cards
   * for vocabulary the user has actually learned (words from completed lessons)
   * so review only ever covers material they've already seen.
   */
  async getDueCards(userId: string) {
    await this.ensureCardsForLearnedVocab(userId)

    return this.prisma.sRSCard.findMany({
      where: { userId, nextReview: { lte: new Date() } },
      orderBy: { nextReview: 'asc' },
      include: { vocab: true },
      take: 30,
    })
  }

  /**
   * Apply the SM-2 spaced-repetition algorithm to a single card.
   * quality: 0–5 (UI maps Again=1, Hard=3, Good=4, Easy=5).
   */
  async review(userId: string, vocabId: string, quality: number) {
    const card = await this.prisma.sRSCard.findUniqueOrThrow({
      where: { userId_vocabId: { userId, vocabId } },
    })

    let { easeFactor, interval, repetitions } = card

    if (quality < 3) {
      // Lapse — start the ladder over, but keep ease above the floor.
      repetitions = 0
      interval = 1
    } else {
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * easeFactor)
      repetitions += 1
    }

    // SM-2 ease adjustment, clamped to a 1.3 floor.
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )

    const now = new Date()
    const nextReview = new Date(now.getTime() + interval * DAY_MS)

    return this.prisma.sRSCard.update({
      where: { userId_vocabId: { userId, vocabId } },
      data: { easeFactor, interval, repetitions, nextReview, lastReview: now },
      include: { vocab: true },
    })
  }

  /** Searchable dictionary of every word at or below the user's level. */
  async getDictionary(userId: string, search?: string, level?: GermanLevel) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true },
    })

    const order: GermanLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    const ceiling = level ?? user.level
    const allowed = order.slice(0, order.indexOf(ceiling) + 1)

    const where: Prisma.VocabWordWhereInput = { level: { in: allowed } }
    if (search?.trim()) {
      where.OR = [
        { german: { contains: search.trim(), mode: 'insensitive' } },
        { english: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    const [words, learnedCards] = await Promise.all([
      this.prisma.vocabWord.findMany({
        where,
        orderBy: [{ level: 'asc' }, { german: 'asc' }],
        take: 200,
      }),
      this.prisma.sRSCard.findMany({ where: { userId }, select: { vocabId: true } }),
    ])

    const learned = new Set(learnedCards.map((c) => c.vocabId))
    return words.map((w) => ({ ...w, learned: learned.has(w.id) }))
  }

  /** A single word, stable for the whole calendar day (UTC). */
  async getWordOfTheDay() {
    const count = await this.prisma.vocabWord.count()
    if (count === 0) return null

    const dayIndex = Math.floor(Date.now() / DAY_MS)
    const [word] = await this.prisma.vocabWord.findMany({
      orderBy: { id: 'asc' },
      skip: dayIndex % count,
      take: 1,
    })
    return word
  }

  /** Headline numbers for the vocabulary dashboard. */
  async getStats(userId: string) {
    const now = new Date()
    const [total, due, mastered] = await Promise.all([
      this.prisma.sRSCard.count({ where: { userId } }),
      this.prisma.sRSCard.count({ where: { userId, nextReview: { lte: now } } }),
      this.prisma.sRSCard.count({
        where: { userId, repetitions: { gte: MASTERED_REPETITIONS } },
      }),
    ])
    return { total, due, mastered, learning: total - mastered }
  }

  /**
   * Create SRS cards (due immediately) for any vocabulary the user has learned
   * via a completed lesson but doesn't yet have a card for. Idempotent.
   */
  private async ensureCardsForLearnedVocab(userId: string) {
    const completed = await this.prisma.userProgress.findMany({
      where: { userId },
      select: { lessonId: true },
    })
    if (completed.length === 0) return

    const links = await this.prisma.lessonVocab.findMany({
      where: { lessonId: { in: completed.map((p) => p.lessonId) } },
      select: { vocabId: true },
    })
    const learnedVocabIds = [...new Set(links.map((l) => l.vocabId))]
    if (learnedVocabIds.length === 0) return

    const existing = await this.prisma.sRSCard.findMany({
      where: { userId, vocabId: { in: learnedVocabIds } },
      select: { vocabId: true },
    })
    const have = new Set(existing.map((c) => c.vocabId))
    const missing = learnedVocabIds.filter((id) => !have.has(id))
    if (missing.length === 0) return

    await this.prisma.sRSCard.createMany({
      data: missing.map((vocabId) => ({ userId, vocabId })),
      skipDuplicates: true,
    })
  }
}
