import { Suspense } from 'react'
import { FeedClient } from './feed-client'
import { getWorkspaceIdForUser, listFeedItems } from '@/lib/feed/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function FeedPage() {
  const workspaceId = await getWorkspaceIdForUser()
  const initialItems = workspaceId ? await listFeedItems(workspaceId) : []

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
      <FeedClient initialItems={initialItems} reviewQueueThreshold={reviewQueueThreshold} />
    </Suspense>
  )
}
