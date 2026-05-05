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

export type DashboardSnapshot = {
  feed: DashboardFeedRow[]
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
    suggestedRes,
    reviewQueueRes,
    heatmapRes,
  ] = await Promise.all([
    listFeedItems(workspaceId, 8),
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

  return {
    feed,
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
  }
}
