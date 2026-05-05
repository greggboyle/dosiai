'use client'

import * as React from 'react'
import Link from 'next/link'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  XCircle,
  Flag,
  CreditCard,
  TrendingDown,
  Zap,
} from 'lucide-react'
import type { AdminWorkspace } from '@/lib/admin-types'

interface FlaggedWorkspace extends AdminWorkspace {
  flagReason: string
  flaggedAt: string
  flagType: 'payment-failed' | 'sweep-failing' | 'churn-risk' | 'usage-spike' | 'needs-attention'
}

const flaggedWorkspaces: FlaggedWorkspace[] = [
  {
    id: 'ws-006',
    name: 'TransitPro Systems',
    domain: 'transitpro.net',
    status: 'suspended',
    plan: 'premium',
    adminEmail: 'billing@transitpro.net',
    adminName: 'Rachel Kim',
    createdAt: '2024-06-10T00:00:00Z',
    lastSweepAt: '2026-04-15T00:00:00Z',
    sweepStatus: 'failing',
    totalSweeps: 289,
    failedSweepsLast7Days: 7,
    itemCount: 3400,
    competitorCount: 6,
    userCount: 8,
    mrr: 0,
    hasOverrides: false,
    flags: ['payment-failed', 'suspended'],
    flagReason: 'Payment failed 3 times. Account suspended.',
    flaggedAt: '2026-04-20T00:00:00Z',
    flagType: 'payment-failed',
  },
  {
    id: 'ws-002',
    name: 'LogiTech Partners',
    domain: 'logitechpartners.io',
    status: 'active',
    plan: 'premium',
    adminEmail: 'admin@logitechpartners.io',
    adminName: 'Mike Chen',
    createdAt: '2024-03-22T00:00:00Z',
    lastSweepAt: '2026-05-05T07:45:00Z',
    sweepStatus: 'degraded',
    totalSweeps: 423,
    failedSweepsLast7Days: 3,
    itemCount: 5670,
    competitorCount: 5,
    userCount: 12,
    mrr: 99900,
    hasOverrides: true,
    flags: ['sweep-issues'],
    flagReason: '3 sweep failures in last 7 days. Vendor rate limits hit.',
    flaggedAt: '2026-05-03T00:00:00Z',
    flagType: 'sweep-failing',
  },
  {
    id: 'ws-014',
    name: 'Harbor Dynamics',
    domain: 'harbordynamics.com',
    status: 'active',
    plan: 'enterprise',
    adminEmail: 'admin@harbordynamics.com',
    adminName: 'Emily Brown',
    createdAt: '2024-01-05T00:00:00Z',
    lastSweepAt: '2026-05-05T06:00:00Z',
    sweepStatus: 'healthy',
    totalSweeps: 567,
    failedSweepsLast7Days: 0,
    itemCount: 8900,
    competitorCount: 7,
    userCount: 18,
    mrr: 249900,
    hasOverrides: false,
    flags: ['churn-risk'],
    flagReason: 'Low engagement. Only 2 logins in past 30 days.',
    flaggedAt: '2026-05-01T00:00:00Z',
    flagType: 'churn-risk',
  },
  {
    id: 'ws-019',
    name: 'ContainerIQ',
    domain: 'containeriq.io',
    status: 'active',
    plan: 'free',
    adminEmail: 'team@containeriq.io',
    adminName: 'Brian Clark',
    createdAt: '2025-10-01T00:00:00Z',
    lastSweepAt: '2026-05-05T09:00:00Z',
    sweepStatus: 'healthy',
    totalSweeps: 156,
    failedSweepsLast7Days: 0,
    itemCount: 2100,
    competitorCount: 12,
    userCount: 4,
    mrr: 29900,
    hasOverrides: false,
    flags: ['usage-spike'],
    flagReason: 'Competitor count increased 3x in 24 hours. May need plan upgrade.',
    flaggedAt: '2026-05-04T00:00:00Z',
    flagType: 'usage-spike',
  },
]

const flagTypeConfig: Record<FlaggedWorkspace['flagType'], { icon: React.ElementType; color: string; label: string }> = {
  'payment-failed': { icon: CreditCard, color: 'bg-red-100 text-red-700 border-red-200', label: 'Payment Failed' },
  'sweep-failing': { icon: XCircle, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Sweep Failing' },
  'churn-risk': { icon: TrendingDown, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Churn Risk' },
  'usage-spike': { icon: Zap, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Usage Spike' },
  'needs-attention': { icon: Flag, color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Needs Attention' },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export default function FlaggedWorkspacesPage() {
  const [typeFilter, setTypeFilter] = React.useState<string>('all')

  const filteredWorkspaces = typeFilter === 'all'
    ? flaggedWorkspaces
    : flaggedWorkspaces.filter((w) => w.flagType === typeFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Flagged Workspaces</h1>
          <p className="text-[13px] text-slate-500">{flaggedWorkspaces.length} workspaces requiring attention.</p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[160px] text-[13px]">
            <SelectValue placeholder="Flag type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flags</SelectItem>
            <SelectItem value="payment-failed">Payment Failed</SelectItem>
            <SelectItem value="sweep-failing">Sweep Failing</SelectItem>
            <SelectItem value="churn-risk">Churn Risk</SelectItem>
            <SelectItem value="usage-spike">Usage Spike</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flagged Items */}
      <div className="space-y-3">
        {filteredWorkspaces.map((workspace) => {
          const config = flagTypeConfig[workspace.flagType]
          const Icon = config.icon
          return (
            <div
              key={workspace.id}
              className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', config.color.split(' ')[0])}>
                    <Icon className={cn('size-5', config.color.split(' ')[1])} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/workspaces/${workspace.id}`}
                        className="text-[14px] font-medium text-slate-900 hover:text-blue-600"
                      >
                        {workspace.name}
                      </Link>
                      <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                        {config.label}
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        Flagged {formatRelativeTime(workspace.flaggedAt)}
                      </span>
                    </div>
                    <div className="text-[12px] font-mono text-slate-500 mt-0.5">{workspace.domain}</div>
                    <div className="text-[13px] text-slate-600 mt-2">{workspace.flagReason}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-[12px] h-7">
                    Resolve
                  </Button>
                  <Link href={`/admin/workspaces/${workspace.id}`}>
                    <Button size="sm" className="text-[12px] h-7">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
