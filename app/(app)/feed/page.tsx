import { FeedClient } from './feed-client'
import { getWorkspaceIdForUser, listFeedItems } from '@/lib/feed/queries'

export default async function FeedPage() {
  const workspaceId = await getWorkspaceIdForUser()
  const initialItems = workspaceId ? await listFeedItems(workspaceId) : []
  return <FeedClient initialItems={initialItems} />
}
