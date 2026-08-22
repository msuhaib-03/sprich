import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly transporter: nodemailer.Transporter | null
  private readonly from: string

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    const port = this.config.get<string>('SMTP_PORT')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASSWORD')

    // A display name reads far better in an inbox than a bare address, but
    // the address itself must stay the real authenticated SMTP account —
    // most providers (Gmail included) reject sending "from" an address you
    // haven't verified.
    this.from = this.config.get<string>('SMTP_FROM') || (user ? `"Sprich" <${user}>` : 'no-reply@sprich.app')

    this.transporter =
      host && port && user && pass
        ? nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: { user, pass },
          })
        : null
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    // SMTP not configured (e.g. local dev without a mailbox set up) — log
    // the link instead of sending, so the flow stays fully testable.
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — password reset link for ${to}: ${resetUrl}`)
      return
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your Sprich password',
      html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      text: `We received a request to reset your password. Open this link to set a new one (expires in 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    })
  }
}
