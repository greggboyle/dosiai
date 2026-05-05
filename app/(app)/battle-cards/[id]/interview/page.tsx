import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listIntelItemsForCompetitor } from '@/lib/feed/queries'
import { getBattleCardRow, listSections } from '@/lib/battle-cards/queries'
import { BattleCardInterviewClient } from './battle-card-interview-client'

export default async function BattleCardInterviewPage({ params }: { params: Promise<{ id: string }> }) {
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
  const feedPreview = await listIntelItemsForCompetitor(member.workspace_id, card.competitor_id, {
    limit: 5,
    days: 30,
  })

  const interviewState =
    (card.interview_state as {
      completedSectionTypes?: import('@/lib/types').BattleCardSectionType[]
      draftAnswers?: Record<string, string>
    }) ?? {}

  return (
    <BattleCardInterviewClient
      battleCardId={id}
      competitorName={competitor?.name ?? 'Competitor'}
      feedPreview={feedPreview}
      sections={sections}
      interviewState={interviewState}
    />
  )
}
