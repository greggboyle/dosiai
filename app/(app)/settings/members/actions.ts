'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getEffectiveLimits } from '@/lib/billing/limits'
import { sendInviteEmail } from '@/lib/email/resend'
import { logAuditEvent } from '@/lib/audit/log'
import type { WorkspaceRole } from '@/lib/types/dosi'

async function getWorkspaceContext() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const supabase = await createSupabaseServerClient()

  const { data: member } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  const { data: workspace } = await supabase.from('workspace').select('*').eq('id', member.workspace_id).single()

  return { session, supabase, member, workspace }
}

async function getActiveAdminCount(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, workspaceId: string) {
  const { count } = await supabase
    .from('workspace_member')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .eq('role', 'admin')
  return count ?? 0
}

export async function inviteMember(email: string, role: WorkspaceRole) {
  const { session, supabase, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can invite members')

  if (role === 'admin' || role === 'analyst') {
    const limits = await getEffectiveLimits(workspace.id, workspace.plan)
    if (limits.analystSeats !== -1) {
      const { count } = await supabase
        .from('workspace_member')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('status', 'active')
        .in('role', ['admin', 'analyst'])
      if ((count ?? 0) >= limits.analystSeats) {
        throw new Error('Analyst seat limit reached. Upgrade to invite more analyst seats.')
      }
    }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('workspace_invite').insert({
    workspace_id: workspace.id,
    email: email.toLowerCase(),
    role,
    invited_by: session.user.id,
    token,
    status: 'pending',
    expires_at: expiresAt,
  })

  if (error) throw error

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invites/${token}`
  await sendInviteEmail({
    to: email,
    inviterName: session.user.user_metadata?.full_name ?? session.user.email ?? 'A teammate',
    workspaceName: workspace.name,
    inviteUrl,
  })

  await logAuditEvent({
    severity: 'info',
    category: 'membership',
    operatorName: session.user.email ?? 'workspace_user',
    operatorRole: 'system',
    action: 'invite_created',
    targetType: 'workspace_invite',
    targetId: token,
    targetName: email,
    reason: `Invited ${email} as ${role}`,
  })

  revalidatePath('/settings/members')
}

export async function changeMemberRole(userId: string, role: WorkspaceRole) {
  const { session, supabase, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can change roles')

  const { data: targetMember } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .single()

  if (!targetMember) throw new Error('Member not found')
  if (targetMember.role === 'admin' && role !== 'admin') {
    const adminCount = await getActiveAdminCount(supabase, workspace.id)
    if (adminCount <= 1) throw new Error('Cannot demote the last admin.')
  }

  const { error } = await supabase
    .from('workspace_member')
    .update({ role })
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
  if (error) throw error

  await logAuditEvent({
    severity: 'info',
    category: 'membership',
    operatorName: session.user.email ?? 'workspace_user',
    operatorRole: 'system',
    action: 'member_role_changed',
    targetType: 'workspace_member',
    targetId: userId,
    targetName: userId,
    reason: `Role changed to ${role}`,
  })
  revalidatePath('/settings/members')
}

export async function removeMember(userId: string) {
  const { session, supabase, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can remove members')

  const { data: targetMember } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .single()
  if (!targetMember) throw new Error('Member not found')

  if (targetMember.role === 'admin') {
    const adminCount = await getActiveAdminCount(supabase, workspace.id)
    if (adminCount <= 1) throw new Error('Cannot remove the last admin.')
  }

  const { error } = await supabase
    .from('workspace_member')
    .delete()
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
  if (error) throw error

  await logAuditEvent({
    severity: 'warn',
    category: 'membership',
    operatorName: session.user.email ?? 'workspace_user',
    operatorRole: 'system',
    action: 'member_removed',
    targetType: 'workspace_member',
    targetId: userId,
    targetName: userId,
    reason: `Member removed from workspace`,
  })
  revalidatePath('/settings/members')
}

export async function leaveWorkspace() {
  const { session, supabase, workspace } = await getWorkspaceContext()
  const { data: selfMember } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', session.user.id)
    .single()
  if (!selfMember) throw new Error('Membership not found')
  if (selfMember.role === 'admin') {
    const adminCount = await getActiveAdminCount(supabase, workspace.id)
    if (adminCount <= 1) throw new Error('Cannot leave as the last admin. Transfer ownership first.')
  }

  const { error } = await supabase
    .from('workspace_member')
    .delete()
    .eq('workspace_id', workspace.id)
    .eq('user_id', session.user.id)
  if (error) throw error
}

export async function transferOwnership(newAdminUserId: string) {
  const { session, supabase, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can transfer ownership')
  if (newAdminUserId === session.user.id) throw new Error('Select another member to transfer ownership')

  const { data: targetMember } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', newAdminUserId)
    .single()
  if (!targetMember) throw new Error('Target member not found')

  const { error: promoteError } = await supabase
    .from('workspace_member')
    .update({ role: 'admin' })
    .eq('workspace_id', workspace.id)
    .eq('user_id', newAdminUserId)
  if (promoteError) throw promoteError

  const { error: demoteError } = await supabase
    .from('workspace_member')
    .update({ role: 'analyst' })
    .eq('workspace_id', workspace.id)
    .eq('user_id', session.user.id)
  if (demoteError) throw demoteError

  await logAuditEvent({
    severity: 'info',
    category: 'membership',
    operatorName: session.user.email ?? 'workspace_user',
    operatorRole: 'system',
    action: 'ownership_transferred',
    targetType: 'workspace',
    targetId: workspace.id,
    targetName: workspace.name,
    reason: `Ownership transferred to ${newAdminUserId}`,
  })

  revalidatePath('/settings/members')
}

export async function revokeInvite(inviteId: string) {
  const { supabase, member } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can revoke invites')
  const { error } = await supabase
    .from('workspace_invite')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('status', 'pending')
  if (error) throw error
  revalidatePath('/settings/members')
}

export async function resendInvite(inviteId: string) {
  const { session, supabase, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only admins can resend invites')

  const { data: invite } = await supabase
    .from('workspace_invite')
    .select('*')
    .eq('id', inviteId)
    .eq('status', 'pending')
    .single()

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invites/${invite.token}`
  await sendInviteEmail({
    to: invite.email,
    inviterName: session.user.user_metadata?.full_name ?? session.user.email ?? 'A teammate',
    workspaceName: workspace.name,
    inviteUrl,
  })
}

export async function deleteWorkspace(confirmation: string) {
  const { session, member, workspace } = await getWorkspaceContext()
  if (member.role !== 'admin') throw new Error('Only workspace admins can delete this workspace')

  const expected = `DELETE ${workspace.name}`
  if (confirmation !== expected) {
    throw new Error(`Type exactly: ${expected}`)
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('workspace').delete().eq('id', workspace.id)
  if (error) throw error

  await logAuditEvent({
    severity: 'critical',
    category: 'workspace',
    operatorName: session.user.email ?? 'workspace_user',
    operatorRole: 'system',
    action: 'workspace_deleted',
    targetType: 'workspace',
    targetId: workspace.id,
    targetName: workspace.name,
    reason: 'Workspace permanently deleted by admin',
  })

  revalidatePath('/settings/members')
}
