'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { BriefKind } from '@/lib/types'

async function requireMember() {
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
  return { userId: session.user.id, workspaceId: member.workspace_id }
}

/** Marks a published brief as read for the current user and clears matching in-app notifications. */
export async function markMyBriefRead(briefId: string): Promise<void> {
  const { userId, workspaceId } = await requireMember()
  const supabase = await createSupabaseServerClient()

  const { data: br, error: brErr } = await supabase
    .from('brief')
    .select('workspace_id')
    .eq('id', briefId)
    .maybeSingle()

  if (brErr || !br || br.workspace_id !== workspaceId) throw new Error('Brief not found')

  const now = new Date().toISOString()

  const { error: uErr } = await supabase.from('brief_user_read').upsert(
    {
      user_id: userId,
      brief_id: briefId,
      read_at: now,
    },
    { onConflict: 'user_id,brief_id' }
  )

  if (uErr) throw uErr

  await supabase
    .from('user_notification')
    .update({ read_at: now })
    .eq('user_id', userId)
    .eq('brief_id', briefId)
    .is('read_at', null)

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function updateBriefSubscription(kind: BriefKind, subscribed: boolean): Promise<void> {
  const { userId, workspaceId } = await requireMember()

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('workspace_member_brief_subscription').upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      brief_kind: kind,
      subscribed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,workspace_id,brief_kind' }
  )

  if (error) throw error

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}
