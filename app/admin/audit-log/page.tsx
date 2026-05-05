'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Download, ChevronLeft, ChevronRight, ChevronDown, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import type { AuditSeverity } from '@/lib/types/dosi'

type AuditRow = {
  id: string
  timestamp: string
  severity: AuditSeverity
  category: string
  operator_id: string | null
  operator_role: string
  action: string
  target_type: string
  target_id: string
  target_name: string
  reason: string | null
  before_value: string | null
  after_value: string | null
  ip_address: string | null
  session_id: string | null
}

const severityConfig: Record<AuditSeverity, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  critical: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100' },
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditLogPage() {
  const [entries, setEntries] = React.useState<AuditRow[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [severityFilter, setSeverityFilter] = React.useState<'all' | AuditSeverity>('all')
  const [operatorFilter, setOperatorFilter] = React.useState<string>('all')
  const [selectedEntry, setSelectedEntry] = React.useState<AuditRow | null>(null)
  const [page, setPage] = React.useState(1)
  const pageSize = 25

  React.useEffect(() => {
    let mounted = true
    async function load() {
      const res = await fetch('/api/admin/audit-log')
      const data = await res.json()
      if (!mounted) return
      setEntries(data.entries ?? [])
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const operators = React.useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach((e) => {
      if (e.operator_id) map.set(e.operator_id, e.operator_id)
    })
    return Array.from(map.entries()).map(([id]) => id)
  }, [entries])

  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (operatorFilter !== 'all' && e.operator_id !== operatorFilter) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        e.action.toLowerCase().includes(q) ||
        e.target_name.toLowerCase().includes(q) ||
        (e.reason ?? '').toLowerCase().includes(q) ||
        e.target_id.toLowerCase().includes(q)
      )
    })
  }, [entries, operatorFilter, searchQuery, severityFilter])

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  const exportJson = () => {
    download(`audit-log-${Date.now()}.json`, JSON.stringify(filtered, null, 2), 'application/json')
  }

  const exportCsv = () => {
    const header = [
      'id',
      'timestamp',
      'severity',
      'category',
      'operator_id',
      'operator_role',
      'action',
      'target_type',
      'target_id',
      'target_name',
      'reason',
      'before_value',
      'after_value',
      'ip_address',
      'session_id',
    ]
    const rows = filtered.map((r) =>
      header
        .map((k) => {
          const value = String((r as unknown as Record<string, unknown>)[k] ?? '')
          return `"${value.replaceAll('"', '""')}"`
        })
        .join(',')
    )
    download(`audit-log-${Date.now()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Global Audit Log</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              Export
              <ChevronDown className="ml-2 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportJson}>Export as JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search action, target, reason..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as 'all' | AuditSeverity)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">info</SelectItem>
            <SelectItem value="warn">warn</SelectItem>
            <SelectItem value="error">error</SelectItem>
            <SelectItem value="critical">critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All operators</SelectItem>
            {operators.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Timestamp</th>
              <th className="text-left p-2">Severity</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Target</th>
              <th className="text-left p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((e) => {
              const Icon = severityConfig[e.severity].icon
              return (
                <tr key={e.id} className="border-t cursor-pointer hover:bg-muted/40" onClick={() => setSelectedEntry(e)}>
                  <td className="p-2 font-mono text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="p-2">
                    <Badge className={cn('text-xs', severityConfig[e.severity].bg, severityConfig[e.severity].color)}>
                      <Icon className="size-3 mr-1" />
                      {e.severity}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-xs">{e.action}</td>
                  <td className="p-2">{e.target_name}</td>
                  <td className="p-2 text-muted-foreground truncate max-w-[380px]">{e.reason ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader>
                <SheetTitle>Audit Entry</SheetTitle>
              </SheetHeader>
              <pre className="mt-4 rounded bg-slate-900 text-slate-100 p-3 text-xs overflow-x-auto">
                {JSON.stringify(selectedEntry, null, 2)}
              </pre>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
