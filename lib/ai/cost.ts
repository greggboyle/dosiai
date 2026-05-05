import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getEffectiveLimits } from '@/lib/billing/limits'
import type { AiPurposeDb, AiVendorDb } from '@/lib/supabase/types'
import { inngest } from '@/inngest/client'
import type { WorkspacePlan } from '@/lib/types/dosi'

export async function getMtdCost(workspaceId: string): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('vendor_call')
    .select('cost_cents')
    .eq('workspace_id', workspaceId)
    .gte('called_at', startOfMonth.toISOString())
  if (error) throw error
  return (data ?? []).reduce((s, r) => s + (r.cost_cents ?? 0), 0)
}

export async function getEffectiveCeilingCents(workspaceId: string, plan: WorkspacePlan): Promise<number> {
  const limits = await getEffectiveLimits(workspaceId, plan)
  return limits.aiCostCeilingCents
}

export type CostBudgetResult =
  | { ok: true }
  | { ok: false; reason: 'AI_COST_CEILING_EXCEEDED'; mtdCents: number; ceilingCents: number }

export async function checkCostBudget(workspaceId: string, plan: WorkspacePlan): Promise<CostBudgetResult> {
  const mtd = await getMtdCost(workspaceId)
  const ceiling = await getEffectiveCeilingCents(workspaceId, plan)
  if (ceiling < 0) return { ok: true }
  if (mtd >= ceiling) {
    return { ok: false, reason: 'AI_COST_CEILING_EXCEEDED', mtdCents: mtd, ceilingCents: ceiling }
  }
  return { ok: true }
}

export interface VendorCallRecord {
  purpose: AiPurposeDb
  vendor: AiVendorDb
  model: string
  promptTemplateId?: string | null
  promptTemplateVersion?: number | null
  requestTokens: number
  responseTokens: number
  costCents: number
  latencyMs?: number | null
  success: boolean
  errorMessage?: string | null
  citationCount?: number
  responsePayload?: unknown
  sweepId?: string | null
}

/**
 * Inserts vendor_call. Workspace MTD is updated automatically via DB trigger.
 * Emits soft warning event when crossing 80% of ceiling.
 */
export async function recordVendorCall(workspaceId: string, plan: WorkspacePlan, call: VendorCallRecord) {
  const supabase = createSupabaseAdminClient()
  const ceiling = await getEffectiveCeilingCents(workspaceId, plan)
  const mtdBefore = await getMtdCost(workspaceId)
  const pctBefore = ceiling > 0 ? mtdBefore / ceiling : 0

  const { data: inserted, error } = await supabase
    .from('vendor_call')
    .insert({
      workspace_id: workspaceId,
      purpose: call.purpose,
      vendor: call.vendor,
      model: call.model,
      prompt_template_id: call.promptTemplateId ?? null,
      prompt_template_version: call.promptTemplateVersion ?? null,
      request_tokens: call.requestTokens,
      response_tokens: call.responseTokens,
      cost_cents: call.costCents,
      latency_ms: call.latencyMs ?? null,
      success: call.success,
      error_message: call.errorMessage ?? null,
      citation_count: call.citationCount ?? 0,
      response_payload: (call.responsePayload ?? null) as never,
      sweep_id: call.sweepId ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  const mtdAfter = mtdBefore + call.costCents
  const pctAfter = ceiling > 0 ? mtdAfter / ceiling : 0
  if (pctBefore < 0.8 && pctAfter >= 0.8 && ceiling > 0) {
    await inngest.send({
      name: 'ai/cost-warning',
      data: { workspaceId, mtdCents: mtdAfter, ceilingCents: ceiling, percent: Math.round(pctAfter * 100) },
    })
    console.warn(
      `[ai cost] workspace ${workspaceId} crossed 80% of AI ceiling (${mtdAfter}/${ceiling} cents)`
    )
  }

  return inserted
}
