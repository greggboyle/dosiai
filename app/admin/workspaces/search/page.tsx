'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Search,
  MoreHorizontal,
  ExternalLink,
  UserCheck,
  CheckCircle2,
  XCircle,
  Pause,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Settings2,
  ScrollText,
  RefreshCw,
  CalendarIcon,
} from 'lucide-react'
import type { AdminWorkspace, WorkspaceStatus, PlanTier, WorkspaceSweepStatus } from '@/lib/admin-types'
import { format } from 'date-fns'
import { startImpersonation } from '@/app/admin/impersonation/actions'
import { runSweepOnBehalf } from '@/app/admin/workspaces/actions'

// Exact seed data from spec - 10 workspaces
const mockWorkspaces: AdminWorkspace[] = [
  {
    id: 'ws-001',
    name: 'Acme Logistics Inc',
    domain: 'acmelogistics.com',
    adminEmail: 'maya@acmelogistics.com',
    adminName: 'Maya Patel',
    plan: 'premium',
    status: 'active',
    createdAt: '2025-09-12T00:00:00Z',
    lastActiveAt: '2026-05-05T06:00:00Z', // 3h ago
    lastSweepAt: '2026-05-05T07:00:00Z', // 2h ago
    sweepStatus: 'healthy',
    totalSweeps: 1247,
    failedSweepsLast7Days: 0,
    itemCount: 8450,
    competitorCount: 10,
    topicCount: 2,
    memberCount: 7,
    aiCostMTD: 28412,
    overrides: [],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-002',
    name: 'ChainCo Logistics',
    domain: 'chainco.io',
    adminEmail: 'ops@chainco.io',
    adminName: 'Ops Team',
    plan: 'premium',
    status: 'active',
    createdAt: '2025-04-03T00:00:00Z',
    lastActiveAt: '2026-05-05T08:48:00Z', // 12m ago
    lastSweepAt: '2026-05-03T20:00:00Z', // 36h ago, FAILED
    sweepStatus: 'failing',
    sweepFailedSince: '2026-05-03T20:00:00Z',
    totalSweeps: 892,
    failedSweepsLast7Days: 12,
    itemCount: 5670,
    competitorCount: 8,
    topicCount: 4,
    memberCount: 12,
    aiCostMTD: 14788,
    overrides: [],
    hasOpenIssues: true,
    flags: ['sweep-failing'],
  },
  {
    id: 'ws-003',
    name: 'FreightHero',
    domain: 'freighthero.com',
    adminEmail: 'hello@freighthero.com',
    adminName: 'Hello Team',
    plan: 'premium',
    status: 'active',
    createdAt: '2025-11-21T00:00:00Z',
    lastActiveAt: '2026-05-05T08:00:00Z', // 1h ago
    lastSweepAt: '2026-05-05T05:00:00Z', // 4h ago
    sweepStatus: 'healthy',
    totalSweeps: 534,
    failedSweepsLast7Days: 0,
    itemCount: 4200,
    competitorCount: 6,
    topicCount: 1,
    memberCount: 5,
    aiCostMTD: 31240,
    overrides: [{ key: 'sweep_cap', label: 'sweep_cap+5' }],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-004',
    name: 'RouteIQ',
    domain: 'routeiq.co',
    adminEmail: 'admin@routeiq.co',
    adminName: 'Admin',
    plan: 'free',
    status: 'active',
    createdAt: '2026-02-14T00:00:00Z',
    lastActiveAt: '2026-05-04T09:00:00Z', // yesterday
    lastSweepAt: '2026-05-02T09:00:00Z', // 3d ago
    sweepStatus: 'healthy',
    totalSweeps: 67,
    failedSweepsLast7Days: 0,
    itemCount: 340,
    competitorCount: 2,
    topicCount: 1,
    memberCount: 1,
    aiCostMTD: 0,
    overrides: [],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-005',
    name: 'Megacorp Logistics',
    domain: 'megacorp-logistics.com',
    adminEmail: 'it-sourcing@megacorp.com',
    adminName: 'IT Sourcing',
    plan: 'premium',
    status: 'active',
    createdAt: '2024-08-22T00:00:00Z',
    lastActiveAt: '2026-05-05T08:30:00Z', // 30m ago
    lastSweepAt: '2026-05-05T08:00:00Z', // 1h ago
    sweepStatus: 'healthy',
    totalSweeps: 2456,
    failedSweepsLast7Days: 1,
    itemCount: 28900,
    competitorCount: 10,
    topicCount: 5,
    memberCount: 31,
    aiCostMTD: 49871,
    overrides: [
      { key: 'seat_count', label: 'seat_count+10' },
      { key: 'deal_size_privacy', label: 'deal_size_privacy' },
    ],
    hasOpenIssues: true,
    flags: ['3-support-issues'],
  },
  {
    id: 'ws-006',
    name: 'ShipperPro Group',
    domain: 'shipperpro.com',
    adminEmail: 'aaron@shipperpro.com',
    adminName: 'Aaron',
    plan: 'premium',
    status: 'grace-period',
    createdAt: '2025-01-15T00:00:00Z',
    lastActiveAt: '2026-05-03T09:00:00Z', // 2 days ago
    lastSweepAt: '2026-04-30T09:00:00Z', // 5d ago
    sweepStatus: 'healthy',
    totalSweeps: 678,
    failedSweepsLast7Days: 0,
    itemCount: 3400,
    competitorCount: 9,
    topicCount: 2,
    memberCount: 4,
    aiCostMTD: 0,
    overrides: [],
    hasOpenIssues: false,
    gracePeriodEndsAt: '2026-05-27T00:00:00Z', // 22 days remaining
    flags: ['cancelled'],
  },
  {
    id: 'ws-007',
    name: 'ChainShield',
    domain: 'chainshield.io',
    adminEmail: 'founders@chainshield.io',
    adminName: 'Founders',
    plan: 'free',
    status: 'active',
    createdAt: '2026-04-30T00:00:00Z',
    lastActiveAt: '2026-05-01T09:00:00Z', // 4 days ago
    lastSweepAt: '2026-04-29T09:00:00Z', // 6d ago
    sweepStatus: 'healthy',
    totalSweeps: 12,
    failedSweepsLast7Days: 0,
    itemCount: 120,
    competitorCount: 2,
    topicCount: 0,
    memberCount: 1,
    aiCostMTD: 0,
    overrides: [],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-008',
    name: 'Streamline TMS',
    domain: 'streamline-tms.com',
    adminEmail: 'alex@streamline-tms.com',
    adminName: 'Alex',
    plan: 'premium',
    status: 'active',
    createdAt: '2025-06-08T00:00:00Z',
    lastActiveAt: '2026-05-05T03:00:00Z', // 6h ago
    lastSweepAt: '2026-05-04T21:00:00Z', // 12h ago
    sweepStatus: 'healthy',
    totalSweeps: 1023,
    failedSweepsLast7Days: 0,
    itemCount: 9200,
    competitorCount: 7,
    topicCount: 3,
    memberCount: 8,
    aiCostMTD: 20455,
    overrides: [],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-009',
    name: 'Globex Holdings',
    domain: 'globex.example',
    adminEmail: 'cto@globex.example',
    adminName: 'CTO',
    plan: 'premium',
    status: 'active',
    createdAt: '2024-11-30T00:00:00Z',
    lastActiveAt: '2026-05-01T09:00:00Z', // 4d ago
    lastSweepAt: '2026-04-28T09:00:00Z', // 7d ago - paused by override
    sweepStatus: 'paused',
    totalSweeps: 1567,
    failedSweepsLast7Days: 0,
    itemCount: 15600,
    competitorCount: 10,
    topicCount: 5,
    memberCount: 18,
    aiCostMTD: 0,
    overrides: [{ key: 'sweeps_paused', label: 'sweeps_paused' }],
    hasOpenIssues: false,
    flags: [],
  },
  {
    id: 'ws-010',
    name: 'DCVelocity Internal',
    domain: 'dcvelocity.example',
    adminEmail: 'amy@dcvelocity.example',
    adminName: 'Amy',
    plan: 'premium',
    status: 'active',
    createdAt: '2025-12-15T00:00:00Z',
    lastActiveAt: '2026-05-04T11:00:00Z', // 22h ago
    lastSweepAt: '2026-05-04T09:00:00Z', // 1d ago
    sweepStatus: 'healthy',
    totalSweeps: 456,
    failedSweepsLast7Days: 0,
    itemCount: 3800,
    competitorCount: 5,
    topicCount: 2,
    memberCount: 9,
    aiCostMTD: 15622,
    overrides: [],
    hasOpenIssues: false,
    flags: [],
  },
]

// Add PlanTier union update
type ExtendedPlanTier = PlanTier | 'free' | 'premium'
type ExtendedWorkspaceStatus = WorkspaceStatus | 'grace-period' | 'cancelled'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-blue-100 text-blue-700 border-blue-200',
  'grace-period': 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  churned: 'bg-slate-100 text-slate-500 border-slate-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
}

const sweepStatusIcons: Record<WorkspaceSweepStatus, React.ReactNode> = {
  healthy: <CheckCircle2 className="size-3 text-green-600" />,
  degraded: <AlertTriangle className="size-3 text-amber-600" />,
  failing: <XCircle className="size-3 text-red-600" />,
  paused: <Pause className="size-3 text-slate-400" />,
  'never-run': <Clock className="size-3 text-slate-400" />,
}

// C6: Updated plan colors to match 2-tier model (free/premium/enterprise)
  const planColors: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600 border-slate-200',
  premium: 'bg-blue-100 text-blue-700 border-blue-200',
free: 'bg-slate-100 text-slate-600 border-slate-200',
    premium: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  enterprise: 'bg-purple-100 text-purple-700 border-purple-200',
  custom: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function formatCost(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toFixed(2)}`
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  return `${diffDays}d ago`
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy-MM-dd')
}

function getGracePeriodDaysRemaining(endsAt: string | null | undefined): number | null {
  if (!endsAt) return null
  const now = new Date()
  const end = new Date(endsAt)
  const diffMs = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function AdminWorkspacesSearchPage() {
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [planFilter, setPlanFilter] = React.useState<string>('all')
  const [hasOverridesOnly, setHasOverridesOnly] = React.useState(false)
  const [hasOpenIssuesOnly, setHasOpenIssuesOnly] = React.useState(false)
  const [dateRangeType, setDateRangeType] = React.useState<'created' | 'lastActive'>('lastActive')
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = React.useState<string>('lastActiveAt')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)

  // Auto-focus search on mount
  React.useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Keyboard shortcut: / to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredWorkspaces = React.useMemo(() => {
    let result = [...mockWorkspaces]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (ws) =>
          ws.name.toLowerCase().includes(q) ||
          ws.domain.toLowerCase().includes(q) ||
          ws.adminEmail.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((ws) => ws.status === statusFilter)
    }

    // Plan filter
    if (planFilter !== 'all') {
      result = result.filter((ws) => ws.plan === planFilter)
    }

    // Has overrides toggle
    if (hasOverridesOnly) {
      result = result.filter((ws) => ws.overrides.length > 0)
    }

    // Has open issues toggle
    if (hasOpenIssuesOnly) {
      result = result.filter((ws) => ws.hasOpenIssues)
    }

    // Date range filter
    if (dateFrom || dateTo) {
      result = result.filter((ws) => {
        const dateField = dateRangeType === 'created' ? ws.createdAt : ws.lastActiveAt
        const d = new Date(dateField)
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        return true
      })
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: number | string = ''
      let bVal: number | string = ''

      switch (sortBy) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'lastActiveAt':
          aVal = a.lastActiveAt || ''
          bVal = b.lastActiveAt || ''
          break
        case 'lastSweepAt':
          aVal = a.lastSweepAt || ''
          bVal = b.lastSweepAt || ''
          break
        case 'createdAt':
          aVal = a.createdAt
          bVal = b.createdAt
          break
        case 'memberCount':
          aVal = a.memberCount
          bVal = b.memberCount
          break
        case 'competitorCount':
          aVal = a.competitorCount
          bVal = b.competitorCount
          break
        case 'aiCostMTD':
          aVal = a.aiCostMTD
          bVal = b.aiCostMTD
          break
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return result
  }, [searchQuery, statusFilter, planFilter, hasOverridesOnly, hasOpenIssuesOnly, dateFrom, dateTo, dateRangeType, sortBy, sortDir])

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir('desc')
    }
  }

  const handleImpersonate = async (workspaceId: string, workspaceName: string) => {
    const reason = window.prompt(`Reason for impersonating ${workspaceName}:`)
    if (!reason) return
    try {
      await startImpersonation(workspaceId, 'read_only', reason)
      setActionMessage(`Started read-only impersonation for ${workspaceName}.`)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to start impersonation.')
    }
  }

  const handleRunSweepOnBehalf = async (workspaceId: string, workspaceName: string) => {
    const reason = window.prompt(`Reason for triggering a sweep for ${workspaceName}:`)
    if (!reason) return
    try {
      await runSweepOnBehalf(workspaceId, reason)
      setActionMessage(`Sweep request recorded for ${workspaceName}.`)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to trigger sweep.')
    }
  }

  return (
    <div className="space-y-3">
      {/* Large Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search by workspace name, domain, or admin email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-11 text-base"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          /
        </kbd>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-8 w-[100px] text-[13px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-[13px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="grace-period">Grace Period</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-[13px]">
              <CalendarIcon className="mr-2 size-4" />
              {dateFrom || dateTo ? (
                <>
                  {dateFrom ? format(dateFrom, 'MMM d') : 'Start'} - {dateTo ? format(dateTo, 'MMM d') : 'End'}
                </>
              ) : (
                'Date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-3">
              <Select value={dateRangeType} onValueChange={(v) => setDateRangeType(v as 'created' | 'lastActive')}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastActive">Last Active</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  className="rounded-md border"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}>
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 ml-2">
          <Switch
            id="has-overrides"
            checked={hasOverridesOnly}
            onCheckedChange={setHasOverridesOnly}
            className="scale-90"
          />
          <Label htmlFor="has-overrides" className="text-[13px] text-slate-600 cursor-pointer">
            Has overrides
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="has-issues"
            checked={hasOpenIssuesOnly}
            onCheckedChange={setHasOpenIssuesOnly}
            className="scale-90"
          />
          <Label htmlFor="has-issues" className="text-[13px] text-slate-600 cursor-pointer">
            Has open issues
          </Label>
        </div>

        <div className="ml-auto text-[12px] text-slate-500">
          {filteredWorkspaces.length} workspace{filteredWorkspaces.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Dense Table */}
      {actionMessage && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {actionMessage}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50">
              <TableHead className="w-[180px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('name')}>
                  Workspace
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[140px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Domain</TableHead>
              <TableHead className="w-[180px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Admin Email</TableHead>
              <TableHead className="w-[70px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Plan</TableHead>
              <TableHead className="w-[80px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Status</TableHead>
              <TableHead className="w-[80px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('createdAt')}>
                  Created
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('lastActiveAt')}>
                  Active
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide text-center">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('memberCount')}>
                  Mbrs
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide text-center">Comp</TableHead>
              <TableHead className="w-[50px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide text-center">Tpcs</TableHead>
              <TableHead className="w-[100px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('lastSweepAt')}>
                  Last Sweep
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Overrides</TableHead>
              <TableHead className="w-[80px] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <Button variant="ghost" size="sm" className="h-6 -ml-2 text-[11px] font-semibold uppercase tracking-wide" onClick={() => toggleSort('aiCostMTD')}>
                  AI MTD
                  <ArrowUpDown className="ml-1 size-3" />
                </Button>
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkspaces.map((workspace) => {
              const graceDays = getGracePeriodDaysRemaining(workspace.gracePeriodEndsAt)
              return (
                <ContextMenu key={workspace.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-slate-50 h-9">
                      <TableCell className="py-1.5">
                        <Link href={`/admin/workspaces/${workspace.id}`} className="text-[12px] font-medium text-slate-900 hover:underline">
                          {workspace.name}
                        </Link>
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 font-mono">
                        {workspace.domain}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 font-mono">
                        {workspace.adminEmail}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', planColors[workspace.plan])}>
                          {workspace.plan === 'premium' ? 'Premium' : 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', statusColors[workspace.status])}>
                          {workspace.status === 'grace-period' ? 'Grace' : workspace.status}
                        </Badge>
                        {graceDays !== null && (
                          <span className="ml-1 text-[10px] text-amber-600">({graceDays}d)</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 font-mono">
                        {formatDate(workspace.createdAt)}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600">
                        {formatRelativeTime(workspace.lastActiveAt)}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 text-center">
                        {workspace.memberCount}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 text-center">
                        {workspace.competitorCount}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 text-center">
                        {workspace.topicCount}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-1">
                          {sweepStatusIcons[workspace.sweepStatus]}
                          <span className={cn(
                            'text-[12px]',
                            workspace.sweepStatus === 'failing' ? 'text-red-600' : 'text-slate-600'
                          )}>
                            {workspace.sweepStatus === 'failing' && workspace.sweepFailedSince
                              ? `FAILED ${formatRelativeTime(workspace.sweepFailedSince)}`
                              : formatRelativeTime(workspace.lastSweepAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {workspace.overrides.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {workspace.overrides.map((o) => (
                              <Badge key={o.key} variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                {o.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">none</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-[12px] text-slate-600 font-mono">
                        {formatCost(workspace.aiCostMTD)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/workspaces/${workspace.id}`}>
                                <ExternalLink className="mr-2 size-4" />
                                View detail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleImpersonate(workspace.id, workspace.name)}>
                              <UserCheck className="mr-2 size-4" />
                              Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRunSweepOnBehalf(workspace.id, workspace.name)}>
                              <RefreshCw className="mr-2 size-4" />
                              Run sweep on behalf of
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <ScrollText className="mr-2 size-4" />
                              View audit log
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings2 className="mr-2 size-4" />
                              Manage overrides
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem asChild>
                      <Link href={`/admin/workspaces/${workspace.id}`}>View detail</Link>
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleImpersonate(workspace.id, workspace.name)}>Impersonate</ContextMenuItem>
                    <ContextMenuItem onClick={() => handleRunSweepOnBehalf(workspace.id, workspace.name)}>
                      Run sweep on behalf of
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem>View audit log</ContextMenuItem>
                    <ContextMenuItem>Manage overrides</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
