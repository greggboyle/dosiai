'use client'

import * as React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { TopBar } from '@/components/top-bar'
import { TrialBanner } from '@/components/billing/trial-banner'
import { TrialWarningHost } from '@/components/billing/trial-warning-host'
import { ReadOnlyBanner } from '@/components/billing/read-only-state'
import { CostCeilingBanner } from '@/components/billing/cost-ceiling-banner'
import { WorkspaceProvider } from '@/components/workspace-context'
import type { TrialUsageStats, WorkspaceSubscription } from '@/lib/billing-types'
import type { SidebarNavBadgeCounts } from '@/lib/dashboard/queries'
import type { NotificationListItem } from '@/lib/notifications/queries'
import type { TrialThreshold } from '@/lib/billing/trial-warning-data'

interface AppShellClientProps {
  children: React.ReactNode
  workspace: { id: string; name: string; logo?: string; status: 'active' | 'read_only' | 'grace_period' | 'cancelled' }
  member: { name: string; email: string; role: 'admin' | 'analyst' | 'viewer' }
  subscription: WorkspaceSubscription
  trialWarning: { usage: TrialUsageStats; pending: TrialThreshold[] } | null
  sidebarNavBadgeCounts: SidebarNavBadgeCounts
  userId: string
  notificationBootstrap: { unreadCount: number; recent: NotificationListItem[] }
}

export function AppShellClient({
  children,
  workspace,
  member,
  subscription,
  trialWarning,
  sidebarNavBadgeCounts,
  userId,
  notificationBootstrap,
}: AppShellClientProps) {
  return (
    <WorkspaceProvider value={{ workspace, subscription, memberRole: member.role }}>
      <TooltipProvider>
        {trialWarning ? (
          <TrialWarningHost
            key={workspace.id}
            workspaceId={workspace.id}
            subscription={subscription}
            usageStats={trialWarning.usage}
            initialPending={trialWarning.pending}
          />
        ) : null}
        <SidebarProvider>
          <AppSidebar
            workspace={workspace}
            member={member}
            subscription={subscription}
            navBadgeCounts={sidebarNavBadgeCounts}
          />
          <SidebarInset>
            <CostCeilingBanner subscription={subscription} />
            {subscription.status === 'read_only' ? <ReadOnlyBanner subscription={subscription} /> : <TrialBanner subscription={subscription} />}
            <TopBar userId={userId} notificationBootstrap={notificationBootstrap} />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-7xl p-6">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  )
}
