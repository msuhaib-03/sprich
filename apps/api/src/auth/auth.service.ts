import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
}
