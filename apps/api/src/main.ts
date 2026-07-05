import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })

  // WEB_URL may be a single origin or a comma-separated list (e.g. a custom
  // domain + Vercel's own *.vercel.app URL). Localhost is always allowed so
  // local dev can point at a deployed API. Vercel preview deploys each get a
  // unique *.vercel.app subdomain, so those are allowed by pattern too.
  const configuredOrigins = new Set(
    (process.env.WEB_URL ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  )
  configuredOrigins.add('http://localhost:3000') // always allowed for local dev
  const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true) // same-origin / server-to-server / curl
      if (configuredOrigins.has(origin) || vercelPreviewPattern.test(origin)) {
        return callback(null, true)
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Exclude the health check from the prefix so it responds at bare `/` —
  // most hosting platforms probe root by default with no custom config needed.
  app.setGlobalPrefix('api/v1', { exclude: ['/'] })

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`🚀 Sprich API running on http://localhost:${port}/api/v1`)
}

bootstrap()
