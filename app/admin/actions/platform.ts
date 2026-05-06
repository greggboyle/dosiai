'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireOperator, requireOperatorAdminOrOwner } from '@/lib/admin/require-operator'
import type { VendorAggregateRow, WorkspaceCostRow } from '@/lib/admin/platform-types'
import type { AIPurpose, AIVendor, PromptVariable } from '@/lib/admin-types'
import { buildPromptTemplateName, getEmbeddedPromptDefault } from '@/lib/admin/prompt-defaults'
import { getVendorClient } from '@/lib/ai/factory'

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

export async function createPromptTemplate(input: {
  name: string
  purpose: AIPurpose
  vendor: AIVendor
  content: string
  variables?: PromptVariable[]
}) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('prompt_template')
    .insert({
      name: input.name.trim(),
      purpose: input.purpose,
      vendor: input.vendor,
      status: 'draft',
      version: 1,
      content: input.content,
      draft_content: input.content,
      draft_note: 'Created from operator console',
      variables: input.variables ?? [],
      deployment_history: [],
      updated_at: now,
      updated_by_operator_id: operator.id,
    })
    .select('id')
    .single()
  if (error) throw error
  revalidatePath('/admin/prompts')
  return data?.id
}

export async function activatePromptTemplate(input: { id: string; reason?: string }) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data: row, error: getErr } = await admin.from('prompt_template').select('*').eq('id', input.id).single()
  if (getErr || !row) throw getErr ?? new Error('Template not found')

  const nextContent = row.draft_content?.trim() ? row.draft_content : row.content
  const nextVersion = row.draft_content ? row.version + 1 : row.version
  const previous = Array.isArray(row.deployment_history) ? row.deployment_history : []
  const deployedAt = new Date().toISOString()
  const historyEntry = {
    version: nextVersion,
    deployedAt,
    deployedBy: operator.name,
    trafficPercent: 100,
    contentSnapshot: nextContent,
  }

  const { error: upErr } = await admin
    .from('prompt_template')
    .update({
      status: 'active',
      content: nextContent,
      version: nextVersion,
      draft_content: null,
      draft_note: input.reason?.trim() || null,
      deployment_history: [historyEntry, ...previous],
      updated_at: deployedAt,
      updated_by_operator_id: operator.id,
    })
    .eq('id', row.id)
  if (upErr) throw upErr

  const { error: archiveErr } = await admin
    .from('prompt_template')
    .update({
      status: 'archived',
      updated_at: deployedAt,
      updated_by_operator_id: operator.id,
    })
    .eq('purpose', row.purpose)
    .eq('vendor', row.vendor)
    .eq('status', 'active')
    .neq('id', row.id)
  if (archiveErr) throw archiveErr

  revalidatePath('/admin/prompts')
}

export async function clonePromptDraftFromActive(input: { id: string; note?: string }) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data: row, error } = await admin.from('prompt_template').select('*').eq('id', input.id).single()
  if (error || !row) throw error ?? new Error('Template not found')

  const now = new Date().toISOString()
  const { error: upErr } = await admin
    .from('prompt_template')
    .update({
      status: 'draft',
      draft_content: row.content,
      draft_note: input.note?.trim() || `Draft cloned from active v${row.version}`,
      updated_at: now,
      updated_by_operator_id: operator.id,
    })
    .eq('id', row.id)
  if (upErr) throw upErr
  revalidatePath('/admin/prompts')
}

export async function rollbackPromptTemplate(input: { id: string; reason: string }) {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data: row, error } = await admin.from('prompt_template').select('*').eq('id', input.id).single()
  if (error || !row) throw error ?? new Error('Template not found')

  const history = Array.isArray(row.deployment_history) ? [...row.deployment_history] : []
  if (history.length < 2) throw new Error('No previous deployed version available to roll back to')

  const current = history[0] as Record<string, unknown>
  const target = history.slice(1).find((h) => (h as Record<string, unknown>).contentSnapshot) as
    | Record<string, unknown>
    | undefined
  if (!target?.contentSnapshot || typeof target.contentSnapshot !== 'string') {
    throw new Error('Cannot roll back: prior content snapshot missing')
  }

  const now = new Date().toISOString()
  const updatedCurrent = {
    ...current,
    rolledBackAt: now,
    rollbackReason: input.reason,
  }
  const rollbackEntry = {
    version: Number(target.version),
    deployedAt: now,
    deployedBy: operator.name,
    trafficPercent: 100,
    contentSnapshot: target.contentSnapshot,
    rollbackFromVersion: row.version,
  }

  const { error: upErr } = await admin
    .from('prompt_template')
    .update({
      status: 'active',
      content: target.contentSnapshot,
      version: Number(target.version),
      draft_content: null,
      draft_note: `Rollback: ${input.reason}`,
      deployment_history: [rollbackEntry, updatedCurrent, ...history.slice(1)],
      updated_at: now,
      updated_by_operator_id: operator.id,
    })
    .eq('id', row.id)
  if (upErr) throw upErr

  const { error: archiveErr } = await admin
    .from('prompt_template')
    .update({
      status: 'archived',
      updated_at: now,
      updated_by_operator_id: operator.id,
    })
    .eq('purpose', row.purpose)
    .eq('vendor', row.vendor)
    .eq('status', 'active')
    .neq('id', row.id)
  if (archiveErr) throw archiveErr

  revalidatePath('/admin/prompts')
}

function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? `{{${key}}}`)
}

export async function validatePromptTemplate(input: {
  id: string
  variables: Record<string, string>
  contentOverride?: string
}) {
  await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const { data: row, error } = await admin.from('prompt_template').select('*').eq('id', input.id).single()
  if (error || !row) throw error ?? new Error('Template not found')

  const purpose = row.purpose
  const vendor = row.vendor
  const { data: routing, error: routingErr } = await admin
    .from('ai_routing_config')
    .select('rules')
    .eq('purpose', purpose)
    .single()
  if (routingErr) throw routingErr
  const rules = (Array.isArray(routing.rules) ? routing.rules : []) as Array<{
    vendor: AIVendor
    model: string
    isEnabled?: boolean
    isPrimary?: boolean
  }>
  const enabled = rules.filter((r) => r.isEnabled !== false)
  const match = enabled.find((r) => r.vendor === vendor) ?? enabled.find((r) => r.isPrimary) ?? enabled[0]
  if (!match) throw new Error(`No enabled model found for purpose ${purpose}`)

  const prompt = interpolatePrompt(input.contentOverride?.trim() || row.draft_content || row.content, input.variables)
  const client = getVendorClient(match.vendor as AIVendor, match.model)
  const started = Date.now()
  const out = await client.complete({ prompt, maxTokens: 500 })
  const latencyMs = Date.now() - started
  return {
    vendor: match.vendor,
    model: match.model,
    latencyMs,
    usage: out.usage,
    preview: out.content.slice(0, 2000),
  }
}

export async function seedPromptTemplatesFromCode() {
  const { operator } = await requireOperatorAdminOrOwner()
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const [routingRes, promptRes] = await Promise.all([
    admin.from('ai_routing_config').select('purpose,rules'),
    admin.from('prompt_template').select('id,purpose,vendor,version,content,draft_content'),
  ])
  if (routingRes.error) throw routingRes.error
  if (promptRes.error) throw promptRes.error

  const existing = new Set((promptRes.data ?? []).map((r) => `${r.purpose}::${r.vendor}`))
  const missingRows: Array<Record<string, unknown>> = []

  for (const cfg of routingRes.data ?? []) {
    const purpose = cfg.purpose as AIPurpose
    const def = getEmbeddedPromptDefault(purpose)
    if (!def) continue
    const rules = Array.isArray(cfg.rules) ? cfg.rules : []
    for (const rule of rules) {
      const vendor = (rule as { vendor?: string; isEnabled?: boolean }).vendor as AIVendor | undefined
      const isEnabled = (rule as { isEnabled?: boolean }).isEnabled !== false
      if (!vendor || !isEnabled) continue
      const key = `${purpose}::${vendor}`
      if (existing.has(key)) continue
      existing.add(key)
      missingRows.push({
        id: randomUUID(),
        name: buildPromptTemplateName(purpose, vendor),
        purpose,
        vendor,
        status: 'active',
        version: 1,
        content: def.content,
        draft_content: null,
        draft_note: null,
        deployment_history: [
          { version: 1, deployedAt: now, deployedBy: operator.name, trafficPercent: 100, contentSnapshot: def.content },
        ],
        ab_test: null,
        variables: def.variables,
        updated_at: now,
        updated_by_operator_id: operator.id,
      })
    }
  }

  if (missingRows.length > 0) {
    const { error } = await admin.from('prompt_template').insert(missingRows)
    if (error) throw error
  }

  // Keep seeded brief_drafting templates aligned with runtime fallback prompt.
  const briefDefault = getEmbeddedPromptDefault('brief_drafting')
  if (briefDefault) {
    const staleBriefTemplates = (promptRes.data ?? []).filter(
      (row) =>
        row.purpose === 'brief_drafting' &&
        row.version === 1 &&
        !row.draft_content &&
        row.content !== briefDefault.content
    )
    for (const row of staleBriefTemplates) {
      const { error } = await admin
        .from('prompt_template')
        .update({
          content: briefDefault.content,
          variables: briefDefault.variables,
          updated_at: now,
          updated_by_operator_id: operator.id,
        })
        .eq('id', row.id)
      if (error) throw error
    }
  }

  // Own-company sweep: older seeds used the shared sweep template (wrong placeholders).
  const selfDefault = getEmbeddedPromptDefault('sweep_self')
  if (selfDefault) {
    const staleSelfTemplates = (promptRes.data ?? []).filter(
      (row) =>
        row.purpose === 'sweep_self' &&
        row.version === 1 &&
        !row.draft_content &&
        row.content !== selfDefault.content
    )
    for (const row of staleSelfTemplates) {
      const { error } = await admin
        .from('prompt_template')
        .update({
          content: selfDefault.content,
          variables: selfDefault.variables,
          updated_at: now,
          updated_by_operator_id: operator.id,
        })
        .eq('id', row.id)
      if (error) throw error
    }
  }

  return { created: missingRows.length }
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

export interface AdminDashboardData {
  platformHealth: {
    activeWorkspacesToday: number
    sweepsCompleted24h: number
    sweepsSuccessRate: number
    sweepsFailed24h: number
    avgSweepLatencyMs: number
    avgSweepLatencyTrend: number
    activeImpersonations: number
  }
  attentionItems: Array<{
    id: string
    severity: 'critical' | 'warning'
    workspaceName: string | null
    workspaceId: string | null
    summary: string
    age: string
    actionLabel?: string
    actionHref?: string
  }>
  vendorHealth: Array<{
    vendor: string
    status: 'healthy' | 'degraded' | 'down'
    latencyMs: number
    successRate: number
    callsLastHour: number
    projectedDailyCost: number
  }>
  recentActivity: Array<{
    id: string
    type: 'signup' | 'upgrade' | 'downgrade' | 'cancellation' | 'ticket'
    workspaceName: string
    workspaceId: string
    details: string
    timestamp: string
  }>
  activeImpersonations: Array<{
    id: string
    workspaceName: string
    workspaceId: string
    operatorName: string
    operatorEmail: string
    durationMinutes: number
  }>
  queueDepthData: Array<{ time: string; depth: number }>
  systemErrorSeries: Array<{ time: string; errors: number }>
  queueStats: { currentDepth: number; avgWaitTimeMinutes: number; longestWaitMinutes: number }
  systemErrors: { countLast24h: number; trend: number }
}

function formatAge(fromIso: string): string {
  const deltaMs = Date.now() - new Date(fromIso).getTime()
  const mins = Math.max(0, Math.floor(deltaMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(0, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const now = Date.now()
  const d24 = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const d48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  const [workspaceRes, sweeps24Res, sweeps48Res, impersonationRes, vendor24Res, vendor1hRes, recentWsRes] =
    await Promise.all([
      admin.from('workspace').select('id,status,created_at', { count: 'exact', head: true }).eq('status', 'active'),
      admin
        .from('sweep')
        .select('id,workspace_id,status,started_at,completed_at,errors', { count: 'exact' })
        .gte('started_at', d24),
      admin.from('sweep').select('id,status,started_at,completed_at').gte('started_at', d48),
      admin
        .from('impersonation_session')
        .select('id,workspace_id,started_at,workspace:workspace_id(name),operator:operator_id(name,email)')
        .is('ended_at', null),
      admin.from('vendor_call').select('vendor,success,latency_ms,cost_cents,called_at').gte('called_at', d24),
      admin
        .from('vendor_call')
        .select('vendor,success,latency_ms,cost_cents,called_at')
        .gte('called_at', new Date(now - 60 * 60 * 1000).toISOString()),
      admin.from('workspace').select('id,name,created_at,plan,status').order('created_at', { ascending: false }).limit(8),
    ])

  const sweeps24 = sweeps24Res.data ?? []
  const sweeps48 = sweeps48Res.data ?? []
  const successful24 = sweeps24.filter((s) => s.status === 'completed').length
  const failed24 = sweeps24.filter((s) => s.status === 'failed').length
  const successRate = sweeps24.length ? (successful24 / sweeps24.length) * 100 : 100

  const avgLatency = (rows: Array<{ started_at: string | null; completed_at: string | null }>) => {
    const samples = rows
      .filter((r) => r.started_at && r.completed_at)
      .map((r) => new Date(r.completed_at as string).getTime() - new Date(r.started_at as string).getTime())
      .filter((n) => Number.isFinite(n) && n >= 0)
    if (!samples.length) return 0
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
  }
  const avg24 = avgLatency(sweeps48.filter((s) => new Date(s.started_at as string).getTime() >= now - 24 * 60 * 60 * 1000))
  const avgPrev24 = avgLatency(
    sweeps48.filter((s) => {
      const t = new Date(s.started_at as string).getTime()
      return t < now - 24 * 60 * 60 * 1000
    })
  )
  const latencyTrend = avgPrev24 > 0 ? Math.round(((avg24 - avgPrev24) / avgPrev24) * 100) : 0

  const running = sweeps24.filter((s) => s.status === 'running')
  const waitMins = running
    .map((s) => Math.max(0, (now - new Date(s.started_at as string).getTime()) / 60000))
    .filter((n) => Number.isFinite(n))
  const avgWait = waitMins.length ? Number((waitMins.reduce((a, b) => a + b, 0) / waitMins.length).toFixed(1)) : 0
  const maxWait = waitMins.length ? Math.round(Math.max(...waitMins)) : 0

  const queueDepthData = Array.from({ length: 24 }, (_, i) => {
    const from = now - (23 - i) * 60 * 60 * 1000
    const to = from + 60 * 60 * 1000
    const depth = sweeps24.filter((s) => {
      const st = new Date(s.started_at as string).getTime()
      const en = s.completed_at ? new Date(s.completed_at).getTime() : Number.POSITIVE_INFINITY
      return st <= to && en >= from
    }).length
    return { time: `${String(new Date(from).getHours()).padStart(2, '0')}:00`, depth }
  })

  const vendorCalls24 = vendor24Res.data ?? []
  const vendorCalls1h = vendor1hRes.data ?? []

  const systemErrorSeries = Array.from({ length: 24 }, (_, i) => {
    const from = now - (23 - i) * 60 * 60 * 1000
    const to = from + 60 * 60 * 1000
    const sweepErrors = sweeps24.filter((s) => {
      if (s.status !== 'failed' || !s.started_at) return false
      const t = new Date(s.started_at).getTime()
      return t >= from && t < to
    }).length
    const vendorErrors = vendorCalls24.filter((v) => {
      if (v.success) return false
      const t = new Date(v.called_at).getTime()
      return t >= from && t < to
    }).length
    return { time: `${String(new Date(from).getHours()).padStart(2, '0')}:00`, errors: sweepErrors + vendorErrors }
  })
  const vendorGroups = new Map<string, { total: number; ok: number; lat: number; latN: number; cost: number; h: number }>()
  for (const c of vendorCalls24) {
    const g = vendorGroups.get(c.vendor) ?? { total: 0, ok: 0, lat: 0, latN: 0, cost: 0, h: 0 }
    g.total += 1
    if (c.success) g.ok += 1
    if (c.latency_ms != null && c.latency_ms >= 0) {
      g.lat += c.latency_ms
      g.latN += 1
    }
    g.cost += c.cost_cents ?? 0
    vendorGroups.set(c.vendor, g)
  }
  for (const c of vendorCalls1h) {
    const g = vendorGroups.get(c.vendor) ?? { total: 0, ok: 0, lat: 0, latN: 0, cost: 0, h: 0 }
    g.h += 1
    vendorGroups.set(c.vendor, g)
  }

  const vendorLabel: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', xai: 'xAI' }
  const vendorHealth = [...vendorGroups.entries()].map(([vendor, g]) => {
    const successRatePct = g.total ? (g.ok / g.total) * 100 : 100
    const latencyMs = g.latN ? Math.round(g.lat / g.latN) : 0
    const status: 'healthy' | 'degraded' | 'down' =
      successRatePct < 90 ? 'down' : successRatePct < 97 || latencyMs > 4000 ? 'degraded' : 'healthy'
    return {
      vendor: vendorLabel[vendor] ?? vendor,
      status,
      latencyMs,
      successRate: Number(successRatePct.toFixed(1)),
      callsLastHour: g.h,
      projectedDailyCost: Math.round((g.cost / 100) || 0),
    }
  })

  const activeImpersonations = (impersonationRes.data ?? []).map((s) => ({
    id: s.id,
    workspaceName: (s.workspace as unknown as { name?: string })?.name ?? 'Unknown workspace',
    workspaceId: s.workspace_id,
    operatorName: (s.operator as unknown as { name?: string })?.name ?? 'Unknown operator',
    operatorEmail: (s.operator as unknown as { email?: string })?.email ?? '',
    durationMinutes: Math.max(0, Math.floor((now - new Date(s.started_at).getTime()) / 60000)),
  }))

  const attentionItems = sweeps24
    .filter((s) => s.status === 'failed')
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      severity: 'critical' as const,
      workspaceName: null,
      workspaceId: s.workspace_id,
      summary: `Sweep failed: ${((s.errors as Array<{ message?: string }> | null)?.[0]?.message ?? 'Unknown error').slice(0, 140)}`,
      age: formatAge(s.started_at as string),
      actionLabel: 'View workspace',
      actionHref: `/admin/workspaces/${s.workspace_id}`,
    }))

  const recentActivity = (recentWsRes.data ?? []).map((w) => ({
    id: w.id,
    type: 'signup' as const,
    workspaceName: w.name,
    workspaceId: w.id,
    details: `Workspace created (${w.plan})`,
    timestamp: formatRelative(w.created_at),
  }))

  const systemErrorsNow = failed24 + vendorCalls24.filter((v) => !v.success).length
  const prevWindowStart = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const prevWindowEnd = d24
  const [prevFailedRes, prevVendorErrRes] = await Promise.all([
    admin.from('sweep').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('started_at', prevWindowStart).lt('started_at', prevWindowEnd),
    admin.from('vendor_call').select('id', { count: 'exact', head: true }).eq('success', false).gte('called_at', prevWindowStart).lt('called_at', prevWindowEnd),
  ])
  const prevErrors = (prevFailedRes.count ?? 0) + (prevVendorErrRes.count ?? 0)
  const trend = prevErrors > 0 ? Math.round(((systemErrorsNow - prevErrors) / prevErrors) * 100) : 0

  return {
    platformHealth: {
      activeWorkspacesToday: workspaceRes.count ?? 0,
      sweepsCompleted24h: successful24,
      sweepsSuccessRate: Number(successRate.toFixed(1)),
      sweepsFailed24h: failed24,
      avgSweepLatencyMs: avg24,
      avgSweepLatencyTrend: latencyTrend,
      activeImpersonations: activeImpersonations.length,
    },
    attentionItems,
    vendorHealth: vendorHealth.sort((a, b) => a.vendor.localeCompare(b.vendor)),
    recentActivity,
    activeImpersonations,
    queueDepthData,
    systemErrorSeries,
    queueStats: {
      currentDepth: running.length,
      avgWaitTimeMinutes: avgWait,
      longestWaitMinutes: maxWait,
    },
    systemErrors: { countLast24h: systemErrorsNow, trend },
  }
}
