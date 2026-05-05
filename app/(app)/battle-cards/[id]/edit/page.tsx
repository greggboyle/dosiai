import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBattleCardRow, listSections } from '@/lib/battle-cards/queries'
import { BattleCardAuthorClient } from './battle-card-author-client'

export default async function BattleCardEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) notFound()

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role === 'viewer') notFound()

  const card = await getBattleCardRow(id)
  if (!card || card.workspace_id !== member.workspace_id) notFound()

  const { data: competitor } = await supabase.from('competitor').select('name').eq('id', card.competitor_id).single()

  const sections = await listSections(id)

  const { data: workspace } = await supabase.from('workspace').select('status').eq('id', member.workspace_id).single()

  return (
    <BattleCardAuthorClient
      battleCardId={id}
      competitorId={card.competitor_id}
      competitorName={competitor?.name ?? 'Competitor'}
      status={card.status}
      freshnessScore={card.freshness_score}
      sections={sections}
      readOnly={workspace?.status === 'read_only'}
    />
  )
}
