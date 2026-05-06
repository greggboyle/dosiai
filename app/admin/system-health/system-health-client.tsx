'use client'

import { AlertTriangle, CheckCircle2, Database, Globe, RefreshCw, Server, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type MetricStatus = 'ok' | 'warning' | 'critical'
type ComponentStatus = 'healthy' | 'degraded' | 'down'

export type SystemHealthData = {
  lastUpdatedIso: string
  components: Array<{
    name: string
    kind: 'api' | 'db' | 'worker' | 'queue' | 'storage'
    status: ComponentStatus
    metrics: Array<{ label: string; value: string; status: MetricStatus }>
  }>
  throughputData: Array<{ hour: string; requests: number; sweeps: number }>
  incidents: Array<{
    id: string
    severity: 'warn' | 'error' | 'critical' | 'info'
    title: string
    detail: string
    timestamp: string
  }>
}

const statusIcons = {
  healthy: <CheckCircle2 className="size-5 text-green-600" />,
  degraded: <AlertTriangle className="size-5 text-amber-600" />,
  down: <XCircle className="size-5 text-red-600" />,
}

const statusColors = {
  healthy: 'border-green-200 bg-green-50',
  degraded: 'border-amber-200 bg-amber-50',
  down: 'border-red-200 bg-red-50',
}

const metricStatusColors = {
  ok: 'text-slate-900',
  warning: 'text-amber-600 font-medium',
  critical: 'text-red-600 font-medium',
}

function iconFor(kind: SystemHealthData['components'][number]['kind']) {
  switch (kind) {
    case 'api':
      return Globe
    case 'db':
      return Database
    case 'worker':
      return Server
    default:
      return Server
  }
}

export function SystemHealthClient({ data }: { data: SystemHealthData }) {
  const router = useRouter()
  const healthyCount = data.components.filter((c) => c.status === 'healthy').length
  const degradedCount = data.components.filter((c) => c.status === 'degraded').length
  const downCount = data.components.filter((c) => c.status === 'down').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">System Health</h1>
          <p className="text-[13px] text-slate-500">Platform infrastructure and service status.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-slate-500">Last updated: {new Date(data.lastUpdatedIso).toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-3 gap-4">
        {data.components.map((component) => {
          const Icon = iconFor(component.kind)
          return (
            <div key={component.name} className={cn('rounded-lg border p-4', statusColors[component.status])}>
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
                    <div className={cn('text-[13px] font-mono', metricStatusColors[metric.status])}>{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="text-[14px] font-medium text-slate-900 mb-4">Request Throughput (24h)</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.throughputData}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} dot={false} name="Vendor Calls" />
              <Line type="monotone" dataKey="sweeps" stroke="#16a34a" strokeWidth={2} dot={false} name="Sweeps Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-[14px] font-medium text-slate-900 mb-3">Recent Incidents</h2>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-200">
          {data.incidents.length === 0 ? (
            <div className="p-3 text-[12px] text-slate-500">No warning/error incidents in the last 24 hours.</div>
          ) : (
            data.incidents.map((i) => (
              <div key={i.id} className="p-3 flex items-start gap-3">
                {i.severity === 'critical' || i.severity === 'error' ? (
                  <XCircle className="size-4 text-red-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-slate-900">{i.title}</div>
                  <div className="text-[12px] text-slate-500">{i.detail}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{new Date(i.timestamp).toLocaleString()}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {i.severity}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
