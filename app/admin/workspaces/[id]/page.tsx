'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronRight,
  ExternalLink,
  UserCheck,
  Eye,
  PenLine,
  Play,
  Settings2,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Target,
  Hash,
  DollarSign,
  Clock,
  Calendar,
  MoreHorizontal,
  AlertCircle,
  CreditCard,
} from 'lucide-react'
import type { AdminWorkspace, SweepRun, SweepError, WorkspaceOverride, AuditLogEntry, OperatorRole } from '@/lib/admin-types'

// Extended workspace type with additional fields for detail view
interface WorkspaceDetail extends AdminWorkspace {
  companySummary: string
  icp: string
  industry: string
  geography: string
  billingEmail: string
  nextRenewalAt: string
  stripeCustomerId: string
}

interface WorkspaceMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'analyst' | 'viewer'
  status: 'active' | 'invited' | 'disabled'
  lastActiveAt: string
}

interface SupportItem {
  id: string
  subject: string
  status: 'open' | 'pending' | 'resolved'
  reportedBy: string
  createdAt: string
  assignedTo?: string
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  stripeInvoiceId: string
}

// Override setting definition
interface OverrideSetting {
  key: string
  label: string
  description: string
  defaultValue: string | number
  currentValue?: string | number
  expiresAt?: string | null
  reason?: string
  inputType: 'number' | 'select'
  options?: { value: string; label: string }[]
  unit?: string
}

// Mock workspace data - ChainCo Logistics as specified
const mockWorkspace: WorkspaceDetail = {
  id: 'ws-chainco',
  name: 'ChainCo Logistics',
  domain: 'chainco.io',
  status: 'active',
  plan: 'premium',
  adminEmail: 'ops@chainco.io',
  adminName: 'Marcus Chen',
  createdAt: '2025-04-03T00:00:00Z',
  lastActiveAt: '2026-05-05T09:30:00Z',
  lastSweepAt: '2026-05-03T17:42:00Z', // 36h ago, failed
  sweepStatus: 'failing',
  sweepFailedSince: '2026-05-03T17:42:00Z',
  totalSweeps: 412,
  failedSweepsLast7Days: 8,
  itemCount: 3847,
  competitorCount: 8,
  topicCount: 4,
  memberCount: 12,
  aiCostMTD: 14788, // $147.88
  overrides: [],
  hasOpenIssues: true,
  gracePeriodEndsAt: null,
  flags: [],
  companySummary: 'ChainCo Logistics provides end-to-end supply chain management solutions for mid-market freight brokers. Founded in 2019, they specialize in intermodal transportation and last-mile delivery optimization.',
  icp: 'Mid-market freight brokers with $20M-$200M revenue',
  industry: 'Logistics & Transportation',
  geography: 'North America',
  billingEmail: 'billing@chainco.io',
  nextRenewalAt: '2026-06-03T00:00:00Z',
  stripeCustomerId: 'cus_QsR7x9Lpk3mN',
}

// Mock members
const mockMembers: WorkspaceMember[] = [
  { id: 'm1', name: 'Marcus Chen', email: 'marcus@chainco.io', role: 'admin', status: 'active', lastActiveAt: '2026-05-05T09:30:00Z' },
  { id: 'm2', name: 'Sarah Kim', email: 'sarah@chainco.io', role: 'analyst', status: 'active', lastActiveAt: '2026-05-05T08:15:00Z' },
  { id: 'm3', name: 'James Rodriguez', email: 'james@chainco.io', role: 'analyst', status: 'active', lastActiveAt: '2026-05-04T16:45:00Z' },
  { id: 'm4', name: 'Emily Zhang', email: 'emily@chainco.io', role: 'analyst', status: 'active', lastActiveAt: '2026-05-04T14:22:00Z' },
  { id: 'm5', name: 'Michael O\'Brien', email: 'michael@chainco.io', role: 'viewer', status: 'active', lastActiveAt: '2026-05-03T11:00:00Z' },
  { id: 'm6', name: 'Lisa Park', email: 'lisa@chainco.io', role: 'viewer', status: 'active', lastActiveAt: '2026-05-02T09:30:00Z' },
  { id: 'm7', name: 'David Lee', email: 'david@chainco.io', role: 'analyst', status: 'active', lastActiveAt: '2026-05-01T15:45:00Z' },
  { id: 'm8', name: 'Jennifer Smith', email: 'jennifer@chainco.io', role: 'viewer', status: 'active', lastActiveAt: '2026-04-30T10:15:00Z' },
  { id: 'm9', name: 'Robert Johnson', email: 'robert@chainco.io', role: 'viewer', status: 'invited', lastActiveAt: '' },
  { id: 'm10', name: 'Amanda Williams', email: 'amanda@chainco.io', role: 'analyst', status: 'active', lastActiveAt: '2026-04-28T14:00:00Z' },
  { id: 'm11', name: 'Christopher Davis', email: 'chris@chainco.io', role: 'viewer', status: 'active', lastActiveAt: '2026-04-25T09:00:00Z' },
  { id: 'm12', name: 'Nicole Brown', email: 'nicole@chainco.io', role: 'viewer', status: 'disabled', lastActiveAt: '2026-03-15T11:30:00Z' },
]

// Mock sweeps - includes the failed one from 36h ago
const mockSweeps: SweepRun[] = [
  {
    id: 'sweep-failing',
    workspaceId: 'ws-chainco',
    startedAt: '2026-05-03T17:30:00Z',
    completedAt: '2026-05-03T17:42:00Z',
    status: 'failed',
    itemsFound: 0,
    errors: [{
      id: 'err-xai',
      sweepId: 'sweep-failing',
      vendor: 'xai',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      errorMessage: 'Rate limit exceeded — retry exhausted after 3 attempts',
      timestamp: '2026-05-03T17:42:00Z',
      retryable: true,
    }],
    vendorCalls: [
      { vendor: 'openai', endpoint: '/v1/chat/completions', status: 'success', latencyMs: 1240, timestamp: '2026-05-03T17:32:00Z' },
      { vendor: 'xai', endpoint: '/v1/chat/completions', status: 'error', latencyMs: 4891, timestamp: '2026-05-03T17:42:00Z' },
    ],
    durationMs: 720000,
    triggeredBy: 'scheduled',
  },
  {
    id: 'sweep-prev-success',
    workspaceId: 'ws-chainco',
    startedAt: '2026-05-03T11:30:00Z',
    completedAt: '2026-05-03T11:36:15Z',
    status: 'completed',
    itemsFound: 14,
    errors: [],
    vendorCalls: [
      { vendor: 'openai', endpoint: '/v1/chat/completions', status: 'success', latencyMs: 1100, timestamp: '2026-05-03T11:31:00Z' },
      { vendor: 'anthropic', endpoint: '/v1/messages', status: 'success', latencyMs: 890, timestamp: '2026-05-03T11:33:00Z' },
    ],
    durationMs: 375000,
    triggeredBy: 'scheduled',
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `sweep-${String(i + 3).padStart(3, '0')}`,
    workspaceId: 'ws-chainco',
    startedAt: new Date(2026, 4, 3 - Math.floor((i + 2) / 4), 5 + ((i + 2) % 4) * 6, 30).toISOString(),
    completedAt: new Date(2026, 4, 3 - Math.floor((i + 2) / 4), 5 + ((i + 2) % 4) * 6, 35 + (i % 5)).toISOString(),
    status: 'completed' as const,
    itemsFound: 8 + (i * 3) % 20,
    errors: [] as SweepError[],
    vendorCalls: [
      { vendor: 'openai', endpoint: '/v1/chat/completions', status: 'success' as const, latencyMs: 1100 + i * 50, timestamp: new Date(2026, 4, 3 - Math.floor((i + 2) / 4), 5 + ((i + 2) % 4) * 6, 31).toISOString() },
    ],
    durationMs: 300000 + i * 15000,
    triggeredBy: 'scheduled' as const,
  })),
]

// Mock support items
const mockSupportItems: SupportItem[] = [
  {
    id: 'support-1',
    subject: 'Sweep failing — first reported 32h ago',
    status: 'open',
    reportedBy: 'ops@chainco.io',
    createdAt: '2026-05-03T19:00:00Z',
    assignedTo: 'Jordan Martinez',
  },
]

// Mock invoices
const mockInvoices: Invoice[] = [
  { id: 'inv-001', date: '2026-05-01T00:00:00Z', amount: 49900, status: 'paid', stripeInvoiceId: 'in_1PqR3xLkjM7z' },
  { id: 'inv-002', date: '2026-04-01T00:00:00Z', amount: 49900, status: 'paid', stripeInvoiceId: 'in_1PoQ2wLkjM7y' },
  { id: 'inv-003', date: '2026-03-01T00:00:00Z', amount: 49900, status: 'paid', stripeInvoiceId: 'in_1PnP1vLkjM7x' },
  { id: 'inv-004', date: '2026-02-01T00:00:00Z', amount: 49900, status: 'paid', stripeInvoiceId: 'in_1PmO0uLkjM7w' },
]

// Mock audit log for this workspace
const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-05-03T19:15:00Z',
    operatorId: 'op-1',
    operatorName: 'Jordan Martinez',
    operatorRole: 'support',
    action: 'support_ticket_assigned',
    category: 'workspace',
    targetType: 'support_ticket',
    targetId: 'support-1',
    targetName: 'Sweep failing — first reported 32h ago',
    details: {},
    reason: 'Self-assigned to investigate sweep failures',
    ipAddress: '192.168.1.100',
  },
  {
    id: 'audit-002',
    timestamp: '2026-05-02T10:30:00Z',
    operatorId: 'op-2',
    operatorName: 'Alex Chen',
    operatorRole: 'ops',
    action: 'impersonation_started',
    category: 'impersonation',
    targetType: 'workspace',
    targetId: 'ws-chainco',
    targetName: 'ChainCo Logistics',
    details: { mode: 'read-only', duration: 8 },
    reason: 'Investigating competitor setup issues reported by customer',
    ipAddress: '192.168.1.101',
  },
  {
    id: 'audit-003',
    timestamp: '2026-04-15T14:20:00Z',
    operatorId: 'op-3',
    operatorName: 'Sam Wilson',
    operatorRole: 'admin',
    action: 'manual_sweep_triggered',
    category: 'workspace',
    targetType: 'workspace',
    targetId: 'ws-chainco',
    targetName: 'ChainCo Logistics',
    details: {},
    reason: 'Customer requested immediate refresh after adding new competitor',
    ipAddress: '192.168.1.102',
  },
]

// Override settings definition
const overrideSettings: OverrideSetting[] = [
  {
    key: 'sweep_cadence_hours',
    label: 'Sweep Cadence',
    description: 'Hours between automated sweeps',
    defaultValue: 6,
    inputType: 'select',
    options: [
      { value: '2', label: 'Every 2 hours' },
      { value: '4', label: 'Every 4 hours' },
      { value: '6', label: 'Every 6 hours (default)' },
      { value: '12', label: 'Every 12 hours' },
      { value: '24', label: 'Daily' },
    ],
  },
  {
    key: 'sweep_cap_weekly',
    label: 'Sweep Cap per Week',
    description: 'Maximum number of sweeps per week',
    defaultValue: 28,
    inputType: 'number',
    unit: 'sweeps',
  },
  {
    key: 'competitor_count_cap',
    label: 'Competitor Count Cap',
    description: 'Maximum number of competitors to track',
    defaultValue: 10,
    inputType: 'number',
    unit: 'competitors',
  },
  {
    key: 'topic_count_cap',
    label: 'Topic Count Cap',
    description: 'Maximum number of topics to track',
    defaultValue: 5,
    inputType: 'number',
    unit: 'topics',
  },
  {
    key: 'seat_count_cap',
    label: 'Seat Count Cap',
    description: 'Maximum number of team members',
    defaultValue: 15,
    inputType: 'number',
    unit: 'seats',
  },
  {
    key: 'ai_token_budget_monthly',
    label: 'AI Token Budget',
    description: 'Monthly AI token budget in thousands',
    defaultValue: 500,
    inputType: 'number',
    unit: 'K tokens',
  },
  {
    key: 'review_queue_threshold',
    label: 'Review Queue Threshold',
    description: 'MIS score threshold for review queue',
    defaultValue: 70,
    inputType: 'number',
    unit: 'MIS',
  },
  {
    key: 'battle_card_cap',
    label: 'Published Battle Card Cap',
    description: 'Maximum number of published battle cards',
    defaultValue: 20,
    inputType: 'number',
    unit: 'cards',
  },
]

const sweepStatusColors: Record<SweepRun['status'], string> = {
  running: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

const sweepStatusIcons: Record<SweepRun['status'], React.ReactNode> = {
  running: <RefreshCw className="size-3.5 text-blue-600 animate-spin" />,
  completed: <CheckCircle2 className="size-3.5 text-green-600" />,
  partial: <AlertTriangle className="size-3.5 text-amber-600" />,
  failed: <XCircle className="size-3.5 text-red-600" />,
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function WorkspaceDetailPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = React.useState('overview')
  const [impersonationOpen, setImpersonationOpen] = React.useState(false)
  const [impersonationReason, setImpersonationReason] = React.useState('')
  const [impersonationMode, setImpersonationMode] = React.useState<'read-only' | 'write'>('read-only')
  const [selectedSweep, setSelectedSweep] = React.useState<SweepRun | null>(null)
  const [overrideValues, setOverrideValues] = React.useState<Record<string, string>>({})
  const [overrideReasons, setOverrideReasons] = React.useState<Record<string, string>>({})
  const [overrideExpiry, setOverrideExpiry] = React.useState<Record<string, string>>({})
  const [creditAmount, setCreditAmount] = React.useState('')
  const [creditReason, setCreditReason] = React.useState('')

  const workspace = mockWorkspace

  // C6: Updated plan colors to match 2-tier model
  const planColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600 border-slate-200',
    premium: 'bg-blue-100 text-blue-700 border-blue-200',
    enterprise: 'bg-purple-100 text-purple-700 border-purple-200',
    custom: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    trial: 'bg-blue-100 text-blue-700 border-blue-200',
    churned: 'bg-red-100 text-red-700 border-red-200',
    suspended: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-slate-500">
        <Link href="/admin" className="hover:text-slate-700">Dashboard</Link>
        <ChevronRight className="size-3" />
        <Link href="/admin/workspaces/search" className="hover:text-slate-700">Workspaces</Link>
        <ChevronRight className="size-3" />
        <span className="text-slate-900 font-medium">{workspace.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{workspace.name}</h1>
            <Badge variant="outline" className={cn('text-[11px]', planColors[workspace.plan])}>
              {workspace.plan}
            </Badge>
            <Badge variant="outline" className={cn('text-[11px]', statusColors[workspace.status])}>
              {workspace.status}
            </Badge>
            {workspace.sweepStatus === 'failing' && (
              <Badge variant="outline" className="text-[11px] bg-red-100 text-red-700 border-red-200">
                <AlertTriangle className="size-3 mr-1" />
                Sweep Failing
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[13px] text-slate-500">
            <span className="font-mono">{workspace.domain}</span>
            <span>•</span>
            <span>Created {formatDate(workspace.createdAt)}</span>
            <span>•</span>
            <span>Last active {formatRelativeTime(workspace.lastActiveAt)}</span>
            <span>•</span>
            <span className="font-mono text-[12px]">{workspace.id}</span>
            <button className="text-slate-400 hover:text-slate-600">
              <Copy className="size-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[12px]">
            <Eye className="mr-1.5 size-3.5" />
            View as customer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="text-[12px] bg-purple-600 hover:bg-purple-700">
                <UserCheck className="mr-1.5 size-3.5" />
                Impersonate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setImpersonationMode('read-only'); setImpersonationOpen(true); }}>
                <Eye className="mr-2 size-4" />
                Read-only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setImpersonationMode('write'); setImpersonationOpen(true); }}>
                <PenLine className="mr-2 size-4" />
                Write (requires approval)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="text-[12px]">
            <Play className="mr-1.5 size-3.5" />
            Run sweep
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Manage overrides</DropdownMenuItem>
              <DropdownMenuItem>View audit log</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Pause sweeps</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Members', value: workspace.memberCount, icon: Users },
          { label: 'Competitors', value: workspace.competitorCount, icon: Target },
          { label: 'Topics', value: workspace.topicCount, icon: Hash },
          { label: 'MTD AI Cost', value: `$${(workspace.aiCostMTD / 100).toFixed(2)}`, icon: DollarSign, mono: true },
          { label: 'Last Sweep', value: formatRelativeTime(workspace.lastSweepAt || ''), icon: Clock, danger: workspace.sweepStatus === 'failing' },
          { label: 'Items', value: workspace.itemCount.toLocaleString(), icon: Hash, mono: true },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 p-3 bg-white">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <stat.icon className="size-3" />
              {stat.label}
            </div>
            <div className={cn(
              'mt-1 text-lg font-semibold',
              stat.danger ? 'text-red-600' : 'text-slate-900',
              stat.mono && 'font-mono'
            )}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Open Issues Banner */}
      {mockSupportItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600" />
            <span className="text-[13px] font-medium text-amber-800">
              {mockSupportItems.length} open support item{mockSupportItems.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {mockSupportItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[12px]">
                <span className="text-amber-700">{item.subject}</span>
                <span className="text-amber-600">Assigned: {item.assignedTo || 'Unassigned'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-[13px]">Overview</TabsTrigger>
          <TabsTrigger value="overrides" className="text-[13px]">Overrides</TabsTrigger>
          <TabsTrigger value="sweeps" className="text-[13px]">Sweep History</TabsTrigger>
          <TabsTrigger value="billing" className="text-[13px]">Billing</TabsTrigger>
          <TabsTrigger value="audit" className="text-[13px]">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Workspace Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-medium">Workspace Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">Company Summary</div>
                  <p className="text-slate-600">{workspace.companySummary}</p>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">ICP</div>
                  <p className="text-slate-600">{workspace.icp}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">Industry</div>
                    <p className="text-slate-600">{workspace.industry}</p>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">Geography</div>
                    <p className="text-slate-600">{workspace.geography}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-medium">Members ({mockMembers.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[280px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] h-8">Name</TableHead>
                        <TableHead className="text-[11px] h-8">Role</TableHead>
                        <TableHead className="text-[11px] h-8">Status</TableHead>
                        <TableHead className="text-[11px] h-8">Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-slate-50">
                          <TableCell className="py-1.5">
                            <div className="text-[12px] font-medium text-slate-900">{member.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{member.email}</div>
                          </TableCell>
                          <TableCell className="py-1.5 text-[12px] text-slate-600 capitalize">{member.role}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className={cn('text-[10px]',
                              member.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              member.status === 'invited' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-500 border-slate-200'
                            )}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-[12px] text-slate-500">
                            {member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sweeps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium">Recent Sweeps</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] w-[100px]">Status</TableHead>
                    <TableHead className="text-[11px]">Started</TableHead>
                    <TableHead className="text-[11px]">Duration</TableHead>
                    <TableHead className="text-[11px]">Vendors</TableHead>
                    <TableHead className="text-[11px]">Items</TableHead>
                    <TableHead className="text-[11px]">Errors</TableHead>
                    <TableHead className="text-[11px]">Triggered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSweeps.slice(0, 10).map((sweep) => (
                    <TableRow
                      key={sweep.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedSweep(sweep)}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          {sweepStatusIcons[sweep.status]}
                          <span className="text-[12px] capitalize">{sweep.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-[12px] text-slate-600">
                        {formatDateTime(sweep.startedAt)}
                      </TableCell>
                      <TableCell className="py-2 text-[12px] font-mono text-slate-600">
                        {formatDuration(sweep.durationMs)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          {[...new Set(sweep.vendorCalls.map(v => v.vendor))].map((vendor) => (
                            <Badge key={vendor} variant="outline" className="text-[10px] px-1.5">
                              {vendor}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-[12px] font-mono text-slate-600">
                        {sweep.itemsFound}
                      </TableCell>
                      <TableCell className="py-2">
                        {sweep.errors.length > 0 ? (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                            {sweep.errors.length}
                          </Badge>
                        ) : (
                          <span className="text-[12px] text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-[12px] text-slate-600 capitalize">
                        {sweep.triggeredBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium">Per-Workspace Overrides</CardTitle>
              <p className="text-[12px] text-slate-500 mt-1">
                Override platform defaults for this workspace. All changes are logged.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overrideSettings.map((setting) => (
                  <div key={setting.key} className="grid grid-cols-12 gap-4 items-start py-3 border-b border-slate-100 last:border-0">
                    <div className="col-span-3">
                      <div className="text-[13px] font-medium text-slate-900">{setting.label}</div>
                      <div className="text-[11px] text-slate-500">{setting.description}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-slate-400 mb-1">Default</div>
                      <div className="text-[13px] font-mono text-slate-600">
                        {setting.defaultValue}{setting.unit ? ` ${setting.unit}` : ''}
                      </div>
                    </div>
                    <div className="col-span-2">
                      {setting.inputType === 'select' ? (
                        <Select
                          value={overrideValues[setting.key] || ''}
                          onValueChange={(v) => setOverrideValues(prev => ({ ...prev, [setting.key]: v }))}
                        >
                          <SelectTrigger className="h-8 text-[12px]">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.options?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={overrideValues[setting.key] || ''}
                            onChange={(e) => setOverrideValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            className="h-8 text-[12px] font-mono w-20"
                            placeholder={String(setting.defaultValue)}
                          />
                          {setting.unit && <span className="text-[11px] text-slate-500">{setting.unit}</span>}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="date"
                        value={overrideExpiry[setting.key] || ''}
                        onChange={(e) => setOverrideExpiry(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        className="h-8 text-[12px]"
                        placeholder="No expiry"
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5">Expires (optional)</div>
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={overrideReasons[setting.key] || ''}
                        onChange={(e) => setOverrideReasons(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        className="h-8 text-[12px]"
                        placeholder="Reason..."
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="sm"
                        className="h-8 text-[12px] w-full"
                        disabled={!overrideValues[setting.key] || !overrideReasons[setting.key]}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Override Audit Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium">Override History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[13px] text-slate-500 text-center py-8">
                No overrides have been applied to this workspace.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sweep History Tab */}
        <TabsContent value="sweeps" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] w-[100px]">Status</TableHead>
                  <TableHead className="text-[11px]">Started</TableHead>
                  <TableHead className="text-[11px]">Completed</TableHead>
                  <TableHead className="text-[11px]">Duration</TableHead>
                  <TableHead className="text-[11px]">Trigger</TableHead>
                  <TableHead className="text-[11px]">Vendors</TableHead>
                  <TableHead className="text-[11px]">Items</TableHead>
                  <TableHead className="text-[11px]">New</TableHead>
                  <TableHead className="text-[11px]">Errors</TableHead>
                  <TableHead className="text-[11px] w-[140px]">Sweep ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSweeps.map((sweep) => (
                  <TableRow
                    key={sweep.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedSweep(sweep)}
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        {sweepStatusIcons[sweep.status]}
                        <span className="text-[12px] capitalize">{sweep.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[12px] text-slate-600">
                      {formatDateTime(sweep.startedAt)}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] text-slate-600">
                      {sweep.completedAt ? formatDateTime(sweep.completedAt) : '-'}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] font-mono text-slate-600">
                      {formatDuration(sweep.durationMs)}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] text-slate-600 capitalize">
                      {sweep.triggeredBy}
                      {sweep.operatorName && (
                        <span className="text-purple-600"> ({sweep.operatorName})</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {[...new Set(sweep.vendorCalls.map(v => v.vendor))].map((vendor) => (
                          <Badge key={vendor} variant="outline" className="text-[10px] px-1.5">
                            {vendor}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[12px] font-mono text-slate-600">
                      {sweep.itemsFound}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] font-mono text-slate-600">
                      {Math.floor(sweep.itemsFound * 0.3)}
                    </TableCell>
                    <TableCell className="py-2">
                      {sweep.errors.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          {sweep.errors.length}
                        </Badge>
                      ) : (
                        <span className="text-[12px] text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-[11px] font-mono text-slate-500">
                      {sweep.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Sweep Detail Panel */}
          {selectedSweep && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-medium text-slate-900">Sweep Details</h3>
                  <Badge variant="outline" className={cn('text-[11px]', sweepStatusColors[selectedSweep.status])}>
                    {selectedSweep.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSweep(null)}>
                  <XCircle className="size-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div>
                  <div className="text-[11px] text-slate-500">Sweep ID</div>
                  <div className="text-[12px] font-mono text-slate-900">{selectedSweep.id}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Started</div>
                  <div className="text-[12px] text-slate-900">{formatDateTime(selectedSweep.startedAt)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Completed</div>
                  <div className="text-[12px] text-slate-900">{selectedSweep.completedAt ? formatDateTime(selectedSweep.completedAt) : '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Duration</div>
                  <div className="text-[12px] font-mono text-slate-900">{formatDuration(selectedSweep.durationMs)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Items Found</div>
                  <div className="text-[12px] font-mono text-slate-900">{selectedSweep.itemsFound}</div>
                </div>
              </div>

              {selectedSweep.errors.length > 0 && (
                <div className="mb-4">
                  <div className="text-[12px] font-medium text-slate-700 mb-2">Errors</div>
                  <div className="space-y-2">
                    {selectedSweep.errors.map((error) => (
                      <div key={error.id} className="rounded border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200">
                            {error.vendor}
                          </Badge>
                          <span className="text-[11px] font-mono text-red-700">{error.errorCode}</span>
                          {error.retryable && (
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                              Retryable
                            </Badge>
                          )}
                        </div>
                        <div className="text-[12px] text-red-800">{error.errorMessage}</div>
                        <div className="text-[10px] text-red-600 mt-1">{formatDateTime(error.timestamp)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSweep.vendorCalls.length > 0 && (
                <div>
                  <div className="text-[12px] font-medium text-slate-700 mb-2">Vendor Calls</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px]">Vendor</TableHead>
                        <TableHead className="text-[11px]">Endpoint</TableHead>
                        <TableHead className="text-[11px]">Status</TableHead>
                        <TableHead className="text-[11px]">Latency</TableHead>
                        <TableHead className="text-[11px]">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSweep.vendorCalls.map((call, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="py-1.5 text-[12px]">
                            <Badge variant="outline" className="text-[10px]">{call.vendor}</Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-[11px] font-mono text-slate-600">{call.endpoint}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className={cn('text-[10px]',
                              call.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                              call.status === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                              {call.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-[12px] font-mono text-slate-600">{call.latencyMs}ms</TableCell>
                          <TableCell className="py-1.5 text-[11px] text-slate-500">{formatDateTime(call.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Billing Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-medium">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500">Plan</div>
                    <div className="text-[14px] font-medium text-slate-900 capitalize">{workspace.plan}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">MRR</div>
                    <div className="text-[14px] font-mono font-medium text-slate-900">$499.00</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500">Billing Email</div>
                    <div className="text-[13px] text-slate-600">{workspace.billingEmail}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Next Renewal</div>
                    <div className="text-[13px] text-slate-600">{formatDate(workspace.nextRenewalAt)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Stripe Customer</div>
                  <a href={`https://dashboard.stripe.com/customers/${workspace.stripeCustomerId}`} target="_blank" rel="noopener noreferrer" className="text-[12px] font-mono text-blue-600 hover:underline flex items-center gap-1">
                    {workspace.stripeCustomerId}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Issue Credit */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-medium">Issue Credit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-[12px]">Amount</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-500">$</span>
                    <Input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="h-8 text-[13px] font-mono w-32"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[12px]">Reason</Label>
                  <Textarea
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="mt-1 text-[12px]"
                    rows={2}
                    placeholder="Reason for credit..."
                  />
                </div>
                <Button size="sm" className="text-[12px]" disabled={!creditAmount || !creditReason}>
                  <CreditCard className="mr-1.5 size-3.5" />
                  Issue Credit
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Invoice History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium">Invoice History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Amount</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Invoice ID</TableHead>
                    <TableHead className="text-[11px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-slate-50">
                      <TableCell className="py-2 text-[12px] text-slate-600">
                        {formatDate(invoice.date)}
                      </TableCell>
                      <TableCell className="py-2 text-[12px] font-mono text-slate-900">
                        ${(invoice.amount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className={cn('text-[10px]',
                          invoice.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          invoice.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        )}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-[11px] font-mono text-slate-500">
                        {invoice.stripeInvoiceId}
                      </TableCell>
                      <TableCell className="py-2">
                        <a href={`https://dashboard.stripe.com/invoices/${invoice.stripeInvoiceId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium text-red-700">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-[12px] border-amber-300 text-amber-700 hover:bg-amber-50">
                Pause Subscription
              </Button>
              <Button variant="outline" size="sm" className="text-[12px] border-red-300 text-red-700 hover:bg-red-50">
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px]">Timestamp</TableHead>
                  <TableHead className="text-[11px]">Operator</TableHead>
                  <TableHead className="text-[11px]">Action</TableHead>
                  <TableHead className="text-[11px]">Target</TableHead>
                  <TableHead className="text-[11px]">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAuditLog.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50">
                    <TableCell className="py-2 text-[12px] text-slate-600">
                      {formatDateTime(entry.timestamp)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="text-[12px] text-slate-900">{entry.operatorName}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{entry.operatorRole}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {entry.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-[12px] text-slate-600">
                      {entry.targetName}
                    </TableCell>
                    <TableCell className="py-2 text-[12px] text-slate-500 max-w-[300px] truncate">
                      {entry.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Impersonation Dialog */}
      <Dialog open={impersonationOpen} onOpenChange={setImpersonationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start impersonation session</DialogTitle>
            <DialogDescription>
              You are about to impersonate workspace &ldquo;{workspace.name}&rdquo; in {impersonationMode} mode. All actions will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[12px]">Mode</Label>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant="outline" className={cn('text-[12px] px-3 py-1',
                  impersonationMode === 'read-only' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600'
                )}>
                  <Eye className="mr-1.5 size-3" />
                  Read-only
                </Badge>
                {impersonationMode === 'write' && (
                  <Badge variant="outline" className="text-[12px] px-3 py-1 bg-amber-100 text-amber-700 border-amber-200">
                    <PenLine className="mr-1.5 size-3" />
                    Write (requires second approval)
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-[12px]">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="Describe why you need to impersonate this workspace (ticket #, customer request, etc.)"
                className="mt-1 text-[13px]"
                rows={3}
              />
              <p className="mt-1 text-[11px] text-slate-500">This will be recorded in the audit log.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonationOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!impersonationReason.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Start impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
