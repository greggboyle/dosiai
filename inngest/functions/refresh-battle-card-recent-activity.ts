import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeFreshnessScore } from '@/lib/battle-cards/freshness'
import type { BattleCardSectionType } from '@/lib/types'

/** Nightly: refresh `recent_activity` section from last 30 days of intel for each active battle card. */
export const refreshBattleCardRecentActivity = inngest.createFunction(
  { id: 'refresh-battle-card-recent-activity' },
  { cron: '30 5 * * *' },
  async ({ step }) => {
    return step.run('refresh-all', async () => {
      const supabase = createSupabaseAdminClient()
      const { data: cards, error } = await supabase
        .from('battle_card')
        .select('id, workspace_id, competitor_id, status')
        .in('status', ['draft', 'published'])

      if (error) throw error

      let updated = 0
      const since = new Date(Date.now() - 30 * 86400000).toISOString()

      for (const card of cards ?? []) {
        const { data: items } = await supabase
          .from('intelligence_item')
          .select('id, title, ingested_at, mi_score')
          .eq('workspace_id', card.workspace_id)
          .eq('visibility', 'feed')
          .gte('ingested_at', since)
          .contains('related_competitors', [card.competitor_id])
          .order('mi_score', { ascending: false })
          .limit(12)

        const content = {
          items:
            items?.map((r) => ({
              itemId: r.id,
              title: r.title,
              ingestedAt: r.ingested_at,
              miScore: r.mi_score,
            })) ?? [],
        }

        const { data: section } = await supabase
          .from('battle_card_section')
          .select('id')
          .eq('battle_card_id', card.id)
          .eq('section_type', 'recent_activity')
          .maybeSingle()

        if (!section?.id) continue

        await supabase
          .from('battle_card_section')
          .update({
            content: content as never,
            ai_drafted: false,
            last_reviewed_at: new Date().toISOString(),
            source_item_ids: items?.map((i) => i.id) ?? [],
          })
          .eq('id', section.id)

        const { data: allSections } = await supabase.from('battle_card_section').select('*').eq('battle_card_id', card.id)

        const score = computeFreshnessScore({
          sections:
            allSections?.map((s) => ({
              section_type: s.section_type as BattleCardSectionType,
              last_reviewed_at: s.last_reviewed_at,
              feedback_count: s.feedback_count,
              gap_count: s.gap_count,
            })) ?? [],
        })

        await supabase.from('battle_card').update({ freshness_score: score }).eq('id', card.id)
        updated += 1
      }

      return { cards: cards?.length ?? 0, recentActivityRowsUpdated: updated }
    })
  }
)
