import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listWorkspaceBattleCards } from '@/lib/win-loss/queries'
import { WinLossLogClient } from './win-loss-log-client'

export default async function WinLossLogPage() {
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
  if (member.role === 'viewer') notFound()

  const { data: competitors } = await supabase
    .from('competitor')
    .select('id, name, segment_relevance')
    .eq('workspace_id', member.workspace_id)
    .eq('status', 'active')
    .order('name')

  const battleCards = await listWorkspaceBattleCards(member.workspace_id)

  return (
    <WinLossLogClient
      competitors={(competitors ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        segments: (c.segment_relevance ?? []).filter(Boolean) as string[],
      }))}
      battleCards={battleCards}
    />
  )
}
