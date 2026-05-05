// Admin/Operator types for DOSI.AI internal admin panel

export type OperatorRole = 'support' | 'ops' | 'engineer' | 'admin' | 'auditor'
export type OperatorStatus = 'active' | 'suspended'

export interface OperatorUser {
  id: string
  name: string
  email: string
  role: OperatorRole
  mfaEnabled: boolean
  lastSignIn: string
  createdAt: string
  createdBy: string | null // null for founding members
  status: OperatorStatus
}

export type WorkspaceStatus = 'active' | 'trial' | 'churned' | 'suspended'
// C6: Updated plan tier to match spec (2-tier with enterprise placeholder)
export type PlanTier = 'free' | 'premium' | 'enterprise'

export type WorkspaceSweepStatus = 'healthy' | 'degraded' | 'failing' | 'never-run' | 'paused'

export interface WorkspaceOverrideInfo {
  key: string
  label: string
}

export interface AdminWorkspace {
  id: string
  name: string
  domain: string
  status: WorkspaceStatus
  plan: PlanTier
  adminEmail: string
  adminName: string
  createdAt: string
  lastActiveAt: string
  lastSweepAt: string | null
  sweepStatus: WorkspaceSweepStatus
  sweepFailedSince?: string | null // if failing, when did it start?
  totalSweeps: number
  failedSweepsLast7Days: number
  itemCount: number
  competitorCount: number
  topicCount: number
  memberCount: number
  aiCostMTD: number // in cents
  overrides: WorkspaceOverrideInfo[]
  hasOpenIssues: boolean
  gracePeriodEndsAt?: string | null
  flags: string[]
}

export interface SweepRun {
  id: string
  workspaceId: string
  startedAt: string
  completedAt: string | null
  status: 'running' | 'completed' | 'failed' | 'partial'
  itemsFound: number
  errors: SweepError[]
  vendorCalls: VendorCall[]
  durationMs: number | null
  triggeredBy: 'scheduled' | 'manual' | 'operator'
  operatorId?: string
  operatorName?: string
}

export interface SweepError {
  id: string
  sweepId: string
  vendor: string
  errorCode: string
  errorMessage: string
  timestamp: string
  retryable: boolean
}

export interface VendorCall {
  vendor: string
  endpoint: string
  status: 'success' | 'error' | 'timeout'
  latencyMs: number
  timestamp: string
}

export type AIVendor = 'openai' | 'anthropic' | 'xai'
export type AIModel = string // e.g. 'gpt-4o', 'claude-opus-4-7', 'grok-4', etc.

export type AIPurpose = 
  | 'sweep_buy' 
  | 'sweep_sell' 
  | 'sweep_channel' 
  | 'sweep_regulatory'
  | 'sweep_topic'
  | 'scoring'
  | 'embedding'
  | 'brief_drafting'
  | 'battle_card_interview'

export interface AIRoutingRule {
  id: string
  vendor: AIVendor
  model: AIModel
  purpose: AIPurpose
  isPrimary: boolean
  isEnabled: boolean
  costPer1MTokens: number // in dollars
  avgLatencyMs: number
  citationRate: number // 0-100 percentage
  factualGroundingScore: number // 0-100
  notes: string
  lastChangedAt: string
  lastChangedBy: string
}

export interface AIPurposeConfig {
  purpose: AIPurpose
  name: string
  description: string
  mode: 'single-vendor' | 'multi-vendor'
  rules: AIRoutingRule[]
}

export type PromptPurpose = AIPurpose
export type PromptStatus = 'active' | 'draft' | 'archived'

export interface PromptVariable {
  name: string
  type: 'string' | 'array' | 'object' | 'number'
  description: string
  example: string
}

export interface PromptDeployment {
  version: number
  deployedAt: string
  deployedBy: string
  trafficPercent: number
  rolledBackAt?: string
  rollbackReason?: string
}

export interface PromptABTest {
  isActive: boolean
  controlVersion: number
  testVersion: number
  trafficPercent: number // percent going to test version
  startedAt: string
  metrics: {
    controlCitationRate: number
    testCitationRate: number
    controlLatencyMs: number
    testLatencyMs: number
    controlDedupRate: number
    testDedupRate: number
  }
}

export interface PromptTemplate {
  id: string
  name: string // e.g. "sweep_buy — openai"
  purpose: PromptPurpose
  vendor: AIVendor
  status: PromptStatus
  version: number
  draftVersion?: number
  content: string
  draftContent?: string
  draftNote?: string
  variables: PromptVariable[]
  callsPerDay: number
  createdAt: string
  updatedAt: string
  updatedBy: string
  deployedAt: string | null
  deployedBy: string | null
  deploymentHistory: PromptDeployment[]
  abTest?: PromptABTest
}

export interface VendorHealthMetric {
  vendor: AIVendor
  status: 'healthy' | 'degraded' | 'down'
  latencyP50Ms: number
  latencyP99Ms: number
  errorRateLast1h: number
  errorRateLast24h: number
  totalCallsLast24h: number
  lastCheckedAt: string
}

export interface SystemHealthMetric {
  component: string
  status: 'healthy' | 'degraded' | 'down'
  metric: string
  value: number
  unit: string
  threshold: number
  lastCheckedAt: string
}

export interface ImpersonationSession {
  id: string
  operatorId: string
  operatorName: string
  operatorRole: OperatorRole
  workspaceId: string
  workspaceName: string
  mode: 'read-only' | 'write'
  reason: string
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  actionsPerformed: number
  approvedBy?: string
  approvedByName?: string
}

export type AuditActionType = 
  | 'override_set'
  | 'override_removed'
  | 'impersonation_started'
  | 'impersonation_ended'
  | 'sweep_triggered'
  | 'sweep_failed_repeatedly'
  | 'prompt_deployed'
  | 'prompt_rolled_back'
  | 'vendor_routing_changed'
  | 'plan_changed'
  | 'credit_issued'
  | 'operator_user_created'
  | 'operator_user_removed'
  | 'ab_test_started'
  | 'vendor_outage_detected'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface AuditLogEntry {
  id: string
  timestamp: string
  severity: AuditSeverity
  operatorId: string | null // null for system events
  operatorName: string
  operatorRole: OperatorRole | 'system'
  action: AuditActionType
  category: 'workspace' | 'ai-routing' | 'prompt' | 'impersonation' | 'operator' | 'billing' | 'system'
  targetType: string
  targetId: string
  targetName: string
  reason: string
  beforeValue?: string
  afterValue?: string
  ipAddress: string | null // null for system events
  sessionId?: string // for grouping related actions
}

export interface WorkspaceOverride {
  id: string
  workspaceId: string
  workspaceName: string
  type: 'sweep-limit' | 'item-limit' | 'user-limit' | 'feature-flag' | 'grace-period'
  originalValue: string
  overrideValue: string
  reason: string
  createdAt: string
  createdBy: string
  createdByName: string
  expiresAt: string | null
  isActive: boolean
}

export interface BillingCredit {
  id: string
  workspaceId: string
  workspaceName: string
  amount: number // in cents
  reason: string
  createdAt: string
  createdBy: string
  createdByName: string
  appliedAt: string | null
}
