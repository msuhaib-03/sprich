import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GermanLevel, UserGoal, UserProfile } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    })
  }

  create(data: { email: string; name: string; passwordHash: string }) {
    return this.prisma.user.create({ data })
  }

  updateOnboarding(
    id: string,
    data: {
      level: GermanLevel
      profile: UserProfile
      goal: UserGoal
      dailyMinutes: number
    },
  ) {
    return this.prisma.user.update({ where: { id }, data })
  }

  updateStreak(id: string, streak: number) {
    return this.prisma.user.update({
      where: { id },
      data: {
        streak,
        longestStreak: { increment: 0 },
        lastActiveDate: new Date(),
      },
    })
  }

  addXp(id: string, xp: number) {
    return this.prisma.user.update({
      where: { id },
      data: { xp: { increment: xp } },
    })
  }
}
