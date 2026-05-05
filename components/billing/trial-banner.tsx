'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles, Check, Circle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  type WorkspaceSubscription,
  PLAN_CONFIG,
} from '@/lib/billing-types'

// =============================================================================
// A) TRIAL BANNER - Top of every authenticated page
// =============================================================================
// Persistent thin banner (36px) between top bar and main content
// Not dismissible - this is the most important conversion signal

interface TrialBannerProps {
  subscription: WorkspaceSubscription
  className?: string
}

export function TrialBanner({ subscription, className }: TrialBannerProps) {
  if (subscription.planId !== 'trial') {
    return null
  }

  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const trialStatus = subscription.trialStatus ?? 'active'
  
  // Determine banner style based on urgency
  const getBannerConfig = () => {
    if (trialStatus === 'expired' || daysRemaining === 0) {
      // Grace period - trial expired but not yet read-only
      return {
        bgClass: 'bg-amber-500/30 border-amber-500/40',
        badgeClass: 'bg-amber-600 text-white',
        message: 'Your trial has ended — upgrade now to keep automated sweeps and your trial data.',
        showPulse: true,
      }
    }
    if (daysRemaining <= 3) {
      // Urgent - 3 days or fewer
      return {
        bgClass: 'bg-accent/20 border-accent/30',
        badgeClass: 'bg-accent text-accent-foreground',
        message: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left — upgrade now to keep automated sweeps and your trial data.`,
        showPulse: true,
      }
    }
    // Normal trial state
    return {
      bgClass: 'bg-accent/10 border-accent/20',
      badgeClass: 'bg-accent text-accent-foreground',
      message: `${daysRemaining} days left in your DOSI.AI trial. Upgrade anytime to keep your data and unlock automated sweeps.`,
      showPulse: false,
    }
  }

  const config = getBannerConfig()

  return (
    <div 
      className={cn(
        'h-9 flex items-center justify-between px-4 border-b',
        config.bgClass,
        className
      )}
    >
      {/* Left content */}
      <div className="flex items-center gap-3">
        <span className={cn(
          'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
          config.badgeClass
        )}>
          Trial
        </span>
        <p className="text-sm">
          <span className="font-mono font-medium">{daysRemaining}</span>
          <span className="text-muted-foreground"> {config.message.replace(/^\d+ day[s]? /, '')}</span>
        </p>
      </div>
      
      {/* Right content */}
      <div className="flex items-center gap-3">
        <Link 
          href="/pricing" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          See plans
        </Link>
        <Button 
          asChild 
          size="sm" 
          className={cn(
            'h-7 px-3 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90',
            config.showPulse && 'animate-pulse [animation-duration:2s]'
          )}
        >
          <Link href="/pricing">Upgrade</Link>
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// B) SIDEBAR TRIAL PILL - Compact indicator in sidebar
// =============================================================================
// Full-width compact card above workspace switcher

interface SidebarTrialCardProps {
  subscription: WorkspaceSubscription
  collapsed?: boolean
  className?: string
}

export function SidebarTrialCard({ subscription, collapsed, className }: SidebarTrialCardProps) {
  if (subscription.planId !== 'trial') {
    return null
  }

  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const trialDurationDays = 14
  const daysUsed = trialDurationDays - daysRemaining
  const progressPercent = Math.min(100, (daysUsed / trialDurationDays) * 100)
  const isUrgent = daysRemaining <= 3

  if (collapsed) {
    // Show just a dot when sidebar is collapsed
    return (
      <div 
        className={cn(
          'size-2 rounded-full',
          isUrgent ? 'bg-amber-500' : 'bg-accent',
          className
        )}
        title={`${daysRemaining} days left in trial`}
      />
    )
  }

  return (
    <div className={cn(
      'mx-2 mb-2 p-3 rounded-lg border',
      isUrgent 
        ? 'bg-amber-500/10 border-amber-500/20' 
        : 'bg-accent/10 border-accent/20',
      className
    )}>
      {/* TRIAL label */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Trial
      </p>
      
      {/* Days remaining */}
      <p className="text-sm font-medium mb-2">
        <span className="font-mono">{daysUsed}</span> of <span className="font-mono">{trialDurationDays}</span> days
      </p>
      
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isUrgent ? 'bg-amber-500' : 'bg-accent'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Upgrade button */}
      <Button 
        asChild 
        size="sm"
        variant={isUrgent ? 'default' : 'outline'}
        className={cn(
          'w-full h-8',
          isUrgent 
            ? 'bg-accent text-accent-foreground hover:bg-accent/90'
            : 'border-accent/30 text-accent hover:bg-accent/10'
        )}
      >
        <Link href="/pricing">Upgrade</Link>
      </Button>
    </div>
  )
}

// Keep the simple pill for use in header
interface TrialPillProps {
  subscription: WorkspaceSubscription
  collapsed?: boolean
  className?: string
}

export function TrialPill({ subscription, collapsed, className }: TrialPillProps) {
  if (subscription.planId !== 'trial') {
    return null
  }

  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const isUrgent = daysRemaining <= 3

  if (collapsed) {
    return (
      <div 
        className={cn(
          'size-2 rounded-full',
          isUrgent ? 'bg-amber-500' : 'bg-accent',
          className
        )}
        title={`${daysRemaining} days left`}
      />
    )
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
      isUrgent 
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
        : 'bg-accent/15 text-accent',
      className
    )}>
      <span className={cn('size-1.5 rounded-full', isUrgent ? 'bg-amber-500' : 'bg-accent')} />
      {daysRemaining}d
    </span>
  )
}

// =============================================================================
// C) DASHBOARD TRIAL MODULE - Full-width row at top of dashboard
// =============================================================================
// 3 columns: trial status, value delivered, CTAs

interface TrialDashboardModuleProps {
  subscription: WorkspaceSubscription
  // Activity stats for "What you've done so far"
  competitorsAdded?: number
  sweepsRun?: number
  itemsReviewed?: number
  hasBattleCard?: boolean
  className?: string
}

export function TrialDashboardModule({ 
  subscription, 
  competitorsAdded = 4,
  sweepsRun = 6,
  itemsReviewed = 47,
  hasBattleCard = false,
  className 
}: TrialDashboardModuleProps) {
  if (subscription.planId !== 'trial') {
    return null
  }

  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const trialDurationDays = 14
  const daysUsed = trialDurationDays - daysRemaining
  const trialStatus = subscription.trialStatus ?? 'active'
  const starterPlan = PLAN_CONFIG.starter

  // Don't show if trial expired (workspace transitions to read-only)
  if (trialStatus === 'expired') {
    return null
  }

  const starterPrice = starterPlan.pricing ? `$${starterPlan.pricing.annual / 100}/mo` : '$79/mo'

  return (
    <div className={cn(
      'rounded-lg border border-accent/20 bg-accent/5 p-5',
      className
    )}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_0.75fr_0.75fr] gap-6">
        {/* Left column - Trial status (~40%) */}
        <div>
          <h3 className="text-lg font-medium">
            You&apos;re {daysUsed} day{daysUsed === 1 ? '' : 's'} into your DOSI.AI trial
          </h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            <span className="font-mono font-medium text-foreground">{daysRemaining}</span> days left to evaluate. 
            After your trial, you can keep using DOSI.AI on the Starter plan ({starterPrice} annual) 
            or upgrade to a higher tier.
          </p>
        </div>

        {/* Middle column - What you've done (~30%) */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            What you&apos;ve done so far
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-positive flex-shrink-0" />
              <span>Added {competitorsAdded} competitors</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-positive flex-shrink-0" />
              <span>Ran {sweepsRun} sweeps</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-positive flex-shrink-0" />
              <span>Reviewed {itemsReviewed} intelligence items</span>
            </li>
            <li className="flex items-center gap-2">
              {hasBattleCard ? (
                <Check className="size-4 text-positive flex-shrink-0" />
              ) : (
                <Circle className="size-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(!hasBattleCard && 'text-muted-foreground')}>
                Try a battle card {!hasBattleCard && <span className="text-accent">(recommended)</span>}
              </span>
            </li>
          </ul>
        </div>

        {/* Right column - CTAs (~30%) */}
        <div className="flex flex-col justify-center gap-3">
          <Button 
            asChild 
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Link href="/pricing">Upgrade now</Link>
          </Button>
          <Button 
            asChild 
            variant="outline"
            className="border-accent/30"
          >
            <Link href="/pricing" target="_blank" rel="noopener noreferrer">
              Compare plans
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
