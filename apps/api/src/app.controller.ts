import { Controller, Get } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'

// Unauthenticated — used by the hosting platform's health check probe AND
// by an external uptime pinger (e.g. UptimeRobot). Runs a trivial query so
// pinging this keeps BOTH the Node process (Render free tier sleeps after
// 15min idle) AND the database (Neon free tier suspends after 5min of no
// DB activity — a plain HTTP ping alone does nothing to prevent that).
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get(['', 'health'])
  async health() {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', service: 'sprich-api' }
  }
}
