'use client'

import * as React from 'react'
import Link from 'next/link'
import { Briefcase, ExternalLink, Play, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startImpersonation } from '@/app/admin/impersonation/actions'
import { runHiringSweepOnBehalf, runSweepOnBehalf, updateWorkspacePlan } from '@/app/admin/workspaces/actions'
import {
  SWEEP_ORCHESTRATION_PURPOSES,
  SWEEP_ORCHESTRATION_PURPOSE_LABELS,
} from '@/lib/sweep/purposes'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type WorkspaceDetailData = {
  workspace: {
    id: string
    name: string
    domain: string
    plan: string
    status: string
    createdAt: string
    lastActiveAt: string
    lastSweepAt: string | null
    lastHiringSweepAt: string | null
    aiCostMtdCents: number
    reviewQueueThreshold: number
    gracePeriodEndsAt: string | null
  }
  profile: {
    companySummary: string
    icp: string
    industry: string
    geography: string
  }
  members: Array<{
    userId: string
    role: string
    status: string
    lastActiveAt: string
    joinedAt: string
  }>
  sweeps: Array<{
    id: string
    status: string
    trigger: string
    startedAt: string
    completedAt: string | null
    itemsFound: number
    itemsNew: number
    errors: unknown
  }>
  vendorCalls: Array<{
    id: string
    sweepId: string | null
    vendor: string
    latencyMs: number | null
    success: boolean
    errorMessage: string | null
    calledAt: string
  }>
  overrides: Array<{
    id: string
    type: string
    originalValue: string
    overrideValue: string
    reason: string | null
    isActive: boolean
    expiresAt: string | null
    createdAt: string
  }>
  audit: Array<{
    id: string
    timestamp: string
    action: string
    category: string
    targetName: string | null
    reason: string | null
    operatorRole: string
  }>
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleString()
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

export function WorkspaceDetailClient({ data }: { data: WorkspaceDetailData }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [planChoice, setPlanChoice] = React.useState<WorkspacePlan>(data.workspace.plan as WorkspacePlan)
  const [planMessage, setPlanMessage] = React.useState<string | null>(null)
  const [purposeSelection, setPurposeSelection] = React.useState<
    Record<(typeof SWEEP_ORCHESTRATION_PURPOSES)[number], boolean>
  >(() =>
    Object.fromEntries(SWEEP_ORCHESTRATION_PURPOSES.map((p) => [p, true])) as Record<
      (typeof SWEEP_ORCHESTRATION_PURPOSES)[number],
      boolean
    >
  )

  React.useEffect(() => {
    setPlanChoice(data.workspace.plan as WorkspacePlan)
  }, [data.workspace.plan])

  async function onRunHiringSweep() {
    const reason = window.prompt('Reason for hiring sweep (required):')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await runHiringSweepOnBehalf(data.workspace.id, reason)
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function onRunSweep() {
    const reason = window.prompt('Reason for manual sweep (required):')
    if (!reason?.trim()) return
    const selected = SWEEP_ORCHESTRATION_PURPOSES.filter((p) => purposeSelection[p])
    if (selected.length === 0) {
      window.alert('Select at least one sweep purpose.')
      return
    }
    setBusy(true)
    try {
      const fullRun = selected.length === SWEEP_ORCHESTRATION_PURPOSES.length
      await runSweepOnBehalf(data.workspace.id, reason, fullRun ? undefined : selected)
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function onImpersonate() {
    const reason = window.prompt('Reason for impersonation (required):')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await startImpersonation(data.workspace.id, 'read_only', reason)
    } finally {
      setBusy(false)
    }
  }

  const planDirty = planChoice !== data.workspace.plan

  async function onUpdatePlan() {
    const reason = window.prompt('Reason for plan change (required):')
    if (!reason?.trim()) return
    setBusy(true)
    setPlanMessage(null)
    try {
      await updateWorkspacePlan(data.workspace.id, planChoice, reason)
      router.refresh()
    } catch (e) {
      setPlanMessage(e instanceof Error ? e.message : 'Could not update plan.')
    } finally {
      setBusy(false)
    }
  }

  const sweepIds = new Set(data.sweeps.map((s) => s.id))
  const callsBySweep = data.vendorCalls.reduce<Record<string, string[]>>((acc, call) => {
    if (!call.sweepId || !sweepIds.has(call.sweepId)) return acc
    acc[call.sweepId] ??= []
    if (!acc[call.sweepId].includes(call.vendor)) acc[call.sweepId].push(call.vendor)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>{' '}
            /{' '}
            <Link href="/admin/workspaces/search" className="hover:underline">
              Workspaces
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{data.workspace.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={planChoice}
                onValueChange={(v) => setPlanChoice(v as WorkspacePlan)}
                disabled={busy}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs capitalize">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8"
                disabled={busy || !planDirty}
                onClick={onUpdatePlan}
              >
                Update plan
              </Button>
            </div>
            <Badge variant="outline">{data.workspace.status}</Badge>
          </div>
          {planMessage ? <div className="text-sm text-red-600">{planMessage}</div> : null}
          <div className="text-sm text-slate-500">
            {data.workspace.domain || 'No domain'} · last active {formatRelativeTime(data.workspace.lastActiveAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onImpersonate}>
            <UserCheck className="mr-2 size-4" />
            Impersonate
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onRunHiringSweep}>
            <Briefcase className="mr-2 size-4" />
            Run hiring sweep
          </Button>
          <Button size="sm" disabled={busy} onClick={onRunSweep}>
            <Play className="mr-2 size-4" />
            Run sweep
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
          Manual sweep purposes (all checked = same as scheduled full sweep)
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {SWEEP_ORCHESTRATION_PURPOSES.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <Checkbox
                id={`admin-sweep-purpose-${p}`}
                checked={purposeSelection[p]}
                onCheckedChange={(c) =>
                  setPurposeSelection((prev) => ({ ...prev, [p]: c === true }))
                }
              />
              <Label htmlFor={`admin-sweep-purpose-${p}`} className="cursor-pointer text-xs font-normal">
                {SWEEP_ORCHESTRATION_PURPOSE_LABELS[p]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="Members" value={String(data.members.length)} />
        <Stat label="MTD AI Cost" value={`$${(data.workspace.aiCostMtdCents / 100).toFixed(2)}`} />
        <Stat label="Review Threshold" value={String(data.workspace.reviewQueueThreshold)} />
        <Stat label="Last Sweep" value={formatRelativeTime(data.workspace.lastSweepAt)} />
        <Stat label="Last Hiring Sweep" value={formatRelativeTime(data.workspace.lastHiringSweepAt)} />
        <Stat label="Active Overrides" value={String(data.overrides.filter((o) => o.isActive).length)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sweeps">Sweep History</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
            <div><span className="font-medium">Company summary:</span> {data.profile.companySummary || '-'}</div>
            <div><span className="font-medium">ICP:</span> {data.profile.icp || '-'}</div>
            <div><span className="font-medium">Industry:</span> {data.profile.industry || '-'}</div>
            <div><span className="font-medium">Geography:</span> {data.profile.geography || '-'}</div>
          </div>

          <div className="mt-4 rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.map((m) => (
                  <TableRow key={`${m.userId}-${m.joinedAt}`}>
                    <TableCell className="font-mono text-xs">{m.userId}</TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>{formatRelativeTime(m.lastActiveAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sweeps" className="mt-4">
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Vendors</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sweeps.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.status}</TableCell>
                    <TableCell>{formatDate(s.startedAt)}</TableCell>
                    <TableCell>{formatDate(s.completedAt)}</TableCell>
                    <TableCell>{s.trigger}</TableCell>
                    <TableCell>{(callsBySweep[s.id] ?? []).join(', ') || '-'}</TableCell>
                    <TableCell>{s.itemsFound} ({s.itemsNew} new)</TableCell>
                    <TableCell>{Array.isArray(s.errors) ? s.errors.length : 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overrides.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.type}</TableCell>
                    <TableCell>{o.originalValue}</TableCell>
                    <TableCell>{o.overrideValue}</TableCell>
                    <TableCell>{o.isActive ? 'active' : 'inactive'}</TableCell>
                    <TableCell>{formatDate(o.expiresAt)}</TableCell>
                    <TableCell>{o.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.timestamp)}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.targetName || '-'}</TableCell>
                    <TableCell>{a.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="pt-2">
            <Link href="/admin/audit-log" className="text-sm text-blue-600 inline-flex items-center gap-1 hover:underline">
              Open full audit log <ExternalLink className="size-3" />
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}
