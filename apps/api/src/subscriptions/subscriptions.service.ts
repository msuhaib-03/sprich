import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'
import { PlanType, SubscriptionStatus } from '@prisma/client'

type PaidPlan = 'premium_monthly' | 'premium_annual'

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe | null

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')
    this.stripe = key ? new Stripe(key) : null
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Payments are not configured yet.')
    }
    return this.stripe
  }

  /** Current plan for the user, defaulting to free. */
  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } })
    if (!sub) return { plan: 'free' as PlanType, status: 'active' as SubscriptionStatus }
    return {
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    }
  }

  /** Create a Stripe Checkout session and return its URL. */
  async createCheckout(userId: string, plan: PaidPlan) {
    const stripe = this.requireStripe()

    const priceId = this.config.get<string>(
      plan === 'premium_monthly'
        ? 'STRIPE_PREMIUM_MONTHLY_PRICE_ID'
        : 'STRIPE_PREMIUM_ANNUAL_PRICE_ID',
    )
    if (!priceId) throw new ServiceUnavailableException('This plan is not configured yet.')

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true, subscription: true },
    })

    // Reuse or create the Stripe customer.
    let customerId = user.subscription?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      })
      customerId = customer.id
      await this.prisma.subscription.upsert({
        where: { userId },
        create: { userId, stripeCustomerId: customerId, plan: 'free', status: 'active' },
        update: { stripeCustomerId: customerId },
      })
    }

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webUrl}/dashboard?upgraded=1`,
      cancel_url: `${webUrl}/premium?canceled=1`,
      metadata: { userId, plan },
    })

    return { url: session.url }
  }

  /** Verify and process a Stripe webhook event. */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const stripe = this.requireStripe()
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')
    if (!secret || !rawBody || !signature) {
      throw new BadRequestException('Missing webhook signature or secret.')
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch {
      throw new BadRequestException('Invalid webhook signature.')
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = (session.metadata?.plan as PaidPlan) ?? 'premium_monthly'
        if (userId && typeof session.customer === 'string') {
          await this.upsertSubscription(userId, session.customer, {
            plan,
            status: 'active',
            stripeSubscriptionId:
              typeof session.subscription === 'string' ? session.subscription : undefined,
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const existing = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true },
        })
        if (existing) {
          // `current_period_end` lives on the subscription in older API versions
          // and on the item in newer ones — read whichever is present.
          const periodEnd =
            (sub as unknown as { current_period_end?: number }).current_period_end ??
            (sub.items.data[0] as unknown as { current_period_end?: number })
              ?.current_period_end
          await this.prisma.subscription.update({
            where: { userId: existing.userId },
            data: {
              status: this.mapStatus(sub.status),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
              plan: sub.status === 'canceled' ? 'free' : undefined,
            },
          })
        }
        break
      }
    }

    return { received: true }
  }

  private upsertSubscription(
    userId: string,
    customerId: string,
    data: { plan: PlanType; status: SubscriptionStatus; stripeSubscriptionId?: string },
  ) {
    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customerId, ...data },
      update: data,
    })
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return status
      case 'past_due':
      case 'unpaid':
        return 'past_due'
      default:
        return 'canceled'
    }
  }
}
