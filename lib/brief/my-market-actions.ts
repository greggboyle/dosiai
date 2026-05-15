'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withWorkspace } from '@/lib/auth/workspace'
import type { BriefKind } from '@/lib/types'

async function resolveBriefWorkspaceId(briefId: string): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const { data: br, error: brErr } = await supabase
    .from('brief')
    .select('workspace_id')
    .eq('id', briefId)
    .maybeSingle()

  if (brErr || !br) throw new Error('Brief not found')
  return br.workspace_id
}

/** Marks a published brief as read and clears matching in-app notifications. */
export async function markBriefRead(briefId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveBriefWorkspaceId(briefId)

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()
    const { error: uErr } = await supabase.from('brief_user_state').upsert(
      {
        brief_id: briefId,
        user_id: user.id,
        status: 'read',
        read_at: now,
        updated_at: now,
      },
      { onConflict: 'brief_id,user_id' }
    )
    if (uErr) throw uErr

    await supabase
      .from('user_notification')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .eq('brief_id', briefId)
      .is('read_at', null)
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

/** @deprecated alias */
export const markMyBriefRead = markBriefRead

export async function toggleBriefSaved(briefId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveBriefWorkspaceId(briefId)

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const { data: row } = await supabase
      .from('brief_user_state')
      .select('status')
      .eq('brief_id', briefId)
      .eq('user_id', user.id)
      .maybeSingle()

    const now = new Date().toISOString()
    const nextStatus = row?.status === 'saved' ? 'read' : 'saved'
    const { error: uErr } = await supabase.from('brief_user_state').upsert(
      {
        brief_id: briefId,
        user_id: user.id,
        status: nextStatus,
        read_at: now,
        updated_at: now,
      },
      { onConflict: 'brief_id,user_id' }
    )
    if (uErr) throw uErr
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function dismissBrief(briefId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveBriefWorkspaceId(briefId)

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()
    const { error: uErr } = await supabase.from('brief_user_state').upsert(
      {
        brief_id: briefId,
        user_id: user.id,
        status: 'dismissed',
        read_at: now,
        updated_at: now,
      },
      { onConflict: 'brief_id,user_id' }
    )
    if (uErr) throw uErr
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function updateBriefSubscription(kind: BriefKind, subscribed: boolean): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member, error } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !member) throw new Error('No workspace')

  await withWorkspace(member.workspace_id, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const sb = await createSupabaseServerClient()
    const { error: uErr } = await sb.from('workspace_member_brief_subscription').upsert(
      {
        user_id: user.id,
        workspace_id: member.workspace_id,
        brief_kind: kind,
        subscribed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,workspace_id,brief_kind' }
    )
    if (uErr) throw uErr
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}
