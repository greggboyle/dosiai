'use server'

import { getSession } from '@/lib/auth/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkCostBudget } from '@/lib/ai/cost'
import { dispatchSweepRun } from '@/lib/sweep/dispatch-run'
import type { WorkspacePlan } from '@/lib/types/dosi'

export type TriggerManualSweepOptions = {
  /**
   * Trial workspaces only: allow one sweep when none have run yet (onboarding completion).
   * Eligibility is enforced server-side from `sweep` row count.
   */
  onboardingFirstSweep?: boolean
}

async function requireWorkspaceAdmin(): Promise<{ workspaceId: string; userId: string; plan: WorkspacePlan }> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role !== 'admin') {
    throw new Error('Only workspace admins can run a manual sweep')
  }

  const { data: workspace } = await supabase
    .from('workspace')
    .select('id, plan')
    .eq('id', member.workspace_id)
    .single()

  if (!workspace) throw new Error('Workspace not found')

  return {
    workspaceId: workspace.id,
    userId: session.user.id,
    plan: workspace.plan as WorkspacePlan,
  }
}

export async function triggerManualSweep(
  options?: TriggerManualSweepOptions
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { workspaceId, userId, plan } = await requireWorkspaceAdmin()
    if (plan === 'trial') {
      if (options?.onboardingFirstSweep) {
        const supabaseAdmin = createSupabaseAdminClient()
        const { count, error: countErr } = await supabaseAdmin
          .from('sweep')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
        if (countErr) throw countErr
        if ((count ?? 0) > 0) {
          return {
            ok: false,
            error:
              'This workspace already ran its first sweep. Upgrade to Starter or higher to run more manual sweeps.',
          }
        }
      } else {
        return { ok: false, error: 'Manual sweeps require Starter or higher on this workspace.' }
      }
    }

    const budget = await checkCostBudget(workspaceId, plan)
    if (!budget.ok) {
      return {
        ok: false,
        error: 'AI cost ceiling reached. Raise the ceiling or wait for the monthly reset.',
      }
    }

    await dispatchSweepRun({
      workspaceId,
      trigger: 'manual',
      triggerUserId: userId,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sweep could not be scheduled'
    return { ok: false, error: msg }
  }
}

export async function getLatestSweepStatus(): Promise<{
  ok: true
  sweep: { status: string | null; startedAt: string | null; completedAt: string | null } | null
} | {
  ok: false
  error: string
}> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { ok: false, error: 'Unauthorized' }
    }

    const supabase = await createSupabaseServerClient()
    const { data: member } = await supabase
      .from('workspace_member')
      .select('workspace_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!member) {
      return { ok: false, error: 'Workspace membership required' }
    }

    const { data: latestSweep, error } = await supabase
      .from('sweep')
      .select('status,started_at,completed_at')
      .eq('workspace_id', member.workspace_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { ok: false, error: error.message }
    }

    return {
      ok: true,
      sweep: latestSweep
        ? {
            status: latestSweep.status,
            startedAt: latestSweep.started_at,
            completedAt: latestSweep.completed_at,
          }
        : null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not load sweep status'
    return { ok: false, error: msg }
  }
}
