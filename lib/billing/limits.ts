import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { WorkspacePlan } from '@/lib/types/dosi'

export const PLAN_LIMITS = {
  trial: { analystSeats: 1, competitors: 5, topics: 3, battleCards: 5, aiCostCeilingCents: 4000 },
  starter: { analystSeats: 1, competitors: 5, topics: 3, battleCards: 5, aiCostCeilingCents: 4000 },
  team: { analystSeats: 5, competitors: 15, topics: 10, battleCards: 15, aiCostCeilingCents: 20000 },
  business: { analystSeats: 15, competitors: 30, topics: 25, battleCards: -1, aiCostCeilingCents: 70000 },
  enterprise: { analystSeats: -1, competitors: -1, topics: -1, battleCards: -1, aiCostCeilingCents: -1 },
} as const

type PlanLimits = (typeof PLAN_LIMITS)[WorkspacePlan]

export async function getEffectiveLimits(workspaceId: string, plan: WorkspacePlan): Promise<PlanLimits> {
  const supabase = await createSupabaseServerClient()
  const base = PLAN_LIMITS[plan]

  const { data: activeOverrides } = await supabase
    .from('workspace_override')
    .select('type, override_value')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (!activeOverrides?.length) return base

  const next = { ...base }
  for (const override of activeOverrides) {
    const parsed = Number(override.override_value)
    if (Number.isNaN(parsed)) continue
    if (override.type === 'analyst_seat_cap') next.analystSeats = parsed
    if (override.type === 'competitor_cap') next.competitors = parsed
    if (override.type === 'topic_cap') next.topics = parsed
    if (override.type === 'battle_card_cap') next.battleCards = parsed
    if (override.type === 'ai_cost_ceiling_cents') next.aiCostCeilingCents = parsed
  }

  return next
}
