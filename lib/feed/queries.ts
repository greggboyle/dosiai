import { createSupabaseServerClient } from '@/lib/supabase/server'
import { intelligenceItemFromDb } from '@/lib/intelligence/map-row'
import type { IntelligenceItem } from '@/lib/types'

export type FeedSubject = 'competitors' | 'our-company'

export async function getWorkspaceIdForUser(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return null
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return member?.workspace_id ?? null
}

export async function listFeedItems(
  workspaceId: string,
  opts?: { limit?: number; subject?: FeedSubject }
): Promise<IntelligenceItem[]> {
  const limit = opts?.limit ?? 100
  const subject = opts?.subject ?? 'competitors'
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('intelligence_item')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('visibility', 'feed')
  query = subject === 'our-company' ? query.eq('is_about_self', true) : query.eq('is_about_self', false)

  const { data: rows, error } = await query.order('mi_score', { ascending: false }).order('ingested_at', { ascending: false }).limit(limit)

  if (error) throw error
  if (!rows?.length) return []

  const compIds = new Set<string>()
  const topicIds = new Set<string>()
  for (const r of rows) {
    for (const id of r.related_competitors ?? []) compIds.add(id)
    for (const id of r.related_topics ?? []) topicIds.add(id)
  }

  const [{ data: comps }, { data: tops }] = await Promise.all([
    compIds.size
      ? supabase.from('competitor').select('id,name').in('id', [...compIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    topicIds.size
      ? supabase.from('topic').select('id,name').in('id', [...topicIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const compById = Object.fromEntries((comps ?? []).map((c) => [c.id, c]))
  const topById = Object.fromEntries((tops ?? []).map((t) => [t.id, t]))

  return rows.map((row) => {
    const item = intelligenceItemFromDb(row)
    item.relatedCompetitors = (row.related_competitors ?? []).map((id) => ({
      id,
      name: compById[id]?.name ?? 'Competitor',
    }))
    item.relatedTopics = (row.related_topics ?? []).map((id) => ({
      id,
      name: topById[id]?.name ?? 'Topic',
    }))
    return item
  })
}

/** Recent feed-visible items mentioning a competitor (for battle card interview context). */
export async function listIntelItemsForCompetitor(
  workspaceId: string,
  competitorId: string,
  opts?: { limit?: number; days?: number }
): Promise<IntelligenceItem[]> {
  const limit = opts?.limit ?? 5
  const days = opts?.days ?? 30
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('intelligence_item')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('visibility', 'feed')
    .gte('ingested_at', since)
    .contains('related_competitors', [competitorId])
    .order('mi_score', { ascending: false })
    .limit(limit)

  if (error) throw error
  if (!rows?.length) return []

  const compIds = new Set<string>()
  const topicIds = new Set<string>()
  for (const r of rows) {
    for (const id of r.related_competitors ?? []) compIds.add(id)
    for (const id of r.related_topics ?? []) topicIds.add(id)
  }

  const [{ data: comps }, { data: tops }] = await Promise.all([
    compIds.size
      ? supabase.from('competitor').select('id,name').in('id', [...compIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    topicIds.size
      ? supabase.from('topic').select('id,name').in('id', [...topicIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const compById = Object.fromEntries((comps ?? []).map((c) => [c.id, c]))
  const topById = Object.fromEntries((tops ?? []).map((t) => [t.id, t]))

  return rows.map((row) => {
    const item = intelligenceItemFromDb(row)
    item.relatedCompetitors = (row.related_competitors ?? []).map((id) => ({
      id,
      name: compById[id]?.name ?? 'Competitor',
    }))
    item.relatedTopics = (row.related_topics ?? []).map((id) => ({
      id,
      name: topById[id]?.name ?? 'Topic',
    }))
    return item
  })
}

export async function getFeedItemsByIds(workspaceId: string, ids: string[]): Promise<IntelligenceItem[]> {
  if (!ids.length) return []
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('intelligence_item')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('id', ids)

  if (error) throw error
  if (!rows?.length) return []

  const compIds = new Set<string>()
  const topicIds = new Set<string>()
  for (const r of rows) {
    for (const id of r.related_competitors ?? []) compIds.add(id)
    for (const id of r.related_topics ?? []) topicIds.add(id)
  }

  const [{ data: comps }, { data: tops }] = await Promise.all([
    compIds.size
      ? supabase.from('competitor').select('id,name').in('id', [...compIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    topicIds.size
      ? supabase.from('topic').select('id,name').in('id', [...topicIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const compById = Object.fromEntries((comps ?? []).map((c) => [c.id, c]))
  const topById = Object.fromEntries((tops ?? []).map((t) => [t.id, t]))

  return rows.map((row) => {
    const item = intelligenceItemFromDb(row)
    item.relatedCompetitors = (row.related_competitors ?? []).map((id) => ({
      id,
      name: compById[id]?.name ?? 'Competitor',
    }))
    item.relatedTopics = (row.related_topics ?? []).map((id) => ({
      id,
      name: topById[id]?.name ?? 'Topic',
    }))
    return item
  })
}
