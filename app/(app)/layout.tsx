'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { TopBar } from '@/components/top-bar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TrialBanner } from '@/components/billing/trial-banner'
import { TrialWarningModal } from '@/components/billing/trial-warning-modal'
import { ReadOnlyBanner, ReadOnlyProvider } from '@/components/billing/read-only-state'
import { AILimitBanner, OverLimitModal } from '@/components/billing/ai-usage-indicator'
import type { WorkspaceSubscription, TrialUsageStats, AIUsageState } from '@/lib/billing-types'

// Toggle this to demo different states: 'active_trial' | 'expiring_trial' | 'expired_read_only' | 'grace_period'
const DEMO_STATE: 'active_trial' | 'expiring_trial' | 'expired_read_only' | 'grace_period' = 'active_trial'

// Mock subscription - in production this comes from context/API
const mockSubscriptions: Record<string, WorkspaceSubscription> = {
  active_trial: {
    planId: 'trial',
    status: 'active',
    billingInterval: null,
    currentPeriodStart: '2026-04-22T00:00:00Z',
    currentPeriodEnd: '2026-05-06T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'active',
    trialStartedAt: '2026-04-22T00:00:00Z',
    trialEndsAt: '2026-05-17T00:00:00Z',
    trialDaysRemaining: 12,
    aiCostUsedCents: 1200,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 30,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
  expiring_trial: {
    planId: 'trial',
    status: 'active',
    billingInterval: null,
    currentPeriodStart: '2026-04-22T00:00:00Z',
    currentPeriodEnd: '2026-05-06T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'expiring_soon',
    trialStartedAt: '2026-04-22T00:00:00Z',
    trialEndsAt: '2026-05-08T00:00:00Z',
    trialDaysRemaining: 3,
    aiCostUsedCents: 1200,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 30,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
  expired_read_only: {
    planId: 'trial',
    status: 'read_only',
    billingInterval: null,
    currentPeriodStart: '2026-04-19T00:00:00Z',
    currentPeriodEnd: '2026-05-03T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'expired',
    trialStartedAt: '2026-04-19T00:00:00Z',
    trialEndsAt: '2026-05-02T00:00:00Z', // Expired 3 days ago
    trialDaysRemaining: 0,
    readOnlySince: '2026-05-02T00:00:00Z',
    aiCostUsedCents: 2400,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 60,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
  grace_period: {
    planId: 'trial',
    status: 'read_only',
    billingInterval: null,
    currentPeriodStart: '2026-04-01T00:00:00Z',
    currentPeriodEnd: '2026-04-15T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'expired',
    trialStartedAt: '2026-04-01T00:00:00Z',
    trialEndsAt: '2026-04-15T00:00:00Z', // Expired 20 days ago
    trialDaysRemaining: 0,
    readOnlySince: '2026-04-15T00:00:00Z',
    gracePeriodEndsAt: '2026-05-15T00:00:00Z', // 10 days until deletion
    daysUntilDeletion: 10,
    aiCostUsedCents: 2400,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 60,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
}

const mockSubscription = mockSubscriptions[DEMO_STATE]

// Mock usage stats - in production this comes from API
const mockUsageStats: TrialUsageStats = {
  competitorsAdded: 4,
  sweepsRun: 14,
  itemsReviewed: 87,
  briefsAuthored: 2,
  battleCardsCreated: 1,
}

// Mock AI usage state - toggle DEMO_AI_LIMIT to show over-limit state
const DEMO_AI_LIMIT = false // Set to true to demo AI limit banner/modal

const mockAIUsage: AIUsageState = DEMO_AI_LIMIT ? {
  currentMonthCents: 20000, // $200 - at limit
  ceilingCents: 20000,
  percentUsed: 100,
  isAtSoftLimit: false,
  isAtHardLimit: true,
  nextResetDate: 'April 1',
} : {
  currentMonthCents: 8400, // $84 - normal usage
  ceilingCents: 20000,
  percentUsed: 42,
  isAtSoftLimit: false,
  isAtHardLimit: false,
  nextResetDate: 'April 1',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Track which warning thresholds have been seen
  const [seenThresholds, setSeenThresholds] = React.useState<Set<7 | 3 | 1>>(new Set())
  const [showWarning, setShowWarning] = React.useState(false)
  const [showAILimitModal, setShowAILimitModal] = React.useState(false)

  // Show AI limit modal once when user first hits the limit (e.g., after a failed sweep)
  React.useEffect(() => {
    if (mockAIUsage.isAtHardLimit) {
      // In production, this would be triggered by a failed sweep API response
      const hasSeenModal = sessionStorage.getItem('ai_limit_modal_seen')
      if (!hasSeenModal) {
        setShowAILimitModal(true)
        sessionStorage.setItem('ai_limit_modal_seen', 'true')
      }
    }
  }, [])

  const daysRemaining = mockSubscription.trialDaysRemaining ?? 0
  const currentThreshold = daysRemaining <= 1 ? 1 : daysRemaining <= 3 ? 3 : daysRemaining <= 7 ? 7 : null

  // Show warning modal once per threshold
  React.useEffect(() => {
    if (
      mockSubscription.planId === 'trial' &&
      currentThreshold &&
      !seenThresholds.has(currentThreshold)
    ) {
      // Small delay to not interrupt page load
      const timer = setTimeout(() => setShowWarning(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [currentThreshold, seenThresholds])

  const handleDismissWarning = (threshold: 7 | 3 | 1) => {
    setSeenThresholds(prev => new Set([...prev, threshold]))
    setShowWarning(false)
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Show appropriate banner based on subscription status */}
          {mockSubscription.status === 'read_only' ? (
            <ReadOnlyBanner subscription={mockSubscription} />
          ) : mockAIUsage.isAtHardLimit ? (
            <AILimitBanner 
              usage={mockAIUsage} 
              onUpgrade={() => setShowAILimitModal(true)}
            />
          ) : (
            <TrialBanner subscription={mockSubscription} />
          )}
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-6">
              {children}
            </div>
          </main>
        </SidebarInset>

        {/* Trial warning modal - appears at T-7, T-3, T-1 */}
        <TrialWarningModal
          subscription={mockSubscription}
          usageStats={mockUsageStats}
          isOpen={showWarning}
          onDismiss={handleDismissWarning}
          onUpgrade={() => {
            setShowWarning(false)
            window.location.href = '/pricing'
          }}
        />

        {/* AI Over-Limit Modal - appears when sweep is rejected due to AI cost ceiling */}
        <OverLimitModal
          subscription={mockSubscription}
          usage={mockAIUsage}
          isOpen={showAILimitModal}
          onClose={() => setShowAILimitModal(false)}
          onUpgrade={() => {
            setShowAILimitModal(false)
            window.location.href = '/pricing'
          }}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
}
