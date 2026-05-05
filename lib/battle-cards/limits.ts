import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { PLAN_LIMITS } from '@/lib/billing/limits'

export async function countBattleCards(workspaceId: string): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from('battle_card')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  if (error) throw error
  return count ?? 0
}

function effectiveCap(plan: WorkspacePlan): number {
  const row = PLAN_LIMITS[plan]
  const n = row.battleCards
  if (n < 0) return Infinity
  return n
}

export async function assertBattleCardCapacity(workspaceId: string, plan: WorkspacePlan): Promise<void> {
  const cap = effectiveCap(plan)
  if (!Number.isFinite(cap)) return
  const used = await countBattleCards(workspaceId)
  if (used >= cap) {
    throw new Error(`Battle card limit reached (${cap}) for your plan. Upgrade to add more.`)
  }
}
