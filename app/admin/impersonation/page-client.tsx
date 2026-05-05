'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { endImpersonation, startImpersonation } from '@/app/admin/impersonation/actions'

type SessionRow = {
  id: string
  operator_id: string
  workspace_id: string
  mode: 'read_only' | 'write'
  reason: string
  started_at: string
  ended_at: string | null
  workspace?: { name?: string } | null
  operator?: { name?: string; email?: string } | null
}

type WorkspaceRow = { id: string; name: string }

export function ImpersonationClient({
  operatorId,
  sessions,
  workspaces,
}: {
  operatorId: string
  sessions: SessionRow[]
  workspaces: WorkspaceRow[]
}) {
  const [workspaceId, setWorkspaceId] = React.useState(workspaces[0]?.id ?? '')
  const [mode, setMode] = React.useState<'read_only' | 'write'>('read_only')
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const activeCount = sessions.filter((s) => !s.ended_at).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Impersonation Sessions</h1>
        <p className="text-[13px] text-slate-500">Create and manage operator impersonation sessions.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Start impersonation</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'read_only' | 'write')}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="read_only">read_only</option>
            <option value="write">write</option>
          </select>
          <Input
            placeholder="Reason for impersonation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="max-w-md"
          />
          <Button
            onClick={async () => {
              try {
                setError(null)
                await startImpersonation(workspaceId, mode, reason, mode === 'write' ? operatorId : undefined)
                window.location.reload()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to start impersonation')
              }
            }}
          >
            Start
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Sessions</h2>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="rounded border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {s.workspace?.name ?? s.workspace_id} · {s.mode}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.operator?.name ?? s.operator_id} · {new Date(s.started_at).toLocaleString()} · {s.reason}
                </div>
              </div>
              {!s.ended_at ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await endImpersonation(s.id)
                    window.location.reload()
                  }}
                >
                  End
                </Button>
              ) : (
                <Badge variant="secondary">Ended</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
