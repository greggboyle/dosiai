import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getVendorClient } from '@/lib/ai/factory'
import { getRoutingFor } from '@/lib/ai/router'
import { getActivePromptTemplateFor, renderPromptTemplate } from '@/lib/ai/prompt-template'
import { SWEEP_HIRING_PROMPT_TEMPLATE } from '@/lib/admin/prompt-defaults'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { SweepRejectedError } from '@/lib/sweep/errors'
import type { JobPostingPayload, JobPostingStatus } from '@/lib/competitors/job-posting-types'
import { upsertCompetitorJobPostingAdmin } from '@/lib/competitors/job-postings-admin'
import { hiringSweepAiResponseSchema, type HiringSweepJobItem } from '@/lib/competitors/hiring-sweep-schema'
import type { AiVendorDb } from '@/lib/supabase/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

export interface OrchestrateHiringSweepInput {
  workspaceId: string
  trigger: 'manual' | 'scheduled'
  triggerUserId: string | null
}

function normalizeJobUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(t) ? t : `https://${t}`)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

async function renderHiringPrompt(
  vendor: AiVendorDb,
  variables: Record<string, string>
): Promise<{ prompt: string; promptTemplateId: string | null; promptTemplateVersion: number | null }> {
  const row = await getActivePromptTemplateFor('sweep_hiring', vendor)
  const raw = row?.content?.trim() ? row.content : SWEEP_HIRING_PROMPT_TEMPLATE
  return {
    prompt: renderPromptTemplate(raw, variables),
    promptTemplateId: row?.id ?? null,
    promptTemplateVersion: row?.version ?? null,
  }
}

function jobItemToPayload(url: string, item: HiringSweepJobItem): JobPostingPayload {
  const status: JobPostingStatus = item.status ?? 'unknown'
  return {
    title: item.title,
    job_url: url,
    status,
    department: item.department ?? undefined,
    function: item.function ?? undefined,
    seniority: item.seniority ?? undefined,
    employment_type: item.employment_type ?? undefined,
    location: item.location_raw ? { raw: item.location_raw } : undefined,
    date_posted: item.date_posted ?? undefined,
    source: 'hiring_sweep_llm',
  }
}

async function closeStaleOpenPostings(
  workspaceId: string,
  competitorId: string,
  seenUrls: Set<string>
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data: opens, error } = await supabase
    .from('competitor_job_posting')
    .select('id, job_url')
    .eq('workspace_id', workspaceId)
    .eq('competitor_id', competitorId)
    .eq('posting_status', 'open')
  if (error) throw error
  const now = new Date().toISOString()
  for (const row of opens ?? []) {
    if (seenUrls.has(row.job_url)) continue
    const { error: upErr } = await supabase
      .from('competitor_job_posting')
      .update({ posting_status: 'closed', last_seen_at: now })
      .eq('id', row.id)
    if (upErr) throw upErr
  }
}

/**
 * Refreshes `competitor_job_posting` for active competitors with a website using LLM + web search.
 * Does not create intelligence items or sweep rows. Records `vendor_call` with `purpose: sweep_hiring`, `sweep_id: null`.
 *
 * **Reconciliation:** When at least one posting URL is successfully ingested for a competitor, any other rows
 * still `open` for that competitor and not in this run’s URL set are marked `closed` (best-effort; the model may omit still-open roles).
 */
export async function orchestrateHiringSweep(
  input: OrchestrateHiringSweepInput
): Promise<{ competitorsConsidered: number; jobPostingsUpserted: number }> {
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
    .select('company_summary, icp, icp_description, industry')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  const companySummary =
    [profile?.company_summary, profile?.icp_description ?? profile?.icp, profile?.industry && `Industry: ${profile.industry}`]
      .filter(Boolean)
      .join('\n') || 'No company profile yet.'

  const { data: competitorRows, error: compErr } = await supabase
    .from('competitor')
    .select('id,name,website')
    .eq('workspace_id', input.workspaceId)
    .eq('status', 'active')
  if (compErr) throw compErr

  const competitors = (competitorRows ?? []).filter((c) => c.website && String(c.website).trim().length > 0)
  const routing = await getRoutingFor('sweep_hiring')

  let jobPostingsUpserted = 0

  for (const comp of competitors) {
    const website = String(comp.website).trim()
    const variables: Record<string, string> = {
      workspace_company_summary: companySummary,
      competitor_name: comp.name,
      competitor_website: website,
    }

    const mergedByUrl = new Map<string, HiringSweepJobItem>()

    for (const rule of routing.activeRules) {
      const vendor = rule.vendor as AiVendorDb
      const { prompt, promptTemplateId, promptTemplateVersion } = await renderHiringPrompt(vendor, variables)
      const client = getVendorClient(vendor, rule.model)
      const started = Date.now()
      try {
        const res = await client.complete({
          prompt,
          responseSchema: hiringSweepAiResponseSchema,
          webSearch: true,
          maxTokens: 8192,
        })
        const usage = res.usage
        const parsed = res.parsed ? hiringSweepAiResponseSchema.safeParse(res.parsed) : null
        const parseOk = Boolean(parsed?.success)
        const cost = estimateCallCostCents(rule.model, usage.inputTokens, usage.outputTokens)

        await recordVendorCall(input.workspaceId, plan, {
          purpose: 'sweep_hiring',
          vendor,
          model: rule.model,
          requestTokens: usage.inputTokens,
          responseTokens: usage.outputTokens,
          costCents: cost,
          latencyMs: Date.now() - started,
          success: parseOk,
          citationCount: 0,
          responsePayload: res.rawResponse,
          sweepId: null,
          promptTemplateId,
          promptTemplateVersion,
          errorMessage: parseOk ? null : parsed ? parsed.error.message : 'Missing parsed JSON',
        })

        if (!parseOk || !parsed?.success) continue

        for (const job of parsed.data.jobs) {
          const url = normalizeJobUrl(job.job_url)
          if (!url) continue
          mergedByUrl.set(url, { ...job, job_url: url })
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await recordVendorCall(input.workspaceId, plan, {
          purpose: 'sweep_hiring',
          vendor,
          model: rule.model,
          requestTokens: 0,
          responseTokens: 0,
          costCents: 0,
          latencyMs: Date.now() - started,
          success: false,
          errorMessage: msg,
          sweepId: null,
        })
        console.error(`[orchestrateHiringSweep] competitor ${comp.id} (${comp.name}):`, e)
      }
    }

    const seenUrls = new Set<string>()
    for (const [url, item] of mergedByUrl) {
      seenUrls.add(url)
      const postingStatus: JobPostingStatus = item.status ?? 'unknown'
      await upsertCompetitorJobPostingAdmin(input.workspaceId, {
        competitorId: comp.id,
        jobUrl: url,
        title: item.title,
        postingStatus,
        payload: jobItemToPayload(url, item),
        rawDescription: item.raw_description ?? null,
      })
      jobPostingsUpserted += 1
    }

    if (seenUrls.size > 0) {
      await closeStaleOpenPostings(input.workspaceId, comp.id, seenUrls)
    }
  }

  await supabase
    .from('workspace')
    .update({ last_hiring_sweep_at: new Date().toISOString() })
    .eq('id', input.workspaceId)

  return { competitorsConsidered: competitors.length, jobPostingsUpserted }
}
