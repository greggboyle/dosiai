export type WorkspacePlan = 'trial' | 'starter' | 'team' | 'business' | 'enterprise'
export type WorkspaceStatus = 'active' | 'read_only' | 'grace_period' | 'cancelled'
export type BillingCycle = 'monthly' | 'annual'
export type WorkspaceRole = 'admin' | 'analyst' | 'viewer'
export type WorkspaceSeatType = 'analyst' | 'viewer'
export type WorkspaceMemberStatus = 'active' | 'invited' | 'suspended'
export type WorkspaceInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type OperatorRole = 'viewer' | 'analyst' | 'admin' | 'owner'
export type OperatorStatus = 'active' | 'disabled'
export type OverrideType =
  | 'analyst_seat_cap'
  | 'competitor_cap'
  | 'topic_cap'
  | 'battle_card_cap'
  | 'ai_cost_ceiling_cents'
export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical'
export type AuditCategory = 'system' | 'auth' | 'billing' | 'membership' | 'override' | 'operator' | 'workspace'
export type ImpersonationMode = 'read_only' | 'write'

export interface Workspace {
  id: string
  name: string
  domain?: string
  logoUrl?: string
  plan: WorkspacePlan
  trialEndsAt?: string
  status: WorkspaceStatus
  billingCycle?: BillingCycle
  nextBillingDate?: string
  gracePeriodEndsAt?: string
  aiCostMtdCents: number
  aiCostCeilingCents: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: string
  lastActiveAt: string
}

export interface WorkspaceMember {
  userId: string
  workspaceId: string
  role: WorkspaceRole
  seatType: WorkspaceSeatType
  invitedBy?: string
  joinedAt: string
  lastActiveAt: string
  status: WorkspaceMemberStatus
}

export interface WorkspaceInvite {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy?: string
  token: string
  status: WorkspaceInviteStatus
  createdAt: string
  expiresAt: string
  acceptedAt?: string
}

export interface OperatorUser {
  id: string
  name: string
  email: string
  role: OperatorRole
  mfaEnabled: boolean
  status: OperatorStatus
  lastSignInAt?: string
  createdAt: string
  createdById?: string
}

export interface WorkspaceOverride {
  id: string
  workspaceId: string
  type: OverrideType
  originalValue?: string
  overrideValue: string
  reason: string
  isActive: boolean
  expiresAt?: string
  createdById: string
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  severity: AuditSeverity
  category: AuditCategory
  operatorId?: string
  operatorRole: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  reason?: string
  beforeValue?: string
  afterValue?: string
  ipAddress?: string
  sessionId?: string
}
