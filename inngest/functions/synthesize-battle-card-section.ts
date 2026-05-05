import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import { computeFreshnessScore } from '@/lib/battle-cards/freshness'
import { buildSynthesisPrompt } from '@/lib/battle-cards/synthesis-prompt'
import { synthesisResponseSchema } from '@/lib/battle-cards/synthesis-schema'
import type { BattleCardSectionType } from '@/lib/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

export const synthesizeBattleCardSection = inngest.createFunction(
  { id: 'synthesize-battle-card-section', retries: 2 },
  { event: 'battle-card/synthesize-section' },
  async ({ event, step }) => {
    const { sectionId, workspaceId, userAnswer } = event.data as {
      sectionId: string
      workspaceId: string
      userAnswer: string
    }

    return step.run('synthesize', async () => {
      const supabase = createSupabaseAdminClient()

      const { data: section, error: secErr } = await supabase
        .from('battle_card_section')
        .select('*')
        .eq('id', sectionId)
        .single()

      if (secErr || !section) throw new Error('Section not found')

      const { data: card, error: cErr } = await supabase
        .from('battle_card')
        .select('workspace_id, competitor_id')
        .eq('id', section.battle_card_id)
        .single()

      if (cErr || !card) throw new Error('Battle card not found')
      if (card.workspace_id !== workspaceId) throw new Error('Workspace mismatch')

      const { data: workspace } = await supabase.from('workspace').select('plan, status').eq('id', workspaceId).single()

      if (!workspace || workspace.status === 'read_only') throw new Error('Workspace unavailable')

      const plan = workspace.plan as WorkspacePlan
      const budget = await checkCostBudget(workspaceId, plan)
      if (!budget.ok) {
        throw new Error(`AI cost ceiling exceeded (${budget.mtdCents}/${budget.ceilingCents})`)
      }

      const { data: competitor } = await supabase.from('competitor').select('name').eq('id', card.competitor_id).single()

      const competitorName = competitor?.name ?? 'Competitor'

      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data: feedRows } = await supabase
        .from('intelligence_item')
        .select('id, title, summary')
        .eq('workspace_id', workspaceId)
        .eq('visibility', 'feed')
        .gte('ingested_at', since)
        .contains('related_competitors', [card.competitor_id])
        .order('mi_score', { ascending: false })
        .limit(5)

      const feedContext = (feedRows ?? []).map((r) => ({
        title: r.title,
        summary: r.summary ?? '',
      }))

      const sectionType = section.section_type as BattleCardSectionType
      const routing = await getRoutingFor('battle_card_interview')
      const vendorClient = getVendorClient(routing.vendor, routing.model)
      const schema = synthesisResponseSchema(sectionType)

      const prompt = buildSynthesisPrompt({
        sectionType,
        competitorName,
        userAnswer,
        feedContext,
      })

      const started = Date.now()
      const result = await vendorClient.complete({
        prompt,
        responseSchema: schema,
        maxTokens: 8192,
      })
      const latencyMs = Date.now() - started

      const parsed = result.parsed
      const safe = schema.safeParse(parsed)
      if (!safe.success) {
        throw new Error(`Synthesis schema: ${safe.error.message}`)
      }

      const costCents = estimateCallCostCents(
        routing.model,
        result.usage.inputTokens,
        result.usage.outputTokens
      )

      await recordVendorCall(workspaceId, plan, {
        purpose: 'battle_card_interview',
        vendor: routing.vendor,
        model: routing.model,
        requestTokens: result.usage.inputTokens,
        responseTokens: result.usage.outputTokens,
        costCents,
        latencyMs,
        success: true,
        citationCount: feedContext.length,
        responsePayload: { sectionId },
      })

      const sourceIds = (feedRows ?? []).map((r) => r.id)

      const { error: upErr } = await supabase
        .from('battle_card_section')
        .update({
          content: safe.data as never,
          ai_drafted: true,
          source_item_ids: sourceIds,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', sectionId)

      if (upErr) throw upErr

      const { data: allSections } = await supabase
        .from('battle_card_section')
        .select('*')
        .eq('battle_card_id', section.battle_card_id)

      const score = computeFreshnessScore({
        sections:
          allSections?.map((s) => ({
            section_type: s.section_type as BattleCardSectionType,
            last_reviewed_at: s.last_reviewed_at,
            feedback_count: s.feedback_count,
            gap_count: s.gap_count,
          })) ?? [],
      })

      await supabase.from('battle_card').update({ freshness_score: score }).eq('id', section.battle_card_id)

      return { ok: true as const, sectionId }
    })
  }
)
