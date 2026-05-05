'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, X, Zap, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { type AIUsageState, type WorkspaceSubscription, formatPrice, PLAN_CONFIG } from '@/lib/billing-types'

// ============================================================================
// A) AI Cost Ceiling Indicator (passive, for settings -> billing)
// ============================================================================

interface AICostCeilingIndicatorProps {
  usage: AIUsageState
  className?: string
}

/**
 * Small horizontal bar with label showing AI cost utilization.
 * Label: "AI usage this month: $84 of $200" (14px regular, monospaced numerals)
 * Bar: 8px tall, full-width, neutral background with colored fill
 * 
 * Color thresholds:
 * - 0–60%: deep amber accent
 * - 60–80%: warmer amber (slightly more saturated)
 * - 80–100%: warning amber (bg-amber-500)
 * - At 100%: "At limit" badge appears
 */
export function AICostCeilingIndicator({ usage, className }: AICostCeilingIndicatorProps) {
  const percent = Math.min(usage.percentUsed, 100)
  
  // Determine bar color based on threshold
  const getBarColor = () => {
    if (percent >= 80) return 'bg-amber-500' // Warning amber
    if (percent >= 60) return 'bg-amber-400' // Warmer amber
    return 'bg-accent' // Deep amber accent (default)
  }

  const tooltipText = `Each plan includes a monthly AI usage ceiling to keep our pricing predictable. Most workspaces never hit this. If you're approaching the limit, contact support — we can usually raise it for legitimate use.`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('space-y-2', className)}>
            {/* Label row */}
            <div className="flex items-center justify-between">
              <span className="text-sm">
                AI usage this month:{' '}
                <span className="font-mono tabular-nums">
                  {formatPrice(usage.currentMonthCents)}
                </span>
                {' '}of{' '}
                <span className="font-mono tabular-nums">
                  {formatPrice(usage.ceilingCents)}
                </span>
              </span>
              
              {/* At limit badge */}
              {usage.isAtHardLimit && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                  At limit
                </Badge>
              )}
            </div>
            
            {/* Progress bar - 8px tall */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={cn('h-full rounded-full transition-all duration-300', getBarColor())}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <p className="text-sm leading-relaxed">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// B) Over-Limit Modal (appears when a sweep is rejected)
// ============================================================================

interface OverLimitModalProps {
  subscription: WorkspaceSubscription
  usage: AIUsageState
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

/**
 * Modal that appears when a sweep is rejected due to hitting AI cost ceiling.
 * Explains the situation, offers upgrade path or support contact.
 */
export function OverLimitModal({ 
  subscription, 
  usage, 
  isOpen, 
  onClose,
  onUpgrade,
}: OverLimitModalProps) {
  const planConfig = PLAN_CONFIG[subscription.planId]
  const planName = planConfig?.name || 'Current'
  
  // Calculate days until reset
  const daysUntilReset = React.useMemo(() => {
    const now = new Date()
    const resetDate = new Date(usage.nextResetDate)
    const diffMs = resetDate.getTime() - now.getTime()
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }, [usage.nextResetDate])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 size-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="size-6 text-amber-500" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            You&apos;ve reached your monthly AI usage limit.
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Explanation */}
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            You&apos;ve used {formatPrice(usage.currentMonthCents)} of your {formatPrice(usage.ceilingCents)} monthly ceiling on the {planName} plan. New sweeps will resume on {usage.nextResetDate} when your usage resets. Your existing data, briefs, and battle cards are unaffected.
          </DialogDescription>

          {/* Options section */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Need more usage now?</p>
            
            {/* Upgrade option */}
            <div className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="font-medium text-sm">
                    Upgrade to Business ({formatPrice(82400)}/month annual)
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li className="flex items-center gap-1.5">
                      <Zap className="size-3 text-accent" />
                      <span>$700/month AI ceiling (3.5× more)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Zap className="size-3 text-accent" />
                      <span>Twice-daily sweeps</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Zap className="size-3 text-accent" />
                      <span>Multi-vendor mode</span>
                    </li>
                  </ul>
                </div>
                <Button size="sm" onClick={onUpgrade}>
                  Upgrade now
                </Button>
              </div>
            </div>

            {/* Support option */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Talk to support</p>
                  <p className="text-xs text-muted-foreground">
                    For legitimate higher-than-ceiling usage, we can often accommodate.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@dosi.ai">
                    <Mail className="size-3.5 mr-1.5" />
                    Contact
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-center">
          <Button variant="ghost" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Banner version (persistent until next billing cycle)
// ============================================================================

interface AILimitBannerProps {
  usage: AIUsageState
  onUpgrade?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Persistent banner at top of every page for workspaces that hit AI ceiling.
 * Dismissible with close button, but reappears next session if still over-limit.
 */
export function AILimitBanner({ usage, onUpgrade, onDismiss, className }: AILimitBannerProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!usage.isAtHardLimit || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5',
        'bg-amber-500/10 border-b border-amber-500/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="size-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">AI usage at limit.</span>
          {' '}Sweeps resume {usage.nextResetDate}.
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-500/10"
          onClick={onUpgrade}
        >
          Upgrade now
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href="mailto:support@dosi.ai">Contact support</a>
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Soft limit warning (80%) - existing component updated
// ============================================================================

interface AISoftLimitWarningProps {
  usage: AIUsageState
  onDismiss?: () => void
  className?: string
}

export function AISoftLimitWarning({ usage, onDismiss, className }: AISoftLimitWarningProps) {
  const [dismissed, setDismissed] = React.useState(false)

  if (!usage.isAtSoftLimit || usage.isAtHardLimit || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2.5 border rounded-lg',
        'bg-amber-500/5 border-amber-500/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="size-4 text-amber-500 flex-shrink-0" />
        <p className="text-sm">
          You&apos;ve used <span className="font-mono tabular-nums">{usage.percentUsed}%</span> of your monthly AI budget (
          <span className="font-mono tabular-nums">{formatPrice(usage.currentMonthCents)}</span> of{' '}
          <span className="font-mono tabular-nums">{formatPrice(usage.ceilingCents)}</span>).
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
          <Link href="/pricing">
            View Plans
          </Link>
        </Button>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Compact indicator for sidebar (existing, simplified)
// ============================================================================

interface AIUsageIndicatorProps {
  usage: AIUsageState
  compact?: boolean
  className?: string
}

export function AIUsageIndicator({ usage, compact, className }: AIUsageIndicatorProps) {
  const percent = Math.min(usage.percentUsed, 100)
  
  const getStatusConfig = () => {
    if (usage.isAtHardLimit) {
      return {
        label: 'AI limit reached',
        color: 'text-amber-600',
        bgColor: 'bg-amber-500/10',
      }
    }
    if (usage.isAtSoftLimit) {
      return {
        label: `${percent}% of AI budget`,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      }
    }
    return {
      label: `${percent}% of AI budget`,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    }
  }

  const config = getStatusConfig()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings/billing"
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                config.bgColor,
                config.color,
                className
              )}
            >
              <Zap className="size-3" />
              <span className="tabular-nums">{percent}%</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(usage.currentMonthCents)} of {formatPrice(usage.ceilingCents)} used this month
              </p>
              {usage.isAtHardLimit && (
                <p className="text-xs text-amber-600">
                  New sweeps are paused until next billing cycle
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full version uses the AICostCeilingIndicator
  return <AICostCeilingIndicator usage={usage} className={className} />
}

// ============================================================================
// Demo component for testing
// ============================================================================

export function AIUsageDemo() {
  const [showModal, setShowModal] = React.useState(false)
  
  // Realistic seed data: Team workspace, $200 of $200 used, 4 days until reset
  const mockUsage: AIUsageState = {
    currentMonthCents: 20000, // $200
    ceilingCents: 20000, // $200 ceiling
    percentUsed: 100,
    isAtSoftLimit: false,
    isAtHardLimit: true,
    nextResetDate: 'April 1',
  }

  const mockSubscription: WorkspaceSubscription = {
    planId: 'team',
    status: 'active',
    billingInterval: 'annual',
    currentPeriodStart: '2026-03-01T00:00:00Z',
    currentPeriodEnd: '2026-04-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    aiCostUsedCents: 20000,
    aiCostCeilingCents: 20000,
    aiCostPercentUsed: 100,
    analystSeatsUsed: 3,
    analystSeatsLimit: 5,
  }

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-lg font-semibold">AI Usage Demo</h2>
      
      {/* Banner */}
      <div>
        <h3 className="text-sm font-medium mb-2">Banner (at limit)</h3>
        <AILimitBanner 
          usage={mockUsage} 
          onUpgrade={() => setShowModal(true)}
        />
      </div>

      {/* Indicator at various states */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Indicator States</h3>
        
        <div className="space-y-3 max-w-md">
          <div>
            <p className="text-xs text-muted-foreground mb-1">40% usage (normal)</p>
            <AICostCeilingIndicator 
              usage={{ ...mockUsage, currentMonthCents: 8000, percentUsed: 40, isAtHardLimit: false }} 
            />
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">70% usage (warmer)</p>
            <AICostCeilingIndicator 
              usage={{ ...mockUsage, currentMonthCents: 14000, percentUsed: 70, isAtHardLimit: false }} 
            />
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">90% usage (warning)</p>
            <AICostCeilingIndicator 
              usage={{ ...mockUsage, currentMonthCents: 18000, percentUsed: 90, isAtSoftLimit: true, isAtHardLimit: false }} 
            />
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">100% usage (at limit)</p>
            <AICostCeilingIndicator usage={mockUsage} />
          </div>
        </div>
      </div>

      {/* Trigger modal button */}
      <Button onClick={() => setShowModal(true)}>
        Show Over-Limit Modal
      </Button>

      {/* Modal */}
      <OverLimitModal
        subscription={mockSubscription}
        usage={mockUsage}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUpgrade={() => {
          setShowModal(false)
          window.location.href = '/pricing'
        }}
      />
    </div>
  )
}
