import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from './email.service'
import { RegisterDto } from './dto/register.dto'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email)
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return user
  }

  async login(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email }
    // Return the full profile inline so the client never needs a second
    // GET /users/me round-trip right after auth — that extra hop was pure
    // added latency, worse than usual on a cold free-tier DB connection.
    const profile = await this.usersService.findById(user.id)
    return {
      accessToken: this.jwtService.sign(payload),
      user: profile,
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    // Cost 10 is bcrypt's own standard default — plenty secure, and 4x
    // cheaper than the previous cost 12 (bcrypt's cost is exponential).
    // Matters more on a CPU-throttled free-tier host than a beefy one.
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    })

    return this.login(user)
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email)

    // Always return the same generic response whether or not the email
    // exists — otherwise this endpoint becomes an account-enumeration oracle.
    const genericResponse = { message: 'If that email is registered, a reset link has been sent.' }
    if (!user) return genericResponse

    // Only one outstanding token per user — a fresh request supersedes any
    // previous unused link.
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const rawToken = randomBytes(32).toString('hex')
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })

    const webUrl = (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').split(',')[0].replace(/\/$/, '')
    const resetUrl = `${webUrl}/reset-password?token=${rawToken}`
    await this.emailService.sendPasswordResetEmail(user.email, resetUrl)

    return genericResponse
  }

  private async findValidResetToken(token: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    })
    if (!record || record.expiresAt < new Date()) return null
    return record
  }

  async validateResetToken(token: string) {
    const record = await this.findValidResetToken(token)
    return { valid: !!record }
  }

  async resetPassword(token: string, password: string) {
    const record = await this.findValidResetToken(token)
    if (!record) throw new BadRequestException('Invalid or expired reset link')

    const passwordHash = await bcrypt.hash(password, 10)
    await this.usersService.updatePasswordHash(record.userId, passwordHash)
    await this.prisma.passwordResetToken.delete({ where: { id: record.id } })

    return { message: 'Password updated successfully.' }
  }
}
