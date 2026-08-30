import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20'
import { AuthService } from '../auth.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    // passport-oauth2's base Strategy throws at construction if clientID/
    // clientSecret are falsy — which would crash the ENTIRE API on boot
    // (breaking email/password login too) just because Google OAuth isn't
    // configured yet. Fall back to a placeholder so the app still starts;
    // hitting /auth/google without real credentials just fails at Google's
    // end instead, exactly like EmailService's SMTP fallback degrades.
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const emailEntry = profile.emails?.[0]

    // We use this email to decide which account to log the user into — if
    // Google hasn't verified it, we can't trust it belongs to this person.
    // Without this check, someone could sign in claiming an unverified email
    // that matches an existing account and get linked straight into it.
    if (!emailEntry?.value || !emailEntry.verified) {
      return done(new Error('Google account email is not verified'), undefined)
    }

    const result = await this.authService.validateOAuthUser({
      googleId: profile.id,
      email: emailEntry.value,
      name: profile.displayName || emailEntry.value,
    })
    done(null, result)
  }
}
