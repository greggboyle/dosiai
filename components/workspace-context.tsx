'use client'

import * as React from 'react'
import type { WorkspaceSubscription } from '@/lib/billing-types'

interface WorkspaceContextValue {
  workspace: { id: string; name: string; status: 'active' | 'read_only' | 'grace_period' | 'cancelled' }
  subscription: WorkspaceSubscription
  memberRole: 'admin' | 'analyst' | 'viewer'
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue
  children: React.ReactNode
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspaceContext() {
  const ctx = React.useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspaceContext must be used inside WorkspaceProvider')
  return ctx
}
