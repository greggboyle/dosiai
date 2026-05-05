import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { PLAN_CONFIG, type PlanId } from '@/lib/billing-types'

function startOfUtcMonthIso(): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Counts completed vendor calls this calendar month for AI brief drafting (plan limit enforcement). */
export async function countAiBriefDraftsThisMonth(workspaceId: string): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from('vendor_call')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('purpose', 'brief_drafting')
    .eq('success', true)
    .gte('called_at', startOfUtcMonthIso())

  if (error) throw error
  return count ?? 0
}

export function aiBriefMonthlyLimitForPlan(plan: WorkspacePlan): number | typeof Infinity {
  const pid = plan as PlanId
  const lim = PLAN_CONFIG[pid]?.limits.aiBriefsPerMonth
  if (lim === 'unlimited') return Infinity
  return lim ?? Infinity
}

export async function assertAiBriefDraftAllowed(workspaceId: string, plan: WorkspacePlan): Promise<void> {
  const limit = aiBriefMonthlyLimitForPlan(plan)
  if (!Number.isFinite(limit)) return
  const used = await countAiBriefDraftsThisMonth(workspaceId)
  if (used >= limit) {
    throw new Error(`AI brief drafting monthly limit reached (${limit}). Upgrade or draft manually without AI.`)
  }
}
