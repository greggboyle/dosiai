'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import { assertAiBriefDraftAllowed } from '@/lib/brief/limits'
import { countWords } from '@/lib/brief/queries'
import { notifyBriefSubscribersOfPublish } from '@/lib/notifications/brief-published'
import { filterItemIdsToSweepRegulatoryOnly } from '@/lib/brief/regulatory-items'
import { briefDraftRequestedEventName } from '@/lib/brief/inngest-events'
import { listIntelItemsForCompetitor } from '@/lib/feed/queries'
import type { Brief, BriefKind } from '@/lib/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

async function requireAuthorWorkspace(): Promise<{
  workspaceId: string
  userId: string
  role: 'admin' | 'analyst' | 'viewer'
  plan: WorkspacePlan
  status: 'active' | 'read_only' | 'grace_period' | 'cancelled'
}> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member, error: mErr } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (mErr || !member) throw new Error('No workspace')
  if (member.role === 'viewer') throw new Error('Forbidden')

  const { data: ws, error: wErr } = await supabase
    .from('workspace')
    .select('plan, status')
    .eq('id', member.workspace_id)
    .single()

  if (wErr || !ws) throw new Error('Workspace not found')

  return {
    workspaceId: member.workspace_id,
    userId: session.user.id,
    role: member.role,
    plan: ws.plan as WorkspacePlan,
    status: ws.status,
  }
}

/** Creates an empty draft brief and returns its id (for redirect). */
export async function createBriefDraft(): Promise<string> {
  const { createEmptyBriefDraftForSession } = await import('@/lib/brief/create-empty-draft')
  const result = await createEmptyBriefDraftForSession()
  if (!result.ok) {
    const msg =
      result.reason === 'unauthorized'
        ? 'Unauthorized'
        : result.reason === 'forbidden'
          ? 'Forbidden'
          : result.reason === 'read_only'
            ? 'Workspace is read-only'
            : result.message ?? 'Could not create brief'
    throw new Error(msg)
  }
  revalidatePath('/briefs')
  return result.id
}

export async function saveBrief(input: {
  briefId: string
  title: string
  summary: string
  body: string
  audience: Brief['audience']
  priority: Brief['priority']
  linkedItemIds: string[]
  status?: Brief['status']
}): Promise<void> {
  const ctx = await requireAuthorWorkspace()
  if (ctx.status === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('brief')
    .select('author_id, workspace_id, ai_drafted, human_reviewed, body, brief_kind, status')
    .eq('id', input.briefId)
    .single()

  if (fetchErr || !existing) throw new Error('Brief not found')
  if (existing.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')

  const isOwner = existing.author_id === ctx.userId
  const isAdmin = ctx.role === 'admin'
  if (!isOwner && !isAdmin) throw new Error('Forbidden')

  let humanReviewed = existing.human_reviewed
  if (existing.ai_drafted && !existing.human_reviewed) {
    humanReviewed = true
  }

  const wordCount = countWords(input.body)

  const { error } = await supabase
    .from('brief')
    .update({
      title: input.title,
      summary: input.summary,
      body: input.body,
      word_count: wordCount,
      audience: input.audience,
      priority: input.priority,
      linked_item_ids: input.linkedItemIds,
      human_reviewed: humanReviewed,
      ...(input.status ? { status: input.status } : {}),
    })
    .eq('id', input.briefId)

  if (error) throw error

  void import('@/lib/brief/recompute-scope').then(({ recomputeBriefScopeAfterWrite }) =>
    recomputeBriefScopeAfterWrite(input.briefId)
  )

  const { data: afterSave } = await supabase
    .from('brief')
    .select('brief_kind, status')
    .eq('id', input.briefId)
    .maybeSingle()

  if (afterSave?.brief_kind === 'competitor' && afterSave.status === 'published') {
    try {
      await notifyBriefSubscribersOfPublish(input.briefId)
    } catch {
      // Non-blocking
    }
    revalidatePath('/my-briefs')
    revalidatePath('/', 'layout')
  }

  revalidatePath('/briefs')
  revalidatePath(`/briefs/${input.briefId}`)
  revalidatePath(`/briefs/${input.briefId}/edit`)
  if (input.status === 'archived') {
    revalidatePath('/')
  }
}

export async function publishBrief(briefId: string): Promise<void> {
  const ctx = await requireAuthorWorkspace()
  if (ctx.status === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('brief')
    .select('author_id, workspace_id')
    .eq('id', briefId)
    .single()

  if (fetchErr || !existing) throw new Error('Brief not found')
  if (existing.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')
  if (existing.author_id !== ctx.userId && ctx.role !== 'admin') throw new Error('Forbidden')

  const publishedAt = new Date().toISOString()
  const { error } = await supabase
    .from('brief')
    .update({
      status: 'published',
      published_at: publishedAt,
      human_reviewed: true,
    })
    .eq('id', briefId)

  if (error) throw error

  void import('@/lib/brief/recompute-scope').then(({ recomputeBriefScopeAfterWrite }) =>
    recomputeBriefScopeAfterWrite(briefId)
  )

  try {
    await notifyBriefSubscribersOfPublish(briefId)
  } catch {
    // Non-blocking: publishing succeeded even if notifications fail
  }

  revalidatePath('/briefs')
  revalidatePath(`/briefs/${briefId}`)
  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function enqueueBriefDraft(input: {
  briefId: string
  itemIds: string[]
  audienceHint?: string
}): Promise<void> {
  const ctx = await requireAuthorWorkspace()
  if (ctx.status === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('brief')
    .select('author_id, workspace_id, brief_kind')
    .eq('id', input.briefId)
    .single()

  if (fetchErr || !existing) throw new Error('Brief not found')
  if (existing.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')
  if (existing.author_id !== ctx.userId && ctx.role !== 'admin') throw new Error('Forbidden')

  let itemIds = input.itemIds
  if (existing.brief_kind === 'regulatory_summary') {
    itemIds = await filterItemIdsToSweepRegulatoryOnly(ctx.workspaceId, input.itemIds)
    if (itemIds.length < 1) {
      throw new Error(
        'Regulatory summary briefs can only use intelligence items from the regulatory sweep pass (ingestion sweep_regulatory).'
      )
    }
  }

  if (itemIds.length < 1) throw new Error('Select at least one intelligence item')

  await assertAiBriefDraftAllowed(ctx.workspaceId, ctx.plan)

  await inngest.send({
    name: briefDraftRequestedEventName(existing.brief_kind as BriefKind),
    data: {
      briefId: input.briefId,
      workspaceId: ctx.workspaceId,
      itemIds,
      audienceHint: input.audienceHint,
    },
  })

  revalidatePath(`/briefs/${input.briefId}/edit`)
}

export type RequestCompetitorDossierBriefResult =
  | { ok: true; briefId: string }
  | {
      ok: false
      reason: 'unauthorized' | 'forbidden' | 'read_only' | 'not_found' | 'no_intelligence' | 'limit' | 'failed'
      message?: string
    }

/**
 * Creates a competitor-scoped brief, links top feed intel for that competitor, and enqueues the AI draft (Inngest).
 */
export async function requestCompetitorDossierBrief(competitorId: string): Promise<RequestCompetitorDossierBriefResult> {
  let ctx: Awaited<ReturnType<typeof requireAuthorWorkspace>>
  try {
    ctx = await requireAuthorWorkspace()
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    if (m.includes('Unauthorized')) {
      return { ok: false, reason: 'unauthorized', message: 'Sign in to request a dossier brief.' }
    }
    if (m.includes('Forbidden') || m.includes('No workspace')) {
      return { ok: false, reason: 'forbidden', message: m || 'You do not have access to create briefs.' }
    }
    return { ok: false, reason: 'failed', message: m || 'Could not verify workspace.' }
  }

  if (ctx.status === 'read_only') {
    return { ok: false, reason: 'read_only', message: 'Workspace is read-only.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: comp, error: cErr } = await supabase
    .from('competitor')
    .select('id,name')
    .eq('id', competitorId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle()

  if (cErr || !comp) {
    return { ok: false, reason: 'not_found', message: 'Competitor not found.' }
  }

  const intelItems = await listIntelItemsForCompetitor(ctx.workspaceId, competitorId, { limit: 25, days: 120 })
  const itemIds = intelItems.map((i) => i.id)
  if (itemIds.length < 1) {
    return {
      ok: false,
      reason: 'no_intelligence',
      message:
        'No feed intelligence mentions this competitor yet. Run a sweep or wait for intel, then try again.',
    }
  }

  try {
    await assertAiBriefDraftAllowed(ctx.workspaceId, ctx.plan)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Monthly AI brief limit reached.'
    return { ok: false, reason: 'limit', message: msg }
  }

  const title = `Competitor dossier: ${comp.name}`
  const { data: inserted, error: insErr } = await supabase
    .from('brief')
    .insert({
      workspace_id: ctx.workspaceId,
      author_id: ctx.userId,
      title,
      summary: '',
      body: '',
      word_count: 0,
      brief_kind: 'competitor',
      audience: 'general',
      priority: 'medium',
      status: 'draft',
      ai_drafted: false,
      human_reviewed: false,
      linked_item_ids: itemIds,
      linked_topic_ids: [],
      linked_competitor_ids: [competitorId],
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    return { ok: false, reason: 'failed', message: insErr?.message ?? 'Could not create brief.' }
  }

  const briefId = inserted.id

  await inngest.send({
    name: briefDraftRequestedEventName('competitor'),
    data: {
      briefId,
      workspaceId: ctx.workspaceId,
      itemIds,
      /** Publish when drafting finishes so /my-briefs and subscriber email/notifications run. */
      autoPublish: true,
    },
  })

  revalidatePath('/briefs')
  revalidatePath(`/briefs/${briefId}/edit`)
  revalidatePath(`/competitors/${competitorId}`)

  return { ok: true, briefId }
}

export type BriefDraftPollResult = { ok: true; aiDrafted: boolean } | { ok: false; reason: 'not_found' | 'forbidden' }

/** Poll whether AI draft has finished writing to the brief (author or workspace admin only). */
export async function getBriefDraftGenerationStatus(briefId: string): Promise<BriefDraftPollResult> {
  let ctx: Awaited<ReturnType<typeof requireAuthorWorkspace>>
  try {
    ctx = await requireAuthorWorkspace()
  } catch {
    return { ok: false, reason: 'forbidden' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('brief')
    .select('workspace_id, author_id, ai_drafted')
    .eq('id', briefId)
    .maybeSingle()

  if (error) throw error
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.workspace_id !== ctx.workspaceId) return { ok: false, reason: 'forbidden' }
  const isOwner = row.author_id === ctx.userId
  if (!isOwner && ctx.role !== 'admin') return { ok: false, reason: 'forbidden' }

  return { ok: true, aiDrafted: row.ai_drafted }
}

export async function archiveBrief(briefId: string): Promise<void> {
  const ctx = await requireAuthorWorkspace()
  if (ctx.status === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('brief')
    .select('author_id, workspace_id')
    .eq('id', briefId)
    .single()

  if (fetchErr || !existing) throw new Error('Brief not found')
  if (existing.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')
  if (existing.author_id !== ctx.userId && ctx.role !== 'admin') throw new Error('Forbidden')

  const { error } = await supabase.from('brief').update({ status: 'archived' }).eq('id', briefId)
  if (error) throw error

  revalidatePath('/briefs')
  revalidatePath('/')
  revalidatePath(`/briefs/${briefId}`)
}
