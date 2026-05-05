'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Check, 
  ArrowRight, 
  Lock, 
  Users, 
  Building2, 
  Zap,
  FileText,
  Hash,
  Swords,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PLAN_CONFIG,
  type PlanId,
  type UpgradePromptReason,
  type UpgradePromptContext,
  formatPrice,
} from '@/lib/billing-types'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: UpgradePromptContext
  currentPlanId: PlanId
}

const reasonConfig: Record<UpgradePromptReason, {
  title: string
  description: (ctx: UpgradePromptContext) => string
  icon: typeof Lock
}> = {
  trial_expiring: {
    title: 'Your trial is ending soon',
    description: (ctx) => `You have ${ctx.currentValue} days left. Upgrade to keep all your data and continue using DOSI.AI.`,
    icon: Lock,
  },
  trial_expired: {
    title: 'Your trial has ended',
    description: () => 'Your workspace is now read-only. Upgrade to continue creating sweeps, briefs, and battle cards.',
    icon: Lock,
  },
  competitor_limit: {
    title: 'Competitor limit reached',
    description: (ctx) => `You're tracking ${ctx.currentValue} of ${ctx.limitValue} competitors. Upgrade for more.`,
    icon: Building2,
  },
  topic_limit: {
    title: 'Topic limit reached',
    description: (ctx) => `You have ${ctx.currentValue} of ${ctx.limitValue} topics. Upgrade to track more.`,
    icon: Hash,
  },
  battle_card_limit: {
    title: 'Battle card limit reached',
    description: (ctx) => `You've created ${ctx.currentValue} of ${ctx.limitValue} battle cards. Upgrade for more.`,
    icon: Swords,
  },
  ai_brief_limit: {
    title: 'AI brief limit reached',
    description: (ctx) => `You've used ${ctx.currentValue} of ${ctx.limitValue} AI-drafted briefs this month.`,
    icon: FileText,
  },
  ai_cost_limit: {
    title: 'AI usage limit reached',
    description: () => 'Your monthly AI budget is exhausted. Upgrade for a higher ceiling.',
    icon: Zap,
  },
  seat_limit: {
    title: 'Analyst seat limit reached',
    description: (ctx) => `All ${ctx.limitValue} analyst seats are in use. Upgrade to add more team members.`,
    icon: Users,
  },
  feature_locked: {
    title: 'Feature not available',
    description: (ctx) => `${ctx.featureName || 'This feature'} requires a higher plan.`,
    icon: Lock,
  },
}

export function UpgradeModal({ open, onOpenChange, context, currentPlanId }: UpgradeModalProps) {
  const config = reasonConfig[context.reason]
  const suggestedPlan = PLAN_CONFIG[context.suggestedPlan]
  const Icon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Icon className="size-5 text-accent" />
            </div>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>
            {config.description(context)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Suggested plan */}
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Badge className="bg-accent text-accent-foreground border-0 mb-2">
                  Recommended
                </Badge>
                <h4 className="font-semibold">{suggestedPlan.name}</h4>
                <p className="text-sm text-muted-foreground">{suggestedPlan.description}</p>
              </div>
            </div>
            
            {suggestedPlan.pricing && (
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-semibold">
                  {formatPrice(suggestedPlan.pricing.annual)}
                </span>
                <span className="text-muted-foreground">/mo billed annually</span>
              </div>
            )}

            <div className="space-y-2">
              {suggestedPlan.features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-accent flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button 
              asChild 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/pricing">
                View All Plans
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Inline limit prompt for in-context upgrade suggestions
interface LimitPromptProps {
  context: UpgradePromptContext
  className?: string
}

export function LimitPrompt({ context, className }: LimitPromptProps) {
  const config = reasonConfig[context.reason]
  const suggestedPlan = PLAN_CONFIG[context.suggestedPlan]
  const Icon = config.icon

  return (
    <div className={cn(
      'rounded-lg border border-accent/20 bg-accent/5 p-4',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded bg-accent/10 flex-shrink-0">
          <Icon className="size-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">{config.title}</p>
          <p className="text-sm text-muted-foreground mb-3">
            {config.description(context)}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/pricing">
                Upgrade to {suggestedPlan.name}
              </Link>
            </Button>
            {suggestedPlan.pricing && (
              <span className="text-xs text-muted-foreground">
                from {formatPrice(suggestedPlan.pricing.annual)}/mo
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Read-only overlay for expired trials
interface ReadOnlyOverlayProps {
  isExpired: boolean
  children: React.ReactNode
}

export function ReadOnlyOverlay({ isExpired, children }: ReadOnlyOverlayProps) {
  if (!isExpired) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px] rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
            <Lock className="size-6 text-destructive" />
          </div>
          <h3 className="font-semibold mb-2">Read-only mode</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your trial has ended. Upgrade to edit content and run sweeps.
          </p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/pricing">
              View Plans
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
