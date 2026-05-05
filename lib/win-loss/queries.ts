import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export type WinLossRow = Database['public']['Tables']['win_loss_outcome']['Row']

/** Outcomes joined with competitor name + submitter lookup skipped (privacy). */
export async function listWinLossOutcomes(workspaceId: string): Promise<
  (WinLossRow & { competitorName?: string })[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('win_loss_outcome')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('close_date', { ascending: false })

  if (error) throw error
  if (!data?.length) return []

  const compIds = [...new Set(data.map((r) => r.competitor_id))]
  const { data: comps } =
    compIds.length > 0
      ? await supabase.from('competitor').select('id,name').in('id', compIds)
      : { data: [] as { id: string; name: string }[] }

  const nameBy = Object.fromEntries((comps ?? []).map((c) => [c.id, c.name]))
  return data.map((r) => ({ ...r, competitorName: nameBy[r.competitor_id] ?? 'Competitor' }))
}

export type CompetitorWinLossAgg = {
  competitorId: string
  competitorName: string
  won90: number
  lost90: number
  nod90: number
  dq90: number
  won12m: number
  lost12m: number
  wonAll: number
  lostAll: number
}

function inWindow(closeDate: string, days: number): boolean {
  const t = new Date(closeDate).getTime()
  return t >= Date.now() - days * 86400000
}

export async function aggregateByCompetitor(
  workspaceId: string,
  rows: WinLossRow[]
): Promise<CompetitorWinLossAgg[]> {
  const supabase = await createSupabaseServerClient()
  const { data: comps } = await supabase
    .from('competitor')
    .select('id,name')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  const byComp = new Map<string, CompetitorWinLossAgg>()
  for (const c of comps ?? []) {
    byComp.set(c.id, {
      competitorId: c.id,
      competitorName: c.name,
      won90: 0,
      lost90: 0,
      nod90: 0,
      dq90: 0,
      won12m: 0,
      lost12m: 0,
      wonAll: 0,
      lostAll: 0,
    })
  }

  for (const r of rows.filter((x) => x.workspace_id === workspaceId)) {
    let agg = byComp.get(r.competitor_id)
    if (!agg) {
      agg = {
        competitorId: r.competitor_id,
        competitorName: 'Competitor',
        won90: 0,
        lost90: 0,
        nod90: 0,
        dq90: 0,
        won12m: 0,
        lost12m: 0,
        wonAll: 0,
        lostAll: 0,
      }
      byComp.set(r.competitor_id, agg)
    }

    const d90 = inWindow(r.close_date, 90)
    const d365 = inWindow(r.close_date, 365)

    if (r.outcome === 'won') {
      agg.wonAll += 1
      if (d90) agg.won90 += 1
      if (d365) agg.won12m += 1
    }
    if (r.outcome === 'lost') {
      agg.lostAll += 1
      if (d90) agg.lost90 += 1
      if (d365) agg.lost12m += 1
    }
    if (r.outcome === 'no_decision') {
      if (d90) agg.nod90 += 1
    }
    if (r.outcome === 'disqualified') {
      if (d90) agg.dq90 += 1
    }
  }

  return [...byComp.values()].sort((a, b) => a.competitorName.localeCompare(b.competitorName))
}

export type ReasonTagAgg = { tag: string; won: number; lost: number; total: number }

export function aggregateByReasonTag(rows: WinLossRow[]): ReasonTagAgg[] {
  const m = new Map<string, { won: number; lost: number; total: number }>()
  for (const r of rows) {
    for (const tag of r.reason_tags ?? []) {
      const t = tag.trim().toLowerCase()
      if (!t) continue
      const cur = m.get(t) ?? { won: 0, lost: 0, total: 0 }
      cur.total += 1
      if (r.outcome === 'won') cur.won += 1
      if (r.outcome === 'lost') cur.lost += 1
      m.set(t, cur)
    }
  }
  return [...m.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.total - a.total)
}

export async function listWorkspaceBattleCards(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('battle_card')
    .select('id, competitor_id, status')
    .eq('workspace_id', workspaceId)
    .in('status', ['draft', 'published'])

  const compIds = [...new Set((data ?? []).map((b) => b.competitor_id))]
  const { data: comps } =
    compIds.length > 0
      ? await supabase.from('competitor').select('id,name').in('id', compIds)
      : { data: [] as { id: string; name: string }[] }

  const nm = Object.fromEntries((comps ?? []).map((c) => [c.id, c.name]))

  return (data ?? []).map((b) => ({
    id: b.id,
    competitorId: b.competitor_id,
    label: nm[b.competitor_id] ?? 'Battle card',
  }))
}
