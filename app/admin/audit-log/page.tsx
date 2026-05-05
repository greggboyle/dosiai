'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  AlertTriangle,
  AlertCircle,
  CalendarIcon,
  X,
} from 'lucide-react'
import type { AuditLogEntry, AuditActionType, AuditSeverity, OperatorRole } from '@/lib/admin-types'
import { format } from 'date-fns'

// Exact 12 seed entries from spec
const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-05-04T14:23:11Z',
    severity: 'info',
    operatorId: 'op-jkim',
    operatorName: 'jkim',
    operatorRole: 'engineer',
    action: 'vendor_routing_changed',
    category: 'ai-routing',
    targetType: 'routing_purpose',
    targetId: 'sweep_buy',
    targetName: 'sweep_buy',
    reason: 'moved off gpt-4-turbo, citation quality up',
    beforeValue: 'gpt-4-turbo',
    afterValue: 'gpt-4o',
    ipAddress: '10.0.1.42',
  },
  {
    id: 'audit-002',
    timestamp: '2026-05-04T11:08:44Z',
    severity: 'info',
    operatorId: 'op-jordan',
    operatorName: 'jordan',
    operatorRole: 'support',
    action: 'impersonation_started',
    category: 'impersonation',
    targetType: 'workspace',
    targetId: 'ws-chainco',
    targetName: 'ChainCo Logistics',
    reason: 'Customer reported sweep failures, debugging',
    ipAddress: '10.0.1.78',
    sessionId: 'session-001',
  },
  {
    id: 'audit-003',
    timestamp: '2026-05-04T11:34:22Z',
    severity: 'info',
    operatorId: 'op-jordan',
    operatorName: 'jordan',
    operatorRole: 'support',
    action: 'impersonation_ended',
    category: 'impersonation',
    targetType: 'workspace',
    targetId: 'ws-chainco',
    targetName: 'ChainCo Logistics',
    reason: 'Duration 25 min',
    ipAddress: '10.0.1.78',
    sessionId: 'session-001',
  },
  {
    id: 'audit-004',
    timestamp: '2026-05-03T16:42:19Z',
    severity: 'warning',
    operatorId: 'op-amy',
    operatorName: 'amy',
    operatorRole: 'ops',
    action: 'override_set',
    category: 'workspace',
    targetType: 'workspace',
    targetId: 'ws-freighthero',
    targetName: 'FreightHero',
    reason: 'Customer in beta partnership, granting extra sweep cap',
    beforeValue: 'sweep_cap_per_week: 2',
    afterValue: 'sweep_cap_per_week: 5 (expires 2026-06-30)',
    ipAddress: '10.0.1.55',
  },
  {
    id: 'audit-005',
    timestamp: '2026-05-03T09:11:08Z',
    severity: 'critical',
    operatorId: 'op-jkim',
    operatorName: 'jkim',
    operatorRole: 'engineer',
    action: 'prompt_rolled_back',
    category: 'prompt',
    targetType: 'prompt_template',
    targetId: 'sweep_regulatory_anthropic_v8',
    targetName: 'sweep_regulatory_anthropic_v8',
    reason: 'Regression in regulatory citation quality',
    beforeValue: 'v8',
    afterValue: 'v7',
    ipAddress: '10.0.1.42',
  },
  {
    id: 'audit-006',
    timestamp: '2026-05-02T22:14:50Z',
    severity: 'info',
    operatorId: null,
    operatorName: 'system',
    operatorRole: 'system',
    action: 'sweep_failed_repeatedly',
    category: 'system',
    targetType: 'workspace',
    targetId: 'ws-chainco',
    targetName: 'ChainCo Logistics',
    reason: 'xAI rate limit exhausted, alerting on 3rd consecutive failure',
    ipAddress: null,
  },
  {
    id: 'audit-007',
    timestamp: '2026-05-02T14:38:11Z',
    severity: 'info',
    operatorId: 'op-amy',
    operatorName: 'amy',
    operatorRole: 'ops',
    action: 'credit_issued',
    category: 'billing',
    targetType: 'workspace',
    targetId: 'ws-acme',
    targetName: 'Acme Logistics',
    reason: 'Compensation for sweep outage 2026-04-29',
    afterValue: '$147.00',
    ipAddress: '10.0.1.55',
  },
  {
    id: 'audit-008',
    timestamp: '2026-05-01T18:22:14Z',
    severity: 'info',
    operatorId: 'op-sam',
    operatorName: 'sam',
    operatorRole: 'admin',
    action: 'operator_user_created',
    category: 'operator',
    targetType: 'operator',
    targetId: 'op-kayla',
    targetName: 'kayla (Support)',
    reason: 'New support hire onboarding',
    ipAddress: '10.0.1.21',
  },
  {
    id: 'audit-009',
    timestamp: '2026-04-30T13:14:09Z',
    severity: 'warning',
    operatorId: 'op-jkim',
    operatorName: 'jkim',
    operatorRole: 'engineer',
    action: 'ab_test_started',
    category: 'prompt',
    targetType: 'prompt_template',
    targetId: 'sweep_buy_openai_v15',
    targetName: 'sweep_buy_openai_v15',
    reason: 'Testing improved hallucination instruction',
    afterValue: '10% traffic',
    ipAddress: '10.0.1.42',
  },
  {
    id: 'audit-010',
    timestamp: '2026-04-29T08:55:32Z',
    severity: 'critical',
    operatorId: null,
    operatorName: 'system',
    operatorRole: 'system',
    action: 'vendor_outage_detected',
    category: 'system',
    targetType: 'vendor',
    targetId: 'xai',
    targetName: 'xAI',
    reason: 'Health checks failing, 32% error rate',
    beforeValue: '92% success rate',
    afterValue: '68% success rate',
    ipAddress: null,
  },
  {
    id: 'audit-011',
    timestamp: '2026-04-28T16:08:47Z',
    severity: 'info',
    operatorId: 'op-amy',
    operatorName: 'amy',
    operatorRole: 'ops',
    action: 'override_set',
    category: 'workspace',
    targetType: 'workspace',
    targetId: 'ws-megacorp',
    targetName: 'Megacorp Logistics',
    reason: 'Enterprise customer requested deal-size privacy',
    beforeValue: 'deal_size_privacy: false',
    afterValue: 'deal_size_privacy: true',
    ipAddress: '10.0.1.55',
  },
  {
    id: 'audit-012',
    timestamp: '2026-04-27T11:42:00Z',
    severity: 'info',
    operatorId: 'op-jordan',
    operatorName: 'jordan',
    operatorRole: 'support',
    action: 'sweep_triggered',
    category: 'workspace',
    targetType: 'workspace',
    targetId: 'ws-globex',
    targetName: 'Globex Holdings',
    reason: 'Manual sweep on customer request',
    ipAddress: '10.0.1.78',
  },
]

const actionTypes: { value: AuditActionType; label: string }[] = [
  { value: 'override_set', label: 'Override Set' },
  { value: 'override_removed', label: 'Override Removed' },
  { value: 'impersonation_started', label: 'Impersonation Started' },
  { value: 'impersonation_ended', label: 'Impersonation Ended' },
  { value: 'sweep_triggered', label: 'Sweep Triggered' },
  { value: 'sweep_failed_repeatedly', label: 'Sweep Failed' },
  { value: 'prompt_deployed', label: 'Prompt Deployed' },
  { value: 'prompt_rolled_back', label: 'Prompt Rolled Back' },
  { value: 'vendor_routing_changed', label: 'Vendor Routing Changed' },
  { value: 'plan_changed', label: 'Plan Changed' },
  { value: 'credit_issued', label: 'Credit Issued' },
  { value: 'operator_user_created', label: 'Operator User Created' },
  { value: 'operator_user_removed', label: 'Operator User Removed' },
  { value: 'ab_test_started', label: 'A/B Test Started' },
  { value: 'vendor_outage_detected', label: 'Vendor Outage Detected' },
]

const severityConfig: Record<AuditSeverity, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
}

const roleColors: Record<OperatorRole | 'system', string> = {
  support: 'bg-blue-100 text-blue-700',
  ops: 'bg-amber-100 text-amber-700',
  engineer: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
  auditor: 'bg-slate-100 text-slate-700',
  system: 'bg-slate-200 text-slate-600',
}

const actionColors: Record<string, string> = {
  override_set: 'bg-amber-100 text-amber-700 border-amber-200',
  override_removed: 'bg-slate-100 text-slate-700 border-slate-200',
  impersonation_started: 'bg-purple-100 text-purple-700 border-purple-200',
  impersonation_ended: 'bg-purple-100 text-purple-700 border-purple-200',
  sweep_triggered: 'bg-blue-100 text-blue-700 border-blue-200',
  sweep_failed_repeatedly: 'bg-red-100 text-red-700 border-red-200',
  prompt_deployed: 'bg-green-100 text-green-700 border-green-200',
  prompt_rolled_back: 'bg-red-100 text-red-700 border-red-200',
  vendor_routing_changed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  plan_changed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  credit_issued: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  operator_user_created: 'bg-violet-100 text-violet-700 border-violet-200',
  operator_user_removed: 'bg-slate-100 text-slate-700 border-slate-200',
  ab_test_started: 'bg-orange-100 text-orange-700 border-orange-200',
  vendor_outage_detected: 'bg-red-100 text-red-700 border-red-200',
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}

function formatTimestampShort(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, 'MMM d, HH:mm:ss')
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedOperators, setSelectedOperators] = React.useState<string[]>([])
  const [selectedWorkspaces, setSelectedWorkspaces] = React.useState<string[]>([])
  const [selectedActions, setSelectedActions] = React.useState<AuditActionType[]>([])
  const [selectedSeverities, setSelectedSeverities] = React.useState<AuditSeverity[]>([])
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedEntry, setSelectedEntry] = React.useState<AuditLogEntry | null>(null)
  const [page, setPage] = React.useState(1)
  const pageSize = 25

  // Get unique operators and workspaces for filters
  const uniqueOperators = React.useMemo(() => {
    const seen = new Map<string, string>()
    mockAuditLog.forEach((entry) => {
      if (entry.operatorId && !seen.has(entry.operatorId)) {
        seen.set(entry.operatorId, entry.operatorName)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [])

  const uniqueWorkspaces = React.useMemo(() => {
    const seen = new Map<string, string>()
    mockAuditLog.forEach((entry) => {
      if (entry.targetType === 'workspace' && !seen.has(entry.targetId)) {
        seen.set(entry.targetId, entry.targetName)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [])

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    let result = [...mockAuditLog]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (entry) =>
          entry.action.toLowerCase().includes(q) ||
          entry.operatorName.toLowerCase().includes(q) ||
          entry.targetName.toLowerCase().includes(q) ||
          entry.reason.toLowerCase().includes(q) ||
          (entry.beforeValue?.toLowerCase().includes(q)) ||
          (entry.afterValue?.toLowerCase().includes(q))
      )
    }

    if (selectedOperators.length > 0) {
      result = result.filter((entry) => entry.operatorId && selectedOperators.includes(entry.operatorId))
    }

    if (selectedWorkspaces.length > 0) {
      result = result.filter((entry) => selectedWorkspaces.includes(entry.targetId))
    }

    if (selectedActions.length > 0) {
      result = result.filter((entry) => selectedActions.includes(entry.action))
    }

    if (selectedSeverities.length > 0) {
      result = result.filter((entry) => selectedSeverities.includes(entry.severity))
    }

    if (dateRange.from) {
      result = result.filter((entry) => new Date(entry.timestamp) >= dateRange.from!)
    }
    if (dateRange.to) {
      result = result.filter((entry) => new Date(entry.timestamp) <= dateRange.to!)
    }

    return result
  }, [searchQuery, selectedOperators, selectedWorkspaces, selectedActions, selectedSeverities, dateRange])

  const paginatedEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredEntries.length / pageSize)

  // Get related actions in same session
  const relatedActions = React.useMemo(() => {
    if (!selectedEntry?.sessionId) return []
    return mockAuditLog.filter(
      (entry) => entry.sessionId === selectedEntry.sessionId && entry.id !== selectedEntry.id
    )
  }, [selectedEntry])

  const toggleAction = (action: AuditActionType) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    )
  }

  const toggleSeverity = (severity: AuditSeverity) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
  }

  const handleExport = (format: 'csv' | 'json') => {
    // In real app, this would download the filtered results
    alert(`Exporting ${filteredEntries.length} entries as ${format.toUpperCase()}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Global Audit Log</h1>
          <p className="text-[13px] text-muted-foreground">
            {filteredEntries.length} entries {filteredEntries.length !== mockAuditLog.length && `(filtered from ${mockAuditLog.length})`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              Export
              <ChevronDown className="ml-2 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px]">
                <CalendarIcon className="mr-2 size-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Operator Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px]">
                Operator
                {selectedOperators.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {selectedOperators.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="space-y-1">
                {uniqueOperators.map((op) => (
                  <label key={op.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedOperators.includes(op.id)}
                      onCheckedChange={(checked) => {
                        setSelectedOperators((prev) =>
                          checked ? [...prev, op.id] : prev.filter((id) => id !== op.id)
                        )
                      }}
                    />
                    <span className="text-[13px]">{op.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Workspace Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px]">
                Workspace
                {selectedWorkspaces.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {selectedWorkspaces.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {uniqueWorkspaces.map((ws) => (
                  <label key={ws.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedWorkspaces.includes(ws.id)}
                      onCheckedChange={(checked) => {
                        setSelectedWorkspaces((prev) =>
                          checked ? [...prev, ws.id] : prev.filter((id) => id !== ws.id)
                        )
                      }}
                    />
                    <span className="text-[13px]">{ws.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Severity Filter */}
          <div className="flex items-center gap-1">
            {(['info', 'warning', 'critical'] as AuditSeverity[]).map((severity) => {
              const config = severityConfig[severity]
              const Icon = config.icon
              const isSelected = selectedSeverities.includes(severity)
              return (
                <button
                  key={severity}
                  onClick={() => toggleSeverity(severity)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium border transition-colors',
                    isSelected
                      ? `${config.bg} ${config.color} border-current`
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  <Icon className="size-3" />
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search all fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-[13px]"
            />
          </div>
        </div>

        {/* Action Type Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mr-1">Actions:</span>
          {actionTypes.map((action) => {
            const isSelected = selectedActions.includes(action.value)
            return (
              <button
                key={action.value}
                onClick={() => toggleAction(action.value)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
                  isSelected
                    ? actionColors[action.value]
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {action.label}
              </button>
            )
          })}
          {selectedActions.length > 0 && (
            <button
              onClick={() => setSelectedActions([])}
              className="ml-1 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Dense Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="text-[11px] w-[150px]">Timestamp</TableHead>
              <TableHead className="text-[11px] w-[40px]"></TableHead>
              <TableHead className="text-[11px] w-[120px]">Operator</TableHead>
              <TableHead className="text-[11px] w-[160px]">Action</TableHead>
              <TableHead className="text-[11px] w-[150px]">Target</TableHead>
              <TableHead className="text-[11px]">Reason</TableHead>
              <TableHead className="text-[11px] w-[140px]">Before</TableHead>
              <TableHead className="text-[11px] w-[140px]">After</TableHead>
              <TableHead className="text-[11px] w-[90px]">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntries.map((entry) => {
              const SeverityIcon = severityConfig[entry.severity].icon
              return (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <SeverityIcon className={cn('size-4', severityConfig[entry.severity].color)} />
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-foreground">{entry.operatorName}</span>
                      <Badge variant="outline" className={cn('text-[9px] px-1 py-0', roleColors[entry.operatorRole])}>
                        {entry.operatorRole}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant="outline" className={cn('text-[10px]', actionColors[entry.action])}>
                      {actionTypes.find((a) => a.value === entry.action)?.label || entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <span className="text-[12px] text-foreground">{entry.targetName}</span>
                  </TableCell>
                  <TableCell className="py-1.5 text-[12px] text-muted-foreground max-w-[200px] truncate">
                    {entry.reason}
                  </TableCell>
                  <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground max-w-[140px] truncate">
                    {entry.beforeValue || '-'}
                  </TableCell>
                  <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground max-w-[140px] truncate">
                    {entry.afterValue || '-'}
                  </TableCell>
                  <TableCell className="py-1.5 text-[11px] font-mono text-muted-foreground">
                    {entry.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredEntries.length)} of {filteredEntries.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-[13px] text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages || totalPages === 0}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[14px] flex items-center gap-2">
                  <severityConfig[selectedEntry.severity].icon
                    className={cn('size-5', severityConfig[selectedEntry.severity].color)}
                  />
                  Audit Log Entry
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {/* Entry ID and Timestamp */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entry ID</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[12px] font-mono text-foreground">{selectedEntry.id}</span>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</div>
                    <div className="text-[12px] font-mono text-foreground mt-0.5">
                      {formatTimestamp(selectedEntry.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Severity */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Severity</div>
                  <Badge className={cn('text-[11px]', severityConfig[selectedEntry.severity].bg, severityConfig[selectedEntry.severity].color)}>
                    {selectedEntry.severity.toUpperCase()}
                  </Badge>
                </div>

                {/* Operator */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Operator</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{selectedEntry.operatorName}</span>
                    <Badge variant="outline" className={cn('text-[10px]', roleColors[selectedEntry.operatorRole])}>
                      {selectedEntry.operatorRole}
                    </Badge>
                  </div>
                  {selectedEntry.operatorId && (
                    <div className="text-[12px] font-mono text-muted-foreground mt-1">{selectedEntry.operatorId}</div>
                  )}
                  {selectedEntry.ipAddress && (
                    <div className="text-[12px] text-muted-foreground mt-1">
                      IP: <span className="font-mono">{selectedEntry.ipAddress}</span>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Action</div>
                  <Badge variant="outline" className={cn('text-[11px]', actionColors[selectedEntry.action])}>
                    {actionTypes.find((a) => a.value === selectedEntry.action)?.label || selectedEntry.action}
                  </Badge>
                </div>

                {/* Target */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Target</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{selectedEntry.targetName}</span>
                    {selectedEntry.targetType === 'workspace' && (
                      <Link
                        href={`/admin/workspaces/${selectedEntry.targetId}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-[12px] font-mono text-muted-foreground mt-1">{selectedEntry.targetId}</div>
                  <div className="text-[12px] text-muted-foreground mt-1">Type: {selectedEntry.targetType}</div>
                </div>

                {/* Reason */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Reason</div>
                  <div className="text-[13px] text-foreground bg-muted p-3 rounded border border-border">
                    {selectedEntry.reason}
                  </div>
                </div>

                {/* Before/After Diff */}
                {(selectedEntry.beforeValue || selectedEntry.afterValue) && (
                  <div className="border-t border-border pt-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Before / After
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-200 dark:border-red-900">
                        <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1">BEFORE</div>
                        <div className="text-[12px] font-mono text-red-700 dark:text-red-300">
                          {selectedEntry.beforeValue || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded border border-green-200 dark:border-green-900">
                        <div className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-1">AFTER</div>
                        <div className="text-[12px] font-mono text-green-700 dark:text-green-300">
                          {selectedEntry.afterValue || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Actions in Same Session */}
                {relatedActions.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Related Actions (Same Session)
                    </div>
                    <div className="space-y-2">
                      {relatedActions.map((related) => (
                        <button
                          key={related.id}
                          onClick={() => setSelectedEntry(related)}
                          className="w-full text-left p-2 rounded border border-border hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-[9px]', actionColors[related.action])}>
                              {actionTypes.find((a) => a.value === related.action)?.label || related.action}
                            </Badge>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {formatTimestampShort(related.timestamp)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full JSON */}
                <div className="border-t border-border pt-4">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Full Entry JSON
                  </div>
                  <pre className="text-[11px] font-mono text-muted-foreground bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedEntry, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
