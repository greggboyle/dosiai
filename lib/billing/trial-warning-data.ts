import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TrialUsageStats } from '@/lib/billing-types'
import type { PlanId } from '@/lib/billing-types'

export type TrialThreshold = 't_minus_7' | 't_minus_3' | 't_minus_1'

/** Lower sort index = show first (most urgent). */
export function trialThresholdRank(t: TrialThreshold): number {
  const order: TrialThreshold[] = ['t_minus_1', 't_minus_3', 't_minus_7']
  return order.indexOf(t)
}

export function sortTrialThresholds(ts: TrialThreshold[]): TrialThreshold[] {
  return [...ts].sort((a, b) => trialThresholdRank(a) - trialThresholdRank(b))
}

export async function getTrialUsageStats(workspaceId: string): Promise<TrialUsageStats> {
  const supabase = await createSupabaseServerClient()

  const [
    { count: competitorsAdded },
    { count: sweepsRun },
    { count: itemsReviewed },
    { count: briefsAuthored },
    { count: battleCardsCreated },
  ] = await Promise.all([
    supabase
      .from('competitor')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active'),
    supabase.from('sweep').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase
      .from('intelligence_item')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('reviewed_at', 'is', null),
    supabase.from('brief').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('battle_card').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ])

  return {
    competitorsAdded: competitorsAdded ?? 0,
    sweepsRun: sweepsRun ?? 0,
    itemsReviewed: itemsReviewed ?? 0,
    briefsAuthored: briefsAuthored ?? 0,
    battleCardsCreated: battleCardsCreated ?? 0,
  }
}

export async function listPendingTrialThresholds(workspaceId: string): Promise<TrialThreshold[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('trial_warning_seen')
    .select('threshold')
    .eq('workspace_id', workspaceId)
    .eq('dismissed', false)

  if (error) throw error
  const rows = (data ?? []) as { threshold: TrialThreshold }[]
  return sortTrialThresholds(rows.map((r) => r.threshold))
}

export async function loadTrialWarningBootstrap(
  workspaceId: string,
  plan: PlanId
): Promise<{ usage: TrialUsageStats; pending: TrialThreshold[] } | null> {
  if (plan !== 'trial') return null
  const [usage, pending] = await Promise.all([getTrialUsageStats(workspaceId), listPendingTrialThresholds(workspaceId)])
  return { usage, pending }
}

/** Modal headline thresholds (days), aligned with `TrialWarningModal`. */
export type TrialWarningStep = 7 | 3 | 1

export function trialToModalStep(t: TrialThreshold): TrialWarningStep {
  switch (t) {
    case 't_minus_7':
      return 7
    case 't_minus_3':
      return 3
    case 't_minus_1':
      return 1
  }
}

export function modalStepToTrial(m: TrialWarningStep): TrialThreshold {
  switch (m) {
    case 7:
      return 't_minus_7'
    case 3:
      return 't_minus_3'
    case 1:
      return 't_minus_1'
  }
}
