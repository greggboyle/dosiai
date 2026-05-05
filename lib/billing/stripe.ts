import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log'
import type { BillingCycle, WorkspacePlan } from '@/lib/types/dosi'
import { PLAN_LIMITS } from '@/lib/billing/limits'

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(key)
}

const PRICE_ENV_MAP: Record<Exclude<WorkspacePlan, 'trial' | 'enterprise'>, Record<BillingCycle, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_TEAM_ANNUAL ?? '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? '',
  },
}

function getPriceId(plan: WorkspacePlan, billingCycle: BillingCycle) {
  if (plan === 'trial' || plan === 'enterprise') {
    throw new Error('Checkout is supported for starter/team/business plans only')
  }
  const priceId = PRICE_ENV_MAP[plan][billingCycle]
  if (!priceId) throw new Error(`Missing Stripe price ID for ${plan} ${billingCycle}`)
  return priceId
}

export async function createCheckoutSession(workspaceId: string, plan: WorkspacePlan, billingCycle: BillingCycle) {
  const stripe = getStripeClient()
  const supabase = createSupabaseAdminClient()
  const { data: workspace } = await supabase.from('workspace').select('*').eq('id', workspaceId).single()
  if (!workspace) throw new Error('Workspace not found')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: workspace.stripe_customer_id ?? undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings/billing?checkout=cancelled`,
    line_items: [{ price: getPriceId(plan, billingCycle), quantity: 1 }],
    metadata: { workspaceId, plan, billingCycle },
    subscription_data: {
      metadata: { workspaceId, plan, billingCycle },
    },
    customer_email: workspace.stripe_customer_id ? undefined : undefined,
  })

  return session.url
}

export async function createBillingPortalSession(workspaceId: string) {
  const stripe = getStripeClient()
  const supabase = createSupabaseAdminClient()
  const { data: workspace } = await supabase.from('workspace').select('*').eq('id', workspaceId).single()
  if (!workspace?.stripe_customer_id) {
    throw new Error('Workspace has no Stripe customer yet')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings/billing`,
  })

  return session.url
}

export async function handleWebhook(event: Stripe.Event) {
  const supabase = createSupabaseAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const workspaceId = session.metadata?.workspaceId
    const plan = (session.metadata?.plan as WorkspacePlan | undefined) ?? 'starter'
    const billingCycle = (session.metadata?.billingCycle as BillingCycle | undefined) ?? 'monthly'
    if (!workspaceId) return

    await supabase
      .from('workspace')
      .update({
        plan,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
        trial_ends_at: null,
        ai_cost_ceiling_cents: PLAN_LIMITS[plan].aiCostCeilingCents,
      })
      .eq('id', workspaceId)

    await logAuditEvent({
      severity: 'info',
      category: 'billing',
      operatorName: 'system',
      operatorRole: 'system',
      action: 'subscription_checkout_completed',
      targetType: 'workspace',
      targetId: workspaceId,
      targetName: workspaceId,
      reason: `Checkout completed: ${plan}/${billingCycle}`,
    })
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const workspaceId = subscription.metadata?.workspaceId
    if (!workspaceId) return
    await supabase
      .from('workspace')
      .update({
        stripe_subscription_id: subscription.id,
      })
      .eq('id', workspaceId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const workspaceId = subscription.metadata?.workspaceId
    if (!workspaceId) return
    await supabase
      .from('workspace')
      .update({
        status: 'grace_period',
        grace_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', workspaceId)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
    if (!subscriptionId) return

    const { data: workspace } = await supabase
      .from('workspace')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()
    if (!workspace) return

    await supabase.from('workspace').update({ status: 'cancelled' }).eq('id', workspace.id)
  }
}

export function verifyWebhookSignature(payload: string, signature: string) {
  const stripe = getStripeClient()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  return stripe.webhooks.constructEvent(payload, signature, secret)
}
