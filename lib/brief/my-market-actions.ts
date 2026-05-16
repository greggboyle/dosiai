'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withWorkspace } from '@/lib/auth/workspace'
import type { BriefKind } from '@/lib/types'
import {
  dismissRecord,
  markRecordRead,
  saveRecord,
} from '@/app/actions/list-view'

/** Marks a published brief as read and clears matching in-app notifications. */
export async function markBriefRead(briefId: string): Promise<void> {
  await markRecordRead('brief', briefId)
}

/** @deprecated alias */
export const markMyBriefRead = markBriefRead

export async function toggleBriefSaved(briefId: string): Promise<void> {
  await saveRecord('brief', briefId)
}

export async function dismissBrief(briefId: string): Promise<void> {
  await dismissRecord('brief', briefId)
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
