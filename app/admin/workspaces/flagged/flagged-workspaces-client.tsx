'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, Flag, TrendingDown, XCircle, Zap } from 'lucide-react'

export type FlaggedWorkspaceRow = {
  id: string
  name: string
  domain: string
  flagReason: string
  flaggedAt: string
  flagType: 'payment-failed' | 'sweep-failing' | 'churn-risk' | 'usage-spike' | 'needs-attention'
}

const flagTypeConfig: Record<
  FlaggedWorkspaceRow['flagType'],
  { icon: React.ElementType; color: string; label: string }
> = {
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
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export function FlaggedWorkspacesClient({ initialRows }: { initialRows: FlaggedWorkspaceRow[] }) {
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const filteredRows =
    typeFilter === 'all' ? initialRows : initialRows.filter((w) => w.flagType === typeFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Flagged Workspaces</h1>
          <p className="text-[13px] text-slate-500">{initialRows.length} workspaces requiring attention.</p>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[180px] text-[13px]">
            <SelectValue placeholder="Flag type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flags</SelectItem>
            <SelectItem value="payment-failed">Payment Failed</SelectItem>
            <SelectItem value="sweep-failing">Sweep Failing</SelectItem>
            <SelectItem value="churn-risk">Churn Risk</SelectItem>
            <SelectItem value="usage-spike">Usage Spike</SelectItem>
            <SelectItem value="needs-attention">Needs Attention</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredRows.map((workspace, idx) => {
          const config = flagTypeConfig[workspace.flagType]
          const Icon = config.icon
          return (
            <div key={`${workspace.id}-${workspace.flagType}-${idx}`} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', config.color.split(' ')[0])}>
                    <Icon className={cn('size-5', config.color.split(' ')[1])} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/workspaces/${workspace.id}`} className="text-[14px] font-medium text-slate-900 hover:text-blue-600">
                        {workspace.name}
                      </Link>
                      <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                        {config.label}
                      </Badge>
                      <span className="text-[11px] text-slate-500">Flagged {formatRelativeTime(workspace.flaggedAt)}</span>
                    </div>
                    <div className="text-[12px] font-mono text-slate-500 mt-0.5">{workspace.domain || '-'}</div>
                    <div className="text-[13px] text-slate-600 mt-2">{workspace.flagReason}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
        {filteredRows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 p-6 text-[13px] text-slate-500">
            No workspaces match this flag filter.
          </div>
        ) : null}
      </div>
    </div>
  )
}
