import { z } from 'zod'
import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import { getActivePromptTemplateFor, renderPromptTemplate } from '@/lib/ai/prompt-template'
import { getEmbeddedPromptDefault } from '@/lib/admin/prompt-defaults'
import { computeFreshnessScore } from '@/lib/battle-cards/freshness'
import { isSectionContentEmpty, parseSectionContent } from '@/lib/battle-cards/section-json'
import type { BattleCardSectionType } from '@/lib/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

const sectionTypeSchema = z.enum([
  'tldr',
  'why_we_win',
  'why_they_win',
  'objections',
  'trap_setters',
  'proof_points',
  'pricing',
  'recent_activity',
  'talk_tracks',
])

const draftResponseSchema = z.object({
  results: z.array(
    z.object({
      sectionType: sectionTypeSchema,
      fill: z.unknown().nullable(),
      improvementSuggestion: z.string().nullable().optional(),
      rationale: z.string().default(''),
      confidence: z.number().min(0).max(1).optional().default(0.5),
      citations: z.array(z.object({ source: z.string(), quote: z.string().optional() })).optional().default([]),
    })
  ),
})

function formatIntelContext(rows: Array<{ id: string; title: string; summary: string | null }>): string {
  if (rows.length === 0) return '(No recent competitor intel was selected or available.)'
  return rows
    .map((r, i) => `### Intel ${i + 1}\nid: ${r.id}\n${r.title}\n${r.summary ?? ''}`)
    .join('\n\n')
}

function formatResourceContext(rows: Array<{ file_name: string; content: string }>): string {
  if (rows.length === 0) return '(No resource documents selected.)'
  return rows
    .map((r, i) => `### Resource ${i + 1}: ${r.file_name}\n${r.content.slice(0, 1400)}`)
    .join('\n\n')
}

function formatWinLossContext(
  rows: Array<{
    outcome: string
    reason_summary: string
    reason_tags: string[] | null
    segment: string | null
    close_date: string
  }>
): string {
  if (rows.length === 0) return '(No win/loss outcomes found for this competitor.)'
  const tagCounts = new Map<string, number>()
  for (const row of rows) {
    for (const tag of row.reason_tags ?? []) {
      const key = String(tag || '').trim()
      if (!key) continue
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1)
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => `${tag} (${count})`)
  const lines = rows.map((r, i) => {
    const seg = r.segment ? ` · ${r.segment}` : ''
    const tags = (r.reason_tags ?? []).length > 0 ? ` · tags: ${(r.reason_tags ?? []).join(', ')}` : ''
    return `### Outcome ${i + 1}: ${r.outcome}${seg}\n${r.reason_summary}${tags}`
  })
  if (topTags.length > 0) {
    lines.unshift(`Top recurring reason tags: ${topTags.join(', ')}`)
  }
  return lines.join('\n\n')
}

export const draftBattleCard = inngest.createFunction(
  { id: 'draft-battle-card', retries: 1 },
  { event: 'battle-card/draft-requested' },
  async ({ event }) => {
    const { runId, workspaceId, battleCardId, competitorId, includeIntel, selectedResourceIds } = event.data as {
      runId: string
      workspaceId: string
      battleCardId: string
      competitorId: string
      includeIntel: boolean
      selectedResourceIds: string[]
    }
    const supabase = createSupabaseAdminClient()
    const startedAt = Date.now()
    const restoreOps: Array<{
      id: string
      content: unknown
      ai_drafted: boolean
      source_item_ids: string[]
      last_reviewed_at: string | null
      last_contributor_id: string | null
    }> = []
    const insertedRecommendationIds: string[] = []

    try {
      const { data: workspace, error: wsErr } = await supabase
        .from('workspace')
        .select('plan,status')
        .eq('id', workspaceId)
        .single()
      if (wsErr || !workspace || workspace.status === 'read_only') throw new Error('Workspace unavailable')
      const plan = workspace.plan as WorkspacePlan

      const budget = await checkCostBudget(workspaceId, plan)
      if (!budget.ok) throw new Error(`AI cost ceiling exceeded (${budget.mtdCents}/${budget.ceilingCents})`)

      const { data: competitor } = await supabase.from('competitor').select('name').eq('id', competitorId).single()
      const competitorName = competitor?.name ?? 'Competitor'

      const routing = await getRoutingFor('battle_card_draft')
      await supabase
        .from('battle_card_generation_run' as any)
        .update({
          status: 'processing',
          vendor: routing.vendor,
          model: routing.model,
          updated_at: new Date().toISOString(),
          error: null,
        } as any)
        .eq('id', runId)

      const { data: sectionRows, error: secErr } = await supabase
        .from('battle_card_section')
        .select('id,section_type,content,ai_drafted,source_item_ids,last_reviewed_at,last_contributor_id,feedback_count,gap_count')
        .eq('battle_card_id', battleCardId)
        .order('display_order', { ascending: true })
      if (secErr || !sectionRows) throw new Error('Battle card sections not found')
      for (const s of sectionRows) {
        restoreOps.push({
          id: s.id,
          content: s.content,
          ai_drafted: s.ai_drafted,
          source_item_ids: s.source_item_ids ?? [],
          last_reviewed_at: s.last_reviewed_at,
          last_contributor_id: s.last_contributor_id,
        })
      }

      const intelRows = includeIntel
        ? (
            await supabase
              .from('intelligence_item')
              .select('id,title,summary')
              .eq('workspace_id', workspaceId)
              .eq('visibility', 'feed')
              .contains('related_competitors', [competitorId])
              .order('event_at', { ascending: false })
              .limit(10)
          ).data ?? []
        : []
      const intelItemIds = intelRows.map((x) => x.id)

      const [primaryOutcomeRows, additionalOutcomeRows] = await Promise.all([
        supabase
          .from('win_loss_outcome')
          .select('id,outcome,reason_summary,reason_tags,segment,close_date')
          .eq('workspace_id', workspaceId)
          .eq('competitor_id', competitorId)
          .order('close_date', { ascending: false })
          .limit(10),
        supabase
          .from('win_loss_outcome')
          .select('id,outcome,reason_summary,reason_tags,segment,close_date')
          .eq('workspace_id', workspaceId)
          .contains('additional_competitor_ids', [competitorId])
          .order('close_date', { ascending: false })
          .limit(10),
      ])
      const outcomeRowsById = new Map<string, any>()
      for (const row of primaryOutcomeRows.data ?? []) outcomeRowsById.set(String(row.id), row)
      for (const row of additionalOutcomeRows.data ?? []) outcomeRowsById.set(String(row.id), row)
      const winLossRows = [...outcomeRowsById.values()]
        .sort((a, b) => String(b.close_date ?? '').localeCompare(String(a.close_date ?? '')))
        .slice(0, 12)

      const resourceChunkRows =
        selectedResourceIds.length > 0
          ? (
              await supabase
                .from('resource_document_chunk' as any)
                .select('content,resource_document_id,resource_document!inner(file_name,status,approved_for_ai)')
                .eq('workspace_id', workspaceId)
                .in('resource_document_id', selectedResourceIds)
                .order('chunk_index', { ascending: true })
                .limit(40)
            ).data ?? []
          : []
      const resourceRows = resourceChunkRows
        .map((r: any) => ({
          file_name: String(r.resource_document?.file_name ?? 'Resource'),
          content: String(r.content ?? ''),
          status: String(r.resource_document?.status ?? ''),
          approved: r.resource_document?.approved_for_ai !== false,
        }))
        .filter((r: { status: string; approved: boolean }) => r.status === 'ready' && r.approved)

      const existingSections = Object.fromEntries(
        sectionRows.map((s) => [s.section_type, parseSectionContent(s.section_type as BattleCardSectionType, s.content)])
      )

      const defaultPrompt = getEmbeddedPromptDefault('battle_card_draft')
      if (!defaultPrompt) throw new Error('Missing embedded prompt for battle_card_draft')
      const template = (await getActivePromptTemplateFor('battle_card_draft', routing.vendor))?.content ?? defaultPrompt.content
      const prompt = renderPromptTemplate(template, {
        competitor_name: competitorName,
        resource_context: formatResourceContext(resourceRows),
        intel_context: formatIntelContext(intelRows),
        win_loss_context: formatWinLossContext(winLossRows),
        existing_sections: JSON.stringify(existingSections),
      })

      const vendorClient = getVendorClient(routing.vendor, routing.model)
      const result = await vendorClient.complete({
        prompt,
        responseSchema: draftResponseSchema,
        maxTokens: 8192,
      })
      const parsed = draftResponseSchema.parse(result.parsed)

      const sectionByType = new Map(
        sectionRows.map((s) => [s.section_type as BattleCardSectionType, s] as const)
      )
      const fillUpdates: Array<{ sectionId: string; content: unknown }> = []
      const recommendationInserts: Array<Record<string, unknown>> = []

      for (const entry of parsed.results) {
        const sectionType = entry.sectionType as BattleCardSectionType
        const section = sectionByType.get(sectionType)
        if (!section) continue
        const empty = isSectionContentEmpty(sectionType, section.content)
        if (empty && entry.fill) {
          const nextContent = parseSectionContent(sectionType, entry.fill)
          if (!isSectionContentEmpty(sectionType, nextContent)) {
            fillUpdates.push({ sectionId: section.id, content: nextContent })
          }
        } else if (!empty && entry.improvementSuggestion?.trim()) {
          recommendationInserts.push({
            workspace_id: workspaceId,
            battle_card_id: battleCardId,
            battle_card_section_id: section.id,
            run_id: runId,
            section_type: sectionType,
            suggested_content: entry.improvementSuggestion.trim(),
            rationale: entry.rationale || null,
            citations: entry.citations ?? [],
            confidence: entry.confidence ?? null,
          })
        }
      }

      for (const u of fillUpdates) {
        const { error } = await supabase
          .from('battle_card_section')
          .update({
            content: u.content as never,
            ai_drafted: true,
            source_item_ids: intelItemIds,
            last_reviewed_at: new Date().toISOString(),
          })
          .eq('id', u.sectionId)
        if (error) throw error
      }
      if (recommendationInserts.length > 0) {
        const { data: inserted, error } = await supabase
          .from('battle_card_section_recommendation' as any)
          .insert(recommendationInserts as any)
          .select('id')
        if (error) throw error
        for (const row of inserted ?? []) insertedRecommendationIds.push(String((row as any).id))
      }

      const { data: allSections } = await supabase
        .from('battle_card_section')
        .select('section_type,last_reviewed_at,feedback_count,gap_count')
        .eq('battle_card_id', battleCardId)
      const score = computeFreshnessScore({
        sections:
          allSections?.map((s) => ({
            section_type: s.section_type as BattleCardSectionType,
            last_reviewed_at: s.last_reviewed_at,
            feedback_count: s.feedback_count,
            gap_count: s.gap_count,
          })) ?? [],
      })
      await supabase.from('battle_card').update({ freshness_score: score }).eq('id', battleCardId)

      const costCents = estimateCallCostCents(routing.model, result.usage.inputTokens, result.usage.outputTokens)
      await recordVendorCall(workspaceId, plan, {
        purpose: 'battle_card_draft',
        vendor: routing.vendor,
        model: routing.model,
        requestTokens: result.usage.inputTokens,
        responseTokens: result.usage.outputTokens,
        costCents,
        latencyMs: Date.now() - startedAt,
        success: true,
        citationCount: intelRows.length + resourceRows.length,
        responsePayload: {
          runId,
          battleCardId,
          fillCount: fillUpdates.length,
          recommendationCount: recommendationInserts.length,
          winLossCount: winLossRows.length,
        },
      })

      await supabase
        .from('battle_card_generation_run' as any)
        .update({
          status: 'ready',
          output_snapshot: parsed as any,
          error: null,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', runId)

      return { ok: true, fillCount: fillUpdates.length, recommendationCount: recommendationInserts.length }
    } catch (error) {
      for (const op of restoreOps) {
        await supabase
          .from('battle_card_section')
          .update({
            content: op.content as never,
            ai_drafted: op.ai_drafted,
            source_item_ids: op.source_item_ids,
            last_reviewed_at: op.last_reviewed_at,
            last_contributor_id: op.last_contributor_id,
          })
          .eq('id', op.id)
      }
      if (insertedRecommendationIds.length > 0) {
        await supabase.from('battle_card_section_recommendation' as any).delete().in('id', insertedRecommendationIds)
      }
      const msg = error instanceof Error ? error.message : 'AI draft failed'
      await supabase
        .from('battle_card_generation_run' as any)
        .update({
          status: 'failed',
          error: msg,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', runId)
      throw error
    }
  }
)
