'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireOperator, requireOperatorAdminOrOwner } from '@/lib/admin/require-operator'
import type { VendorAggregateRow, WorkspaceCostRow } from '@/lib/admin/platform-types'

export async function listAiRoutingConfigs() {
  await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.from('ai_routing_config').select('*').order('purpose')
  if (error) throw error
  return data ?? []
}

export async function updateAiRoutingConfig(input: {
  purpose: string
  mode: 'single-vendor' | 'multi-vendor'
  rules: unknown
}) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('ai_routing_config')
    .update({
      mode: input.mode,
      rules: input.rules as object,
      updated_at: new Date().toISOString(),
      updated_by_operator_id: operator.id,
    })
    .eq('purpose', input.purpose)

  if (error) throw error
  revalidatePath('/admin/ai-routing')
}

export async function listPromptTemplates() {
  await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('prompt_template')
    .select('*')
    .order('purpose', { ascending: true })
    .order('vendor', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updatePromptTemplate(input: {
  id: string
  content?: string
  status?: 'active' | 'draft' | 'archived'
  draft_content?: string | null
  draft_note?: string | null
}) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by_operator_id: operator.id,
  }
  if (input.content !== undefined) patch.content = input.content
  if (input.status !== undefined) patch.status = input.status
  if (input.draft_content !== undefined) patch.draft_content = input.draft_content
  if (input.draft_note !== undefined) patch.draft_note = input.draft_note

  const { error } = await admin.from('prompt_template').update(patch).eq('id', input.id)
  if (error) throw error
  revalidatePath('/admin/prompts')
}

export async function getVendorCallAggregates(days = 7): Promise<VendorAggregateRow[]> {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await admin
    .from('vendor_call')
    .select('vendor,success,latency_ms,cost_cents,called_at')
    .gte('called_at', since)

  if (error) throw error
  const rows = data ?? []
  const byVendor = new Map<
    string,
    { calls: number; successes: number; failures: number; latencySum: number; latencyN: number; cost: number }
  >()

  for (const r of rows) {
    const v = r.vendor as string
    const cur =
      byVendor.get(v) ??
      { calls: 0, successes: 0, failures: 0, latencySum: 0, latencyN: 0, cost: 0 }
    cur.calls += 1
    if (r.success) cur.successes += 1
    else cur.failures += 1
    if (r.latency_ms != null && r.latency_ms >= 0) {
      cur.latencySum += r.latency_ms
      cur.latencyN += 1
    }
    cur.cost += r.cost_cents ?? 0
    byVendor.set(v, cur)
  }

  return [...byVendor.entries()].map(([vendor, agg]) => ({
    vendor,
    calls: agg.calls,
    successes: agg.successes,
    failures: agg.failures,
    avgLatencyMs: agg.latencyN ? Math.round(agg.latencySum / agg.latencyN) : null,
    totalCostCents: agg.cost,
  }))
}

export async function listWorkspaceCostOverview(limit = 500): Promise<WorkspaceCostRow[]> {
  await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('workspace')
    .select('id,name,plan,status,ai_cost_mtd_cents,ai_cost_ceiling_cents,trial_ends_at')
    .order('name', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as WorkspaceCostRow[]
}
