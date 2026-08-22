import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailService } from './email.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LocalStrategy } from './strategies/local.strategy'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    // 3 requests/min per IP — only applied to POST /auth/forgot-password.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
