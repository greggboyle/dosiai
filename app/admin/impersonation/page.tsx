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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Search,
  UserCheck,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { ImpersonationSession } from '@/lib/admin-types'

const mockSessions: ImpersonationSession[] = [
  {
    id: 'imp-001',
    operatorId: 'op-2',
    operatorName: 'Jamie Rodriguez',
    operatorRole: 'support',
    workspaceId: 'ws-003',
    workspaceName: 'SupplyChain Co',
    mode: 'read-only',
    reason: 'Investigating feed display issue reported in ticket #4892',
    startedAt: '2026-05-05T10:22:00Z',
    endedAt: '2026-05-05T10:30:00Z',
    durationMinutes: 8,
    actionsPerformed: 12,
  },
  {
    id: 'imp-002',
    operatorId: 'op-2',
    operatorName: 'Jamie Rodriguez',
    operatorRole: 'support',
    workspaceId: 'ws-007',
    workspaceName: 'CargoFlow Analytics',
    mode: 'read-only',
    reason: 'Debugging competitor profile not loading - ticket #4856',
    startedAt: '2026-05-04T15:00:00Z',
    endedAt: '2026-05-04T15:18:00Z',
    durationMinutes: 18,
    actionsPerformed: 24,
  },
  {
    id: 'imp-003',
    operatorId: 'op-1',
    operatorName: 'Alex Chen',
    operatorRole: 'admin',
    workspaceId: 'ws-001',
    workspaceName: 'Freight Solutions Inc',
    mode: 'write',
    reason: 'Customer requested help setting up new competitor profiles',
    startedAt: '2026-05-03T14:00:00Z',
    endedAt: '2026-05-03T14:45:00Z',
    durationMinutes: 45,
    actionsPerformed: 67,
    approvedBy: 'op-4',
    approvedByName: 'Morgan Lee',
  },
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `imp-${String(i + 4).padStart(3, '0')}`,
    operatorId: `op-${(i % 3) + 1}`,
    operatorName: ['Alex Chen', 'Jamie Rodriguez', 'Sam Taylor'][i % 3],
    operatorRole: (['admin', 'support', 'ops'] as const)[i % 3],
    workspaceId: `ws-${String((i % 8) + 1).padStart(3, '0')}`,
    workspaceName: [
      'Freight Solutions Inc', 'LogiTech Partners', 'SupplyChain Co', 'Global Freight Hub',
      'QuickShip Logistics', 'TransitPro Systems', 'CargoFlow Analytics', 'Harbor Dynamics'
    ][i % 8],
    mode: (i % 5 === 0 ? 'write' : 'read-only') as 'read-only' | 'write',
    reason: 'Support investigation',
    startedAt: new Date(2026, 4, 3 - Math.floor(i / 4), 10 + (i % 8), 0).toISOString(),
    endedAt: new Date(2026, 4, 3 - Math.floor(i / 4), 10 + (i % 8), 15 + Math.floor(Math.random() * 30)).toISOString(),
    durationMinutes: 15 + Math.floor(Math.random() * 30),
    actionsPerformed: 5 + Math.floor(Math.random() * 50),
  })),
]

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ImpersonationPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [modeFilter, setModeFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const pageSize = 20

  const activeSessions = mockSessions.filter(s => !s.endedAt)
  
  const filteredSessions = React.useMemo(() => {
    let result = [...mockSessions]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.operatorName.toLowerCase().includes(q) ||
          s.workspaceName.toLowerCase().includes(q) ||
          s.reason.toLowerCase().includes(q)
      )
    }

    if (modeFilter !== 'all') {
      result = result.filter((s) => s.mode === modeFilter)
    }

    return result
  }, [searchQuery, modeFilter])

  const paginatedSessions = filteredSessions.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredSessions.length / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Impersonation Sessions</h1>
        <p className="text-[13px] text-slate-500">Track all operator impersonation activity across workspaces.</p>
      </div>

      {/* Active Sessions Alert */}
      {activeSessions.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-2 text-purple-800">
            <UserCheck className="size-5" />
            <span className="font-medium">{activeSessions.length} active impersonation session(s)</span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by operator or workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-9 text-[13px]"
          />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-[13px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="read-only">Read-only</SelectItem>
            <SelectItem value="write">Write</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Table */}
      <div className="rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px]">Status</TableHead>
              <TableHead className="text-[12px]">Operator</TableHead>
              <TableHead className="text-[12px]">Workspace</TableHead>
              <TableHead className="text-[12px]">Mode</TableHead>
              <TableHead className="text-[12px]">Started</TableHead>
              <TableHead className="text-[12px]">Duration</TableHead>
              <TableHead className="text-[12px]">Actions</TableHead>
              <TableHead className="text-[12px]">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="py-2">
                  {session.endedAt ? (
                    <CheckCircle2 className="size-4 text-slate-400" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="size-2 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-[11px] text-purple-600">Active</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-900">
                  {session.operatorName}
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-[13px] text-slate-900">{session.workspaceName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{session.workspaceId}</div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      session.mode === 'write'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    {session.mode}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600">
                  {formatDateTime(session.startedAt)}
                </TableCell>
                <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                  {session.durationMinutes || '-'}m
                </TableCell>
                <TableCell className="py-2 text-[13px] font-mono text-slate-600">
                  {session.actionsPerformed}
                </TableCell>
                <TableCell className="py-2 text-[13px] text-slate-600 max-w-[200px] truncate">
                  {session.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-slate-500">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredSessions.length)} of {filteredSessions.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-[13px] text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
