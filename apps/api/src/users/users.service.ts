import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GermanLevel, UserGoal, UserProfile } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    })
    if (!user) return null
    const sub = user.subscription
    const isPremium =
      !!sub && sub.status === 'active' && sub.plan !== 'free'
    const { passwordHash: _passwordHash, ...safe } = user
    return { ...safe, isPremium }
  }

  create(data: { email: string; name: string; passwordHash: string }) {
    return this.prisma.user.create({ data })
  }

  updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } })
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } })
  }

  createFromGoogle(data: { email: string; name: string; googleId: string }) {
    return this.prisma.user.create({ data })
  }

  // Links a Google account onto an existing password-based user (e.g. they
  // registered with email+password first, then used "Continue with Google"
  // with the same address). Safe because Google has already verified the
  // email — this can't be used to hijack an account via an unverified one.
  linkGoogleId(id: string, googleId: string) {
    return this.prisma.user.update({ where: { id }, data: { googleId } })
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
