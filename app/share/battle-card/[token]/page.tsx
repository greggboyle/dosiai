import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { RepBattleCardView } from '@/components/rep/rep-battle-card-view'
import { listSectionsAdmin } from '@/lib/battle-cards/queries'
import { buildRepBattleCardView } from '@/lib/battle-cards/rep-mapper'

export default async function SharedBattleCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createSupabaseAdminClient()

  const { data: link, error } = await supabase
    .from('battle_card_share_link')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error || !link) notFound()
  if (link.revoked_at) notFound()
  if (new Date(link.expires_at).getTime() < Date.now()) notFound()

  const { data: card } = await supabase.from('battle_card').select('*').eq('id', link.battle_card_id).single()

  if (!card) notFound()

  const { data: competitor } = await supabase.from('competitor').select('name, tier').eq('id', card.competitor_id).single()

  const sections = await listSectionsAdmin(card.id)

  const tierLabels: Record<string, string> = {
    primary_direct: 'Primary · Direct',
    secondary_indirect: 'Secondary',
    emerging: 'Emerging',
    adjacent: 'Adjacent',
    watching: 'Watching',
  }

  const view = buildRepBattleCardView({
    competitorName: competitor?.name ?? 'Competitor',
    competitorTier: competitor?.tier ? tierLabels[competitor.tier] ?? competitor.tier : undefined,
    freshnessScore: card.freshness_score,
    sections,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-2 text-center text-[10px] text-muted-foreground border-b border-border/60">
        Shared battle card · DOSI.AI
      </div>
      <RepBattleCardView data={view} />
    </div>
  )
}
