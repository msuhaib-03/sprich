import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'

const DAY_MS = 86_400_000

/** A card is "mastered" once it has survived several successful reviews. */
const MASTERED_REPETITIONS = 5

/** der/die/das from a grammatical-gender string (for saved dictionary words). */
function articleFromGender(gender?: string | null): string | null {
  switch (gender) {
    case 'masculine':
      return 'der'
    case 'feminine':
      return 'die'
    case 'neuter':
      return 'das'
    default:
      return null
  }
}

/**
 * Lower rank = better match. Exact headword wins, then prefix, then contains;
 * within each, single short words beat long multi-word phrases and titles.
 */
function rank(german: string, lowerTerm: string): number {
  const g = german.toLowerCase()
  const multiWord = g.includes(' ') ? 1 : 0
  let tier: number
  if (g === lowerTerm) tier = 0
  else if (g.startsWith(lowerTerm)) tier = 2
  else tier = 4
  // Nudge phrases below single words in the same tier, then favour brevity.
  return tier + multiWord + Math.min(g.length, 40) / 100
}

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

  /**
   * Full German↔English dictionary lookup (FreeDict data, GPL/AGPL — see NOTICE).
   * Searches both German headwords and English translations.
   */
  async searchDictionary(search?: string, limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100)
    const term = search?.trim()
    if (!term) return []

    const select = { german: true, english: true, pos: true, gender: true, example: true } as const
    const insensitive = 'insensitive' as const

    // Tiered fetch so the most relevant matches are guaranteed to be present,
    // not just whatever happened to be alphabetically first.
    const [exact, prefix, contains] = await Promise.all([
      this.prisma.dictionaryEntry.findMany({
        where: { german: { equals: term, mode: insensitive } },
        take,
        select,
      }),
      this.prisma.dictionaryEntry.findMany({
        where: { german: { startsWith: term, mode: insensitive } },
        orderBy: { german: 'asc' },
        take,
        select,
      }),
      this.prisma.dictionaryEntry.findMany({
        where: {
          OR: [
            { german: { contains: term, mode: insensitive } },
            { english: { contains: term, mode: insensitive } },
          ],
        },
        orderBy: { german: 'asc' },
        take: take * 2,
        select,
      }),
    ])

    // Merge in priority order, de-duplicate, then rank so single, short,
    // common words beat long multi-word phrases and proper-noun titles.
    const seen = new Set<string>()
    const merged: typeof exact = []
    for (const e of [...exact, ...prefix, ...contains]) {
      const key = `${e.german}|${e.english}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(e)
    }

    const lower = term.toLowerCase()
    merged.sort((a, b) => rank(a.german, lower) - rank(b.german, lower))
    return merged.slice(0, take)
  }

  /** Add an existing curriculum/vocab word to the user's review deck. */
  async addWordToDeck(userId: string, vocabId: string) {
    await this.prisma.vocabWord.findUniqueOrThrow({ where: { id: vocabId }, select: { id: true } })
    await this.prisma.sRSCard.upsert({
      where: { userId_vocabId: { userId, vocabId } },
      create: { userId, vocabId },
      update: {},
    })
    return { added: true, vocabId }
  }

  /**
   * Add a dictionary entry to the user's review deck. Finds or creates a
   * VocabWord for it (so it can carry an SRS card), then schedules it.
   */
  async addDictionaryToDeck(
    userId: string,
    entry: { german: string; english: string; gender?: string | null; example?: string | null },
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true },
    })

    let word = await this.prisma.vocabWord.findFirst({
      where: { german: entry.german, english: entry.english },
      select: { id: true },
    })

    if (!word) {
      const gender = (entry.gender as Prisma.VocabWordCreateInput['gender']) ?? null
      word = await this.prisma.vocabWord.create({
        data: {
          german: entry.german,
          english: entry.english,
          gender,
          article: articleFromGender(entry.gender),
          exampleSentence: entry.example ?? '',
          exampleTranslation: '',
          level: user.level,
        },
        select: { id: true },
      })
    }

    await this.prisma.sRSCard.upsert({
      where: { userId_vocabId: { userId, vocabId: word.id } },
      create: { userId, vocabId: word.id },
      update: {},
    })
    return { added: true, vocabId: word.id }
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
