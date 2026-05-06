import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MISScore } from '@/lib/types'
import { listFeedItems } from '@/lib/feed/queries'

export type DashboardFeedRow = {
  id: string
  title: string
  competitorInitial: string
  competitorName: string
  mis: MISScore
  timestampLabel: string
}

export type SidebarNavBadgeCounts = {
  /** Feed items in review queue (same logic as dashboard `reviewQueueCount`). */
  feedReviewQueue: number
  /** Total briefs in the workspace. */
  briefCount: number
}

export async function loadSidebarNavBadgeCounts(workspaceId: string): Promise<SidebarNavBadgeCounts> {
  const supabase = await createSupabaseServerClient()

  const { data: ws } = await supabase
    .from('workspace')
    .select('review_queue_threshold')
    .eq('id', workspaceId)
    .single()

  const threshold = ws?.review_queue_threshold ?? 30

  const [reviewQueueRes, briefCountRes] = await Promise.all([
    supabase
      .from('intelligence_item')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('visibility', 'feed')
      .lt('mi_score', threshold)
      .is('reviewed_at', null),
    supabase.from('brief').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ])

  return {
    feedReviewQueue: reviewQueueRes.count ?? 0,
    briefCount: briefCountRes.count ?? 0,
  }
}

export type DashboardSnapshot = {
  feed: DashboardFeedRow[]
  recentBriefs: Array<{
    id: string
    title: string
    audience: 'leadership' | 'sales' | 'product' | 'general'
    priority: 'critical' | 'high' | 'medium'
    author: string
    timestamp: string
  }>
  competitorHeatmap: Array<{ id: string; name: string; initial: string; count: number }>
  topicActivity: Array<{ name: string; count: number; trend: 'up' | 'down' | 'neutral'; delta: number }>
  reviewQueueCount: number
  sweep: {
    lastStartedAt: string | null
    lastCompletedAt: string | null
    itemsFound: number | null
    status: string | null
  } | null
  suggestedCompetitors: Array<{ id: string; name: string; confidence: number; summary: string }>
  usageStats: {
    competitorsAdded: number
    sweepsRun: number
    itemsReviewed: number
    battleCardsCreated: number
  }
  winRatePulse: {
    currentRate90: number | null
    trendDelta: number | null
    sparkline: number[]
    competitorDeltas: Array<{ name: string; delta: number }>
  }
}

export function formatRelativeLabel(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export async function loadDashboardSnapshot(workspaceId: string): Promise<DashboardSnapshot> {
  const supabase = await createSupabaseServerClient()

  const { data: ws } = await supabase
    .from('workspace')
    .select('review_queue_threshold')
    .eq('id', workspaceId)
    .single()

  const threshold = ws?.review_queue_threshold ?? 30

  const [
    feedItems,
    competitorsRes,
    topicsRes,
    topicIntelRes,
    competitorCountRes,
    sweepCountRes,
    reviewedCountRes,
    battleCardCountRes,
    latestSweepRes,
    recentBriefsRes,
    suggestedRes,
    reviewQueueRes,
    heatmapRes,
    winLossRes,
  ] = await Promise.all([
    listFeedItems(workspaceId, { limit: 10 }),
    supabase.from('competitor').select('id,name').eq('workspace_id', workspaceId).eq('status', 'active').limit(24),
    supabase.from('topic').select('id,name').eq('workspace_id', workspaceId).eq('status', 'active').limit(12),
    supabase
      .from('intelligence_item')
      .select('related_topics')
      .eq('workspace_id', workspaceId)
      .gte('ingested_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('competitor').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('sweep').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase
      .from('intelligence_item')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('reviewed_at', 'is', null),
    supabase.from('battle_card').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase
      .from('sweep')
      .select('started_at,completed_at,status,items_found')
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('brief')
      .select('id,title,audience,priority,published_at,updated_at,status')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('suggested_competitor')
      .select('id,name,description_snippet,discovery_confidence')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .limit(6),
    supabase
      .from('intelligence_item')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('visibility', 'feed')
      .lt('mi_score', threshold)
      .is('reviewed_at', null),
    supabase
      .from('intelligence_item')
      .select('related_competitors')
      .eq('workspace_id', workspaceId)
      .gte('ingested_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase
      .from('win_loss_outcome')
      .select('competitor_id,outcome,close_date')
      .eq('workspace_id', workspaceId)
      .in('outcome', ['won', 'lost']),
  ])

  const competitors = competitorsRes.data ?? []
  const heatmapCounts = new Map<string, number>()
  for (const row of heatmapRes.data ?? []) {
    for (const cid of row.related_competitors ?? []) {
      heatmapCounts.set(cid, (heatmapCounts.get(cid) ?? 0) + 1)
    }
  }

  const competitorHeatmap = competitors.map((c) => ({
    id: c.id,
    name: c.name,
    initial: c.name.slice(0, 2).toUpperCase(),
    count: heatmapCounts.get(c.id) ?? 0,
  }))

  const topicRows = topicsRes.data ?? []

  const topicItemCounts = new Map<string, number>()
  for (const row of topicIntelRes.data ?? []) {
    for (const tid of row.related_topics ?? []) {
      topicItemCounts.set(tid, (topicItemCounts.get(tid) ?? 0) + 1)
    }
  }

  const topicActivity = topicRows.map((t) => ({
    name: t.name,
    count: topicItemCounts.get(t.id) ?? 0,
    trend: 'neutral' as const,
    delta: 0,
  }))

  const feed: DashboardFeedRow[] = feedItems.map((item) => {
    const primaryComp = item.relatedCompetitors?.[0]
    const name = primaryComp?.name ?? 'Market'
    return {
      id: item.id,
      title: item.title,
      competitorInitial: name.slice(0, 2).toUpperCase(),
      competitorName: name,
      mis: item.mis,
      timestampLabel: formatRelativeLabel(item.timestamp),
    }
  })

  const latestSweep = latestSweepRes.data

  const outcomes = winLossRes.data ?? []
  const nowMs = Date.now()
  const inDays = (iso: string, days: number) => new Date(iso).getTime() >= nowMs - days * 86400000
  const calcRate = (rows: Array<{ outcome: string }>) => {
    const won = rows.filter((r) => r.outcome === 'won').length
    const lost = rows.filter((r) => r.outcome === 'lost').length
    const total = won + lost
    return total > 0 ? Math.round((won / total) * 100) : null
  }

  const last90 = outcomes.filter((r) => inDays(r.close_date, 90))
  const prior90 = outcomes.filter((r) => {
    const t = new Date(r.close_date).getTime()
    return t < nowMs - 90 * 86400000 && t >= nowMs - 180 * 86400000
  })
  const currentRate90 = calcRate(last90)
  const priorRate90 = calcRate(prior90)
  const trendDelta =
    currentRate90 != null && priorRate90 != null ? currentRate90 - priorRate90 : null

  const sparkline: number[] = []
  for (let i = 7; i >= 0; i -= 1) {
    const end = nowMs - i * 7 * 86400000
    const start = end - 7 * 86400000
    const bucket = outcomes.filter((r) => {
      const t = new Date(r.close_date).getTime()
      return t >= start && t < end
    })
    sparkline.push(calcRate(bucket) ?? 0)
  }

  const compNameById = Object.fromEntries(competitors.map((c) => [c.id, c.name]))
  const byCompetitor = new Map<string, { won90: number; lost90: number; wonPrev90: number; lostPrev90: number }>()
  for (const o of outcomes) {
    const agg = byCompetitor.get(o.competitor_id) ?? { won90: 0, lost90: 0, wonPrev90: 0, lostPrev90: 0 }
    const t = new Date(o.close_date).getTime()
    if (t >= nowMs - 90 * 86400000) {
      if (o.outcome === 'won') agg.won90 += 1
      else agg.lost90 += 1
    } else if (t >= nowMs - 180 * 86400000) {
      if (o.outcome === 'won') agg.wonPrev90 += 1
      else agg.lostPrev90 += 1
    }
    byCompetitor.set(o.competitor_id, agg)
  }
  const competitorDeltas = [...byCompetitor.entries()]
    .map(([id, a]) => {
      const curDen = a.won90 + a.lost90
      const prevDen = a.wonPrev90 + a.lostPrev90
      if (curDen === 0 || prevDen === 0) return null
      const cur = Math.round((a.won90 / curDen) * 100)
      const prev = Math.round((a.wonPrev90 / prevDen) * 100)
      return { name: compNameById[id] ?? 'Competitor', delta: cur - prev, volume: curDen }
    })
    .filter((v): v is { name: string; delta: number; volume: number } => Boolean(v))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 2)
    .map(({ name, delta }) => ({ name, delta }))

  return {
    feed,
    recentBriefs: (recentBriefsRes.data ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      audience: b.audience,
      priority: b.priority,
      author: 'Team',
      timestamp: formatRelativeLabel(b.published_at ?? b.updated_at),
    })),
    competitorHeatmap,
    topicActivity,
    reviewQueueCount: reviewQueueRes.count ?? 0,
    sweep: latestSweep
      ? {
          lastStartedAt: latestSweep.started_at,
          lastCompletedAt: latestSweep.completed_at,
          itemsFound: latestSweep.items_found,
          status: latestSweep.status,
        }
      : null,
    suggestedCompetitors: (suggestedRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      confidence: Math.round((s.discovery_confidence ?? 0.5) * 100),
      summary: s.description_snippet ?? 'Suggested from recent intelligence.',
    })),
    usageStats: {
      competitorsAdded: competitorCountRes.count ?? 0,
      sweepsRun: sweepCountRes.count ?? 0,
      itemsReviewed: reviewedCountRes.count ?? 0,
      battleCardsCreated: battleCardCountRes.count ?? 0,
    },
    winRatePulse: {
      currentRate90,
      trendDelta,
      sparkline,
      competitorDeltas,
    },
  }
}
