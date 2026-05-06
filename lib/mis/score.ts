import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { recordVendorCall } from '@/lib/ai/cost'
import { cosineSimilarity } from '@/lib/vector/cosine'
import type { ParsedSweepItem } from '@/lib/sweep/schemas'
import type { MisBand } from '@/lib/types/dosi'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { getMISBand } from '@/lib/types'

export interface SweepContext {
  workspaceId: string
  plan: WorkspacePlan
  companyEmbedding: number[] | null
  differentiatorsEmbedding: number[] | null
  scoringWeights: Record<string, number>
  competitorTierById: Record<string, { tier: string }>
  topicEmbeddings: { id: string; embedding: number[]; importance: number }[]
  segmentRelevance: string[]
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n))
}

function recencyScore(eventAt: Date, now = new Date()): number {
  const days = (now.getTime() - eventAt.getTime()) / (1000 * 60 * 60 * 24)
  return clamp(100 * Math.exp(-days / 18))
}

function sourceCredibility(sourceType?: string): number {
  const t = (sourceType ?? '').toLowerCase()
  if (/sec|filing|regulator|government/.test(t)) return 100
  if (/press|release|company/.test(t)) return 95
  if (/analyst|research/.test(t)) return 70
  if (/news|wire|reuters|bloomberg/.test(t)) return 50
  if (/social|twitter|x\.com/.test(t)) return 30
  return 60
}

function sourceMagnitude(sourceType?: string): number {
  // Start with source credibility as a proxy, then adjust for impact scale.
  const cred = sourceCredibility(sourceType)
  const t = (sourceType ?? '').toLowerCase()
  if (/major|wsj|wall-street-journal|techcrunch|forbes|bloomberg|reuters/.test(t)) return Math.max(cred, 90)
  if (/reddit|hacker-news|community|forum/.test(t)) return Math.min(cred, 55)
  return cred
}

function isProcurementRelevantSource(sourceType?: string): boolean {
  const t = (sourceType ?? '').toLowerCase()
  return /g2|capterra|trustradius|trust-radius|app-store|review|procurement/.test(t)
}

function computeSelfRelevance(item: ParsedSweepItem): number {
  let base = 50
  const sentiment = item.reviewMetadata?.sentiment
  if (sentiment === 'negative') base = 95
  else if (sentiment === 'mixed') base = 70
  else if (sentiment === 'neutral') base = 40
  else if (sentiment === 'positive') base = 65

  const mag = sourceMagnitude(item.sourceType)
  base = (base + mag) / 2

  if (isProcurementRelevantSource(item.sourceType)) {
    base = Math.min(100, base + 10)
  }

  const crisisKeywords = ['outage', 'breach', 'lawsuit', 'investigation', 'acquired', 'lays off', 'shutters', 'data leak']
  const haystack = `${item.title} ${item.summary}`.toLowerCase()
  if (crisisKeywords.some((kw) => haystack.includes(kw))) {
    base = Math.min(100, base + 15)
  }

  return Math.round(base)
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  proximity: 0.18,
  magnitude: 0.08,
  recency: 0.12,
  competitor_weight: 0.12,
  source_credibility: 0.1,
  vendor_consensus: 0.1,
  category_weight: 0.06,
  strategic_alignment: 0.08,
  topic_relevance: 0.08,
  segment_match: 0.08,
}

function tierWeight(tier: string): number {
  const map: Record<string, number> = {
    primary_direct: 100,
    secondary_indirect: 70,
    emerging: 60,
    adjacent: 40,
    watching: 20,
  }
  return map[tier] ?? 50
}

export interface MisComputation {
  value: number
  band: MisBand
  components: Record<string, number>
  explanation: string
}

const explanationCache = new Map<string, string>()

function hashComponents(c: Record<string, number>): string {
  return JSON.stringify(
    Object.keys(c)
      .sort()
      .map((k) => [k, Math.round((c[k] ?? 0) * 1000) / 1000])
  )
}

export async function computeMis(
  context: SweepContext,
  item: ParsedSweepItem & { isAboutSelf?: boolean },
  itemEmbedding: number[] | null,
  vendorConsensus: { confirmed: number; total: number }
): Promise<MisComputation> {
  const w = { ...DEFAULT_WEIGHTS, ...context.scoringWeights }
  const isAboutSelf = Boolean(item.isAboutSelf)
  let proximity = 50
  if (itemEmbedding && context.companyEmbedding) {
    proximity = clamp(cosineSimilarity(itemEmbedding, context.companyEmbedding) * 100)
  }
  let strategic_alignment = 50
  if (itemEmbedding && context.differentiatorsEmbedding) {
    strategic_alignment = clamp(cosineSimilarity(itemEmbedding, context.differentiatorsEmbedding) * 100)
  }

  const recency = recencyScore(item.eventAt ? new Date(item.eventAt) : new Date())
  const magnitude = 55
  const names = item.relatedCompetitorNames ?? []
  let competitor_weight = names.length > 0 ? 75 : 40
  if (names.length > 0 && Object.keys(context.competitorTierById).length > 0) {
    let maxTw = 0
    for (const meta of Object.values(context.competitorTierById)) {
      maxTw = Math.max(maxTw, tierWeight(meta.tier))
    }
    competitor_weight = Math.max(competitor_weight, maxTw)
  }

  const source_credibility = sourceCredibility(item.sourceType)
  const vconf =
    vendorConsensus.total > 0
      ? clamp((vendorConsensus.confirmed / vendorConsensus.total) * 100)
      : 50
  const category_weight = 70
  let topic_relevance = 0
  if (itemEmbedding) {
    for (const t of context.topicEmbeddings) {
      const sim = cosineSimilarity(itemEmbedding, t.embedding)
      topic_relevance = Math.max(topic_relevance, sim * t.importance * 25)
    }
    topic_relevance = clamp(topic_relevance)
  }
  const segment_match = context.segmentRelevance.length ? 70 : 50
  const self_relevance = isAboutSelf ? computeSelfRelevance(item) : 50

  // Own-company items use self relevance in place of competitor weight,
  // and de-emphasize proximity because it's already saturated by definition.
  const effectiveWeights = { ...w }
  if (isAboutSelf) {
    effectiveWeights.self_relevance = effectiveWeights.competitor_weight ?? DEFAULT_WEIGHTS.competitor_weight
    effectiveWeights.competitor_weight = 0
    effectiveWeights.proximity = Math.max(0.04, (effectiveWeights.proximity ?? DEFAULT_WEIGHTS.proximity) * 0.5)
  } else {
    effectiveWeights.self_relevance = 0
  }

  const components: Record<string, number> = {
    proximity,
    magnitude,
    recency,
    competitor_weight,
    self_relevance,
    source_credibility,
    vendor_consensus: vconf,
    category_weight,
    strategic_alignment,
    topic_relevance,
    segment_match,
  }

  let value = 0
  let denom = 0
  for (const key of Object.keys(effectiveWeights)) {
    const weight = effectiveWeights[key] ?? 0
    value += (components[key] ?? 50) * weight
    denom += weight
  }
  value = denom > 0 ? value / denom : 50
  if (proximity < 30) value *= 0.5
  value = clamp(value)
  if (isAboutSelf && self_relevance >= 80) {
    value = Math.max(value, 65)
  }

  const band = getMISBand(value) as MisBand
  const compHash = hashComponents(components)
  let explanation = explanationCache.get(compHash)
  if (!explanation) {
    explanation = await generateExplanation(context.workspaceId, context.plan, value, components, item)
    explanationCache.set(compHash, explanation)
  }

  return { value, band, components, explanation }
}

async function generateExplanation(
  workspaceId: string,
  plan: WorkspacePlan,
  value: number,
  components: Record<string, number>,
  item: ParsedSweepItem & { isAboutSelf?: boolean }
): Promise<string> {
  try {
    const routing = await getRoutingFor('scoring')
    const client = getVendorClient(routing.vendor, routing.model)
    const prompt = `You are scoring competitive intelligence. In one short paragraph, explain why this item has MIS ${value.toFixed(
      0
    )}/100 for our user. Reference the main component drivers: ${JSON.stringify(components)}. Item title: ${item.title}.`
    const res = await client.complete({ prompt, maxTokens: 400 })
    await recordVendorCall(workspaceId, plan, {
      purpose: 'scoring',
      vendor: routing.vendor,
      model: routing.model,
      requestTokens: res.usage.inputTokens,
      responseTokens: res.usage.outputTokens,
      costCents: estimateCallCostCents(routing.model, res.usage.inputTokens, res.usage.outputTokens),
      success: true,
      citationCount: 0,
      responsePayload: res.rawResponse,
    })
    return res.content.trim()
  } catch {
    return `Score ${value.toFixed(
      0
    )} reflects blended proximity, recency, sources, and consensus. Key components: ${Object.entries(
      components
    )
      .map(([k, v]) => `${k}=${v.toFixed(0)}`)
      .slice(0, 5)
      .join(', ')}.`
  }
}

export async function embedText(workspaceId: string, plan: WorkspacePlan, text: string): Promise<number[] | null> {
  const routing = await getRoutingFor('embedding')
  const client = getVendorClient(routing.vendor, routing.model)
  const res = await client.embed({ input: text, model: routing.model })
  await recordVendorCall(workspaceId, plan, {
    purpose: 'embedding',
    vendor: routing.vendor,
    model: routing.model,
    requestTokens: res.usage.inputTokens,
    responseTokens: 0,
    costCents: estimateCallCostCents(routing.model, res.usage.inputTokens, 0),
    success: true,
    citationCount: 0,
    responsePayload: res.rawResponse,
  })
  return res.embeddings[0] ?? null
}

/** Load vectors from workspace_profile for MIS. */
export async function loadProfileVectors(
  workspaceId: string
): Promise<{ company: number[] | null; differentiators: number[] | null; segmentRelevance: string[] }> {
  const supabase = createSupabaseAdminClient()
  const { data: profile } = await supabase
    .from('workspace_profile')
    .select('embedding, differentiators_embedding, segment_relevance')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!profile) return { company: null, differentiators: null, segmentRelevance: [] }

  const parseVec = (s: string | null): number[] | null => {
    if (!s) return null
    const inner = s.replace(/^\[/, '').replace(/\]$/, '')
    if (!inner.trim()) return null
    return inner.split(',').map((x) => Number.parseFloat(x.trim()))
  }

  return {
    company: parseVec(profile.embedding),
    differentiators: parseVec(profile.differentiators_embedding),
    segmentRelevance: profile.segment_relevance ?? [],
  }
}
