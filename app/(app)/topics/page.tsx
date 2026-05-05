import { redirect } from 'next/navigation'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { listTopicsForWorkspace } from '@/lib/topics/queries'
import { TopicsPageClient } from './topics-page-client'

export default async function TopicsPage() {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')

  const initialTopics = await listTopicsForWorkspace(workspaceId)

  return <TopicsPageClient initialTopics={initialTopics} />
}
