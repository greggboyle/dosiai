import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { loadDashboardSnapshot } from '@/lib/dashboard/queries'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { DashboardHomeClient } from './dashboard-home-client'

export default async function HomePage() {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')

  const session = await getSession()
  const firstName =
    (session?.user.user_metadata?.full_name as string | undefined)?.split(/\s+/)[0] ??
    session?.user.email?.split('@')[0] ??
    'there'

  const snapshot = await loadDashboardSnapshot(workspaceId)

  return <DashboardHomeClient snapshot={snapshot} firstName={firstName} />
}
