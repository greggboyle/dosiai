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
export type AuditCategory =
  | 'system'
  | 'auth'
  | 'billing'
  | 'membership'
  | 'override'
  | 'operator'
  | 'workspace'
  | 'ai_routing'
export type ImpersonationMode = 'read_only' | 'write'

/** Per-user state on /my-briefs and notifications (stored in `brief_user_state`). */
export type BriefReadStatus = 'unread' | 'read' | 'saved' | 'dismissed'

/** Universal read-state for list surfaces (stored in `user_record_state`). */
export type RecordReadStatus = BriefReadStatus

export type UserRecordType =
  | 'brief'
  | 'intelligence_item'
  | 'competitor'
  | 'topic'
  | 'win_loss'
  | 'customer_voice'
  | 'channel'
  | 'battle_card'

export interface UserRecordState {
  workspaceId: string
  recordType: UserRecordType
  recordId: string
  userId: string
  status: RecordReadStatus
  readAt?: string
  savedAt?: string
  dismissedAt?: string
  updatedAt: string
}

export interface BriefUserState {
  briefId: string
  userId: string
  status: BriefReadStatus
  readAt?: string
  updatedAt: string
}

export type MisBand = 'noise' | 'low' | 'medium' | 'high' | 'critical'

export type ListCardBadgeVariant =
  | 'neutral'
  | 'buy_side'
  | 'sell_side'
  | 'channel'
  | 'regulatory'
  | 'critical'
  | 'success'
  | 'warning'

export interface ListCardBadge {
  label: string
  variant: ListCardBadgeVariant
}

export type ListCardConfidence = 'low' | 'medium' | 'high'

export interface ListCardScore {
  value: number
  band?: MisBand
  label?: string
}

export interface ListCardMetadataAttribution {
  type: 'ai_drafted' | 'human_authored' | 'ai_drafted_human_reviewed' | 'system'
  authorName?: string
  authorAvatarUrl?: string
}

export interface ListCardRelatedEntity {
  label: string
  type: 'competitor' | 'topic' | 'segment' | 'audience' | 'channel'
  href?: string
}

export interface ListCardMetadata {
  attribution?: ListCardMetadataAttribution
  relatedEntities?: ListCardRelatedEntity[]
  sourceLabel?: string
}

/** Canonical shape for shared list cards; specialization via metadata and slots. */
export interface ListCardData<T = unknown> {
  recordId: string
  recordType: UserRecordType
  title: string
  preview?: string
  primaryBadge?: ListCardBadge
  secondaryBadges?: ListCardBadge[]
  scoreIndicator?: ListCardScore
  confidenceIndicator?: ListCardConfidence
  priority?: 'critical' | 'high' | 'medium' | null
  metadata: ListCardMetadata
  scopeLabel?: string
  timestamp: string
  userState: RecordReadStatus
  raw: T
}

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
  lastSweepAt?: string
  dailyIntelligenceSweepHourUtc?: number
  reviewQueueThreshold?: number
  scoringWeights?: Record<string, number>
}

/** Canonical AI routing / vendor identifiers (align with DB enums). */
export type AiVendor = 'openai' | 'anthropic' | 'xai'

export type AiPurpose =
  | 'sweep_buy'
  | 'sweep_sell'
  | 'sweep_channel'
  | 'sweep_regulatory'
  | 'sweep_umbrella'
  | 'sweep_self'
  | 'sweep_topic'
  | 'sweep_hiring'
  | 'competitor_profile_refresh'
  | 'scoring'
  | 'embedding'
  | 'brief_drafting_all'
  | 'brief_drafting_manual'
  | 'brief_drafting_sweep_summary'
  | 'brief_drafting_daily_summary'
  | 'brief_drafting_weekly_intelligence'
  | 'brief_drafting_regulatory_summary'
  | 'brief_drafting_competitor'
  | 'battle_card_interview'
  | 'battle_card_draft'

export interface AiRoutingRuleRow {
  vendor: AiVendor
  model: string
  isPrimary: boolean
  isEnabled: boolean
}

export interface MisScore {
  value: number
  band: MisBand
  components: Record<string, number>
  explanation: string
  confidence: 'low' | 'medium' | 'high'
  confidenceReason?: string
}

export interface PromptAbTest {
  isActive: boolean
  controlVersion: number
  testVersion: number
  trafficPercent: number
  startedAt: string
}

export interface PromptTemplateRecord {
  id: string
  name: string
  purpose: AiPurpose
  vendor: AiVendor
  status: 'active' | 'draft' | 'archived'
  version: number
  content: string
  draftContent?: string
  draftNote?: string
  deploymentHistory: JsonDeploymentEntry[]
  abTest?: PromptAbTest
}

export interface JsonDeploymentEntry {
  version: number
  deployedAt: string
  deployedBy: string
  note?: string
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
