import { Suspense } from 'react'
import { FeedClient } from './feed-client'
import {
  getFeedItemsByIds,
  getWorkspaceIdForUser,
  listFeedItemsPage,
  type FeedSubject,
} from '@/lib/feed/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) ?? {}
  const subjectParam = Array.isArray(params.subject) ? params.subject[0] : params.subject
  const subject: FeedSubject = subjectParam === 'our-company' ? 'our-company' : 'competitors'
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page
  const itemParam = Array.isArray(params.item) ? params.item[0] : params.item
  const parsedPage = Number.parseInt(pageParam ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const pageSize = 25

  const workspaceId = await getWorkspaceIdForUser()
  const paged = workspaceId
    ? await listFeedItemsPage(workspaceId, { subject, page, pageSize })
    : { items: [], total: 0, page: 1, pageSize, totalPages: 1 }
  const selectedItem =
    workspaceId && itemParam ? (await getFeedItemsByIds(workspaceId, [itemParam]))[0] ?? null : null

  let reviewQueueThreshold = 30
  if (workspaceId) {
    const supabase = await createSupabaseServerClient()
    const { data: ws } = await supabase
      .from('workspace')
      .select('review_queue_threshold')
      .eq('id', workspaceId)
      .maybeSingle()
    reviewQueueThreshold = ws?.review_queue_threshold ?? 30
  }

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
      />
    </Suspense>
  )
}
