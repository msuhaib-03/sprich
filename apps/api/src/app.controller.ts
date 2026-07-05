import { Controller, Get } from '@nestjs/common'

// Unauthenticated — used by the hosting platform's health check probe.
@Controller()
export class AppController {
  @Get()
  health() {
    return { status: 'ok', service: 'sprich-api' }
  }
}
