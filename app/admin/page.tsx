'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'
import {
  Building2,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { getAdminDashboardData, type AdminDashboardData } from '@/app/admin/actions/platform'

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
  const [dashboard, setDashboard] = React.useState<AdminDashboardData | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    void getAdminDashboardData()
      .then((data) => {
        if (mounted) {
          setDashboard(data)
          setLoadError(null)
        }
      })
      .catch(() => {
        if (mounted) setLoadError('Unable to load admin dashboard data.')
      })
    return () => {
      mounted = false
    }
  }, [])

  if (!dashboard && !loadError) {
    return <div className="text-sm text-slate-500">Loading dashboard...</div>
  }

  if (!dashboard) {
    return <div className="text-sm text-red-600">{loadError}</div>
  }

  const platformHealth = dashboard.platformHealth
  const attentionItems = dashboard.attentionItems
  const vendorHealthData = dashboard.vendorHealth
  const recentActivity = dashboard.recentActivity
  const activeImpersonations = dashboard.activeImpersonations
  const queueDepthData = dashboard.queueDepthData
  const systemErrorSeries = dashboard.systemErrorSeries
  const queueStats = dashboard.queueStats
  const systemErrors = dashboard.systemErrors

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
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                      <Link href="/admin/impersonation">Manage</Link>
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
                <AreaChart data={systemErrorSeries}>
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
