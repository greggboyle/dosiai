import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listSections } from '@/lib/battle-cards/queries'
import { buildRepBattleCardView } from '@/lib/battle-cards/rep-mapper'
import { RepBattleCardView } from '@/components/rep/rep-battle-card-view'

export default async function RepBattleCardPage({ params }: { params: Promise<{ competitorId: string }> }) {
  const { competitorId } = await params
  const supabase = await createSupabaseServerClient()
  const session = await getSession()
  if (!session?.user) notFound()

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) notFound()

  const { data: competitor } = await supabase
    .from('competitor')
    .select('id, name, tier')
    .eq('id', competitorId)
    .eq('workspace_id', member.workspace_id)
    .maybeSingle()

  if (!competitor) notFound()

  const { data: card } = await supabase
    .from('battle_card')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .eq('competitor_id', competitorId)
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background text-muted-foreground text-sm">
        No published battle card for this competitor yet.
      </div>
    )
  }

  const sections = await listSections(card.id)
  const tierLabels: Record<string, string> = {
    primary_direct: 'Primary · Direct',
    secondary_indirect: 'Secondary',
    emerging: 'Emerging',
    adjacent: 'Adjacent',
    watching: 'Watching',
  }

  const view = buildRepBattleCardView({
    competitorName: competitor.name,
    competitorTier: competitor.tier ? tierLabels[competitor.tier] ?? competitor.tier : undefined,
    freshnessScore: card.freshness_score,
    sections,
  })

  return <RepBattleCardView data={view} />
}
