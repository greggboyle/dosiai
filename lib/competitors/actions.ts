'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { inngest } from '@/inngest/client'
import { getSession } from '@/lib/auth/session'
import { withWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { WorkspacePlan } from '@/lib/types/dosi'
import type { CompetitorStatus, CompetitorTier } from '@/lib/types'
import { getCompetitorProfileRefreshPolicy } from '@/lib/competitors/profile-refresh'
import { assertCompetitorCapacity } from '@/lib/competitors/limits'
import { z } from 'zod'

function normalizeWebsiteForDb(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null

  // Accept either `acme.com` or `https://acme.com/...` and store hostname only.
  const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(href)
    const host = u.hostname.replace(/^www\./i, '')
    return host || null
  } catch {
    // Fallback: try to strip common protocol prefixes.
    return t.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || null
  }
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

function splitLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
}

function splitSegments(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/[\n,]/g)
    .map((v) => v.trim())
    .filter(Boolean)
}

const competitorProductSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
})

const competitorProductsSchema = z.array(competitorProductSchema).max(12)

const competitorLeadershipSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  since: z.string().optional().nullable(),
  linkedIn: z.string().url().optional().nullable(),
})

const competitorLeadershipArraySchema = z.array(competitorLeadershipSchema).max(12)

function safeJsonParse(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  return JSON.parse(t)
}

export async function requestCompetitorProfileRefresh(competitorId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id,role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role === 'viewer') throw new Error('Forbidden')

  const [{ data: workspace, error: wsErr }, { data: competitor, error: compErr }] = await Promise.all([
    supabase.from('workspace').select('id,plan,status').eq('id', member.workspace_id).single(),
    supabase
      .from('competitor')
      .select('id,last_profile_refresh')
      .eq('workspace_id', member.workspace_id)
      .eq('id', competitorId)
      .single(),
  ])

  if (wsErr || !workspace) throw wsErr ?? new Error('Workspace not found')
  if (workspace.status === 'read_only') throw new Error('Workspace is read-only')
  if (compErr || !competitor) throw compErr ?? new Error('Competitor not found')

  const policy = getCompetitorProfileRefreshPolicy({
    plan: workspace.plan as WorkspacePlan,
    lastProfileRefreshAt: competitor.last_profile_refresh,
  })
  if (!policy.allowed) {
    if (policy.nextAllowedAt) {
      const when = new Date(policy.nextAllowedAt).toLocaleString()
      throw new Error(`${policy.reason ?? 'Refresh limit reached'} Next allowed: ${when}.`)
    }
    throw new Error(policy.reason ?? 'Refresh not allowed for this workspace')
  }

  await inngest.send({
    name: 'competitor/populate-profile',
    data: {
      workspaceId: member.workspace_id,
      competitorId,
      requestedByUserId: session.user.id,
      source: 'manual',
      bypassLimits: false,
    },
  })

  revalidatePath(`/competitors/${competitorId}`)
}
export async function createCompetitor(input: {
  workspaceId: string
  name: string
  website?: string
  tier?: CompetitorTier
}): Promise<{ id: string }> {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')

  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    if (workspace.status !== 'active') {
      throw new Error('Workspace cannot add competitors in the current state.')
    }

    await assertCompetitorCapacity(workspace.id, workspace.plan)

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('competitor')
      .insert({
        workspace_id: workspace.id,
        name,
        website: input.website?.trim() || null,
        source: 'manual',
        status: 'active',
        tier: input.tier ?? 'primary_direct',
      })
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('Failed to create competitor')

    revalidatePath('/competitors')
    revalidatePath('/')
    return { id: data.id }
  })
}

export async function setCompetitorStatus(input: {
  workspaceId: string
  competitorId: string
  status: CompetitorStatus
}): Promise<void> {
  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    if (workspace.status !== 'active') {
      throw new Error('Workspace cannot update competitors in the current state.')
    }

    if (input.status === 'active') {
      await assertCompetitorCapacity(workspace.id, workspace.plan)
    }

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('competitor')
      .update({ status: input.status })
      .eq('id', input.competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error

    revalidatePath('/competitors')
    revalidatePath('/')
  })
}

export async function updateCompetitorIdentity(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const websiteRaw = String(formData.get('website') ?? '').trim()

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')
  if (!name) throw new Error('Name is required')

  const website = normalizeWebsiteForDb(websiteRaw)

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        name,
        website,
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=identity`)
}

export async function updateCompetitorCompanySummary(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const positioning = String(formData.get('positioning') ?? '').trim() || null
  const icp = String(formData.get('icp') ?? '').trim() || null
  const pricingModel = String(formData.get('pricingModel') ?? '').trim() || null
  const pricingNotes = String(formData.get('pricingNotes') ?? '').trim() || null
  const founded = parseOptionalNumber(formData.get('founded'))
  const hq = String(formData.get('hq') ?? '').trim() || null
  const employeeEstimate = parseOptionalNumber(formData.get('employeeEstimate'))
  const fundingStatus = String(formData.get('fundingStatus') ?? '').trim() || null

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        positioning,
        icp_description: icp,
        pricing_model: pricingModel,
        pricing_notes: pricingNotes,
        founded_year: founded,
        hq_location: hq,
        employee_count_estimate: employeeEstimate,
        funding_status: fundingStatus,
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=summary`)
}

export async function updateCompetitorStrengthsWeaknesses(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const strengths = splitLines(formData.get('strengthsText')).slice(0, 30)
  const weaknesses = splitLines(formData.get('weaknessesText')).slice(0, 30)

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        strengths: strengths.length ? strengths : [],
        weaknesses: weaknesses.length ? weaknesses : [],
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=strengths`)
}

export async function updateCompetitorProducts(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const productsJsonRaw = safeJsonParse(formData.get('productsJson'))

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')

  const parsed = competitorProductsSchema.parse(productsJsonRaw)

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        products: parsed as never,
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=products`)
}

export async function updateCompetitorLeadership(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const leadershipJsonRaw = safeJsonParse(formData.get('leadershipJson'))

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')

  const parsed = competitorLeadershipArraySchema.parse(leadershipJsonRaw)

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        leadership: parsed as never,
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=leadership`)
}

export async function updateCompetitorSegments(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  const competitorId = String(formData.get('competitorId') ?? '')
  const segments = splitSegments(formData.get('segmentsText')).slice(0, 20)

  if (!workspaceId || !competitorId) throw new Error('Missing workspace or competitor id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('competitor')
      .update({
        segment_relevance: segments,
        last_significant_change_at: nowIso,
      })
      .eq('id', competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error
  })

  revalidatePath(`/competitors/${competitorId}`)
  revalidatePath('/competitors')
  revalidatePath('/')
  redirect(`/competitors/${competitorId}?saved=segments`)
}
