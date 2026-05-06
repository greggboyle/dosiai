import { inngest } from '@/inngest/client'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { getCompetitorProfileRefreshPolicy } from '@/lib/competitors/profile-refresh'

const competitorProfileSchema = z.object({
  company_summary: z.object({
    positioning: z.string().default(''),
    icp_description: z.string().default(''),
    pricing_model: z.string().default('unknown'),
    pricing_notes: z.string().default(''),
    founded_year: z.number().int().min(1800).max(2100).nullable().optional(),
    hq_location: z.string().nullable().optional(),
    employee_count_estimate: z.number().int().min(0).nullable().optional(),
    funding_status: z.string().nullable().optional(),
  }),
  products: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .max(12)
    .default([]),
  leadership: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        since: z.string().optional(),
        linkedIn: z.string().url().optional(),
      })
    )
    .max(12)
    .default([]),
  confidence: z.number().min(0).max(1).optional(),
})

export const populateCompetitorProfile = inngest.createFunction(
  { id: 'populate-competitor-profile', retries: 2 },
  { event: 'competitor/populate-profile' },
  async ({ event }) => {
    const {
      workspaceId,
      competitorId,
      source,
      bypassLimits,
    } = event.data as {
      workspaceId: string
      competitorId: string
      requestedByUserId?: string | null
      source: 'manual' | 'trial_first_sweep'
      bypassLimits?: boolean
    }

    const supabase = createSupabaseAdminClient()
    const [{ data: workspace, error: wsErr }, { data: competitor, error: compErr }] = await Promise.all([
      supabase.from('workspace').select('id,plan,status').eq('id', workspaceId).single(),
      supabase.from('competitor').select('*').eq('workspace_id', workspaceId).eq('id', competitorId).single(),
    ])
    if (wsErr || !workspace) throw wsErr ?? new Error('Workspace not found')
    if (workspace.status === 'read_only') throw new Error('Workspace is read-only')
    if (compErr || !competitor) throw compErr ?? new Error('Competitor not found')

    const plan = workspace.plan as WorkspacePlan
    const policy = getCompetitorProfileRefreshPolicy({
      plan,
      lastProfileRefreshAt: competitor.last_profile_refresh,
      bypassLimits,
    })
    if (!policy.allowed) {
      throw new Error(policy.reason ?? 'Competitor profile refresh not allowed')
    }

    const budget = await checkCostBudget(workspaceId, plan)
    if (!budget.ok) {
      throw new Error(`AI cost ceiling exceeded (${budget.mtdCents}/${budget.ceilingCents} cents)`)
    }

    const { data: relatedItems } = await supabase
      .from('intelligence_item')
      .select('title,summary,source_urls,ingested_at')
      .eq('workspace_id', workspaceId)
      .contains('related_competitors', [competitorId])
      .order('ingested_at', { ascending: false })
      .limit(20)

    const contextBlock = (relatedItems ?? [])
      .map((it, idx) => `#${idx + 1} ${it.title}\n${it.summary ?? ''}`)
      .join('\n\n')

    const prompt = `Use available knowledge and context to refresh a competitor profile.
Return output as valid JSON only.

Competitor:
- Name: ${competitor.name}
- Website: ${competitor.website ?? '(unknown)'}

Existing profile:
- Positioning: ${competitor.positioning ?? ''}
- ICP: ${competitor.icp_description ?? ''}
- Pricing model: ${competitor.pricing_model ?? ''}
- Pricing notes: ${competitor.pricing_notes ?? ''}

Recent intelligence context:
${contextBlock || '(none)'}

Output requirements:
- Provide company_summary, products, and leadership.
- Keep facts grounded and conservative if uncertain.
- Include a confidence score from 0 to 1.

Return JSON matching:
{
  "company_summary":{
    "positioning":"string",
    "icp_description":"string",
    "pricing_model":"string",
    "pricing_notes":"string",
    "founded_year":number|null,
    "hq_location":"string|null",
    "employee_count_estimate":number|null,
    "funding_status":"string|null"
  },
  "products":[{"name":"string","description":"string"}],
  "leadership":[{"name":"string","role":"string","since":"string","linkedIn":"https://..."}],
  "confidence":0.0
}`

    const routing = await getRoutingFor('competitor_profile_refresh')
    const client = getVendorClient(routing.vendor, routing.model)
    const started = Date.now()
    const res = await client.complete({
      prompt,
      responseSchema: competitorProfileSchema,
      maxTokens: 4096,
    })

    const usage = res.usage
    const cost = estimateCallCostCents(routing.model, usage.inputTokens, usage.outputTokens)
    await recordVendorCall(workspaceId, plan, {
      purpose: 'competitor_profile_refresh',
      vendor: routing.vendor,
      model: routing.model,
      requestTokens: usage.inputTokens,
      responseTokens: usage.outputTokens,
      costCents: cost,
      latencyMs: Date.now() - started,
      success: true,
      responsePayload: { competitorId, source },
    })

    const parsed = competitorProfileSchema.parse(res.parsed)
    const nowIso = new Date().toISOString()
    const aiDraftedFields = [
      'positioning',
      'icp_description',
      'pricing_model',
      'pricing_notes',
      'founded_year',
      'hq_location',
      'employee_count_estimate',
      'funding_status',
      'products',
      'leadership',
    ]

    const { error: upErr } = await supabase
      .from('competitor')
      .update({
        positioning: parsed.company_summary.positioning || null,
        icp_description: parsed.company_summary.icp_description || null,
        pricing_model: parsed.company_summary.pricing_model || null,
        pricing_notes: parsed.company_summary.pricing_notes || null,
        founded_year: parsed.company_summary.founded_year ?? null,
        hq_location: parsed.company_summary.hq_location ?? null,
        employee_count_estimate: parsed.company_summary.employee_count_estimate ?? null,
        funding_status: parsed.company_summary.funding_status ?? null,
        products: parsed.products as never,
        leadership: parsed.leadership as never,
        discovery_confidence: parsed.confidence ?? competitor.discovery_confidence,
        ai_drafted_fields: aiDraftedFields,
        last_profile_refresh: nowIso,
        last_significant_change_at: nowIso,
      })
      .eq('workspace_id', workspaceId)
      .eq('id', competitorId)
    if (upErr) throw upErr

    return { ok: true, competitorId, workspaceId }
  }
)
