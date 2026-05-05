'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Users,
  UserPlus,
  FileText,
  Swords,
  Check,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLAN_CONFIG, type PlanId, formatPrice } from '@/lib/billing-types'

// ============================================================================
// Types
// ============================================================================

export type LimitType = 'competitor' | 'seat' | 'brief' | 'battle_card'

export interface LimitHitContext {
  limitType: LimitType
  currentPlanId: PlanId
  currentValue: number
  limitValue: number
  // Optional context for specific variants
  attemptedName?: string // e.g., "Convoy" for competitor, "alex@example.com" for invite
  resetDate?: string // e.g., "April 1" for monthly limits
}

interface LimitHitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: LimitHitContext
  onUpgrade: () => void
  // Variant-specific callbacks
  onInviteAsViewer?: (email: string) => void // For seat limit variant
  onAuthorWithoutAI?: () => void // For brief limit variant
}

// ============================================================================
// Limit Configuration
// ============================================================================

interface LimitConfig {
  icon: typeof Users
  headline: string
  body: (ctx: LimitHitContext) => string
  upgradeFeatures: string[]
  note?: (ctx: LimitHitContext) => string | null
}

const limitConfigs: Record<LimitType, LimitConfig> = {
  competitor: {
    icon: Building2,
    headline: "You've reached your competitor limit.",
    body: (ctx) => {
      const planName = PLAN_CONFIG[ctx.currentPlanId].name
      return `Your ${planName} plan tracks up to ${ctx.limitValue} competitors. You're tracking ${ctx.currentValue}. Upgrade to Team to track up to 15 competitors plus segment variants on battle cards.`
    },
    upgradeFeatures: [
      'Track 15 competitors',
      '5 analyst seats instead of 1',
      'Slack lookup for battle cards',
    ],
    note: null,
  },
  seat: {
    icon: UserPlus,
    headline: "You've reached your analyst seat limit.",
    body: (ctx) => {
      const planName = PLAN_CONFIG[ctx.currentPlanId].name
      return `Your ${planName} plan includes ${ctx.limitValue} analyst seat${ctx.limitValue === 1 ? '' : 's'}. To add more analysts, upgrade to Team for 5 seats. Viewer seats stay free on every plan.`
    },
    upgradeFeatures: [
      '5 analyst seats',
      'Team collaboration features',
      'Shared battle card library',
    ],
    note: (ctx) => ctx.attemptedName 
      ? `Want to invite ${ctx.attemptedName} as a viewer instead?`
      : null,
  },
  brief: {
    icon: FileText,
    headline: "You've used 10 of 10 AI-drafted briefs this month.",
    body: (ctx) => {
      const planName = PLAN_CONFIG[ctx.currentPlanId].name
      return `Your ${planName} plan includes 10 AI-drafted briefs per month. Your limit resets on ${ctx.resetDate || 'the 1st'}. Upgrade to Team for unlimited briefs.`
    },
    upgradeFeatures: [
      'Unlimited AI-drafted briefs',
      'Multi-vendor consensus mode',
      'Advanced brief templates',
    ],
    note: () => 'You can still author briefs manually without using AI assist.',
  },
  battle_card: {
    icon: Swords,
    headline: "You've reached your battle card limit.",
    body: (ctx) => {
      const planName = PLAN_CONFIG[ctx.currentPlanId].name
      const nextLimit = ctx.currentPlanId === 'starter' ? 15 : 'unlimited'
      const nextPlan = ctx.currentPlanId === 'starter' ? 'Team' : 'Business'
      return `Your ${planName} plan includes up to ${ctx.limitValue} battle cards. Upgrade to ${nextPlan} for ${nextLimit === 'unlimited' ? 'unlimited' : nextLimit} battle cards.`
    },
    upgradeFeatures: [
      'Up to 15 battle cards (Team) or unlimited (Business)',
      'Segment-specific variants',
      'Slack lookup integration',
    ],
    note: null,
  },
}

// Get the suggested upgrade plan based on current plan and limit type
function getSuggestedPlan(currentPlanId: PlanId, limitType: LimitType): PlanId {
  if (currentPlanId === 'trial' || currentPlanId === 'starter') {
    return 'team'
  }
  if (currentPlanId === 'team') {
    return 'business'
  }
  return 'enterprise'
}

// ============================================================================
// Main Component
// ============================================================================

export function LimitHitPrompt({
  open,
  onOpenChange,
  context,
  onUpgrade,
  onInviteAsViewer,
  onAuthorWithoutAI,
}: LimitHitPromptProps) {
  const config = limitConfigs[context.limitType]
  const Icon = config.icon
  const suggestedPlanId = getSuggestedPlan(context.currentPlanId, context.limitType)
  const suggestedPlan = PLAN_CONFIG[suggestedPlanId]
  const note = config.note ? config.note(context) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pb-0">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <Icon className="size-6 text-accent" />
            </div>
          </div>
          
          {/* Headline */}
          <DialogTitle className="text-xl font-semibold text-center">
            {config.headline}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Body text */}
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {config.body(context)}
          </p>

          {/* Feature list */}
          <div className="rounded-lg border bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              What you get with {suggestedPlan.name}
            </p>
            <div className="space-y-2.5">
              {config.upgradeFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm">
                  <Check className="size-4 text-accent flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Note (if applicable) */}
          {note && (
            <p className="text-sm text-muted-foreground text-center italic">
              {note}
            </p>
          )}

          {/* Action row */}
          <div className="flex flex-col gap-2 pt-2">
            {/* Primary: Upgrade */}
            <Button 
              onClick={onUpgrade}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Upgrade to {suggestedPlan.name}
              {suggestedPlan.pricing && (
                <span className="ml-1 text-accent-foreground/80">
                  — {formatPrice(suggestedPlan.pricing.annual)}/mo
                </span>
              )}
            </Button>

            {/* Secondary: Variant-specific action */}
            {context.limitType === 'seat' && onInviteAsViewer && context.attemptedName && (
              <Button 
                variant="outline"
                onClick={() => {
                  onInviteAsViewer(context.attemptedName!)
                  onOpenChange(false)
                }}
                className="w-full"
              >
                Invite as viewer instead
              </Button>
            )}

            {context.limitType === 'brief' && onAuthorWithoutAI && (
              <Button 
                variant="outline"
                onClick={() => {
                  onAuthorWithoutAI()
                  onOpenChange(false)
                }}
                className="w-full"
              >
                Author without AI
              </Button>
            )}

            {/* Tertiary: Dismiss */}
            <Button 
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Pre-built Variant Components
// ============================================================================

interface CompetitorLimitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: PlanId
  competitorCount: number
  competitorLimit: number
  attemptedCompetitorName?: string
  onUpgrade: () => void
}

export function CompetitorLimitPrompt({
  open,
  onOpenChange,
  currentPlanId,
  competitorCount,
  competitorLimit,
  attemptedCompetitorName,
  onUpgrade,
}: CompetitorLimitPromptProps) {
  return (
    <LimitHitPrompt
      open={open}
      onOpenChange={onOpenChange}
      context={{
        limitType: 'competitor',
        currentPlanId,
        currentValue: competitorCount,
        limitValue: competitorLimit,
        attemptedName: attemptedCompetitorName,
      }}
      onUpgrade={onUpgrade}
    />
  )
}

interface SeatLimitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: PlanId
  seatCount: number
  seatLimit: number
  attemptedEmail?: string
  onUpgrade: () => void
  onInviteAsViewer?: (email: string) => void
}

export function SeatLimitPrompt({
  open,
  onOpenChange,
  currentPlanId,
  seatCount,
  seatLimit,
  attemptedEmail,
  onUpgrade,
  onInviteAsViewer,
}: SeatLimitPromptProps) {
  return (
    <LimitHitPrompt
      open={open}
      onOpenChange={onOpenChange}
      context={{
        limitType: 'seat',
        currentPlanId,
        currentValue: seatCount,
        limitValue: seatLimit,
        attemptedName: attemptedEmail,
      }}
      onUpgrade={onUpgrade}
      onInviteAsViewer={onInviteAsViewer}
    />
  )
}

interface BriefLimitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: PlanId
  briefsUsed: number
  briefLimit: number
  resetDate?: string
  onUpgrade: () => void
  onAuthorWithoutAI?: () => void
}

export function BriefLimitPrompt({
  open,
  onOpenChange,
  currentPlanId,
  briefsUsed,
  briefLimit,
  resetDate,
  onUpgrade,
  onAuthorWithoutAI,
}: BriefLimitPromptProps) {
  return (
    <LimitHitPrompt
      open={open}
      onOpenChange={onOpenChange}
      context={{
        limitType: 'brief',
        currentPlanId,
        currentValue: briefsUsed,
        limitValue: briefLimit,
        resetDate,
      }}
      onUpgrade={onUpgrade}
      onAuthorWithoutAI={onAuthorWithoutAI}
    />
  )
}

interface BattleCardLimitPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: PlanId
  battleCardCount: number
  battleCardLimit: number
  onUpgrade: () => void
}

export function BattleCardLimitPrompt({
  open,
  onOpenChange,
  currentPlanId,
  battleCardCount,
  battleCardLimit,
  onUpgrade,
}: BattleCardLimitPromptProps) {
  return (
    <LimitHitPrompt
      open={open}
      onOpenChange={onOpenChange}
      context={{
        limitType: 'battle_card',
        currentPlanId,
        currentValue: battleCardCount,
        limitValue: battleCardLimit,
      }}
      onUpgrade={onUpgrade}
    />
  )
}

// ============================================================================
// Demo Component
// ============================================================================

export function LimitHitPromptsDemo() {
  const [variant, setVariant] = React.useState<LimitType | null>(null)

  const demoContexts: Record<LimitType, LimitHitContext> = {
    competitor: {
      limitType: 'competitor',
      currentPlanId: 'starter',
      currentValue: 5,
      limitValue: 5,
      attemptedName: 'Convoy',
    },
    seat: {
      limitType: 'seat',
      currentPlanId: 'starter',
      currentValue: 1,
      limitValue: 1,
      attemptedName: 'alex@example.com',
    },
    brief: {
      limitType: 'brief',
      currentPlanId: 'starter',
      currentValue: 10,
      limitValue: 10,
      resetDate: 'April 1',
    },
    battle_card: {
      limitType: 'battle_card',
      currentPlanId: 'starter',
      currentValue: 5,
      limitValue: 5,
    },
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Limit Hit Prompts Demo</h2>
      <p className="text-sm text-muted-foreground">
        Click a button to see the contextual upgrade prompt for each limit type.
      </p>
      
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setVariant('competitor')}>
          <Building2 className="size-4 mr-2" />
          Competitor Limit (5/5)
        </Button>
        <Button variant="outline" onClick={() => setVariant('seat')}>
          <UserPlus className="size-4 mr-2" />
          Seat Limit (1/1)
        </Button>
        <Button variant="outline" onClick={() => setVariant('brief')}>
          <FileText className="size-4 mr-2" />
          Brief Limit (10/10)
        </Button>
        <Button variant="outline" onClick={() => setVariant('battle_card')}>
          <Swords className="size-4 mr-2" />
          Battle Card Limit (5/5)
        </Button>
      </div>

      {variant && (
        <LimitHitPrompt
          open={true}
          onOpenChange={(open) => !open && setVariant(null)}
          context={demoContexts[variant]}
          onUpgrade={() => {
            console.log('[v0] Upgrade clicked for:', variant)
            setVariant(null)
          }}
          onInviteAsViewer={(email) => {
            console.log('[v0] Invite as viewer:', email)
          }}
          onAuthorWithoutAI={() => {
            console.log('[v0] Author without AI clicked')
          }}
        />
      )}
    </div>
  )
}
