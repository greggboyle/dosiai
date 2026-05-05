import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { getEffectiveLimits } from '@/lib/billing/limits'

export async function assertCompetitorCapacity(workspaceId: string, plan: WorkspacePlan): Promise<void> {
  const limits = await getEffectiveLimits(workspaceId, plan)
  const cap = limits.competitors
  if (cap < 0) return

  const supabase = await createSupabaseServerClient()
  const { count, error } = await supabase
    .from('competitor')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) throw error
  if ((count ?? 0) >= cap) {
    throw new Error(
      `Competitor limit reached (${cap} active) for your plan. Archive a competitor or upgrade to add more.`
    )
  }
}
