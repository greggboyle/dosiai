import { Suspense } from 'react'
import { FeedClient } from './feed-client'
import { getWorkspaceIdForUser, listFeedItems, type FeedSubject } from '@/lib/feed/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) ?? {}
  const subjectParam = Array.isArray(params.subject) ? params.subject[0] : params.subject
  const subject: FeedSubject = subjectParam === 'our-company' ? 'our-company' : 'competitors'

  const workspaceId = await getWorkspaceIdForUser()
  const initialItems = workspaceId ? await listFeedItems(workspaceId, { subject }) : []

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
      <FeedClient initialItems={initialItems} reviewQueueThreshold={reviewQueueThreshold} initialSubject={subject} />
    </Suspense>
  )
}
