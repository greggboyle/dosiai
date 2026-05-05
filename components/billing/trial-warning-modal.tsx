'use client'

import * as React from 'react'
import Link from 'next/link'
import { Clock, AlertTriangle, AlertCircle, Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { 
  type WorkspaceSubscription,
  PLAN_CONFIG,
} from '@/lib/billing-types'

// =============================================================================
// TRIAL WARNING MODAL
// =============================================================================
// Appears at T-7, T-3, T-1 thresholds
// Dismissible but tracked - "Remind me later" sets last_seen_warning flag

type WarningThreshold = 7 | 3 | 1

interface TrialUsageStats {
  competitorsAdded: number
  sweepsRun: number
  itemsReviewed: number
  briefsAuthored: number
  battleCardsCreated: number
}

type EngagementLevel = 'high' | 'medium' | 'low'

interface TrialWarningModalProps {
  subscription: WorkspaceSubscription
  usageStats: TrialUsageStats
  isOpen: boolean
  onDismiss: (threshold: WarningThreshold) => void
  onUpgrade: () => void
}

// Determine engagement level based on usage
function getEngagementLevel(stats: TrialUsageStats): EngagementLevel {
  const { competitorsAdded, sweepsRun, briefsAuthored } = stats
  
  if (competitorsAdded >= 5 && sweepsRun >= 4 && briefsAuthored >= 1) {
    return 'high'
  }
  if (competitorsAdded >= 2 && sweepsRun >= 2) {
    return 'medium'
  }
  return 'low'
}

// Get appropriate threshold based on days remaining
function getCurrentThreshold(daysRemaining: number): WarningThreshold | null {
  if (daysRemaining <= 1) return 1
  if (daysRemaining <= 3) return 3
  if (daysRemaining <= 7) return 7
  return null
}

// Configuration for each threshold
const THRESHOLD_CONFIG: Record<WarningThreshold, {
  icon: typeof Clock
  iconColor: string
  headline: string
}> = {
  7: {
    icon: Clock,
    iconColor: 'text-amber-600 dark:text-amber-500',
    headline: '7 days left in your trial',
  },
  3: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-500',
    headline: '3 days left in your trial',
  },
  1: {
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    headline: 'Your trial ends tomorrow',
  },
}

// Sub-headline based on engagement level and threshold
function getSubHeadline(engagement: EngagementLevel, threshold: WarningThreshold): string {
  if (threshold === 1) {
    return "Tomorrow your workspace transitions to read-only. Your data stays — you just won't be able to run new sweeps or invite users until you upgrade."
  }
  
  if (engagement === 'high') {
    return "You've gotten real value out of DOSI.AI. Upgrade now to keep automated sweeps and your trial data."
  }
  if (engagement === 'medium') {
    if (threshold === 3) {
      return "Your trial ends Friday. Upgrade to keep your work, or schedule a call with our team."
    }
    return "You're partway through evaluating. Upgrade to keep going, or extend your trial by talking to our team."
  }
  return "Trial ending soon. If you'd like more time to evaluate, our team is happy to extend it."
}

export function TrialWarningModal({
  subscription,
  usageStats,
  isOpen,
  onDismiss,
  onUpgrade,
}: TrialWarningModalProps) {
  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const threshold = getCurrentThreshold(daysRemaining)
  
  if (!threshold) {
    return null
  }

  const config = THRESHOLD_CONFIG[threshold]
  const engagement = getEngagementLevel(usageStats)
  const subHeadline = getSubHeadline(engagement, threshold)
  const Icon = config.icon
  
  const isLastDay = threshold === 1

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss(threshold)}>
      <DialogContent className="max-w-[560px] p-0 gap-0">
        {/* Icon */}
        <div className="flex justify-center pt-8 pb-4">
          <div className={cn(
            'size-14 rounded-full flex items-center justify-center',
            threshold === 1 
              ? 'bg-amber-500/20' 
              : 'bg-amber-600/15 dark:bg-amber-500/15'
          )}>
            <Icon className={cn('size-7', config.iconColor)} />
          </div>
        </div>

        <DialogHeader className="px-8 pb-4 space-y-3 text-center">
          <DialogTitle className="text-2xl font-semibold">
            {config.headline}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground leading-relaxed">
            {subHeadline}
          </DialogDescription>
        </DialogHeader>

        {/* Usage summary */}
        <div className="px-8 py-4 bg-muted/30 border-y">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            What you&apos;ve done in your trial
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <UsageLine 
              completed={usageStats.competitorsAdded > 0}
              text={`Added ${usageStats.competitorsAdded} competitor${usageStats.competitorsAdded !== 1 ? 's' : ''}`}
            />
            <UsageLine 
              completed={usageStats.sweepsRun > 0}
              text={`Ran ${usageStats.sweepsRun} sweep${usageStats.sweepsRun !== 1 ? 's' : ''}`}
            />
            <UsageLine 
              completed={usageStats.itemsReviewed > 0}
              text={`Reviewed ${usageStats.itemsReviewed} item${usageStats.itemsReviewed !== 1 ? 's' : ''}`}
            />
            <UsageLine 
              completed={usageStats.briefsAuthored > 0}
              text={`Authored ${usageStats.briefsAuthored} brief${usageStats.briefsAuthored !== 1 ? 's' : ''}`}
            />
            <UsageLine 
              completed={usageStats.battleCardsCreated > 0}
              text={`Created ${usageStats.battleCardsCreated} battle card${usageStats.battleCardsCreated !== 1 ? 's' : ''}`}
              isRecommended={usageStats.battleCardsCreated === 0}
            />
          </div>
        </div>

        {/* What happens next */}
        <div className="px-8 py-4">
          <h4 className="text-sm font-medium mb-2">What happens next</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            On expiration: your data stays. You&apos;ll be able to view everything but won&apos;t be able to run new sweeps, edit, or invite users until you upgrade.
          </p>
        </div>

        {/* Action buttons */}
        <div className="p-8 pt-4 space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={onUpgrade}
              className={cn(
                'flex-1 bg-accent text-accent-foreground hover:bg-accent/90',
                threshold <= 3 && 'animate-pulse [animation-duration:2s]'
              )}
            >
              Upgrade now
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="flex-1"
            >
              <Link href="/pricing" target="_blank" rel="noopener noreferrer">
                Compare plans
              </Link>
            </Button>
          </div>
          
          {/* Tertiary dismiss action */}
          <button
            onClick={() => onDismiss(threshold)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {isLastDay ? 'Continue to product' : 'Remind me later'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper component for usage lines
function UsageLine({ 
  completed, 
  text, 
  isRecommended = false 
}: { 
  completed: boolean
  text: string
  isRecommended?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <Check className="size-4 text-positive flex-shrink-0" />
      ) : (
        <Circle className="size-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={cn(!completed && 'text-muted-foreground')}>
        {text}
        {isRecommended && !completed && (
          <span className="text-accent ml-1">(try it!)</span>
        )}
      </span>
    </div>
  )
}

// =============================================================================
// HOOK: useTrialWarning
// =============================================================================
// Manages the modal state and tracking of seen warnings

interface UseTrialWarningOptions {
  subscription: WorkspaceSubscription
  usageStats: TrialUsageStats
}

interface TrialWarningState {
  seenThresholds: Set<WarningThreshold>
  lastSeenAt: string | null
}

export function useTrialWarning({ subscription, usageStats }: UseTrialWarningOptions) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [warningState, setWarningState] = React.useState<TrialWarningState>(() => {
    // In production, load from localStorage or API
    return {
      seenThresholds: new Set(),
      lastSeenAt: null,
    }
  })

  const daysRemaining = subscription.trialDaysRemaining ?? 0
  const currentThreshold = getCurrentThreshold(daysRemaining)

  // Show modal if we're at a threshold that hasn't been seen
  React.useEffect(() => {
    if (
      subscription.planId === 'trial' &&
      currentThreshold &&
      !warningState.seenThresholds.has(currentThreshold)
    ) {
      // Small delay to not interrupt page load
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [subscription.planId, currentThreshold, warningState.seenThresholds])

  const handleDismiss = React.useCallback((threshold: WarningThreshold) => {
    setWarningState(prev => ({
      seenThresholds: new Set([...prev.seenThresholds, threshold]),
      lastSeenAt: new Date().toISOString(),
    }))
    setIsOpen(false)
    // In production, persist to localStorage or API
  }, [])

  const handleUpgrade = React.useCallback(() => {
    // Navigate to pricing or open upgrade modal
    window.location.href = '/pricing'
  }, [])

  return {
    isOpen,
    handleDismiss,
    handleUpgrade,
    modalProps: {
      subscription,
      usageStats,
      isOpen,
      onDismiss: handleDismiss,
      onUpgrade: handleUpgrade,
    },
  }
}

// =============================================================================
// DEMO COMPONENT: TrialWarningDemo
// =============================================================================
// For testing the modal at different thresholds

interface TrialWarningDemoProps {
  threshold: WarningThreshold
  usageStats?: TrialUsageStats
}

export function TrialWarningDemo({ 
  threshold, 
  usageStats = {
    competitorsAdded: 4,
    sweepsRun: 6,
    itemsReviewed: 47,
    briefsAuthored: 0,
    battleCardsCreated: 0,
  }
}: TrialWarningDemoProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  const mockSubscription: WorkspaceSubscription = {
    planId: 'trial',
    status: 'active',
    billingInterval: null,
    currentPeriodStart: '2026-04-22T00:00:00Z',
    currentPeriodEnd: '2026-05-06T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: threshold <= 3 ? 'expiring_soon' : 'active',
    trialStartedAt: '2026-04-22T00:00:00Z',
    trialEndsAt: '2026-05-06T00:00:00Z',
    trialDaysRemaining: threshold,
    aiCostUsedCents: 1200,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 30,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Show T-{threshold} Warning Modal
      </Button>
      <TrialWarningModal
        subscription={mockSubscription}
        usageStats={usageStats}
        isOpen={isOpen}
        onDismiss={() => setIsOpen(false)}
        onUpgrade={() => {
          setIsOpen(false)
          window.location.href = '/pricing'
        }}
      />
    </>
  )
}
