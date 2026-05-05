'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Lock, 
  Check,
  Building2,
  Radar,
  FileText,
  Swords,
  Eye,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WorkspaceSubscription, TrialUsageStats } from '@/lib/billing-types'
import { getDaysExpired, getDaysUntilDeletion } from '@/lib/billing-types'

// ============================================================================
// READ-ONLY BANNER - 80px tall takeover at top of every page
// ============================================================================

interface ReadOnlyBannerProps {
  subscription: WorkspaceSubscription
}

export function ReadOnlyBanner({ subscription }: ReadOnlyBannerProps) {
  // Only show for read_only status
  if (subscription.status !== 'read_only') {
    return null
  }

  const daysExpired = subscription.trialEndsAt 
    ? getDaysExpired(subscription.trialEndsAt) 
    : 0
  
  const isGracePeriod = subscription.gracePeriodEndsAt && 
    getDaysUntilDeletion(subscription.gracePeriodEndsAt) <= 30
  
  const daysUntilDeletion = subscription.gracePeriodEndsAt
    ? getDaysUntilDeletion(subscription.gracePeriodEndsAt)
    : null

  return (
    <div className="h-20 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-center px-6">
      <div className="flex items-center justify-between w-full max-w-5xl">
        {/* Left side - Lock icon and messaging */}
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Lock className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isGracePeriod 
                ? `Your data will be deleted in ${daysUntilDeletion} days`
                : 'Your DOSI.AI trial has expired.'
              }
            </h2>
            <p className="text-sm text-muted-foreground">
              {isGracePeriod
                ? 'Upgrade now to preserve your competitive intelligence.'
                : 'Your data is preserved. Upgrade to a paid plan to resume sweeps, invite users, and edit content.'
              }
            </p>
          </div>
        </div>

        {/* Right side - CTAs */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            asChild
            className="border-amber-500/30 hover:bg-amber-500/10"
          >
            <Link href="/pricing">Compare plans</Link>
          </Button>
          <Button 
            asChild
            className={cn(
              'bg-amber-500 text-white hover:bg-amber-600',
              isGracePeriod && 'animate-pulse'
            )}
          >
            <Link href="/pricing">Upgrade now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// READ-ONLY DASHBOARD MODULE - Replaces trial module when expired
// ============================================================================

interface ReadOnlyDashboardModuleProps {
  subscription: WorkspaceSubscription
  usageStats: TrialUsageStats
  className?: string
}

export function ReadOnlyDashboardModule({ 
  subscription, 
  usageStats,
  className 
}: ReadOnlyDashboardModuleProps) {
  // Only show for read_only status
  if (subscription.status !== 'read_only') {
    return null
  }

  const daysExpired = subscription.trialEndsAt 
    ? getDaysExpired(subscription.trialEndsAt) 
    : 0
  
  const isGracePeriod = subscription.gracePeriodEndsAt && 
    getDaysUntilDeletion(subscription.gracePeriodEndsAt) <= 30
  
  const daysUntilDeletion = subscription.gracePeriodEndsAt
    ? getDaysUntilDeletion(subscription.gracePeriodEndsAt)
    : null

  return (
    <div className={cn(
      'rounded-xl border border-amber-500/30 bg-amber-500/10 p-6',
      className
    )}>
      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        {/* Left column - 40% - Welcome back message */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-center gap-2">
            {isGracePeriod ? (
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Lock className="size-5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {isGracePeriod ? 'Action Required' : 'Trial Expired'}
            </span>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground">
            {isGracePeriod
              ? `You have ${daysUntilDeletion} days before your data is deleted`
              : `Welcome back. Your trial expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago.`
            }
          </h2>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isGracePeriod
              ? 'Your workspace is scheduled for deletion. Upgrade now to preserve all your competitive intelligence.'
              : 'All your data is here. Upgrade to keep building.'
            }
          </p>
        </div>

        {/* Middle column - 30% - Trial recap stats */}
        <div className="md:col-span-3 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            During your trial
          </h3>
          
          <div className="space-y-2">
            <StatRow 
              icon={Building2} 
              label="competitors tracked" 
              value={usageStats.competitorsAdded} 
            />
            <StatRow 
              icon={Radar} 
              label="sweeps run" 
              value={usageStats.sweepsRun} 
            />
            <StatRow 
              icon={Eye} 
              label="items reviewed" 
              value={usageStats.itemsReviewed} 
            />
            {usageStats.briefsAuthored > 0 && (
              <StatRow 
                icon={FileText} 
                label="briefs authored" 
                value={usageStats.briefsAuthored} 
              />
            )}
            {usageStats.battleCardsCreated > 0 && (
              <StatRow 
                icon={Swords} 
                label="battle cards built" 
                value={usageStats.battleCardsCreated} 
              />
            )}
          </div>
        </div>

        {/* Right column - 30% - CTAs */}
        <div className="md:col-span-3 flex flex-col justify-center gap-3">
          <Button 
            asChild 
            size="lg"
            className={cn(
              'w-full bg-amber-500 text-white hover:bg-amber-600',
              isGracePeriod && 'animate-pulse'
            )}
          >
            <Link href="/pricing">Upgrade now</Link>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            className="w-full border-amber-500/30 hover:bg-amber-500/10"
          >
            <a 
              href="https://cal.com/dosi-ai/demo" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Calendar className="size-4 mr-2" />
              Schedule a call
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatRow({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: typeof Building2
  label: string
  value: number 
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 rounded bg-amber-500/20">
        <Icon className="size-3.5 text-amber-600 dark:text-amber-400" />
      </div>
      <span className="text-sm">
        <span className="font-semibold tabular-nums">{value}</span>{' '}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

// ============================================================================
// DISABLED ACTION BUTTON - For read-only mode throughout the app
// ============================================================================

type DisabledAction = 
  | 'run_sweep'
  | 'invite_user'
  | 'add_competitor'
  | 'new_brief'
  | 'new_battle_card'
  | 'log_win_loss'
  | 'edit_competitor'
  | 'edit_brief'
  | 'edit_battle_card'

const disabledActionTooltips: Record<DisabledAction, string> = {
  run_sweep: 'Sweeps are paused on expired trials. Upgrade to resume.',
  invite_user: 'Inviting users requires a paid plan.',
  add_competitor: 'Adding competitors requires a paid plan.',
  new_brief: 'Authoring requires a paid plan.',
  new_battle_card: 'Battle card authoring requires a paid plan.',
  log_win_loss: 'Outcome logging requires a paid plan.',
  edit_competitor: 'Editing requires a paid plan.',
  edit_brief: 'Editing requires a paid plan.',
  edit_battle_card: 'Editing requires a paid plan.',
}

interface DisabledActionButtonProps {
  action: DisabledAction
  isReadOnly: boolean
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DisabledActionButton({ 
  action, 
  isReadOnly, 
  children, 
  className,
}: DisabledActionButtonProps) {
  if (!isReadOnly) {
    return <>{children}</>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('inline-flex', className)}>
          <Button 
            variant="outline" 
            disabled 
            className="opacity-50 cursor-not-allowed"
          >
            <Lock className="size-4 mr-2" />
            {/* Extract text content from children if it's a button */}
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.props.children) {
                return child.props.children
              }
              return child
            })}
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        className="max-w-xs bg-popover text-popover-foreground border shadow-lg"
      >
        <p className="text-sm">{disabledActionTooltips[action]}</p>
        <Link 
          href="/pricing" 
          className="text-xs text-accent hover:underline mt-1 inline-block"
        >
          View plans →
        </Link>
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// READ-ONLY CONTEXT - Provides read-only state throughout the app
// ============================================================================

interface ReadOnlyContextValue {
  isReadOnly: boolean
  subscription: WorkspaceSubscription | null
  usageStats: TrialUsageStats | null
}

const ReadOnlyContext = React.createContext<ReadOnlyContextValue>({
  isReadOnly: false,
  subscription: null,
  usageStats: null,
})

export function useReadOnly() {
  return React.useContext(ReadOnlyContext)
}

interface ReadOnlyProviderProps {
  subscription: WorkspaceSubscription
  usageStats: TrialUsageStats
  children: React.ReactNode
}

export function ReadOnlyProvider({ 
  subscription, 
  usageStats, 
  children 
}: ReadOnlyProviderProps) {
  const isReadOnly = subscription.status === 'read_only'

  return (
    <ReadOnlyContext.Provider value={{ isReadOnly, subscription, usageStats }}>
      {children}
    </ReadOnlyContext.Provider>
  )
}

// ============================================================================
// DEMO: Read-only state demonstration
// ============================================================================

export function ReadOnlyDemo() {
  const [daysExpired, setDaysExpired] = React.useState(3)
  
  const mockSubscription: WorkspaceSubscription = {
    planId: 'trial',
    status: 'read_only',
    billingInterval: null,
    currentPeriodStart: '2026-04-19T00:00:00Z',
    currentPeriodEnd: '2026-05-03T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'expired',
    trialStartedAt: '2026-04-19T00:00:00Z',
    trialEndsAt: new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000).toISOString(),
    trialDaysRemaining: 0,
    readOnlySince: new Date(Date.now() - daysExpired * 24 * 60 * 60 * 1000).toISOString(),
    gracePeriodEndsAt: daysExpired > 27 
      ? new Date(Date.now() + (30 - daysExpired) * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    aiCostUsedCents: 2400,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 60,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  }

  const mockUsageStats: TrialUsageStats = {
    competitorsAdded: 4,
    sweepsRun: 14,
    itemsReviewed: 87,
    briefsAuthored: 2,
    battleCardsCreated: 1,
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Days since expiration:</label>
        <input 
          type="range" 
          min="1" 
          max="35" 
          value={daysExpired}
          onChange={(e) => setDaysExpired(Number(e.target.value))}
          className="w-48"
        />
        <span className="text-sm tabular-nums">{daysExpired} days</span>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium">Read-Only Banner:</h3>
        <div className="border rounded-lg overflow-hidden">
          <ReadOnlyBanner subscription={mockSubscription} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium">Dashboard Module:</h3>
        <ReadOnlyDashboardModule 
          subscription={mockSubscription} 
          usageStats={mockUsageStats}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium">Disabled Action Buttons:</h3>
        <div className="flex flex-wrap gap-3">
          <DisabledActionButton action="run_sweep" isReadOnly={true}>
            <Button>Run sweep</Button>
          </DisabledActionButton>
          <DisabledActionButton action="add_competitor" isReadOnly={true}>
            <Button>Add competitor</Button>
          </DisabledActionButton>
          <DisabledActionButton action="new_brief" isReadOnly={true}>
            <Button>New brief</Button>
          </DisabledActionButton>
          <DisabledActionButton action="new_battle_card" isReadOnly={true}>
            <Button>New battle card</Button>
          </DisabledActionButton>
        </div>
      </div>
    </div>
  )
}
