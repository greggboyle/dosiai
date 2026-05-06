'use client'

import * as React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, UserCheck, RefreshCw, ExternalLink } from 'lucide-react'
import { startImpersonation } from '@/app/admin/impersonation/actions'
import { runSweepOnBehalf } from '@/app/admin/workspaces/actions'

export type WorkspaceSearchRow = {
  id: string
  name: string
  domain: string
  plan: string
  status: string
  createdAt: string
  lastActiveAt: string
  lastSweepAt: string | null
  aiCostMtdCents: number
  memberCount: number
  competitorCount: number
  topicCount: number
  activeOverrideCount: number
  failedSweepsLast7Days: number
  adminUserId: string | null
  gracePeriodEndsAt: string | null
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function relativeTime(ts: string | null): string {
  if (!ts) return 'Never'
  const delta = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(delta / 60000)
  if (mins < 60) return `${Math.max(0, mins)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function WorkspacesSearchClient({ initialRows }: { initialRows: WorkspaceSearchRow[] }) {
  const [rows, setRows] = React.useState(initialRows)
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [plan, setPlan] = React.useState('all')
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => setRows(initialRows), [initialRows])

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      const q = query.trim().toLowerCase()
      if (q && !`${r.name} ${r.domain} ${r.adminUserId ?? ''}`.toLowerCase().includes(q)) return false
      if (status !== 'all' && r.status !== status) return false
      if (plan !== 'all' && r.plan !== plan) return false
      return true
    })
  }, [rows, query, status, plan])

  const onImpersonate = async (workspaceId: string, workspaceName: string) => {
    const reason = window.prompt(`Reason for impersonating ${workspaceName}:`)
    if (!reason) return
    try {
      await startImpersonation(workspaceId, 'read_only', reason)
      setMessage(`Started impersonation for ${workspaceName}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not start impersonation.')
    }
  }

  const onRunSweep = async (workspaceId: string, workspaceName: string) => {
    const reason = window.prompt(`Reason for triggering a sweep for ${workspaceName}:`)
    if (!reason) return
    try {
      await runSweepOnBehalf(workspaceId, reason)
      setMessage(`Sweep queued for ${workspaceName}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not queue sweep.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[320px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by workspace, domain, or admin user id"
            className="pl-9"
          />
        </div>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="read_only">Read only</SelectItem>
            <SelectItem value="grace_period">Grace period</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message ? <div className="rounded border bg-muted px-3 py-2 text-sm">{message}</div> : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last sweep</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="text-center">Comp</TableHead>
              <TableHead className="text-center">Topics</TableHead>
              <TableHead>Overrides</TableHead>
              <TableHead>AI MTD</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/admin/workspaces/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.domain || '-'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.status}</Badge>
                </TableCell>
                <TableCell>{relativeTime(r.lastActiveAt)}</TableCell>
                <TableCell>{relativeTime(r.lastSweepAt)}</TableCell>
                <TableCell className="text-center">{r.memberCount}</TableCell>
                <TableCell className="text-center">{r.competitorCount}</TableCell>
                <TableCell className="text-center">{r.topicCount}</TableCell>
                <TableCell>{r.activeOverrideCount > 0 ? r.activeOverrideCount : '-'}</TableCell>
                <TableCell>{formatCost(r.aiCostMtdCents)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/workspaces/${r.id}`}>
                          <ExternalLink className="mr-2 size-4" />
                          View detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onImpersonate(r.id, r.name)}>
                        <UserCheck className="mr-2 size-4" />
                        Impersonate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRunSweep(r.id, r.name)}>
                        <RefreshCw className="mr-2 size-4" />
                        Run sweep
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
