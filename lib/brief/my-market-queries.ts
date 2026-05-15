import { createSupabaseServerClient } from '@/lib/supabase/server'
import { briefRowToBrief } from '@/lib/brief/queries'
import { BRIEF_KIND_LABELS } from '@/lib/brief/brief-kind'
import { displayScopeLabel } from '@/lib/brief/scope-label'
import { stripRedundantPrefix } from '@/lib/utils/brief'
import type { BriefKind, Brief } from '@/lib/types'
import type { BriefReadStatus } from '@/lib/types/dosi'
import { getRelativeTime } from '@/lib/types'
import type { Database } from '@/lib/supabase/types'
import type { MyBriefsPagePayload, BriefCardData, MyBriefsViewMode } from '@/lib/brief/my-briefs-types'

type BriefRow = Database['public']['Tables']['brief']['Row']

const PAGE_SIZE = 20
const NEW_SECTION_CAP = 8

const ALL_BRIEF_KINDS: BriefKind[] = [
  'manual',
  'sweep_summary',
  'daily_summary',
  'weekly_intelligence',
  'regulatory_summary',
  'competitor',
]

function escapeIlike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function priorityRank(p: BriefRow['priority']): number {
  if (p === 'critical') return 0
  if (p === 'high') return 1
  return 2
}

function sortByPriorityThenUpdated(a: BriefRow, b: BriefRow): number {
  const pr = priorityRank(a.priority) - priorityRank(b.priority)
  if (pr !== 0) return pr
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

function effectiveStatus(
  row: { status: string; read_at: string | null } | undefined
): BriefReadStatus {
  if (!row) return 'unread'
  return row.status as BriefReadStatus
}

function isStaleRead(status: BriefReadStatus, updatedAt: string): boolean {
  if (status !== 'read' && status !== 'saved') return false
  const t = new Date(updatedAt).getTime()
  return Date.now() - t > 7 * 24 * 60 * 60 * 1000
}

function rowToCardData(
  r: BriefRow,
  userId: string,
  stateMap: Map<string, { status: string; read_at: string | null }>,
  authorSelfLabel: string
): BriefCardData {
  const status = effectiveStatus(stateMap.get(r.id))
  const label = r.author_id === userId ? authorSelfLabel : 'Teammate'
  const brief = briefRowToBrief(r, label)
  const isUnreadVisual = status === 'unread'
  const stale = isStaleRead(status, r.updated_at)
  return {
    brief,
    userStatus: status,
    relativeUpdated: getRelativeTime(r.updated_at),
    scopeLabel: displayScopeLabel(r),
    typeBadgeLabel: BRIEF_KIND_LABELS[r.brief_kind as BriefKind],
    displayTitle: stripRedundantPrefix(r.title, r.brief_kind as BriefKind),
    stale,
    isUnreadVisual,
  }
}

export async function loadBriefSubscriptions(workspaceId: string, userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workspace_member_brief_subscription')
    .select('brief_kind, subscribed')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error

  const map = new Map<BriefKind, boolean>()
  for (const row of data ?? []) {
    map.set(row.brief_kind as BriefKind, row.subscribed)
  }

  return ALL_BRIEF_KINDS.map((kind) => ({
    brief_kind: kind,
    subscribed: map.get(kind) ?? (kind === 'sweep_summary' ? false : true),
  }))
}

export async function countMyMarketUnread(workspaceId: string, userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient()

  const { data: subs, error: sErr } = await supabase
    .from('workspace_member_brief_subscription')
    .select('brief_kind')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('subscribed', true)

  if (sErr) throw sErr

  const kinds = [...new Set((subs ?? []).map((s) => s.brief_kind))]
  if (kinds.length === 0) return 0

  const { data: briefRows, error: bErr } = await supabase
    .from('brief')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .in('brief_kind', kinds)

  if (bErr) throw bErr
  const briefIds = (briefRows ?? []).map((b) => b.id)
  if (briefIds.length === 0) return 0

  const { data: states, error: stErr } = await supabase
    .from('brief_user_state')
    .select('brief_id, status')
    .eq('user_id', userId)
    .in('brief_id', briefIds)

  if (stErr) throw stErr
  const stateMap = new Map((states ?? []).map((s) => [s.brief_id, s.status]))

  return briefIds.filter((id) => {
    const st = stateMap.get(id)
    if (st === 'dismissed') return false
    return !st || st === 'unread'
  }).length
}

export type MyBriefsSearchParams = {
  view?: string
  q?: string
  types?: string
  audience?: string
  status?: string
  from?: string
  roffset?: string
  coffset?: string
}

export async function loadMyBriefsPageData(
  workspaceId: string,
  userId: string,
  authorSelfLabel: string,
  sp: MyBriefsSearchParams
): Promise<MyBriefsPagePayload> {
  const supabase = await createSupabaseServerClient()

  const view: MyBriefsViewMode =
    sp.view === 'type' || sp.view === 'chronological' ? sp.view : 'importance'

  const [{ data: wsRow }, subsRows] = await Promise.all([
    supabase
      .from('workspace')
      .select('last_sweep_at, review_queue_threshold')
      .eq('id', workspaceId)
      .maybeSingle(),
    loadBriefSubscriptions(workspaceId, userId),
  ])

  const reviewThreshold = wsRow?.review_queue_threshold ?? 30
  const lastSweepRelative = wsRow?.last_sweep_at ? getRelativeTime(wsRow.last_sweep_at) : null

  const { count: publishedBriefTotal } = await supabase
    .from('brief')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')

  const publishedCount = publishedBriefTotal ?? 0

  const subscribedKinds = subsRows.filter((s) => s.subscribed).map((s) => s.brief_kind)
  if (subscribedKinds.length === 0) {
    return emptyPayload(
      view,
      workspaceId,
      reviewThreshold,
      lastSweepRelative,
      subsRows,
      sp,
      false,
      true,
      false
    )
  }

  let kindsFilter = new Set<BriefKind>(subscribedKinds)
  if (sp.types?.trim()) {
    const wanted = new Set(
      sp.types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) as BriefKind[]
    )
    kindsFilter = new Set([...kindsFilter].filter((k) => wanted.has(k)))
  }

  const kinds = [...kindsFilter]
  if (kinds.length === 0) {
    return emptyPayload(
      view,
      workspaceId,
      reviewThreshold,
      lastSweepRelative,
      subsRows,
      sp,
      true,
      false,
      false
    )
  }

  let query = supabase
    .from('brief')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .in('brief_kind', kinds)

  if (sp.from === '7d') {
    const cut = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('updated_at', cut)
  } else if (sp.from === '30d') {
    const cut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('updated_at', cut)
  } else if (sp.from === '90d') {
    const cut = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('updated_at', cut)
  }

  if (sp.audience?.trim()) {
    const auds = sp.audience.split(',').map((a) => a.trim()) as Brief['audience'][]
    query = query.in('audience', auds)
  }

  const qRaw = sp.q?.trim() ?? ''
  if (qRaw.length > 0) {
    const safe = escapeIlike(qRaw.slice(0, 200))
    const pattern = `%${safe}%`
    query = query.or(`title.ilike.${pattern},summary.ilike.${pattern},body.ilike.${pattern}`)
  }

  query = query.order('updated_at', { ascending: false }).limit(400)

  const { data: briefRows, error: bErr } = await query
  if (bErr) throw bErr
  const rows = (briefRows ?? []) as BriefRow[]
  if (rows.length === 0) {
    const hasFilters = Boolean(
      qRaw ||
        sp.types?.trim() ||
        sp.audience?.trim() ||
        sp.from ||
        (sp.status && sp.status !== 'all')
    )
    return emptyPayload(
      view,
      workspaceId,
      reviewThreshold,
      lastSweepRelative,
      subsRows,
      sp,
      hasFilters,
      false,
      !hasFilters && publishedCount === 0
    )
  }

  const ids = rows.map((r) => r.id)
  const { data: states, error: sErr } = await supabase
    .from('brief_user_state')
    .select('brief_id, status, read_at')
    .eq('user_id', userId)
    .in('brief_id', ids)

  if (sErr) throw sErr
  const stateMap = new Map((states ?? []).map((s) => [s.brief_id, { status: s.status, read_at: s.read_at }]))

  let cards: BriefCardData[] = rows.map((r) => rowToCardData(r, userId, stateMap, authorSelfLabel))

  const statusParam = sp.status ?? 'all'
  if (statusParam === 'unread') {
    cards = cards.filter((c) => c.userStatus === 'unread')
  } else if (statusParam === 'saved') {
    cards = cards.filter((c) => c.userStatus === 'saved')
  }

  const activeCards = cards.filter((c) => c.userStatus !== 'dismissed')
  const unreadCount = activeCards.filter((c) => c.userStatus === 'unread').length
  const totalCount = activeCards.length

  const activeFilterCount = [
    qRaw.length > 0,
    Boolean(sp.types?.trim()),
    Boolean(sp.audience?.trim()),
    Boolean(sp.from),
    statusParam !== 'all',
  ].filter(Boolean).length

  const recentOffset = Math.max(0, Number.parseInt(sp.roffset ?? '0', 10) || 0)
  const chronologicalOffset = Math.max(0, Number.parseInt(sp.coffset ?? '0', 10) || 0)

  // Partition for importance view
  const nonDismissed = cards.filter((c) => c.userStatus !== 'dismissed')
  const archivedCards = cards.filter((c) => c.userStatus === 'dismissed')

  const unreadCards = nonDismissed.filter((c) => c.userStatus === 'unread').sort((a, b) => {
    const ra = rows.find((x) => x.id === a.brief.id)!
    const rb = rows.find((x) => x.id === b.brief.id)!
    return sortByPriorityThenUpdated(ra, rb)
  })

  const readLike = nonDismissed.filter((c) => c.userStatus === 'read' || c.userStatus === 'saved').sort((a, b) => {
    const ra = rows.find((x) => x.id === a.brief.id)!
    const rb = rows.find((x) => x.id === b.brief.id)!
    return sortByPriorityThenUpdated(ra, rb)
  })

  const newForYou = unreadCards.slice(0, NEW_SECTION_CAP)
  const newForYouOverflow = Math.max(0, unreadCards.length - NEW_SECTION_CAP)

  const recentSlice = readLike.slice(recentOffset, recentOffset + PAGE_SIZE)
  const hasMoreRecent = readLike.length > recentOffset + PAGE_SIZE

  const chronoSorted = [...nonDismissed].sort(
    (a, b) => new Date(b.brief.updatedAt).getTime() - new Date(a.brief.updatedAt).getTime()
  )
  const chronological = chronoSorted.slice(chronologicalOffset, chronologicalOffset + PAGE_SIZE)
  const hasMoreChronological = chronoSorted.length > chronologicalOffset + PAGE_SIZE

  const byType: MyBriefsPagePayload['byType'] = [
    {
      sectionTitle: 'Team briefs',
      briefKinds: ['manual'],
      cards: nonDismissed.filter((c) => c.brief.briefKind === 'manual'),
    },
    {
      sectionTitle: 'Competitor briefs',
      briefKinds: ['competitor'],
      cards: nonDismissed.filter((c) => c.brief.briefKind === 'competitor'),
    },
    {
      sectionTitle: 'Regulatory summaries',
      briefKinds: ['regulatory_summary'],
      cards: nonDismissed.filter((c) => c.brief.briefKind === 'regulatory_summary'),
    },
    {
      sectionTitle: 'Sweep summaries',
      briefKinds: ['sweep_summary'],
      cards: nonDismissed.filter((c) => c.brief.briefKind === 'sweep_summary'),
    },
    {
      sectionTitle: 'Daily & weekly summaries',
      briefKinds: ['daily_summary', 'weekly_intelligence'],
      cards: nonDismissed.filter((c) =>
        c.brief.briefKind === 'daily_summary' || c.brief.briefKind === 'weekly_intelligence'
          ? true
          : false
      ),
    },
  ].filter((s) => s.cards.length > 0)

  for (const s of byType) {
    s.cards.sort((a, b) => {
      const ra = rows.find((x) => x.id === a.brief.id)!
      const rb = rows.find((x) => x.id === b.brief.id)!
      return sortByPriorityThenUpdated(ra, rb)
    })
  }

  const emptyBecauseFilters =
    cards.length === 0 && Boolean(qRaw || sp.types || sp.audience || sp.from || (sp.status && sp.status !== 'all'))

  return {
    view,
    workspaceId,
    reviewThreshold,
    unreadCount,
    totalCount,
    lastSweepRelative,
    newForYou,
    newForYouOverflow,
    recent: recentSlice,
    hasMoreRecent,
    recentOffset,
    archived: archivedCards.sort(
      (a, b) => new Date(b.brief.updatedAt).getTime() - new Date(a.brief.updatedAt).getTime()
    ),
    chronological,
    hasMoreChronological,
    chronologicalOffset,
    byType,
    subscriptions: subsRows,
    activeFilterCount,
    searchQuery: qRaw,
    emptyBecauseFilters,
    noSubscriptions: false,
    emptyWorkspace: false,
  }
}

function emptyPayload(
  view: MyBriefsViewMode,
  workspaceId: string,
  reviewThreshold: number,
  lastSweepRelative: string | null,
  subsRows: Awaited<ReturnType<typeof loadBriefSubscriptions>>,
  sp: MyBriefsSearchParams,
  emptyBecauseFilters: boolean,
  noSubscriptions: boolean,
  emptyWorkspace: boolean
): MyBriefsPagePayload {
  const activeFilterCount = [
    Boolean(sp.q?.trim()),
    Boolean(sp.types?.trim()),
    Boolean(sp.audience?.trim()),
    Boolean(sp.from),
    Boolean(sp.status && sp.status !== 'all'),
  ].filter(Boolean).length

  return {
    view,
    workspaceId,
    reviewThreshold,
    noSubscriptions,
    emptyWorkspace,
    unreadCount: 0,
    totalCount: 0,
    lastSweepRelative,
    newForYou: [],
    newForYouOverflow: 0,
    recent: [],
    hasMoreRecent: false,
    recentOffset: 0,
    archived: [],
    chronological: [],
    hasMoreChronological: false,
    chronologicalOffset: 0,
    byType: [],
    subscriptions: subsRows,
    activeFilterCount,
    searchQuery: sp.q?.trim() ?? '',
    emptyBecauseFilters,
  }
}

/** @deprecated use loadMyBriefsPageData */
export type MyMarketBriefRow = {
  brief: Brief
  readAt: string | null
  relativeUpdated: string
}

export async function loadMyMarketBriefs(
  workspaceId: string,
  userId: string,
  authorSelfLabel: string
): Promise<MyMarketBriefRow[]> {
  const data = await loadMyBriefsPageData(workspaceId, userId, authorSelfLabel, { view: 'chronological' })
  return data.chronological.map((c) => ({
    brief: c.brief,
    readAt: c.userStatus === 'unread' ? null : c.brief.publishedAt ?? c.brief.updatedAt,
    relativeUpdated: c.relativeUpdated,
  }))
}
