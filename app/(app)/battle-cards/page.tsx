import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listBattleCardsWithCompetitor } from '@/lib/battle-cards/queries'
import { BattleCardsListClient } from './battle-cards-list-client'

export default async function BattleCardsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
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

  const rows = await listBattleCardsWithCompetitor(member.workspace_id)
  const cards = rows.map((r) => ({
    id: r.id,
    competitorId: r.competitor_id,
    competitorName: r.competitorName,
    status: r.status,
    version: r.version,
    freshness_score: r.freshness_score,
    updated_at: r.updated_at,
  }))

  const canAuthor = member.role === 'admin' || member.role === 'analyst'

  return <BattleCardsListClient cards={cards} canAuthor={canAuthor} />
}
