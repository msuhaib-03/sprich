import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { SESSION_COOKIE } from '../session-cookie'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET')
    if (!secret) {
      // Fail fast at boot rather than silently signing/verifying with a known
      // fallback (which would be a full auth bypass in production).
      throw new Error('JWT_SECRET is not set')
    }
    super({
      // Cookie-only: the session JWT rides in an HttpOnly cookie, never a
      // header or the URL.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[SESSION_COOKIE] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email }
  }
}
