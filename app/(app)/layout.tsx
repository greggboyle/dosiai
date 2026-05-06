import { redirect } from 'next/navigation'
import { AppShellClient } from '@/components/app-shell-client'
import type { PlanId, WorkspaceSubscription } from '@/lib/billing-types'
import { getTrialDaysRemaining, getTrialStatus, PLAN_CONFIG } from '@/lib/billing-types'
import { loadTrialWarningBootstrap } from '@/lib/billing/trial-warning-data'
import { loadSidebarNavBadgeCounts } from '@/lib/dashboard/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { data: memberRow } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!memberRow) {
    redirect('/onboarding')
  }

  const { data: workspaceRow } = await supabase
    .from('workspace')
    .select('*')
    .eq('id', memberRow.workspace_id)
    .single()

  if (!workspaceRow) {
    redirect('/onboarding')
  }

  const trialEndsAt = workspaceRow.trial_ends_at ?? undefined
  const trialDaysRemaining = trialEndsAt ? getTrialDaysRemaining(trialEndsAt) : undefined
  const subscription: WorkspaceSubscription = {
    planId: workspaceRow.plan,
    status: workspaceRow.status === 'read_only' ? 'read_only' : 'active',
    billingInterval: workspaceRow.billing_cycle ?? null,
    currentPeriodStart: workspaceRow.created_at,
    currentPeriodEnd: workspaceRow.next_billing_date ?? workspaceRow.created_at,
    cancelAtPeriodEnd: false,
    trialStatus: trialEndsAt ? getTrialStatus(trialEndsAt) : undefined,
    trialStartedAt: workspaceRow.created_at,
    trialEndsAt,
    trialDaysRemaining,
    readOnlySince: workspaceRow.status === 'read_only' ? (trialEndsAt ?? workspaceRow.created_at) : undefined,
    gracePeriodEndsAt: workspaceRow.grace_period_ends_at ?? undefined,
    aiCostUsedCents: workspaceRow.ai_cost_mtd_cents,
    aiCostCeilingCents: workspaceRow.ai_cost_ceiling_cents,
    aiCostPercentUsed:
      workspaceRow.ai_cost_ceiling_cents > 0
        ? Math.min(100, Math.round((workspaceRow.ai_cost_mtd_cents / workspaceRow.ai_cost_ceiling_cents) * 100))
        : 0,
    analystSeatsUsed: 1,
    analystSeatsLimit: PLAN_CONFIG[workspaceRow.plan].limits.analystSeats,
  }

  const trialWarning = await loadTrialWarningBootstrap(
    workspaceRow.id,
    workspaceRow.plan as PlanId
  )

  const sidebarNavBadgeCounts = await loadSidebarNavBadgeCounts(workspaceRow.id)

  return (
    <AppShellClient
      trialWarning={trialWarning}
      sidebarNavBadgeCounts={sidebarNavBadgeCounts}
      workspace={{
        id: workspaceRow.id,
        name: workspaceRow.name,
        logo: workspaceRow.logo_url ?? undefined,
        status: workspaceRow.status,
      }}
      member={{
        name:
          (session.user.user_metadata?.full_name as string | undefined) ??
          (session.user.email?.split('@')[0] ?? 'Member'),
        email: session.user.email ?? '',
        role: memberRow.role,
      }}
      subscription={subscription}
    >
      {children}
    </AppShellClient>
  )
}
