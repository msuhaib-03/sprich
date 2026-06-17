import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GermanLevel } from '@prisma/client'

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  getChaptersByLevel(level: GermanLevel) {
    return this.prisma.chapter.findMany({
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
    })
  }

  getLessonById(id: string) {
    return this.prisma.lesson.findUniqueOrThrow({
      where: { id },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        vocabulary: { include: { vocab: true } },
      },
    })
  }
}
