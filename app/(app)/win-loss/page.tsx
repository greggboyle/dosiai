import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  aggregateByCompetitor,
  aggregateByReasonTag,
  listWinLossOutcomes,
} from '@/lib/win-loss/queries'
import { ensureStarterReasonTags } from '@/lib/win-loss/actions'
import { WinLossHubClient } from './win-loss-hub-client'

export default async function WinLossPage() {
  const supabase = await createSupabaseServerClient()
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) redirect('/onboarding')

  await ensureStarterReasonTags(member.workspace_id)

  const allRows = await listWinLossOutcomes(member.workspace_id)
  const canAnalyst = member.role === 'admin' || member.role === 'analyst'
  const outcomes = canAnalyst ? allRows : []

  const byCompetitor = await aggregateByCompetitor(member.workspace_id, allRows)
  const byReason = aggregateByReasonTag(allRows)

  return (
    <WinLossHubClient canAnalyst={canAnalyst} outcomes={outcomes} byCompetitor={byCompetitor} byReason={byReason} />
  )
}
