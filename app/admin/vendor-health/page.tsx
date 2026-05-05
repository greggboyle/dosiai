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
  ExternalLink,
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

const mockVendorHealth: VendorHealthMetric[] = [
  {
    vendor: 'openai',
    status: 'healthy',
    latencyP50Ms: 890,
    latencyP99Ms: 2340,
    errorRateLast1h: 0.12,
    errorRateLast24h: 0.08,
    totalCallsLast24h: 145230,
    lastCheckedAt: '2026-05-05T11:00:00Z',
  },
  {
    vendor: 'anthropic',
    status: 'healthy',
    latencyP50Ms: 1120,
    latencyP99Ms: 3100,
    errorRateLast1h: 0.05,
    errorRateLast24h: 0.04,
    totalCallsLast24h: 42890,
    lastCheckedAt: '2026-05-05T11:00:00Z',
  },
  {
    vendor: 'google',
    status: 'degraded',
    latencyP50Ms: 1890,
    latencyP99Ms: 5200,
    errorRateLast1h: 2.4,
    errorRateLast24h: 1.2,
    totalCallsLast24h: 8920,
    lastCheckedAt: '2026-05-05T11:00:00Z',
  },
  {
    vendor: 'cohere',
    status: 'healthy',
    latencyP50Ms: 450,
    latencyP99Ms: 980,
    errorRateLast1h: 0.02,
    errorRateLast24h: 0.01,
    totalCallsLast24h: 12450,
    lastCheckedAt: '2026-05-05T11:00:00Z',
  },
  {
    vendor: 'aws-bedrock',
    status: 'healthy',
    latencyP50Ms: 780,
    latencyP99Ms: 1890,
    errorRateLast1h: 0.08,
    errorRateLast24h: 0.06,
    totalCallsLast24h: 5670,
    lastCheckedAt: '2026-05-05T11:00:00Z',
  },
]

// Generate mock latency time series
const generateLatencyData = (vendor: AIVendor, baseLatency: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    p50: baseLatency + Math.floor(Math.random() * 200) - 100,
    p99: baseLatency * 2.5 + Math.floor(Math.random() * 500) - 250,
  }))
}

// Generate mock error rate time series
const generateErrorData = (baseRate: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    rate: Math.max(0, baseRate + (Math.random() * 0.5) - 0.25),
  }))
}

const vendorLabels: Record<AIVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  cohere: 'Cohere',
  'aws-bedrock': 'AWS Bedrock',
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

export default function VendorHealthPage() {
  const [selectedVendor, setSelectedVendor] = React.useState<AIVendor>('openai')
  const [lastRefresh, setLastRefresh] = React.useState(new Date())

  const selectedHealth = mockVendorHealth.find((v) => v.vendor === selectedVendor)
  const latencyData = generateLatencyData(selectedVendor, selectedHealth?.latencyP50Ms || 1000)
  const errorData = generateErrorData(selectedHealth?.errorRateLast24h || 0.1)

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
          <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-5 gap-4">
        {mockVendorHealth.map((vendor) => (
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
            <a
              href={`https://status.${selectedVendor === 'aws-bedrock' ? 'aws.amazon' : selectedVendor}.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700"
            >
              Vendor status page
              <ExternalLink className="size-3" />
            </a>
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
              {mockVendorHealth.map((vendor) => (
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
