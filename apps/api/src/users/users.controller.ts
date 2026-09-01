import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UsersService } from './users.service'
import { OnboardingDto } from './dto/onboarding.dto'

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: { user: { id: string } }) {
    // TEMP DIAGNOSTIC — which user's verified token reached /users/me. Correlate
    // with the Vercel [REQUEST] line. Remove once the callback issue is fixed.
    console.log('[USERS_ME]', JSON.stringify({ userId: req.user?.id ?? null }))
    return this.usersService.findById(req.user.id)
  }

  @Patch('onboarding')
  completeOnboarding(
    @Request() req: { user: { id: string } },
    @Body() dto: OnboardingDto,
  ) {
    return this.usersService.updateOnboarding(req.user.id, dto)
  }
}
