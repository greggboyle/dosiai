import { Suspense } from 'react'
import { FeedClient } from './feed-client'
import {
  getFeedItemsByIds,
  getWorkspaceIdForUser,
  listFeedItemsPage,
  type FeedSubject,
} from '@/lib/feed/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRelativeTime } from '@/lib/types'

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) ?? {}
  const subjectParam = Array.isArray(params.subject) ? params.subject[0] : params.subject
  const subject: FeedSubject =
    subjectParam === 'our-company'
      ? 'our-company'
      : subjectParam === 'all'
        ? 'all'
        : 'competitors'
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page
  const itemParam = Array.isArray(params.item) ? params.item[0] : params.item
  const parsedPage = Number.parseInt(pageParam ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const pageSize = 10

  const supabaseAuth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  const workspaceId = await getWorkspaceIdForUser()
  const paged = workspaceId
    ? await listFeedItemsPage(workspaceId, { subject, page, pageSize })
    : { items: [], total: 0, page: 1, pageSize, totalPages: 1 }
  const selectedItem =
    workspaceId && itemParam ? (await getFeedItemsByIds(workspaceId, [itemParam]))[0] ?? null : null
  let competitorOptions: Array<{ id: string; name: string }> = []
  if (workspaceId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('competitor')
      .select('id,name')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true })
    if (error) throw error
    competitorOptions = data ?? []
  }

  let reviewQueueThreshold = 30
  let lastSweepRelative: string | null = null
  if (workspaceId) {
    const supabase = await createSupabaseServerClient()
    const { data: ws } = await supabase
      .from('workspace')
      .select('review_queue_threshold, last_sweep_at')
      .eq('id', workspaceId)
      .maybeSingle()
    reviewQueueThreshold = ws?.review_queue_threshold ?? 30
    if (ws?.last_sweep_at) {
      lastSweepRelative = getRelativeTime(ws.last_sweep_at)
    }
  }

  const unreadOnPage = paged.items.filter((i) => !i.isRead).length
  const listHeaderSubtitle = `${unreadOnPage} unread on this page · ${paged.total} total${
    lastSweepRelative ? ` · Last sweep ${lastSweepRelative}` : ''
  }`

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading feed…</div>}>
      <FeedClient
        initialItems={paged.items}
        reviewQueueThreshold={reviewQueueThreshold}
        initialSubject={subject}
        currentPage={paged.page}
        pageSize={paged.pageSize}
        totalItems={paged.total}
        totalPages={paged.totalPages}
        initialSelectedItem={selectedItem}
        competitorOptions={competitorOptions}
        listHeaderSubtitle={listHeaderSubtitle}
        userId={user?.id}
      />
    </Suspense>
  )
}
