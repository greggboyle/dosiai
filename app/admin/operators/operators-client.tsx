'use client'

import * as React from 'react'
import Link from 'next/link'
import { History, UserX } from 'lucide-react'
import { endImpersonation } from '@/app/admin/impersonation/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type OperatorsPageData = {
  operators: Array<{
    id: string
    name: string
    email: string
    role: string
    mfaEnabled: boolean
    status: string
    lastSignInAt: string | null
    createdAt: string
    createdById: string | null
  }>
  activeSessions: Array<{
    id: string
    operatorId: string
    operatorName: string
    workspaceId: string
    workspaceName: string
    mode: string
    reason: string
    startedAt: string
    endedAt: string | null
  }>
  audit: Array<{
    id: string
    timestamp: string
    operatorId: string | null
    action: string
    targetName: string
    reason: string | null
  }>
}

function formatRelativeTime(date: string | null) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}

export function OperatorsClient({ data }: { data: OperatorsPageData }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [busySession, setBusySession] = React.useState<string | null>(null)
  const selected = data.operators.find((o) => o.id === selectedId) ?? null

  const activity = React.useMemo(
    () =>
      selected
        ? data.audit.filter((a) => a.operatorId === selected.id).slice(0, 30)
        : [],
    [data.audit, selected]
  )

  async function onEndSession(sessionId: string) {
    setBusySession(sessionId)
    try {
      await endImpersonation(sessionId)
      window.location.reload()
    } finally {
      setBusySession(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-2 rounded-full bg-purple-500 animate-pulse" />
          <h2 className="text-lg font-semibold">Active Impersonation Sessions</h2>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.activeSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-slate-500">
                    No active impersonation sessions.
                  </TableCell>
                </TableRow>
              ) : (
                data.activeSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.operatorName}</TableCell>
                    <TableCell>
                      <Link href={`/admin/workspaces/${s.workspaceId}`} className="text-blue-600 hover:underline">
                        {s.workspaceName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(s.startedAt)}</TableCell>
                    <TableCell>{formatRelativeTime(s.startedAt)}</TableCell>
                    <TableCell>{s.mode}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{s.reason}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busySession === s.id}
                        onClick={() => onEndSession(s.id)}
                      >
                        <UserX className="mr-2 size-4" />
                        End
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-2">
          <Link href="/admin/audit-log?action=impersonation_started,impersonation_ended" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
            <History className="size-3" />
            Impersonation history
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Operator Users</h2>
          <p className="text-sm text-slate-500">Live operator accounts from `operator_user`.</p>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Last Sign-in</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.operators.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedId(o.id)
                    setDetailOpen(true)
                  }}
                >
                  <TableCell>{o.name}</TableCell>
                  <TableCell className="font-mono text-xs">{o.email}</TableCell>
                  <TableCell>{o.role}</TableCell>
                  <TableCell>{o.mfaEnabled ? 'enabled' : 'disabled'}</TableCell>
                  <TableCell>{formatRelativeTime(o.lastSignInAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                <div><span className="font-medium">Role:</span> {selected.role}</div>
                <div><span className="font-medium">Status:</span> {selected.status}</div>
                <div><span className="font-medium">MFA:</span> {selected.mfaEnabled ? 'enabled' : 'disabled'}</div>
                <div><span className="font-medium">Created:</span> {formatDate(selected.createdAt)}</div>
                <div><span className="font-medium">Last sign-in:</span> {formatDate(selected.lastSignInAt ?? selected.createdAt)}</div>
              </div>
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent Activity</h3>
                <div className="space-y-2">
                  {activity.length === 0 ? (
                    <p className="text-sm text-slate-500">No operator activity found.</p>
                  ) : (
                    activity.map((a) => (
                      <div key={a.id} className="rounded border p-2 text-sm">
                        <div className="font-medium">{a.action}</div>
                        <div className="text-xs text-slate-500">{formatDate(a.timestamp)}</div>
                        <div className="text-xs text-slate-600">{a.targetName}</div>
                        {a.reason ? <div className="text-xs text-slate-500">Reason: {a.reason}</div> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
