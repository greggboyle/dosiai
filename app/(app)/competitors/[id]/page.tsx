import { notFound, redirect } from 'next/navigation'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { loadCompetitorProfile } from '@/lib/competitors/load-profile'
import { CompetitorProfileClient } from './competitor-profile-client'

export default async function CompetitorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) redirect('/sign-in')

  const data = await loadCompetitorProfile(workspaceId, id)
  if (!data) notFound()

  return <CompetitorProfileClient {...data} />
}
