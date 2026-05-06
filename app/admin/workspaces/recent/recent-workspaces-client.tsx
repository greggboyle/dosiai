'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type RecentWorkspaceRow = {
  id: string
  name: string
  domain: string
  plan: string
  lastActivity: string
  activityType: string
  sweepStatus: 'healthy' | 'degraded' | 'failing' | 'never-run'
  items: number
}

const sweepStatusIcons: Record<RecentWorkspaceRow['sweepStatus'], JSX.Element> = {
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

export function RecentWorkspacesClient({ initialRows }: { initialRows: RecentWorkspaceRow[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Recently Active Workspaces</h1>
        <p className="text-[13px] text-slate-500">Workspaces with activity in the last 24 hours.</p>
      </div>

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
            {initialRows.map((workspace) => (
              <TableRow key={workspace.id} className="cursor-pointer hover:bg-slate-50">
                <TableCell className="py-2">
                  <Link href={`/admin/workspaces/${workspace.id}`} className="block">
                    <div className="text-[13px] font-medium text-slate-900 hover:text-blue-600">{workspace.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{workspace.domain || '-'}</div>
                  </Link>
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600">{formatRelativeTime(workspace.lastActivity)}</TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600">{workspace.activityType}</TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600 capitalize">{workspace.plan}</TableCell>
                <TableCell className="py-2">{sweepStatusIcons[workspace.sweepStatus]}</TableCell>
                <TableCell className="py-2 text-[13px] font-mono text-slate-600">{workspace.items.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
