'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log'

export async function acceptInvite(token: string) {
  const session = await getSession()
  if (!session?.user?.email) throw new Error('Please sign in to accept this invite')

  const supabase = await createSupabaseServerClient()
  const { data: invite } = await supabase
    .from('workspace_invite')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite) throw new Error('Invite not found')
  if (invite.status !== 'pending') throw new Error('Invite is no longer valid')
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error('Invite has expired')
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error('This invite is for a different email')
  }

  const { error: memberError } = await supabase.from('workspace_member').insert({
    user_id: session.user.id,
    workspace_id: invite.workspace_id,
    role: invite.role,
    status: 'active',
    invited_by: invite.invited_by,
  })
  if (memberError) throw memberError

  const { error: inviteError } = await supabase
    .from('workspace_invite')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
  if (inviteError) throw inviteError

  await logAuditEvent({
    severity: 'info',
    category: 'membership',
    operatorName: session.user.email,
    operatorRole: 'system',
    action: 'invite_accepted',
    targetType: 'workspace_invite',
    targetId: invite.id,
    targetName: invite.email,
    reason: 'Invite accepted by recipient.',
  })

  revalidatePath('/settings/members')
  return { workspaceId: invite.workspace_id }
}
