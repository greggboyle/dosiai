'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
  Clock,
} from 'lucide-react'
import type { AdminWorkspace } from '@/lib/admin-types'

// Mock recently active workspaces
const recentWorkspaces: (AdminWorkspace & { lastActivity: string; activityType: string })[] = [
  {
    id: 'ws-001',
    name: 'Freight Solutions Inc',
    domain: 'freightsolutions.com',
    status: 'active',
    plan: 'enterprise',
    adminEmail: 'ops@freightsolutions.com',
    adminName: 'Sarah Miller',
    createdAt: '2024-01-15T00:00:00Z',
    lastSweepAt: '2026-05-05T11:15:00Z',
    sweepStatus: 'healthy',
    totalSweeps: 848,
    failedSweepsLast7Days: 0,
    itemCount: 12473,
    competitorCount: 8,
    userCount: 24,
    mrr: 249900,
    hasOverrides: false,
    flags: [],
    lastActivity: '2026-05-05T11:15:00Z',
    activityType: 'Sweep completed',
  },
  {
    id: 'ws-003',
    name: 'SupplyChain Co',
    domain: 'supplychain.co',
    status: 'trial',
    plan: 'premium',
    adminEmail: 'cto@supplychain.co',
    adminName: 'Alex Johnson',
    createdAt: '2026-04-28T00:00:00Z',
    lastSweepAt: '2026-05-05T11:10:00Z',
    sweepStatus: 'healthy',
    totalSweeps: 13,
    failedSweepsLast7Days: 0,
    itemCount: 356,
    competitorCount: 4,
    userCount: 3,
    mrr: 0,
    hasOverrides: false,
    flags: ['high-intent'],
    lastActivity: '2026-05-05T11:10:00Z',
    activityType: 'User login',
  },
  // Add more...
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `ws-${String(i + 10).padStart(3, '0')}`,
    name: [
      'LogiCore Systems', 'PortConnect', 'CarrierLink', 'WarehouseOS', 'DistributionHub',
      'TruckFlow Inc', 'RailLogix', 'AirCargo Plus', 'SeaFreight Co', 'IntermodalTech',
      'LastMile Labs', 'DockSmart', 'PalletTrack', 'ContainerIQ', 'BulkShip Pro',
      'ColdChain Mgmt', 'HazMat Logistics', 'FleetTrack Pro'
    ][i],
    domain: `workspace${i + 10}.com`,
    status: 'active' as const,
    plan: 'premium' as const,
    adminEmail: `admin@workspace${i + 10}.com`,
    adminName: `Admin ${i + 10}`,
    createdAt: '2024-06-01T00:00:00Z',
    lastSweepAt: new Date(2026, 4, 5, 11, 5 - i).toISOString(),
    sweepStatus: 'healthy' as const,
    totalSweeps: 200 + i * 10,
    failedSweepsLast7Days: 0,
    itemCount: 1000 + i * 100,
    competitorCount: 5,
    userCount: 8,
    mrr: 99900,
    hasOverrides: false,
    flags: [] as string[],
    lastActivity: new Date(2026, 4, 5, 11, 5 - i).toISOString(),
    activityType: ['Sweep completed', 'User login', 'Brief generated', 'Battle card viewed'][i % 4],
  })),
]

const sweepStatusIcons: Record<AdminWorkspace['sweepStatus'], React.ReactNode> = {
  healthy: <CheckCircle2 className="size-4 text-green-600" />,
  degraded: <AlertTriangle className="size-4 text-amber-600" />,
  failing: <XCircle className="size-4 text-red-600" />,
  'never-run': <Clock className="size-4 text-slate-400" />,
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function RecentWorkspacesPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Recently Active Workspaces</h1>
        <p className="text-[13px] text-slate-500">Workspaces with activity in the last 24 hours.</p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px]">Workspace</TableHead>
              <TableHead className="text-[12px]">Last Activity</TableHead>
              <TableHead className="text-[12px]">Activity Type</TableHead>
              <TableHead className="text-[12px]">Plan</TableHead>
              <TableHead className="text-[12px]">Sweep</TableHead>
              <TableHead className="text-[12px]">Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentWorkspaces.map((workspace) => (
              <TableRow key={workspace.id} className="cursor-pointer hover:bg-slate-50">
                <TableCell className="py-2">
                  <Link href={`/admin/workspaces/${workspace.id}`} className="block">
                    <div className="text-[13px] font-medium text-slate-900 hover:text-blue-600">
                      {workspace.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{workspace.domain}</div>
                  </Link>
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600">
                  {formatRelativeTime(workspace.lastActivity)}
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600">
                  {workspace.activityType}
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600 capitalize">
                  {workspace.plan}
                </TableCell>
                <TableCell className="py-2">
                  {sweepStatusIcons[workspace.sweepStatus]}
                </TableCell>
                <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                  {workspace.itemCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
