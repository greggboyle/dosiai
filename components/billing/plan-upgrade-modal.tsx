'use client'

import * as React from 'react'
import { 
  Check, 
  ArrowLeft,
  ArrowRight, 
  Building2, 
  Users,
  Zap,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  PLAN_CONFIG,
  type PlanId,
  type BillingInterval,
  type UpgradePromptContext,
  formatPrice,
} from '@/lib/billing-types'

// Source context for upgrade - determines the contextual message
export type UpgradeSource = 
  | 'dashboard_module'
  | 'trial_banner'
  | 'limit_hit'
  | 'settings_billing'
  | 'read_only_state'

interface PlanUpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: UpgradeSource
  limitContext?: UpgradePromptContext // When source is 'limit_hit'
  currentPlanId: PlanId
  trialDaysUsed?: number
  trialDaysTotal?: number
  userEmail?: string
  onUpgradeComplete?: (planId: PlanId, interval: BillingInterval) => void
}

// Contextual messages based on where the user came from
const sourceMessages: Record<UpgradeSource, (ctx: { trialDaysUsed?: number; limitContext?: UpgradePromptContext }) => string> = {
  dashboard_module: ({ trialDaysUsed }) => 
    `You're ${trialDaysUsed || 2} days into your trial. Pick a plan to keep going.`,
  trial_banner: () => 
    'Your trial is ending soon. Pick a plan to keep your data and continue using DOSI.AI.',
  limit_hit: ({ limitContext }) => {
    if (!limitContext) return 'You\'ve reached a limit. Pick a plan with more capacity.'
    switch (limitContext.reason) {
      case 'competitor_limit':
        return `You've hit your competitor cap (${limitContext.currentValue}/${limitContext.limitValue}). Pick a plan to track more competitors.`
      case 'topic_limit':
        return `You've hit your topic cap (${limitContext.currentValue}/${limitContext.limitValue}). Pick a plan to track more topics.`
      case 'battle_card_limit':
        return `You've hit your battle card cap (${limitContext.currentValue}/${limitContext.limitValue}). Pick a plan to create more.`
      case 'ai_cost_limit':
        return 'Your AI usage ceiling is reached. Pick a plan with a higher budget.'
      case 'seat_limit':
        return `All analyst seats are filled. Pick a plan to add more team members.`
      default:
        return 'You\'ve reached a limit. Pick a plan with more capacity.'
    }
  },
  settings_billing: () => 'Choose a plan.',
  read_only_state: () => 
    'Your trial has expired. Pick a plan to restore full access to your workspace.',
}

// Plan features to highlight (compact version for modal)
const planHighlights: Record<Exclude<PlanId, 'trial' | 'enterprise'>, string[]> = {
  starter: [
    '1 analyst seat',
    '5 competitors, 3 topics',
    'Daily intelligence sweeps',
    '5 battle cards',
  ],
  team: [
    '5 analyst seats',
    '15 competitors, 10 topics',
    'Configurable sweep cadence',
    'Slack & Teams notifications',
    'Unlimited AI briefs',
  ],
  business: [
    '15 analyst seats',
    '30 competitors, 25 topics',
    'Unlimited battle cards',
    'Custom branding',
    'API access',
  ],
}

// What the user gains by upgrading (based on their limit hit)
function getUpgradeUnlocks(planId: PlanId, limitContext?: UpgradePromptContext): string[] {
  const plan = PLAN_CONFIG[planId]
  const unlocks: string[] = []
  
  if (limitContext) {
    switch (limitContext.reason) {
      case 'competitor_limit':
        unlocks.push(`Track up to ${plan.limits.competitors} competitors instead of ${limitContext.limitValue}`)
        break
      case 'topic_limit':
        unlocks.push(`Monitor ${plan.limits.topics} topics instead of ${limitContext.limitValue}`)
        break
      case 'seat_limit':
        unlocks.push(`${plan.limits.analystSeats} analyst seats instead of ${limitContext.limitValue}`)
        break
      case 'ai_cost_limit':
        unlocks.push(`$${plan.limits.aiCostCeilingCents / 100}/month AI ceiling`)
        break
    }
  }
  
  // Add general unlocks
  if (planId === 'team' || planId === 'business') {
    unlocks.push('Slack & Teams notifications')
    unlocks.push('Unlimited AI-drafted briefs')
  }
  if (planId === 'business') {
    unlocks.push('Custom branding on share links')
    unlocks.push('API access')
  }
  
  return unlocks.slice(0, 5)
}

// Stripe error code to friendly message
const stripeErrorMessages: Record<string, string> = {
  card_declined: 'Your card was declined. Please try a different card or contact your bank.',
  insufficient_funds: 'Insufficient funds. Please try a different card.',
  expired_card: 'Your card has expired. Please use a different card.',
  incorrect_cvc: 'Incorrect CVC code. Please check and try again.',
  processing_error: 'A processing error occurred. Please try again.',
  default: 'Payment failed. Please try again or use a different card.',
}

type ModalStep = 'select' | 'confirm' | 'success'

export function PlanUpgradeModal({
  open,
  onOpenChange,
  source,
  limitContext,
  currentPlanId,
  trialDaysUsed = 2,
  trialDaysTotal = 14,
  userEmail = 'sarah@acmecorp.com',
  onUpgradeComplete,
}: PlanUpgradeModalProps) {
  const [step, setStep] = React.useState<ModalStep>('select')
  const [selectedPlan, setSelectedPlan] = React.useState<PlanId | null>(null)
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>('annual')
  const [email, setEmail] = React.useState(userEmail)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Card form state (mock)
  const [cardNumber, setCardNumber] = React.useState('')
  const [cardExpiry, setCardExpiry] = React.useState('')
  const [cardCvc, setCardCvc] = React.useState('')

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setStep('select')
      setSelectedPlan(null)
      setError(null)
      setIsProcessing(false)
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
    }
  }, [open])

  const contextMessage = sourceMessages[source]({ trialDaysUsed, limitContext })

  // Available plans for selection (exclude trial and enterprise from direct selection)
  const selectablePlans: PlanId[] = ['starter', 'team', 'business']

  // Calculate pricing
  const selectedPlanConfig = selectedPlan ? PLAN_CONFIG[selectedPlan] : null
  const price = selectedPlanConfig?.pricing
    ? billingInterval === 'annual' 
      ? selectedPlanConfig.pricing.annual 
      : selectedPlanConfig.pricing.monthly
    : 0
  const annualTotal = selectedPlanConfig?.pricing?.annualTotal || 0

  // Mock payment processing
  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock success (90% success rate for demo)
    if (Math.random() > 0.1) {
      setStep('success')
      onUpgradeComplete?.(selectedPlan!, billingInterval)
    } else {
      setError(stripeErrorMessages.card_declined)
    }
    
    setIsProcessing(false)
  }

  // Calculate next billing date
  const getNextBillingDate = () => {
    const date = new Date()
    if (billingInterval === 'annual') {
      date.setFullYear(date.getFullYear() + 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden">
        {/* Step 1: Plan Selection */}
        {step === 'select' && (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Upgrade your DOSI.AI plan</h2>
              <p className="text-sm text-muted-foreground mt-1">{contextMessage}</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button
                onClick={() => setBillingInterval('annual')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  billingInterval === 'annual'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Annual
                <span className="ml-1.5 text-xs opacity-80">save 20%</span>
              </button>
              <button
                onClick={() => setBillingInterval('monthly')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  billingInterval === 'monthly'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {selectablePlans.map((planId) => {
                const plan = PLAN_CONFIG[planId]
                const isSelected = selectedPlan === planId
                const isTrialLevel = planId === 'starter' && currentPlanId === 'trial'
                const highlights = planHighlights[planId as keyof typeof planHighlights]
                const priceValue = plan.pricing
                  ? billingInterval === 'annual' ? plan.pricing.annual : plan.pricing.monthly
                  : 0

                return (
                  <button
                    key={planId}
                    onClick={() => setSelectedPlan(planId)}
                    className={cn(
                      'relative text-left p-4 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      {plan.isPopular && (
                        <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                          Most popular
                        </Badge>
                      )}
                      {isTrialLevel && (
                        <Badge variant="outline" className="text-[10px]">
                          Your trial level
                        </Badge>
                      )}
                    </div>

                    {/* Plan name and price */}
                    <h3 className="font-semibold text-base">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1 mb-2">
                      <span className="text-2xl font-semibold font-mono">
                        {formatPrice(priceValue)}
                      </span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {plan.description}
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-1.5">
                      {highlights.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <Check className="size-3.5 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="size-5 rounded-full bg-accent flex items-center justify-center">
                          <Check className="size-3 text-accent-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Enterprise link */}
            <p className="text-center text-xs text-muted-foreground mb-6">
              Need something custom?{' '}
              <a 
                href="https://cal.com/dosi-ai/enterprise" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Talk to sales about Enterprise
              </a>
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedPlan}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Continue
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm and Pay */}
        {step === 'confirm' && selectedPlanConfig && (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Confirm your upgrade</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left: Summary */}
              <div className="space-y-4">
                {/* Plan summary card */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{selectedPlanConfig.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {billingInterval === 'annual' ? 'Annual billing' : 'Monthly billing'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold font-mono">
                        {formatPrice(price)}<span className="text-sm font-normal">/mo</span>
                      </div>
                      {billingInterval === 'annual' && (
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(annualTotal)}/year total
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* What you'll get */}
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    What you&apos;ll get on {selectedPlanConfig.name}
                  </h4>
                  <div className="space-y-2">
                    {getUpgradeUnlocks(selectedPlan!, limitContext).map((unlock, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>{unlock}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Payment form */}
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Card number */}
                <div className="space-y-2">
                  <Label htmlFor="card" className="text-sm">Card number</Label>
                  <div className="relative">
                    <Input
                      id="card"
                      placeholder="1234 1234 1234 1234"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="h-10 pr-10"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-sm">Expiry</Label>
                    <Input
                      id="expiry"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc" className="text-sm">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Prorated note */}
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be charged {formatPrice(billingInterval === 'annual' ? annualTotal : price)} today.
                  {billingInterval === 'annual' && ' Billed annually.'}
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t">
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing || !cardNumber || !cardExpiry || !cardCvc}
                className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm & pay'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && selectedPlanConfig && (
          <div className="p-8 text-center">
            {/* Success icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center mb-4">
              <Check className="size-8 text-positive" />
            </div>

            {/* Header */}
            <h2 className="text-2xl font-semibold mb-2">
              You&apos;re on {selectedPlanConfig.name}.
            </h2>
            <p className="text-muted-foreground mb-6">
              Your account is upgraded. Your next bill is {getNextBillingDate()} for{' '}
              {formatPrice(billingInterval === 'annual' ? annualTotal : price)}.
            </p>

            {/* Action */}
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Back to DOSI.AI
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Demo component for testing different states
export function PlanUpgradeModalDemo() {
  const [open, setOpen] = React.useState(false)
  const [source, setSource] = React.useState<UpgradeSource>('dashboard_module')

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Upgrade Modal Demo</h3>
      <div className="flex flex-wrap gap-2">
        {(['dashboard_module', 'trial_banner', 'limit_hit', 'settings_billing', 'read_only_state'] as UpgradeSource[]).map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            onClick={() => {
              setSource(s)
              setOpen(true)
            }}
          >
            {s.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      <PlanUpgradeModal
        open={open}
        onOpenChange={setOpen}
        source={source}
        currentPlanId="trial"
        trialDaysUsed={2}
        limitContext={source === 'limit_hit' ? {
          reason: 'competitor_limit',
          currentValue: 5,
          limitValue: 5,
          suggestedPlan: 'team',
        } : undefined}
        onUpgradeComplete={(planId, interval) => {
          console.log('[v0] Upgrade complete:', planId, interval)
        }}
      />
    </div>
  )
}
