import { Controller, Post, Body, UseGuards, Request, Get, Query, Res, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { ExchangeOAuthCodeDto } from './dto/exchange-oauth-code.dto'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: { user: { id: string; email: string } }, @Body() _dto: LoginDto) {
    return this.authService.login(req.user)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req: { user: { id: string; email: string } }) {
    return req.user
  }

  // Rate-limited on its own — this triggers an outbound email, so it's a
  // spam/quota-abuse target that login/register aren't.
  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  @Get('reset-password/validate')
  validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token)
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  // Kicks off the redirect to Google's consent screen — Passport handles it,
  // this handler body never actually runs.
  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {}

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  googleCallback(
    @Request() req: { user: Awaited<ReturnType<AuthService['login']>> },
    @Res() res: Response,
  ) {
    // Don't put the real token in the URL — it would end up in browser
    // history. Send a one-time code instead; the frontend trades it for
    // the login result right away via POST /auth/oauth/exchange.
    const code = this.authService.createOAuthExchangeCode(req.user)
    res.redirect(`${this.authService.getWebUrl()}/callback?code=${code}`)
  }

  @Post('oauth/exchange')
  exchangeOAuthCode(@Body() dto: ExchangeOAuthCodeDto) {
    // Same { accessToken, user } shape as POST /auth/login, so the callback
    // page can finish sign-in without a follow-up GET /users/me.
    const result = this.authService.exchangeOAuthCode(dto.code)
    if (!result) throw new BadRequestException('Invalid or expired code')
    return result
  }
}
