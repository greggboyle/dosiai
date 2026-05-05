import type { AuditLogEntry, OperatorUser, Workspace, WorkspaceInvite, WorkspaceMember, WorkspaceOverride } from '@/lib/types/dosi'
import type { Database } from '@/lib/supabase/types'

export function workspaceFromDb(row: Database['public']['Tables']['workspace']['Row']): Workspace {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    plan: row.plan,
    trialEndsAt: row.trial_ends_at ?? undefined,
    status: row.status,
    billingCycle: row.billing_cycle ?? undefined,
    nextBillingDate: row.next_billing_date ?? undefined,
    gracePeriodEndsAt: row.grace_period_ends_at ?? undefined,
    aiCostMtdCents: row.ai_cost_mtd_cents,
    aiCostCeilingCents: row.ai_cost_ceiling_cents,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  }
}

export function workspaceToDb(
  workspace: Partial<Workspace>
): Partial<Database['public']['Tables']['workspace']['Insert']> {
  return {
    id: workspace.id,
    name: workspace.name,
    domain: workspace.domain ?? null,
    logo_url: workspace.logoUrl ?? null,
    plan: workspace.plan,
    trial_ends_at: workspace.trialEndsAt ?? null,
    status: workspace.status,
    billing_cycle: workspace.billingCycle ?? null,
    next_billing_date: workspace.nextBillingDate ?? null,
    grace_period_ends_at: workspace.gracePeriodEndsAt ?? null,
    ai_cost_mtd_cents: workspace.aiCostMtdCents,
    ai_cost_ceiling_cents: workspace.aiCostCeilingCents,
    stripe_customer_id: workspace.stripeCustomerId ?? null,
    stripe_subscription_id: workspace.stripeSubscriptionId ?? null,
    created_at: workspace.createdAt,
    last_active_at: workspace.lastActiveAt,
  }
}

export function workspaceMemberFromDb(row: Database['public']['Tables']['workspace_member']['Row']): WorkspaceMember {
  return {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    role: row.role,
    seatType: row.seat_type,
    invitedBy: row.invited_by ?? undefined,
    joinedAt: row.joined_at,
    lastActiveAt: row.last_active_at,
    status: row.status,
  }
}

export function workspaceMemberToDb(
  member: Partial<WorkspaceMember>
): Partial<Database['public']['Tables']['workspace_member']['Insert']> {
  return {
    user_id: member.userId!,
    workspace_id: member.workspaceId!,
    role: member.role,
    seat_type: member.seatType,
    invited_by: member.invitedBy ?? null,
    joined_at: member.joinedAt,
    last_active_at: member.lastActiveAt,
    status: member.status,
  }
}

export function workspaceInviteFromDb(row: Database['public']['Tables']['workspace_invite']['Row']): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by ?? undefined,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
  }
}

export function workspaceInviteToDb(
  invite: Partial<WorkspaceInvite>
): Partial<Database['public']['Tables']['workspace_invite']['Insert']> {
  return {
    id: invite.id,
    workspace_id: invite.workspaceId!,
    email: invite.email!,
    role: invite.role!,
    invited_by: invite.invitedBy ?? null,
    token: invite.token,
    status: invite.status,
    created_at: invite.createdAt,
    expires_at: invite.expiresAt!,
    accepted_at: invite.acceptedAt ?? null,
  }
}

export function operatorUserFromDb(row: Database['public']['Tables']['operator_user']['Row']): OperatorUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    mfaEnabled: row.mfa_enabled,
    status: row.status,
    lastSignInAt: row.last_sign_in_at ?? undefined,
    createdAt: row.created_at,
    createdById: row.created_by_id ?? undefined,
  }
}

export function operatorUserToDb(
  user: Partial<OperatorUser>
): Partial<Database['public']['Tables']['operator_user']['Insert']> {
  return {
    id: user.id,
    name: user.name!,
    email: user.email!,
    role: user.role!,
    mfa_enabled: user.mfaEnabled,
    status: user.status,
    last_sign_in_at: user.lastSignInAt ?? null,
    created_at: user.createdAt,
    created_by_id: user.createdById ?? null,
  }
}

export function workspaceOverrideFromDb(
  row: Database['public']['Tables']['workspace_override']['Row']
): WorkspaceOverride {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    originalValue: row.original_value ?? undefined,
    overrideValue: row.override_value,
    reason: row.reason,
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined,
    createdById: row.created_by_id,
    createdAt: row.created_at,
  }
}

export function workspaceOverrideToDb(
  override: Partial<WorkspaceOverride>
): Partial<Database['public']['Tables']['workspace_override']['Insert']> {
  return {
    id: override.id,
    workspace_id: override.workspaceId!,
    type: override.type!,
    original_value: override.originalValue ?? null,
    override_value: override.overrideValue!,
    reason: override.reason!,
    is_active: override.isActive,
    expires_at: override.expiresAt ?? null,
    created_by_id: override.createdById!,
    created_at: override.createdAt,
  }
}

export function auditLogEntryFromDb(row: Database['public']['Tables']['audit_log_entry']['Row']): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    severity: row.severity,
    category: row.category,
    operatorId: row.operator_id ?? undefined,
    operatorRole: row.operator_role,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: row.target_name,
    reason: row.reason ?? undefined,
    beforeValue: row.before_value ?? undefined,
    afterValue: row.after_value ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    sessionId: row.session_id ?? undefined,
  }
}

export function auditLogEntryToDb(
  entry: Partial<AuditLogEntry>
): Partial<Database['public']['Tables']['audit_log_entry']['Insert']> {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    severity: entry.severity,
    category: entry.category!,
    operator_id: entry.operatorId ?? null,
    operator_role: entry.operatorRole!,
    action: entry.action!,
    target_type: entry.targetType!,
    target_id: entry.targetId!,
    target_name: entry.targetName!,
    reason: entry.reason ?? null,
    before_value: entry.beforeValue ?? null,
    after_value: entry.afterValue ?? null,
    ip_address: entry.ipAddress ?? null,
    session_id: entry.sessionId ?? null,
  }
}
