import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GermanLevel } from '@prisma/client'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  // Curriculum content is static at runtime — it only changes via
  // packages/db/src/seed.ts, a manual/deploy-time step, never from a user
  // request — so caching it trades a short staleness window (at most
  // CACHE_TTL_MS after a reseed) for skipping the DB round-trip on nearly
  // every request. Plain in-memory Map, same "single-server, no new infra"
  // pattern as the OAuth exchange-code store in auth.service.ts.
  private cache = new Map<string, { data: unknown; expiresAt: number }>()

  private async getOrSetCache<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.data as T

    // Not cached on failure (e.g. a bad lesson id) — only successful
    // lookups are worth remembering.
    const data = await fetch()
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
    return data
  }

  getChaptersByLevel(level: GermanLevel) {
    return this.getOrSetCache(`chapters:${level}`, () =>
      this.prisma.chapter.findMany({
        where: { level },
        orderBy: { number: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              subtitle: true,
              type: true,
              estimatedMinutes: true,
              xpReward: true,
              isPremium: true,
            },
          },
        },
      }),
    )
  }

  getLessonById(id: string) {
    return this.getOrSetCache(`lesson:${id}`, () =>
      this.prisma.lesson.findUniqueOrThrow({
        where: { id },
        include: {
          exercises: { orderBy: { order: 'asc' } },
          vocabulary: { include: { vocab: true } },
        },
      }),
    )
  }
}
