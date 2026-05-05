'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

const STARTER_TAGS = ['pricing', 'feature_gap', 'champion_left', 'incumbent_advantage', 'timing', 'relationship'] as const

export async function ensureStarterReasonTags(workspaceId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  for (const tag of STARTER_TAGS) {
    const { data: exists } = await supabase
      .from('workspace_reason_tag')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('tag', tag)
      .maybeSingle()
    if (exists) continue
    await supabase.from('workspace_reason_tag').insert({ workspace_id: workspaceId, tag })
  }
}

async function bumpReasonTagUsage(workspaceId: string, tag: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const normalized = tag.trim().toLowerCase()
  if (!normalized) return

  const { data: row } = await supabase
    .from('workspace_reason_tag')
    .select('id, usage_count')
    .eq('workspace_id', workspaceId)
    .ilike('tag', normalized)
    .maybeSingle()

  if (row) {
    await supabase
      .from('workspace_reason_tag')
      .update({ usage_count: (row.usage_count ?? 0) + 1 })
      .eq('id', row.id)
  } else {
    await supabase.from('workspace_reason_tag').insert({ workspace_id: workspaceId, tag: normalized, usage_count: 1 })
  }
}

export type SubmitWinLossInput = {
  dealName: string
  outcome: 'won' | 'lost' | 'no_decision' | 'disqualified'
  competitorId: string
  additionalCompetitorIds?: string[]
  closeDate: string
  dealSizeCents: number | null
  dealSizeBand: string | null
  segment: string | null
  reasonSummary: string
  reasonTags: string[]
  battleCardId: string | null
  mostHelpfulSectionType: string | null
  missingSectionFeedback: string | null
  notes: string | null
  dealStageAtClose?: string | null
}

async function requireAnalyst(): Promise<{ workspaceId: string; userId: string }> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role === 'viewer') throw new Error('Forbidden')

  const { data: ws } = await supabase.from('workspace').select('status').eq('id', member.workspace_id).single()

  if (ws?.status === 'read_only') throw new Error('Workspace is read-only')

  return { workspaceId: member.workspace_id, userId: session.user.id }
}

export async function submitWinLossOutcome(input: SubmitWinLossInput): Promise<void> {
  const ctx = await requireAnalyst()

  const supabase = await createSupabaseServerClient()

  const { data: inserted, error } = await supabase
    .from('win_loss_outcome')
    .insert({
      workspace_id: ctx.workspaceId,
      deal_name: input.dealName,
      competitor_id: input.competitorId,
      additional_competitor_ids: input.additionalCompetitorIds ?? [],
      outcome: input.outcome,
      deal_size_cents: input.dealSizeCents,
      deal_size_band: input.dealSizeBand,
      segment: input.segment,
      deal_stage_at_close: input.dealStageAtClose ?? null,
      close_date: input.closeDate.slice(0, 10),
      reason_summary: input.reasonSummary,
      reason_tags: input.reasonTags,
      battle_card_id: input.battleCardId,
      most_helpful_section_type: input.mostHelpfulSectionType as never,
      missing_section_feedback: input.missingSectionFeedback,
      notes: input.notes,
      source: 'manual',
      submitted_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error) throw error
  const outcomeId = inserted.id

  if (input.battleCardId && input.mostHelpfulSectionType) {
    const { data: sec } = await supabase
      .from('battle_card_section')
      .select('id, feedback_count')
      .eq('battle_card_id', input.battleCardId)
      .eq('section_type', input.mostHelpfulSectionType as never)
      .maybeSingle()

    if (sec) {
      await supabase
        .from('battle_card_section')
        .update({ feedback_count: sec.feedback_count + 1 })
        .eq('id', sec.id)
    }
  }

  if (input.battleCardId && input.missingSectionFeedback?.trim()) {
    const sectionType = input.mostHelpfulSectionType ?? 'objections'
    const { data: sec } = await supabase
      .from('battle_card_section')
      .select('id, gap_count')
      .eq('battle_card_id', input.battleCardId)
      .eq('section_type', sectionType as never)
      .maybeSingle()

    if (sec) {
      await supabase.from('battle_card_section_gap_note').insert({
        workspace_id: ctx.workspaceId,
        battle_card_section_id: sec.id,
        win_loss_outcome_id: outcomeId,
        note: input.missingSectionFeedback.trim(),
      })
      await supabase
        .from('battle_card_section')
        .update({ gap_count: sec.gap_count + 1 })
        .eq('id', sec.id)
    }
  }

  await inngest.send({ name: 'win-loss/learn-from-outcome', data: { outcomeId, workspaceId: ctx.workspaceId } })

  const seen = new Set<string>()
  for (const t of input.reasonTags) {
    const k = t.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    await bumpReasonTagUsage(ctx.workspaceId, k)
  }

  revalidatePath('/win-loss')
}

export async function bulkImportWinLossOutcomes(rows: SubmitWinLossInput[]): Promise<{ ok: number; errors: string[] }> {
  let ok = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i++) {
    try {
      await submitWinLossOutcome(rows[i])
      ok += 1
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }
  revalidatePath('/win-loss')
  return { ok, errors }
}
