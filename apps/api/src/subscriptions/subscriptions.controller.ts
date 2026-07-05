import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { IsIn } from 'class-validator'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'
import { SubscriptionsService } from './subscriptions.service'

class CheckoutDto {
  @IsIn(['premium_monthly', 'premium_annual'])
  plan!: 'premium_monthly' | 'premium_annual'
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMine(@Request() req: { user: { id: string } }) {
    return this.subscriptionsService.getMySubscription(req.user.id)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  checkout(@Request() req: { user: { id: string } }, @Body() dto: CheckoutDto) {
    return this.subscriptionsService.createCheckout(req.user.id, dto.plan)
  }

  // Public — verified via Stripe signature, not JWT.
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionsService.handleWebhook(req.rawBody, signature)
  }
}
