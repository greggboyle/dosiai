// DOSI.AI Billing & Plan Types
// Trial → Starter → Team → Business → Enterprise

export type PlanId = 'trial' | 'starter' | 'team' | 'business' | 'enterprise'
export type BillingInterval = 'monthly' | 'annual'
export type TrialStatus = 'active' | 'expiring_soon' | 'expired' | 'converted'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'read_only'

// Plan limit configuration
export interface PlanLimits {
  analystSeats: number // Paid seats (viewers are always free/unlimited)
  competitors: number
  topics: number
  battleCards: number
  aiBriefsPerMonth: number | 'unlimited'
  aiCostCeilingCents: number // Monthly AI cost ceiling in cents
  sweepCadence: 'daily' | 'twice_daily' | 'four_times_daily' | 'configurable'
  notifications: 'email_only' | 'full_stack' // full_stack = Slack/Teams/webhook
  customBranding: boolean
  apiAccess: boolean
  prioritySupport: boolean
}

// Plan pricing
export interface PlanPricing {
  monthly: number // in cents
  annual: number // per month in cents (when paid annually)
  annualTotal: number // total annual price in cents
}

// Full plan definition
export interface PlanDefinition {
  id: PlanId
  name: string
  description: string
  pricing: PlanPricing | null // null for trial/enterprise
  limits: PlanLimits
  features: string[] // Marketing features list
  isPopular?: boolean
  ctaLabel: string
}

// Workspace subscription state
export interface WorkspaceSubscription {
  planId: PlanId
  status: SubscriptionStatus
  billingInterval: BillingInterval | null // null for trial
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  // Trial specific
  trialStatus?: TrialStatus
  trialStartedAt?: string
  trialEndsAt?: string
  trialDaysRemaining?: number
  // Read-only / grace period (after trial expires)
  readOnlySince?: string // When workspace transitioned to read_only
  gracePeriodEndsAt?: string // 30 days after expiration, data deletion warning
  daysUntilDeletion?: number // Computed days until grace period ends
  // Usage
  aiCostUsedCents: number
  aiCostCeilingCents: number
  aiCostPercentUsed: number
  // Seats
  analystSeatsUsed: number
  analystSeatsLimit: number
}

// Trial usage stats for conversion prompts
export interface TrialUsageStats {
  competitorsAdded: number
  sweepsRun: number
  itemsReviewed: number
  briefsAuthored: number
  battleCardsCreated: number
}

// AI usage tracking
export interface AIUsageState {
  currentMonthCents: number
  ceilingCents: number
  percentUsed: number
  isAtSoftLimit: boolean // 80%
  isAtHardLimit: boolean // 100%
  nextResetDate: string
}

// Upgrade prompt context
export type UpgradePromptReason = 
  | 'trial_expiring'
  | 'trial_expired'
  | 'competitor_limit'
  | 'topic_limit'
  | 'battle_card_limit'
  | 'ai_brief_limit'
  | 'ai_cost_limit'
  | 'seat_limit'
  | 'feature_locked'

export interface UpgradePromptContext {
  reason: UpgradePromptReason
  currentValue?: number
  limitValue?: number
  suggestedPlan: PlanId
  featureName?: string
}

// Plan configuration - the source of truth
export const PLAN_CONFIG: Record<PlanId, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: '14-day full access to evaluate DOSI.AI',
    pricing: null,
    limits: {
      analystSeats: 1,
      competitors: 5,
      topics: 3,
      battleCards: 5,
      aiBriefsPerMonth: 10,
      aiCostCeilingCents: 4000, // $40
      sweepCadence: 'daily',
      notifications: 'email_only',
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
    features: [
      'Full Starter capabilities',
      '14-day evaluation period',
      'No credit card required',
    ],
    ctaLabel: 'Start Trial',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For individual analysts tracking a focused competitive set',
    pricing: {
      monthly: 9900, // $99
      annual: 7900, // $79/mo
      annualTotal: 94800, // $948/year
    },
    limits: {
      analystSeats: 1,
      competitors: 5,
      topics: 3,
      battleCards: 5,
      aiBriefsPerMonth: 10,
      aiCostCeilingCents: 4000, // $40
      sweepCadence: 'daily',
      notifications: 'email_only',
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
    features: [
      '1 analyst seat',
      'Unlimited free viewers',
      '5 competitors',
      '3 topics',
      'Daily intelligence sweeps',
      '5 battle cards',
      '10 AI-drafted briefs/month',
      'Email notifications',
    ],
    ctaLabel: 'Get Started',
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'For product marketing teams with dedicated CI responsibilities',
    pricing: {
      monthly: 34900, // $349
      annual: 27900, // $279/mo
      annualTotal: 334800, // $3,348/year
    },
    limits: {
      analystSeats: 5,
      competitors: 15,
      topics: 10,
      battleCards: 15,
      aiBriefsPerMonth: 'unlimited',
      aiCostCeilingCents: 20000, // $200
      sweepCadence: 'configurable',
      notifications: 'full_stack',
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
    },
    features: [
      '5 analyst seats',
      'Unlimited free viewers',
      '15 competitors',
      '10 topics',
      'Configurable sweep cadence',
      '15 battle cards',
      'Unlimited AI briefs',
      'Slack, Teams & webhook notifications',
    ],
    isPopular: true,
    ctaLabel: 'Upgrade to Team',
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For established CI programs at scale',
    pricing: {
      monthly: 109900, // $1,099
      annual: 82400, // $824/mo
      annualTotal: 988800, // $9,888/year
    },
    limits: {
      analystSeats: 15,
      competitors: 30,
      topics: 25,
      battleCards: -1, // unlimited
      aiBriefsPerMonth: 'unlimited',
      aiCostCeilingCents: 70000, // $700
      sweepCadence: 'four_times_daily',
      notifications: 'full_stack',
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
    features: [
      '15 analyst seats',
      'Unlimited free viewers',
      '30 competitors',
      '25 topics',
      'Up to 4x daily sweeps',
      'Unlimited battle cards',
      'Unlimited AI briefs',
      'Custom branding on share links',
      'Read-only API access',
      'Priority support',
    ],
    ctaLabel: 'Upgrade to Business',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    pricing: null, // Custom
    limits: {
      analystSeats: -1, // Custom
      competitors: -1,
      topics: -1,
      battleCards: -1,
      aiBriefsPerMonth: 'unlimited',
      aiCostCeilingCents: -1, // Custom
      sweepCadence: 'four_times_daily',
      notifications: 'full_stack',
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
    features: [
      'Custom seat allocation',
      'Unlimited competitors & topics',
      'SSO/SAML integration',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantees',
    ],
    ctaLabel: 'Contact Sales',
  },
}

// Helper functions
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`
}

export function formatPricePerMonth(cents: number): string {
  return `$${(cents / 100).toLocaleString()}/mo`
}

export function getAnnualSavings(planId: PlanId): number | null {
  const plan = PLAN_CONFIG[planId]
  if (!plan.pricing) return null
  const monthlyCost = plan.pricing.monthly * 12
  const annualCost = plan.pricing.annualTotal
  return monthlyCost - annualCost
}

export function getAnnualSavingsPercent(planId: PlanId): number | null {
  const plan = PLAN_CONFIG[planId]
  if (!plan.pricing) return null
  const savings = getAnnualSavings(planId)
  if (!savings) return null
  return Math.round((savings / (plan.pricing.monthly * 12)) * 100)
}

export function getTrialDaysRemaining(trialEndsAt: string): number {
  const now = new Date()
  const end = new Date(trialEndsAt)
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function getTrialStatus(trialEndsAt: string): TrialStatus {
  const daysRemaining = getTrialDaysRemaining(trialEndsAt)
  if (daysRemaining <= 0) return 'expired'
  if (daysRemaining <= 3) return 'expiring_soon'
  return 'active'
}

export function getDaysExpired(trialEndsAt: string): number {
  const now = new Date()
  const end = new Date(trialEndsAt)
  const diffMs = now.getTime() - end.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export function getDaysUntilDeletion(gracePeriodEndsAt: string): number {
  const now = new Date()
  const end = new Date(gracePeriodEndsAt)
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function isInGracePeriod(subscription: WorkspaceSubscription): boolean {
  return (
    subscription.status === 'read_only' &&
    !!subscription.gracePeriodEndsAt &&
    getDaysUntilDeletion(subscription.gracePeriodEndsAt) <= 30
  )
}
