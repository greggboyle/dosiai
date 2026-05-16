import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { intelligenceItemFromDb } from '@/lib/intelligence/map-row'
import type { IntelligenceItem } from '@/lib/types'

export type FeedSubject = 'competitors' | 'our-company' | 'all'

export type FeedServerFilters = {
  subject?: FeedSubject
  categories?: Array<'buy-side' | 'sell-side' | 'channel' | 'regulatory'>
  competitorNames?: string[]
  topicNames?: string[]
  minScore?: number
  customerVoiceOnly?: boolean
}

async function mapFeedRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: Array<{ related_competitors: string[] | null; related_topics: string[] | null } & Record<string, unknown>>
): Promise<IntelligenceItem[]> {
  if (!rows.length) return []

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
  const itemIds = rows
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  let userStatesByItemId: Record<string, { status: 'new' | 'read' | 'bookmarked'; is_watching: boolean }> = {}
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user && itemIds.length > 0) {
    const { data: states } = await supabase
      .from('item_user_state')
      .select('item_id,status,is_watching')
      .eq('user_id', user.id)
      .in('item_id', itemIds)
    userStatesByItemId = Object.fromEntries(
      (states ?? []).map((state) => [
        state.item_id,
        { status: state.status, is_watching: state.is_watching },
      ])
    )
  }

  return rows.map((row) => {
    const item = intelligenceItemFromDb(row as never)
    const state = userStatesByItemId[item.id]
    item.isRead = state?.status === 'read'
    item.isBookmarked = state?.status === 'bookmarked'
    item.isWatching = state?.is_watching ?? false
    item.relatedCompetitors = ((row.related_competitors as string[] | null) ?? []).map((id) => ({
      id,
      name: compById[id]?.name ?? 'Competitor',
    }))
    item.relatedTopics = ((row.related_topics as string[] | null) ?? []).map((id) => ({
      id,
      name: topById[id]?.name ?? 'Topic',
    }))
    return item
  })
}

export async function getWorkspaceIdForUser(): Promise<string | null> {
  const session = await getSession()
  if (!session?.user) return null
  const supabase = await createSupabaseServerClient()
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
  if (subject === 'our-company') query = query.eq('is_about_self', true)
  else if (subject === 'competitors') query = query.eq('is_about_self', false)

  const { data: rows, error } = await query
    .order('event_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return mapFeedRows(supabase, (rows ?? []) as never)
}

export async function listFeedItemsPage(
  workspaceId: string,
  opts?: { page?: number; pageSize?: number; subject?: FeedSubject }
): Promise<{ items: IntelligenceItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const pageSize = Math.max(1, Math.min(100, opts?.pageSize ?? 25))
  const page = Math.max(1, opts?.page ?? 1)
  const subject = opts?.subject ?? 'competitors'
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('intelligence_item')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('visibility', 'feed')
  if (subject === 'our-company') query = query.eq('is_about_self', true)
  else if (subject === 'competitors') query = query.eq('is_about_self', false)

  const { data: rows, error, count } = await query
    .order('event_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  if (!rows?.length) {
    const total = count ?? 0
    return {
      items: [],
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  const items = await mapFeedRows(supabase, rows as never)

  const total = count ?? 0
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function listFeedItemsFiltered(
  workspaceId: string,
  filters: FeedServerFilters
): Promise<IntelligenceItem[]> {
  const supabase = await createSupabaseServerClient()
  const subject = filters.subject ?? 'competitors'
  const minScore = Math.max(0, filters.minScore ?? 0)
  const categories = (filters.categories ?? []).filter(Boolean)
  const competitorNames = [...new Set((filters.competitorNames ?? []).map((v) => v.trim()).filter(Boolean))]
  const topicNames = [...new Set((filters.topicNames ?? []).map((v) => v.trim()).filter(Boolean))]

  let query = supabase
    .from('intelligence_item')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('visibility', 'feed')

  if (subject === 'our-company') query = query.eq('is_about_self', true)
  else if (subject === 'competitors') query = query.eq('is_about_self', false)
  if (categories.length > 0) query = query.in('category', categories as string[])
  if (minScore > 0) query = query.gte('mi_score', minScore)
  if (filters.customerVoiceOnly) query = query.not('review_metadata', 'is', null)

  if (competitorNames.length > 0) {
    const { data: compRows, error: compErr } = await supabase
      .from('competitor')
      .select('id,name')
      .eq('workspace_id', workspaceId)
      .in('name', competitorNames)
    if (compErr) throw compErr
    const competitorIds = (compRows ?? []).map((r) => r.id)
    if (competitorIds.length === 0) return []
    query = query.overlaps('related_competitors', competitorIds)
  }

  if (topicNames.length > 0) {
    const { data: topicRows, error: topicErr } = await supabase
      .from('topic')
      .select('id,name')
      .eq('workspace_id', workspaceId)
      .in('name', topicNames)
    if (topicErr) throw topicErr
    const topicIds = (topicRows ?? []).map((r) => r.id)
    if (topicIds.length === 0) return []
    query = query.overlaps('related_topics', topicIds)
  }

  const { data: rows, error } = await query
    .order('event_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false })
    .limit(2000)
  if (error) throw error
  return mapFeedRows(supabase, (rows ?? []) as never)
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
  return mapFeedRows(supabase, (rows ?? []) as never)
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
  return mapFeedRows(supabase, (rows ?? []) as never)
}
