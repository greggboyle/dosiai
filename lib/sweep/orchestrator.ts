import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getVendorClient } from '@/lib/ai/factory'
import { getRoutingFor } from '@/lib/ai/router'
import { sweepAiResponseSchema, type ParsedSweepItem } from '@/lib/sweep/schemas'
import { SweepRejectedError } from '@/lib/sweep/errors'
import { computeMis, embedText, loadProfileVectors, type SweepContext } from '@/lib/mis/score'
import { determineVisibility } from '@/lib/feed/visibility'
import { cosineSimilarity } from '@/lib/vector/cosine'
import { formatVectorLiteral } from '@/lib/intelligence/map-row'
import type { AiPurposeDb } from '@/lib/supabase/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

export interface OrchestrateSweepInput {
  workspaceId: string
  trigger: 'manual' | 'scheduled'
  triggerUserId: string | null
}

function categoryToPurpose(cat: 'buy' | 'sell' | 'channel' | 'regulatory'): AiPurposeDb {
  if (cat === 'buy') return 'sweep_buy'
  if (cat === 'sell') return 'sweep_sell'
  if (cat === 'channel') return 'sweep_channel'
  return 'sweep_regulatory'
}

function buildDefaultPrompt(
  purpose: AiPurposeDb,
  companySummary: string,
  competitorLines: string,
  topicLines: string
): string {
  return `You are an intelligence analyst. Return STRICT JSON matching {"items":[...]} with fields defined by the schema.
Purpose: ${purpose}.
Company context:
${companySummary}

Tracked competitors:
${competitorLines}

Active topics:
${topicLines}

Each item must include: title, summary, confidence (low|medium|high), confidenceReason, category as exactly one of the strings \"buy-side\", \"sell-side\", \"channel\", or \"regulatory\" (no other labels), sourceUrls (array of {name,url,domain}), optional fiveWH as an object {\"who\",\"what\",\"when\",\"where\",\"why\",\"how\"} strings or omit entirely (never a bare string), optional eventAt ISO string, optional sourceType, optional relatedCompetitorNames (string[]), optional entitiesMentioned ([{name}]).
Produce 1-3 realistic items if data is thin; focus on verifiable claims.`
}

async function runCategoryPrompt(
  workspaceId: string,
  plan: WorkspacePlan,
  sweepId: string,
  cat: 'buy' | 'sell' | 'channel' | 'regulatory',
  companySummary: string,
  competitorLines: string,
  topicLines: string
): Promise<{ items: ParsedSweepItem[]; vendorCallIds: string[] }> {
  const purpose = categoryToPurpose(cat)
  const routing = await getRoutingFor(purpose)
  const prompt = buildDefaultPrompt(purpose, companySummary, competitorLines, topicLines)

  const vendorCallIds: string[] = []
  const merged: ParsedSweepItem[] = []

  for (const rule of routing.activeRules) {
    const client = getVendorClient(rule.vendor, rule.model)
    const started = Date.now()
    try {
      const res = await client.complete({
        prompt,
        responseSchema: sweepAiResponseSchema,
        maxTokens: 4096,
      })
      const usage = res.usage
      const cost = estimateCallCostCents(rule.model, usage.inputTokens, usage.outputTokens)
      const vc = await recordVendorCall(workspaceId, plan, {
        purpose,
        vendor: rule.vendor,
        model: rule.model,
        requestTokens: usage.inputTokens,
        responseTokens: usage.outputTokens,
        costCents: cost,
        latencyMs: Date.now() - started,
        success: true,
        citationCount: 0,
        responsePayload: res.rawResponse,
        sweepId,
      })
      if (vc?.id) vendorCallIds.push(vc.id)

      const parsed = res.parsed ? sweepAiResponseSchema.safeParse(res.parsed) : null
      if (parsed?.success) {
        for (const it of parsed.data.items) {
          merged.push({ ...it, category: enforceCategory(it.category, cat) })
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await recordVendorCall(workspaceId, plan, {
        purpose,
        vendor: rule.vendor,
        model: rule.model,
        requestTokens: 0,
        responseTokens: 0,
        costCents: 0,
        latencyMs: Date.now() - started,
        success: false,
        errorMessage: msg,
        sweepId,
      })
      throw e
    }
  }

  return { items: merged, vendorCallIds }
}

function enforceCategory(
  c: ParsedSweepItem['category'] | undefined,
  fallbackCat: 'buy' | 'sell' | 'channel' | 'regulatory'
): ParsedSweepItem['category'] {
  if (c) return c
  const map = {
    buy: 'buy-side',
    sell: 'sell-side',
    channel: 'channel',
    regulatory: 'regulatory',
  } as const
  return map[fallbackCat]
}

function normalizeSearchSeeds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0)
  }
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t ? [t] : []
  }
  return []
}

async function runTopicsPass(
  workspaceId: string,
  plan: WorkspacePlan,
  sweepId: string,
  topics: { id: string; name: string; description: string | null; seeds: string[] }[],
  companySummary: string,
  competitorLines: string
): Promise<{ items: ParsedSweepItem[]; vendorCallIds: string[] }> {
  if (topics.length === 0) return { items: [], vendorCallIds: [] }
  const purpose: AiPurposeDb = 'sweep_topic'
  const routing = await getRoutingFor(purpose)
  const vendorCallIds: string[] = []
  const merged: ParsedSweepItem[] = []

  const primaryRule = routing.activeRules[0]
  if (!primaryRule) return { items: [], vendorCallIds: [] }

  for (const topic of topics) {
    const seedText = topic.seeds.length > 0 ? topic.seeds.join(', ') : '(none)'
    const prompt = buildDefaultPrompt(
      purpose,
      companySummary,
      competitorLines,
      `Topic: ${topic.name}\n${topic.description ?? ''}\nSeeds: ${seedText}`
    )
    const client = getVendorClient(primaryRule.vendor, primaryRule.model)
    const started = Date.now()
    const res = await client.complete({
      prompt,
      responseSchema: sweepAiResponseSchema,
      maxTokens: 4096,
    })
    const cost = estimateCallCostCents(primaryRule.model, res.usage.inputTokens, res.usage.outputTokens)
    const vc = await recordVendorCall(workspaceId, plan, {
      purpose,
      vendor: primaryRule.vendor,
      model: primaryRule.model,
      requestTokens: res.usage.inputTokens,
      responseTokens: res.usage.outputTokens,
      costCents: cost,
      latencyMs: Date.now() - started,
      success: true,
      sweepId,
      responsePayload: res.rawResponse,
    })
    if (vc?.id) vendorCallIds.push(vc.id)
    const parsed = res.parsed ? sweepAiResponseSchema.safeParse(res.parsed) : null
    if (parsed?.success) {
      for (const it of parsed.data.items) {
        merged.push({ ...it })
      }
    }
  }
  return { items: merged, vendorCallIds }
}

function parseVectorString(s: string | null): number[] | null {
  if (!s) return null
  try {
    const inner = s.replace(/^\[/, '').replace(/\]$/, '')
    if (!inner.trim()) return null
    return inner.split(',').map((x) => Number.parseFloat(x.trim()))
  } catch {
    return null
  }
}

export async function orchestrateSweep(input: OrchestrateSweepInput): Promise<{ sweepId: string; itemsIngested: number }> {
  const supabase = createSupabaseAdminClient()
  const { data: ws, error: wsErr } = await supabase.from('workspace').select('*').eq('id', input.workspaceId).single()
  if (wsErr || !ws) throw new Error('Workspace not found')

  const plan = ws.plan as WorkspacePlan
  const budget = await checkCostBudget(input.workspaceId, plan)
  if (!budget.ok) {
    throw new SweepRejectedError(budget.reason, 'AI cost ceiling exceeded for this workspace')
  }

  const { data: profile } = await supabase
    .from('workspace_profile')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  const { data: competitors } = await supabase.from('competitor').select('id,name,tier').eq('workspace_id', input.workspaceId)
  const { data: topicRows } = await supabase
    .from('topic')
    .select('id,name,description,search_seeds,importance,embedding')
    .eq('workspace_id', input.workspaceId)
    .eq('status', 'active')

  const companySummary =
    [
      profile?.company_summary,
      profile?.icp && `ICP: ${profile.icp}`,
      profile?.industry && `Industry: ${profile.industry}`,
    ]
      .filter(Boolean)
      .join('\n') || 'No company profile yet.'

  const competitorLines =
    competitors?.map((c) => `- ${c.name} (${c.tier})`).join('\n') || '(none)'

  const topicLines =
    topicRows?.map((t) => `- ${t.name}: ${t.description ?? ''}`).join('\n') || '(none)'

  const { data: sweepRow, error: sweepErr } = await supabase
    .from('sweep')
    .insert({
      workspace_id: input.workspaceId,
      trigger: input.trigger,
      trigger_user_id: input.triggerUserId,
      status: 'running',
    })
    .select('id')
    .single()

  if (sweepErr || !sweepRow) throw sweepErr ?? new Error('sweep insert failed')
  const sweepId = sweepRow.id

  const profileVecs = await loadProfileVectors(input.workspaceId)

  const importanceTo01 = (i: string) =>
    ({ critical: 1, high: 0.85, medium: 0.65, low: 0.45 } as const)[i as 'critical'] ?? 0.65

  const topicEmbeddings =
    topicRows
      ?.map((t) => ({
        id: t.id,
        embedding: parseVectorString(t.embedding as string | null) ?? [],
        importance: importanceTo01(t.importance),
      }))
      .filter((t) => t.embedding.length > 0) ?? []

  const competitorTierById: Record<string, { tier: string }> = {}
  for (const c of competitors ?? []) {
    competitorTierById[c.id] = { tier: c.tier }
  }

  const scoringWeights = (ws.scoring_weights as Record<string, number> | null) ?? {}

  const sweepCtxBase: Omit<SweepContext, 'workspaceId' | 'plan'> = {
    companyEmbedding: profileVecs.company,
    differentiatorsEmbedding: profileVecs.differentiators,
    scoringWeights,
    competitorTierById,
    topicEmbeddings,
    segmentRelevance: profileVecs.segmentRelevance,
  }

  try {
    const cats = ['buy', 'sell', 'channel', 'regulatory'] as const
    const catResults = await Promise.all(
      cats.map((c) =>
        runCategoryPrompt(
          input.workspaceId,
          plan,
          sweepId,
          c,
          companySummary,
          competitorLines,
          topicLines
        )
      )
    )

    const topicPassResult = await runTopicsPass(
      input.workspaceId,
      plan,
      sweepId,
      (topicRows ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        seeds: normalizeSearchSeeds(t.search_seeds),
      })),
      companySummary,
      competitorLines
    )

    let rawItems = [...catResults.flatMap((r) => r.items), ...topicPassResult.items]

    // Deduplicate within sweep by title slug + category
    const seen = new Set<string>()
    rawItems = rawItems.filter((it) => {
      const key = `${it.category}::${it.title.trim().toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Cross-sweep dedup: fetch recent items with embeddings (30d)
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const { data: existingRows } = await supabase
      .from('intelligence_item')
      .select('id, embedding, title')
      .eq('workspace_id', input.workspaceId)
      .gte('ingested_at', since.toISOString())

    const nameToId: Record<string, string> = {}
    for (const c of competitors ?? []) {
      nameToId[c.name.toLowerCase()] = c.id
    }

    let itemsNew = 0
    let dedupCollapsed = 0

    for (const item of rawItems) {
      const textForEmbed = `${item.title}\n${item.summary}`.slice(0, 8000)
      const emb = await embedText(input.workspaceId, plan, textForEmbed)
      let skip = false
      if (emb && existingRows?.length) {
        for (const ex of existingRows) {
          const exVec = parseVectorString(ex.embedding as string | null)
          if (exVec && cosineSimilarity(emb, exVec) > 0.92) {
            skip = true
            dedupCollapsed++
            break
          }
        }
      }
      if (skip) continue

      const relatedCompetitorIds: string[] = []
      for (const n of item.relatedCompetitorNames ?? []) {
        const id = nameToId[n.toLowerCase()]
        if (id) relatedCompetitorIds.push(id)
      }

      const relatedTopicIds: string[] = []
      for (const te of topicEmbeddings) {
        if (emb && te.embedding.length && cosineSimilarity(emb, te.embedding) > 0.82) {
          relatedTopicIds.push(te.id)
        }
      }

      const vendorConsensus = { confirmed: 1, total: 1 }
      const mis = await computeMis(
        { workspaceId: input.workspaceId, plan, ...sweepCtxBase },
        item,
        emb,
        vendorConsensus
      )

      const threshold = ws.review_queue_threshold ?? 30
      const visibility = determineVisibility(mis.value, threshold)

      const insertPayload = {
        workspace_id: input.workspaceId,
        sweep_id: sweepId,
        title: item.title,
        summary: item.summary,
        content: item.content ?? '',
        full_summary: item.fullSummary ?? null,
        category: item.category,
        subcategory: item.subcategory ?? null,
        five_wh: item.fiveWH ?? null,
        source_urls: item.sourceUrls,
        source_type: item.sourceType ?? null,
        entities_mentioned: item.entitiesMentioned ?? null,
        vendor_consensus: { confirmed: vendorConsensus.confirmed, total: vendorConsensus.total },
        related_competitors: relatedCompetitorIds,
        related_topics: relatedTopicIds,
        mi_score: mis.value,
        mi_score_band: mis.band,
        mi_score_components: mis.components,
        mi_score_explanation: mis.explanation,
        confidence: item.confidence,
        confidence_reason: item.confidenceReason,
        review_metadata: null,
        embedding: emb ? formatVectorLiteral(emb) : null,
        visibility,
        event_at: item.eventAt ?? new Date().toISOString(),
        ingested_at: new Date().toISOString(),
      }

      const { data: inserted, error: insErr } = await supabase
        .from('intelligence_item')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insErr) throw insErr
      itemsNew++
      if (inserted && emb) {
        existingRows?.push({
          id: inserted.id,
          embedding: formatVectorLiteral(emb),
          title: item.title,
        })
      }
    }

    await supabase
      .from('sweep')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        items_found: rawItems.length,
        items_new: itemsNew,
        items_dedup_collapsed: dedupCollapsed,
      })
      .eq('id', sweepId)

    await supabase
      .from('workspace')
      .update({ last_sweep_at: new Date().toISOString() })
      .eq('id', input.workspaceId)

    return { sweepId, itemsIngested: itemsNew }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase
      .from('sweep')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [{ message: msg }],
      })
      .eq('id', sweepId)
    throw e
  }
}
