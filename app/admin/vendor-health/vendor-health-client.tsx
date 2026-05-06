'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import type { VendorHealthMetric, AIVendor } from '@/lib/admin-types'
import { useRouter } from 'next/navigation'

const PLATFORM_VENDORS: AIVendor[] = ['openai', 'anthropic', 'xai']

function normalizeVendorMetrics(initial: VendorHealthMetric[]): VendorHealthMetric[] {
  const map = new Map(initial.map((m) => [m.vendor, m]))
  const now = new Date().toISOString()
  return PLATFORM_VENDORS.map((v) =>
    map.get(v) ?? {
      vendor: v,
      status: 'healthy' as const,
      latencyP50Ms: 0,
      latencyP99Ms: 0,
      errorRateLast1h: 0,
      errorRateLast24h: 0,
      totalCallsLast24h: 0,
      lastCheckedAt: now,
    }
  )
}

const vendorLabels: Record<AIVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
}

const statusIcons: Record<VendorHealthMetric['status'], React.ReactNode> = {
  healthy: <CheckCircle2 className="size-5 text-green-600" />,
  degraded: <AlertTriangle className="size-5 text-amber-600" />,
  down: <XCircle className="size-5 text-red-600" />,
}

const statusColors: Record<VendorHealthMetric['status'], string> = {
  healthy: 'bg-green-100 text-green-700 border-green-200',
  degraded: 'bg-amber-100 text-amber-700 border-amber-200',
  down: 'bg-red-100 text-red-700 border-red-200',
}

interface VendorHealthClientProps {
  initialMetrics: VendorHealthMetric[]
  seriesByVendor: Record<
    AIVendor,
    {
      latency: Array<{ hour: string; p50: number; p99: number }>
      error: Array<{ hour: string; rate: number }>
    }
  >
}

export function VendorHealthClient({ initialMetrics, seriesByVendor }: VendorHealthClientProps) {
  const router = useRouter()
  const vendorMetrics = React.useMemo(() => normalizeVendorMetrics(initialMetrics), [initialMetrics])
  const [selectedVendor, setSelectedVendor] = React.useState<AIVendor>('openai')
  const [lastRefresh, setLastRefresh] = React.useState(new Date(initialMetrics[0]?.lastCheckedAt ?? Date.now()))

  const selectedHealth = vendorMetrics.find((v) => v.vendor === selectedVendor)
  const latencyData = seriesByVendor[selectedVendor]?.latency ?? []
  const errorData = seriesByVendor[selectedVendor]?.error ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendor Health</h1>
          <p className="text-[13px] text-slate-500">
            Monitor AI vendor availability, latency, and error rates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLastRefresh(new Date())
              router.refresh()
            }}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <p className="text-[12px] text-slate-500">
        Aggregates from <code className="font-mono text-[11px]">vendor_call</code> rows in the last 7 days (platform-wide).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {vendorMetrics.map((vendor) => (
          <button
            key={vendor.vendor}
            onClick={() => setSelectedVendor(vendor.vendor)}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              selectedVendor === vendor.vendor
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-slate-900">
                {vendorLabels[vendor.vendor]}
              </span>
              {statusIcons[vendor.status]}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">P50</span>
                <span className="font-mono text-slate-700">{vendor.latencyP50Ms}ms</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Error rate</span>
                <span className={cn(
                  'font-mono',
                  vendor.errorRateLast1h > 1 ? 'text-red-600' : vendor.errorRateLast1h > 0.5 ? 'text-amber-600' : 'text-slate-700'
                )}>
                  {vendor.errorRateLast1h.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Calls (24h)</span>
                <span className="font-mono text-slate-700">{vendor.totalCallsLast24h.toLocaleString()}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detailed Charts for Selected Vendor */}
      {selectedHealth && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-slate-900">
              {vendorLabels[selectedVendor]} - Last 24 Hours
            </h2>
            <span className="text-[11px] text-slate-400">Hourly rollups from `vendor_call` (last 24h).</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Latency Chart */}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-[12px] font-medium text-slate-700 mb-4">Latency (ms)</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyData}>
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
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      labelStyle={{ fontWeight: 500 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="p50"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="P50"
                    />
                    <Line
                      type="monotone"
                      dataKey="p99"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={false}
                      name="P99"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className="w-3 h-0.5 bg-blue-600 rounded" />
                  P50: {selectedHealth.latencyP50Ms}ms
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <div className="w-3 h-0.5 bg-red-600 rounded" style={{ borderStyle: 'dashed' }} />
                  P99: {selectedHealth.latencyP99Ms}ms
                </div>
              </div>
            </div>

            {/* Error Rate Chart */}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-[12px] font-medium text-slate-700 mb-4">Error Rate (%)</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={errorData}>
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
                      width={40}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      labelStyle={{ fontWeight: 500 }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#dc2626"
                      fill="#fee2e2"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="text-[11px] text-slate-600">
                  1h avg: <span className="font-mono">{selectedHealth.errorRateLast1h.toFixed(2)}%</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  24h avg: <span className="font-mono">{selectedHealth.errorRateLast24h.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Vendors Table */}
      <div>
        <h2 className="text-[14px] font-medium text-slate-900 mb-3">All Vendors</h2>
        <div className="rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[12px]">Vendor</TableHead>
                <TableHead className="text-[12px]">Status</TableHead>
                <TableHead className="text-[12px]">P50 Latency</TableHead>
                <TableHead className="text-[12px]">P99 Latency</TableHead>
                <TableHead className="text-[12px]">Error Rate (1h)</TableHead>
                <TableHead className="text-[12px]">Error Rate (24h)</TableHead>
                <TableHead className="text-[12px]">Calls (24h)</TableHead>
                <TableHead className="text-[12px]">Last Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorMetrics.map((vendor) => (
                <TableRow key={vendor.vendor}>
                  <TableCell className="py-2 text-[13px] font-medium text-slate-900">
                    {vendorLabels[vendor.vendor]}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={cn('text-[11px]', statusColors[vendor.status])}>
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                    {vendor.latencyP50Ms}ms
                  </TableCell>
                  <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                    {vendor.latencyP99Ms}ms
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={cn(
                      'text-[13px] font-mono',
                      vendor.errorRateLast1h > 1 ? 'text-red-600 font-medium' : vendor.errorRateLast1h > 0.5 ? 'text-amber-600' : 'text-slate-600'
                    )}>
                      {vendor.errorRateLast1h.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                    {vendor.errorRateLast24h.toFixed(2)}%
                  </TableCell>
                  <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                    {vendor.totalCallsLast24h.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2 text-[12px] text-slate-500">
                    {new Date(vendor.lastCheckedAt).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
