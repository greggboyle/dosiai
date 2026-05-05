import { redirect } from 'next/navigation'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { listCompetitorsForWorkspace } from '@/lib/competitors/queries'
import { CompetitorsPageClient } from './competitors-page-client'

export default async function CompetitorsPage() {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')

  const competitors = await listCompetitorsForWorkspace(workspaceId)

  return <CompetitorsPageClient initialCompetitors={competitors} />
}
