'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertCircle,
  CircleDot,
} from 'lucide-react'

// Types for operator dashboard
interface PlatformHealth {
  activeWorkspacesToday: number
  sweepsCompleted24h: number
  sweepsSuccessRate: number
  sweepsFailed24h: number
  avgSweepLatencyMs: number
  avgSweepLatencyTrend: number // positive = slower, negative = faster
  activeImpersonations: number
}

interface AttentionItem {
  id: string
  severity: 'critical' | 'warning'
  workspaceName: string | null // null = platform-wide
  workspaceId: string | null
  summary: string
  age: string
  actionLabel?: string
  actionHref?: string
}

interface VendorHealth {
  vendor: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  successRate: number
  callsLastHour: number
  projectedDailyCost: number
}

interface RecentActivity {
  id: string
  type: 'signup' | 'upgrade' | 'downgrade' | 'cancellation' | 'ticket'
  workspaceName: string
  workspaceId: string
  details: string
  timestamp: string
}

interface ImpersonationSession {
  id: string
  workspaceName: string
  workspaceId: string
  operatorName: string
  operatorEmail: string
  durationMinutes: number
}

interface QueueDepthPoint {
  time: string
  depth: number
}

// Mock data with realistic seed values from spec
const platformHealth: PlatformHealth = {
  activeWorkspacesToday: 247,
  sweepsCompleted24h: 3892,
  sweepsSuccessRate: 98.7,
  sweepsFailed24h: 51,
  avgSweepLatencyMs: 252000, // 4m 12s
  avgSweepLatencyTrend: -8, // 8% faster than yesterday
  activeImpersonations: 1,
}

const attentionItems: AttentionItem[] = [
  {
    id: 'att-1',
    severity: 'critical',
    workspaceName: 'ChainCo Logistics',
    workspaceId: 'ws-chainco',
    summary: 'Sweep failing for 36 hours, error: xAI rate limit exceeded',
    age: '36h',
    actionLabel: 'View sweep logs',
    actionHref: '/admin/workspaces/ws-chainco',
  },
  {
    id: 'att-2',
    severity: 'warning',
    workspaceName: null,
    workspaceId: null,
    summary: 'OpenAI cost projection over budget by 14% this month',
    age: '2h',
    actionLabel: 'View AI routing',
    actionHref: '/admin/ai-routing',
  },
  {
    id: 'att-3',
    severity: 'warning',
    workspaceName: 'Megacorp Logistics',
    workspaceId: 'ws-megacorp',
    summary: '3 customer-reported issues in 7 days',
    age: '4d',
    actionLabel: 'View workspace',
    actionHref: '/admin/workspaces/ws-megacorp',
  },
  {
    id: 'att-4',
    severity: 'critical',
    workspaceName: null,
    workspaceId: null,
    summary: 'Pending two-operator approval — Engineering wants to deploy prompt template v17 (initiated by jkim, requires second approval)',
    age: '45m',
    actionLabel: 'Review & approve',
    actionHref: '/admin/prompts',
  },
]

const vendorHealthData: VendorHealth[] = [
  {
    vendor: 'OpenAI',
    status: 'healthy',
    latencyMs: 1847,
    successRate: 99.4,
    callsLastHour: 4521,
    projectedDailyCost: 847,
  },
  {
    vendor: 'Anthropic',
    status: 'healthy',
    latencyMs: 2103,
    successRate: 99.8,
    callsLastHour: 2890,
    projectedDailyCost: 523,
  },
  {
    vendor: 'xAI',
    status: 'degraded',
    latencyMs: 4891,
    successRate: 94.2,
    callsLastHour: 1245,
    projectedDailyCost: 312,
  },
]

const recentActivity: RecentActivity[] = [
  {
    id: 'act-1',
    type: 'signup',
    workspaceName: 'TransitFlow Inc',
    workspaceId: 'ws-transitflow',
    details: 'New signup, Growth plan trial',
    timestamp: '2h ago',
  },
  {
    id: 'act-2',
    type: 'upgrade',
    workspaceName: 'FleetMaster Pro',
    workspaceId: 'ws-fleetmaster',
    details: 'Free → Premium upgrade',
    timestamp: '3h ago',
  },
  {
    id: 'act-3',
    type: 'signup',
    workspaceName: 'Harbor Logistics',
    workspaceId: 'ws-harbor',
    details: 'New signup, Enterprise inquiry',
    timestamp: '4h ago',
  },
  {
    id: 'act-4',
    type: 'upgrade',
    workspaceName: 'QuickShip Systems',
    workspaceId: 'ws-quickship',
    details: 'Free → Premium upgrade',
    timestamp: '6h ago',
  },
  {
    id: 'act-5',
    type: 'cancellation',
    workspaceName: 'Acme Corp',
    workspaceId: 'ws-acme',
    details: 'Cancelled, free tier',
    timestamp: '8h ago',
  },
  {
    id: 'act-6',
    type: 'signup',
    workspaceName: 'PortConnect AI',
    workspaceId: 'ws-portconnect',
    details: 'New signup, Growth plan trial',
    timestamp: '10h ago',
  },
  {
    id: 'act-7',
    type: 'signup',
    workspaceName: 'CargoIQ Solutions',
    workspaceId: 'ws-cargoiq',
    details: 'New signup, Starter plan',
    timestamp: '12h ago',
  },
]

const activeImpersonations: ImpersonationSession[] = [
  {
    id: 'imp-1',
    workspaceName: 'ChainCo Logistics',
    workspaceId: 'ws-chainco',
    operatorName: 'Jordan Martinez',
    operatorEmail: 'jordan@dosi.ai',
    durationMinutes: 8,
  },
]

// Sweep queue depth data (24 hours, hourly) - static values for SSR consistency
const queueDepthData: QueueDepthPoint[] = [
  { time: '00:00', depth: 4 },
  { time: '01:00', depth: 3 },
  { time: '02:00', depth: 2 },
  { time: '03:00', depth: 2 },
  { time: '04:00', depth: 3 },
  { time: '05:00', depth: 5 },
  { time: '06:00', depth: 7 },
  { time: '07:00', depth: 10 },
  { time: '08:00', depth: 18 },
  { time: '09:00', depth: 22 },
  { time: '10:00', depth: 25 },
  { time: '11:00', depth: 28 },
  { time: '12:00', depth: 20 },
  { time: '13:00', depth: 24 },
  { time: '14:00', depth: 26 },
  { time: '15:00', depth: 22 },
  { time: '16:00', depth: 19 },
  { time: '17:00', depth: 15 },
  { time: '18:00', depth: 12 },
  { time: '19:00', depth: 9 },
  { time: '20:00', depth: 7 },
  { time: '21:00', depth: 5 },
  { time: '22:00', depth: 4 },
  { time: '23:00', depth: 3 },
]

// Current queue stats
const queueStats = {
  currentDepth: 12,
  avgWaitTimeMinutes: 2.4,
  longestWaitMinutes: 8,
}

// System errors
const systemErrors = {
  countLast24h: 147,
  trend: -12, // 12% fewer than previous 24h
}

// Helper functions
function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatCurrency(dollars: number): string {
  return `$${dollars.toLocaleString()}`
}

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' | 'active' }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
    active: 'bg-purple-500',
  }
  return (
    <span className={cn('inline-block size-2 rounded-full', colors[status])} />
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      {/* Platform Health Strip - Full width, 1 row */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status="healthy" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Active Workspaces</span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 font-mono">
              {platformHealth.activeWorkspacesToday}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status="healthy" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Sweeps (24h)</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 font-mono">
                {platformHealth.sweepsCompleted24h.toLocaleString()}
              </span>
              <span className="text-sm text-green-600 font-medium">
                {platformHealth.sweepsSuccessRate}% success
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={platformHealth.sweepsFailed24h > 10 ? 'degraded' : 'healthy'} />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Failed Sweeps (24h)</span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 font-mono">
              {platformHealth.sweepsFailed24h}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status="healthy" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Sweep Latency</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900 font-mono">
                {formatLatency(platformHealth.avgSweepLatencyMs)}
              </span>
              {platformHealth.avgSweepLatencyTrend !== 0 && (
                <span className={cn(
                  'flex items-center text-sm font-medium',
                  platformHealth.avgSweepLatencyTrend < 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {platformHealth.avgSweepLatencyTrend < 0 ? (
                    <TrendingDown className="size-3 mr-0.5" />
                  ) : (
                    <TrendingUp className="size-3 mr-0.5" />
                  )}
                  {Math.abs(platformHealth.avgSweepLatencyTrend)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={platformHealth.activeImpersonations > 0 ? 'active' : 'healthy'} />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Active Impersonations</span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-900 font-mono">
              {platformHealth.activeImpersonations}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: Attention Needed (8 cols) + Vendor Health (4 cols) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Attention Needed */}
        <Card className="col-span-8 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Attention Needed
              <Badge variant="secondary" className="ml-auto text-xs">
                {attentionItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-3',
                    item.severity === 'critical'
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  )}
                >
                  <div className="mt-0.5">
                    {item.severity === 'critical' ? (
                      <XCircle className="size-4 text-red-600" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.workspaceName ? (
                        <span className="text-[13px] font-medium text-slate-900">
                          {item.workspaceName}
                        </span>
                      ) : (
                        <span className="text-[13px] font-medium text-slate-500">
                          Platform-wide
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">{item.age}</span>
                    </div>
                    <p className="text-[13px] text-slate-700 mt-0.5">{item.summary}</p>
                  </div>
                  {item.actionHref && (
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs" asChild>
                      <Link href={item.actionHref}>
                        {item.actionLabel}
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vendor Health */}
        <Card className="col-span-4 border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Vendor Health</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                <Link href="/admin/vendor-health">
                  View all
                  <ExternalLink className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {vendorHealthData.map((vendor) => (
                <div key={vendor.vendor} className="flex items-center gap-3 text-[13px]">
                  <StatusDot status={vendor.status} />
                  <span className="font-medium w-20">{vendor.vendor}</span>
                  <span className={cn(
                    'text-slate-600 w-14',
                    vendor.successRate < 95 && 'text-amber-600 font-medium'
                  )}>
                    {vendor.successRate}%
                  </span>
                  <span className={cn(
                    'text-slate-500 w-16 font-mono text-[12px]',
                    vendor.latencyMs > 3000 && 'text-amber-600'
                  )}>
                    {formatLatency(vendor.latencyMs)}
                  </span>
                  <span className="text-slate-400 text-[12px] font-mono">
                    {vendor.callsLastHour.toLocaleString()}/h
                  </span>
                  <span className="text-slate-500 text-[12px] ml-auto font-mono">
                    ~{formatCurrency(vendor.projectedDailyCost)}/d
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row: Recent Activity (8 cols) + Active Impersonations (4 cols) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Recent Workspace Activity */}
        <Card className="col-span-8 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Workspace Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 text-[13px] py-1.5 border-b border-slate-100 last:border-0"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] w-20 justify-center',
                      activity.type === 'signup' && 'bg-blue-50 text-blue-700 border-blue-200',
                      activity.type === 'upgrade' && 'bg-green-50 text-green-700 border-green-200',
                      activity.type === 'downgrade' && 'bg-amber-50 text-amber-700 border-amber-200',
                      activity.type === 'cancellation' && 'bg-red-50 text-red-700 border-red-200',
                      activity.type === 'ticket' && 'bg-purple-50 text-purple-700 border-purple-200'
                    )}
                  >
                    {activity.type}
                  </Badge>
                  <Link
                    href={`/admin/workspaces/${activity.workspaceId}`}
                    className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                  >
                    {activity.workspaceName}
                  </Link>
                  <span className="text-slate-500">{activity.details}</span>
                  <span className="text-slate-400 text-[12px] ml-auto">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Impersonation Sessions */}
        <Card className="col-span-4 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-purple-500" />
              Active Impersonations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {activeImpersonations.length === 0 ? (
              <div className="text-[13px] text-slate-500 py-4 text-center">
                No active impersonation sessions
              </div>
            ) : (
              <div className="space-y-2">
                {activeImpersonations.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-purple-50 border border-purple-200"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-slate-900">
                        {session.workspaceName}
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {session.operatorName} · {session.durationMinutes} min
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
                      End session
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fourth row: Sweep Queue (4 cols) + System Errors (4 cols) + empty space (4 cols) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Sweep Queue Depth */}
        <Card className="col-span-4 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sweep Queue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-4 mb-3">
              <div>
                <div className="text-2xl font-semibold text-slate-900 font-mono">
                  {queueStats.currentDepth}
                </div>
                <div className="text-[11px] text-slate-500 uppercase">Current depth</div>
              </div>
              <div>
                <div className="text-lg font-medium text-slate-700 font-mono">
                  {queueStats.avgWaitTimeMinutes.toFixed(1)}m
                </div>
                <div className="text-[11px] text-slate-500 uppercase">Avg wait</div>
              </div>
              <div>
                <div className="text-lg font-medium text-slate-700 font-mono">
                  {queueStats.longestWaitMinutes}m
                </div>
                <div className="text-[11px] text-slate-500 uppercase">Longest</div>
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={queueDepthData}>
                  <Area
                    type="monotone"
                    dataKey="depth"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Errors */}
        <Card className="col-span-4 border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">System Errors (24h)</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                <Link href="/admin/audit-log?filter=errors">
                  View log
                  <ExternalLink className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 font-mono">
                {systemErrors.countLast24h}
              </span>
              {systemErrors.trend !== 0 && (
                <span className={cn(
                  'flex items-center text-sm font-medium',
                  systemErrors.trend < 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {systemErrors.trend < 0 ? (
                    <TrendingDown className="size-3 mr-0.5" />
                  ) : (
                    <TrendingUp className="size-3 mr-0.5" />
                  )}
                  {Math.abs(systemErrors.trend)}% vs yesterday
                </span>
              )}
            </div>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { time: 0, errors: 4 }, { time: 1, errors: 3 }, { time: 2, errors: 2 },
                  { time: 3, errors: 5 }, { time: 4, errors: 8 }, { time: 5, errors: 6 },
                  { time: 6, errors: 7 }, { time: 7, errors: 9 }, { time: 8, errors: 12 },
                  { time: 9, errors: 15 }, { time: 10, errors: 11 }, { time: 11, errors: 8 },
                  { time: 12, errors: 6 }, { time: 13, errors: 7 }, { time: 14, errors: 9 },
                  { time: 15, errors: 5 }, { time: 16, errors: 4 }, { time: 17, errors: 6 },
                  { time: 18, errors: 3 }, { time: 19, errors: 4 }, { time: 20, errors: 5 },
                  { time: 21, errors: 3 }, { time: 22, errors: 2 }, { time: 23, errors: 4 },
                ]}>
                  <Area
                    type="monotone"
                    dataKey="errors"
                    stroke="#ef4444"
                    fill="#fca5a5"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-4 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[13px]" asChild>
              <Link href="/admin/workspaces/search">
                <Building2 className="mr-2 size-4" />
                Search workspaces
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[13px]" asChild>
              <Link href="/admin/impersonation">
                <UserCheck className="mr-2 size-4" />
                Start impersonation
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[13px]" asChild>
              <Link href="/admin/audit-log">
                <Clock className="mr-2 size-4" />
                View audit log
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
