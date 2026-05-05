'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Zap,
  Clock,
  HardDrive,
  Globe,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SystemComponent {
  name: string
  icon: React.ElementType
  status: 'healthy' | 'degraded' | 'down'
  metrics: {
    label: string
    value: string
    status: 'ok' | 'warning' | 'critical'
  }[]
  lastChecked: string
}

const components: SystemComponent[] = [
  {
    name: 'API Gateway',
    icon: Globe,
    status: 'healthy',
    metrics: [
      { label: 'Requests/min', value: '2,450', status: 'ok' },
      { label: 'P50 Latency', value: '45ms', status: 'ok' },
      { label: 'P99 Latency', value: '180ms', status: 'ok' },
      { label: 'Error Rate', value: '0.02%', status: 'ok' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
  {
    name: 'PostgreSQL Primary',
    icon: Database,
    status: 'healthy',
    metrics: [
      { label: 'Connections', value: '124/500', status: 'ok' },
      { label: 'Query Time', value: '8ms', status: 'ok' },
      { label: 'Disk Usage', value: '67%', status: 'ok' },
      { label: 'Replication Lag', value: '2ms', status: 'ok' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
  {
    name: 'Redis Cache',
    icon: Zap,
    status: 'healthy',
    metrics: [
      { label: 'Memory', value: '4.2GB/8GB', status: 'ok' },
      { label: 'Hit Rate', value: '98.5%', status: 'ok' },
      { label: 'Connections', value: '89', status: 'ok' },
      { label: 'Evictions/hr', value: '12', status: 'ok' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
  {
    name: 'Sweep Workers',
    icon: Server,
    status: 'degraded',
    metrics: [
      { label: 'Active', value: '18/20', status: 'warning' },
      { label: 'Queue Depth', value: '847', status: 'warning' },
      { label: 'Avg Duration', value: '5.2m', status: 'ok' },
      { label: 'Failed (1h)', value: '3', status: 'warning' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
  {
    name: 'Job Queue',
    icon: Clock,
    status: 'healthy',
    metrics: [
      { label: 'Pending', value: '156', status: 'ok' },
      { label: 'Processing', value: '24', status: 'ok' },
      { label: 'Completed (1h)', value: '2,340', status: 'ok' },
      { label: 'Failed (1h)', value: '7', status: 'ok' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
  {
    name: 'Object Storage',
    icon: HardDrive,
    status: 'healthy',
    metrics: [
      { label: 'Storage Used', value: '1.2TB', status: 'ok' },
      { label: 'Read/min', value: '450', status: 'ok' },
      { label: 'Write/min', value: '120', status: 'ok' },
      { label: 'Availability', value: '99.99%', status: 'ok' },
    ],
    lastChecked: '2026-05-05T11:00:00Z',
  },
]

const statusIcons: Record<SystemComponent['status'], React.ReactNode> = {
  healthy: <CheckCircle2 className="size-5 text-green-600" />,
  degraded: <AlertTriangle className="size-5 text-amber-600" />,
  down: <XCircle className="size-5 text-red-600" />,
}

const statusColors: Record<SystemComponent['status'], string> = {
  healthy: 'border-green-200 bg-green-50',
  degraded: 'border-amber-200 bg-amber-50',
  down: 'border-red-200 bg-red-50',
}

const metricStatusColors: Record<string, string> = {
  ok: 'text-slate-900',
  warning: 'text-amber-600 font-medium',
  critical: 'text-red-600 font-medium',
}

// Generate mock throughput data
const throughputData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  requests: 1800 + Math.floor(Math.random() * 800),
  sweeps: 80 + Math.floor(Math.random() * 40),
}))

export default function SystemHealthPage() {
  const [lastRefresh, setLastRefresh] = React.useState(new Date())

  const healthyCount = components.filter((c) => c.status === 'healthy').length
  const degradedCount = components.filter((c) => c.status === 'degraded').length
  const downCount = components.filter((c) => c.status === 'down').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">System Health</h1>
          <p className="text-[13px] text-slate-500">Platform infrastructure and service status.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[13px]">
          <CheckCircle2 className="size-4 text-green-600" />
          <span className="text-slate-600">{healthyCount} Healthy</span>
        </div>
        {degradedCount > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-amber-600">{degradedCount} Degraded</span>
          </div>
        )}
        {downCount > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <XCircle className="size-4 text-red-600" />
            <span className="text-red-600">{downCount} Down</span>
          </div>
        )}
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-3 gap-4">
        {components.map((component) => {
          const Icon = component.icon
          return (
            <div
              key={component.name}
              className={cn(
                'rounded-lg border p-4',
                statusColors[component.status]
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-slate-600" />
                  <span className="text-[14px] font-medium text-slate-900">{component.name}</span>
                </div>
                {statusIcons[component.status]}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {component.metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="text-[11px] text-slate-500">{metric.label}</div>
                    <div className={cn('text-[13px] font-mono', metricStatusColors[metric.status])}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Throughput Chart */}
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="text-[14px] font-medium text-slate-900 mb-4">Request Throughput (24h)</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={throughputData}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name="API Requests"
              />
              <Line
                type="monotone"
                dataKey="sweeps"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                name="Sweeps Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <div className="w-3 h-0.5 bg-blue-600 rounded" />
            API Requests
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <div className="w-3 h-0.5 bg-green-600 rounded" />
            Sweeps Completed
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div>
        <h2 className="text-[14px] font-medium text-slate-900 mb-3">Recent Incidents</h2>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-200">
          <div className="p-3 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-900">Sweep worker capacity warning</div>
              <div className="text-[12px] text-slate-500">2 workers unresponsive, queue depth elevated. Investigating.</div>
              <div className="text-[11px] text-slate-400 mt-1">Started 15 minutes ago</div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
              Ongoing
            </Badge>
          </div>
          <div className="p-3 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-900">Redis cluster failover completed</div>
              <div className="text-[12px] text-slate-500">Automatic failover to replica completed in 2.3 seconds.</div>
              <div className="text-[11px] text-slate-400 mt-1">Resolved 2 hours ago • Duration: 2s</div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
              Resolved
            </Badge>
          </div>
          <div className="p-3 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-900">API latency spike</div>
              <div className="text-[12px] text-slate-500">P99 latency elevated due to database query optimization running.</div>
              <div className="text-[11px] text-slate-400 mt-1">Resolved yesterday • Duration: 12m</div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
              Resolved
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
