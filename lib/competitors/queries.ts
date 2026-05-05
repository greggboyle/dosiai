import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatRelativeLabel } from '@/lib/dashboard/queries'
import type { CompetitorStatus, CompetitorTier, MISScore } from '@/lib/types'
import { getMISBand } from '@/lib/types'

export type CompetitorTableRow = {
  id: string
  name: string
  website: string | null
  tier: CompetitorTier
  status: CompetitorStatus
  overallMIS: MISScore
  recentActivity: number
  lastActivityLabel: string
}

function normalizeBand(b: string): MISScore['band'] {
  const allowed: MISScore['band'][] = ['noise', 'low', 'medium', 'high', 'critical']
  return (allowed.includes(b as MISScore['band']) ? b : 'medium') as MISScore['band']
}

export async function listCompetitorsForWorkspace(workspaceId: string): Promise<CompetitorTableRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('competitor')
    .select('id,name,website,tier,status')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (error) throw error
  if (!rows?.length) return []

  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString()

  const [{ data: items7 }, { data: items90 }] = await Promise.all([
    supabase
      .from('intelligence_item')
      .select('related_competitors, ingested_at')
      .eq('workspace_id', workspaceId)
      .gte('ingested_at', since7),
    supabase
      .from('intelligence_item')
      .select('related_competitors, mi_score, mi_score_band, confidence, ingested_at')
      .eq('workspace_id', workspaceId)
      .gte('ingested_at', since90),
  ])

  const count7d = new Map<string, number>()
  for (const row of items7 ?? []) {
    for (const cid of row.related_competitors ?? []) {
      count7d.set(cid, (count7d.get(cid) ?? 0) + 1)
    }
  }

  const maxScore = new Map<string, { value: number; band: string; confidence: MISScore['confidence'] }>()
  const lastIngest = new Map<string, string>()
  for (const row of items90 ?? []) {
    const ing = row.ingested_at
    for (const cid of row.related_competitors ?? []) {
      const prevT = lastIngest.get(cid)
      if (!prevT || ing > prevT) lastIngest.set(cid, ing)

      const v = Math.round(row.mi_score)
      const prev = maxScore.get(cid)
      if (!prev || v > prev.value) {
        maxScore.set(cid, {
          value: v,
          band: row.mi_score_band,
          confidence: row.confidence,
        })
      }
    }
  }

  return rows.map((r) => {
    const ms = maxScore.get(r.id)
    const overallMIS: MISScore = ms
      ? {
          value: ms.value,
          band: normalizeBand(ms.band),
          confidence: ms.confidence,
        }
      : { value: 40, band: getMISBand(40), confidence: 'medium' }

    const lastIso = lastIngest.get(r.id)

    return {
      id: r.id,
      name: r.name,
      website: r.website,
      tier: r.tier as CompetitorTier,
      status: r.status as CompetitorStatus,
      overallMIS,
      recentActivity: count7d.get(r.id) ?? 0,
      lastActivityLabel: lastIso ? formatRelativeLabel(lastIso) : '—',
    }
  })
}
