'use client'

import * as React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { TopBar } from '@/components/top-bar'
import { TrialBanner } from '@/components/billing/trial-banner'
import { ReadOnlyBanner } from '@/components/billing/read-only-state'
import { WorkspaceProvider } from '@/components/workspace-context'
import type { WorkspaceSubscription } from '@/lib/billing-types'

interface AppShellClientProps {
  children: React.ReactNode
  workspace: { id: string; name: string; logo?: string; status: 'active' | 'read_only' | 'grace_period' | 'cancelled' }
  member: { name: string; email: string; role: 'admin' | 'analyst' | 'viewer' }
  subscription: WorkspaceSubscription
}

export function AppShellClient({ children, workspace, member, subscription }: AppShellClientProps) {
  return (
    <WorkspaceProvider value={{ workspace, subscription }}>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar workspace={workspace} member={member} subscription={subscription} />
          <SidebarInset>
            {subscription.status === 'read_only' ? <ReadOnlyBanner subscription={subscription} /> : <TrialBanner subscription={subscription} />}
            <TopBar />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-7xl p-6">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  )
}
