import { Controller, Post, Body, UseGuards, Request, Get, Query, Res } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ThrottlerGuard } from '@nestjs/throttler'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { setSessionCookie, clearSessionCookie } from './session-cookie'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.register(dto)
    setSessionCookie(res, accessToken, this.config)
    return { user }
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Request() req: { user: { id: string; email: string } },
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.login(req.user)
    setSessionCookie(res, accessToken, this.config)
    return { user }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    // Stateless JWT — clearing the cookie is the logout. Safe to call
    // unauthenticated (idempotent).
    clearSessionCookie(res, this.config)
    return { ok: true }
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
    // Set the session cookie straight onto the redirect response — no one-time
    // code, no exchange hop. The cookie is Domain=.dolang.website, so the
    // dolang.website page we redirect to (and its api.dolang.website calls)
    // carry it immediately.
    const { accessToken, user } = req.user
    setSessionCookie(res, accessToken, this.config)

    const needsOnboarding = !user?.profile || !user?.goal
    const target = `${this.authService.getWebUrl()}${needsOnboarding ? '/onboarding' : '/dashboard'}`
    console.log(
      '[OAUTH_CALLBACK]',
      JSON.stringify({ stage: 'api_google_callback', userId: user?.id ?? null, target }),
    )
    res.redirect(target)
  }
}
