'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import { assertBattleCardCapacity } from '@/lib/battle-cards/limits'
import { BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
import { defaultSectionContent } from '@/lib/battle-cards/section-json'
import { computeFreshnessScore } from '@/lib/battle-cards/freshness'
import type { BattleCardSectionType } from '@/lib/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

async function requireAnalystWorkspace(): Promise<{
  workspaceId: string
  userId: string
  role: 'admin' | 'analyst' | 'viewer'
  plan: WorkspacePlan
  workspaceStatus: string
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
    workspaceStatus: ws.status,
  }
}

export async function createBattleCardFromForm(formData: FormData): Promise<void> {
  const competitorId = formData.get('competitorId')
  if (typeof competitorId !== 'string' || !competitorId) throw new Error('Missing competitor')
  const id = await createBattleCard(competitorId)
  redirect(`/battle-cards/${id}/interview`)
}

export async function createBattleCard(competitorId: string): Promise<string> {
  const ctx = await requireAnalystWorkspace()
  if (ctx.workspaceStatus === 'read_only') throw new Error('Workspace is read-only')

  await assertBattleCardCapacity(ctx.workspaceId, ctx.plan)

  const supabase = await createSupabaseServerClient()

  const interview_state = {
    v: 1 as const,
    completedSectionTypes: [] as BattleCardSectionType[],
    draftAnswers: {} as Record<string, string>,
  }

  const { data: card, error: cErr } = await supabase
    .from('battle_card')
    .insert({
      workspace_id: ctx.workspaceId,
      competitor_id: competitorId,
      status: 'draft',
      version: 1,
      owner_id: ctx.userId,
      interview_state,
    })
    .select('id')
    .single()

  if (cErr || !card) throw cErr ?? new Error('Insert failed')

  const sectionRows = BATTLE_SECTION_ORDER.map((section_type, display_order) => ({
    battle_card_id: card.id,
    section_type,
    content: defaultSectionContent(section_type) as never,
    display_order,
    ai_drafted: false,
    source_item_ids: [],
    feedback_count: 0,
    gap_count: 0,
  }))

  const { error: sErr } = await supabase.from('battle_card_section').insert(sectionRows)
  if (sErr) throw sErr

  await refreshFreshnessScore(card.id)

  revalidatePath('/battle-cards')
  return card.id
}

async function refreshFreshnessScore(battleCardId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: sections } = await supabase.from('battle_card_section').select('*').eq('battle_card_id', battleCardId)

  const score = computeFreshnessScore({
    sections:
      sections?.map((s) => ({
        section_type: s.section_type as BattleCardSectionType,
        last_reviewed_at: s.last_reviewed_at,
        feedback_count: s.feedback_count,
        gap_count: s.gap_count,
      })) ?? [],
  })

  await supabase.from('battle_card').update({ freshness_score: score }).eq('id', battleCardId)
}

export async function saveInterviewDraftAnswer(
  battleCardId: string,
  sectionType: BattleCardSectionType,
  answer: string
): Promise<void> {
  const ctx = await requireAnalystWorkspace()
  if (ctx.workspaceStatus === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: card, error } = await supabase
    .from('battle_card')
    .select('workspace_id, interview_state')
    .eq('id', battleCardId)
    .single()

  if (error || !card || card.workspace_id !== ctx.workspaceId) throw new Error('Not found')

  const prev = (card.interview_state as { draftAnswers?: Record<string, string> }) ?? {}
  const draftAnswers = { ...prev.draftAnswers, [sectionType]: answer }

  const nextState = {
    ...(typeof card.interview_state === 'object' && card.interview_state !== null ? card.interview_state : {}),
    draftAnswers,
    v: 1,
  }

  const { error: uErr } = await supabase.from('battle_card').update({ interview_state: nextState }).eq('id', battleCardId)
  if (uErr) throw uErr
}

export async function enqueueSynthesizeSection(sectionId: string, userAnswer: string): Promise<void> {
  const ctx = await requireAnalystWorkspace()
  if (ctx.workspaceStatus === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: section, error: sErr } = await supabase
    .from('battle_card_section')
    .select('id, battle_card_id, section_type')
    .eq('id', sectionId)
    .single()

  if (sErr || !section) throw new Error('Section not found')

  const { data: card } = await supabase
    .from('battle_card')
    .select('workspace_id')
    .eq('id', section.battle_card_id)
    .single()

  if (!card || card.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')

  await inngest.send({
    name: 'battle-card/synthesize-section',
    data: {
      sectionId,
      workspaceId: ctx.workspaceId,
      userAnswer: userAnswer.trim(),
    },
  })

  revalidatePath(`/battle-cards/${section.battle_card_id}/interview`)
  revalidatePath(`/battle-cards/${section.battle_card_id}/edit`)
}

export async function markInterviewSectionComplete(
  battleCardId: string,
  sectionType: BattleCardSectionType
): Promise<void> {
  const ctx = await requireAnalystWorkspace()
  const supabase = await createSupabaseServerClient()

  const { data: card, error } = await supabase
    .from('battle_card')
    .select('workspace_id, interview_state')
    .eq('id', battleCardId)
    .single()

  if (error || !card || card.workspace_id !== ctx.workspaceId) throw new Error('Not found')

  const state = card.interview_state as {
    completedSectionTypes?: BattleCardSectionType[]
    draftAnswers?: Record<string, string>
  }
  const completed = new Set(state.completedSectionTypes ?? [])
  completed.add(sectionType)

  const nextState = {
    ...state,
    completedSectionTypes: [...completed],
    v: 1 as const,
  }

  await supabase.from('battle_card').update({ interview_state: nextState }).eq('id', battleCardId)

  const { data: sec } = await supabase
    .from('battle_card_section')
    .select('id')
    .eq('battle_card_id', battleCardId)
    .eq('section_type', sectionType)
    .maybeSingle()

  if (sec?.id) {
    await supabase
      .from('battle_card_section')
      .update({ last_reviewed_at: new Date().toISOString(), last_contributor_id: ctx.userId })
      .eq('id', sec.id)
  }

  await refreshFreshnessScore(battleCardId)

  revalidatePath(`/battle-cards/${battleCardId}/interview`)
}

export async function publishBattleCard(battleCardId: string): Promise<void> {
  const ctx = await requireAnalystWorkspace()
  if (ctx.workspaceStatus === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: card, error } = await supabase.from('battle_card').select('*').eq('id', battleCardId).single()

  if (error || !card || card.workspace_id !== ctx.workspaceId) throw new Error('Not found')

  const nextVersion = (card.version ?? 1) + 1

  await supabase
    .from('battle_card')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      version: nextVersion,
    })
    .eq('id', battleCardId)

  await refreshFreshnessScore(battleCardId)

  revalidatePath('/battle-cards')
  revalidatePath(`/battle-cards/${battleCardId}/edit`)
}

export async function updateBattleSectionContent(
  sectionId: string,
  content: unknown,
  options?: { humanOverwriteAi?: boolean }
): Promise<void> {
  const ctx = await requireAnalystWorkspace()
  if (ctx.workspaceStatus === 'read_only') throw new Error('Workspace is read-only')

  const supabase = await createSupabaseServerClient()
  const { data: section, error } = await supabase
    .from('battle_card_section')
    .select('id, battle_card_id, section_type')
    .eq('id', sectionId)
    .single()

  if (error || !section) throw new Error('Section not found')

  const { data: card } = await supabase.from('battle_card').select('workspace_id').eq('id', section.battle_card_id).single()

  if (!card || card.workspace_id !== ctx.workspaceId) throw new Error('Forbidden')

  const { parseSectionContent } = await import('@/lib/battle-cards/section-json')
  const parsed = parseSectionContent(section.section_type as BattleCardSectionType, content)

  const patch: Record<string, unknown> = {
    content: parsed as never,
    last_reviewed_at: new Date().toISOString(),
    last_contributor_id: ctx.userId,
  }
  if (options?.humanOverwriteAi) patch.ai_drafted = false

  await supabase.from('battle_card_section').update(patch as never).eq('id', sectionId)

  await refreshFreshnessScore(section.battle_card_id)

  revalidatePath(`/battle-cards/${section.battle_card_id}/edit`)
}

export async function createBattleCardShareLink(battleCardId: string, expiresInDays = 30): Promise<string> {
  const ctx = await requireAnalystWorkspace()
  const supabase = await createSupabaseServerClient()

  const { data: card, error } = await supabase.from('battle_card').select('workspace_id').eq('id', battleCardId).single()

  if (error || !card || card.workspace_id !== ctx.workspaceId) throw new Error('Not found')

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + expiresInDays * 86400000).toISOString()

  const { error: iErr } = await supabase.from('battle_card_share_link').insert({
    workspace_id: card.workspace_id,
    battle_card_id: battleCardId,
    token,
    expires_at,
    created_by: ctx.userId,
  })

  if (iErr) throw iErr

  revalidatePath(`/battle-cards/${battleCardId}/edit`)
  return token
}
