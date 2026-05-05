'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  Shield,
  ExternalLink,
  Eye,
  History,
  AlertTriangle,
  Info,
} from 'lucide-react'
import type { OperatorUser, OperatorRole, ImpersonationSession } from '@/lib/admin-types'

// Active impersonation session seed data
const activeImpersonations: ImpersonationSession[] = [
  {
    id: 'imp-1',
    operatorId: 'op-2',
    operatorName: 'Jordan Lee',
    operatorRole: 'support',
    workspaceId: 'ws-3',
    workspaceName: 'ChainCo Logistics',
    mode: 'read-only',
    reason: 'Sweep failure investigation',
    startedAt: '2026-05-05T14:18:00Z',
    endedAt: null,
    durationMinutes: null,
    actionsPerformed: 12,
  },
]

// Operator users seed data - exact 8 rows from spec
const mockOperators: OperatorUser[] = [
  {
    id: 'op-1',
    name: 'Sam Chen',
    email: 'sam@dosi.ai',
    role: 'admin',
    mfaEnabled: true,
    lastSignIn: '2026-05-05T09:30:00Z', // 2h ago
    createdAt: '2025-08-14T00:00:00Z',
    createdBy: null, // founding
    status: 'active',
  },
  {
    id: 'op-2',
    name: 'Jordan Lee',
    email: 'jordan@dosi.ai',
    role: 'support',
    mfaEnabled: true,
    lastSignIn: '2026-05-05T11:22:00Z', // 8m ago
    createdAt: '2025-09-22T00:00:00Z',
    createdBy: 'sam',
    status: 'active',
  },
  {
    id: 'op-3',
    name: 'Amy Patel',
    email: 'amy@dosi.ai',
    role: 'ops',
    mfaEnabled: true,
    lastSignIn: '2026-05-05T10:30:00Z', // 1h ago
    createdAt: '2025-10-08T00:00:00Z',
    createdBy: 'sam',
    status: 'active',
  },
  {
    id: 'op-4',
    name: 'Jay Kim',
    email: 'jay@dosi.ai',
    role: 'engineer',
    mfaEnabled: true,
    lastSignIn: '2026-05-05T11:00:00Z', // 30m ago
    createdAt: '2025-08-14T00:00:00Z',
    createdBy: null, // founding
    status: 'active',
  },
  {
    id: 'op-5',
    name: 'Riley Brooks',
    email: 'riley@dosi.ai',
    role: 'engineer',
    mfaEnabled: true,
    lastSignIn: '2026-05-05T05:30:00Z', // 6h ago
    createdAt: '2026-01-12T00:00:00Z',
    createdBy: 'sam',
    status: 'active',
  },
  {
    id: 'op-6',
    name: 'Kayla Ross',
    email: 'kayla@dosi.ai',
    role: 'support',
    mfaEnabled: true,
    lastSignIn: '2026-05-04T15:00:00Z', // yesterday
    createdAt: '2026-05-01T00:00:00Z',
    createdBy: 'sam',
    status: 'active',
  },
  {
    id: 'op-7',
    name: 'Marcus Allen',
    email: 'marcus@dosi.ai',
    role: 'auditor',
    mfaEnabled: true,
    lastSignIn: '2026-04-24T10:00:00Z', // 11d ago
    createdAt: '2026-02-28T00:00:00Z',
    createdBy: 'sam',
    status: 'active',
  },
  {
    id: 'op-8',
    name: 'Devon Park',
    email: 'devon@dosi.ai',
    role: 'support',
    mfaEnabled: false,
    lastSignIn: '2026-03-19T10:00:00Z', // 47d ago
    createdAt: '2025-11-30T00:00:00Z',
    createdBy: 'sam',
    status: 'suspended',
  },
]

// Activity log entries for detail sheet
interface OperatorActivity {
  id: string
  timestamp: string
  action: string
  target: string
  details?: string
}

const mockActivityLog: OperatorActivity[] = [
  { id: '1', timestamp: '2026-05-05T11:22:00Z', action: 'Sign in', target: 'Admin panel' },
  { id: '2', timestamp: '2026-05-05T11:20:00Z', action: 'Impersonation started', target: 'ChainCo Logistics', details: 'read-only' },
  { id: '3', timestamp: '2026-05-04T16:45:00Z', action: 'Impersonation ended', target: 'Megacorp Logistics', details: '15 min session' },
  { id: '4', timestamp: '2026-05-04T16:30:00Z', action: 'Impersonation started', target: 'Megacorp Logistics', details: 'read-only' },
  { id: '5', timestamp: '2026-05-04T14:20:00Z', action: 'Sweep triggered', target: 'ChainCo Logistics' },
  { id: '6', timestamp: '2026-05-03T10:15:00Z', action: 'Sign in', target: 'Admin panel' },
]

interface RoleChangeEntry {
  id: string
  timestamp: string
  fromRole: OperatorRole
  toRole: OperatorRole
  changedBy: string
  reason?: string
}

const mockRoleHistory: RoleChangeEntry[] = [
  { id: '1', timestamp: '2025-12-01T10:00:00Z', fromRole: 'support', toRole: 'ops', changedBy: 'Sam Chen', reason: 'Promotion' },
]

const roleColors: Record<OperatorRole, string> = {
  support: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ops: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  engineer: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  admin: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  auditor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}

const roleLabels: Record<OperatorRole, string> = {
  support: 'Support',
  ops: 'Ops',
  engineer: 'Engineer',
  admin: 'Admin',
  auditor: 'Read-only Auditor',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date('2026-05-05T11:30:00Z') // Mock "now" for consistent display
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays}d ago`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function calculateDuration(startedAt: string): string {
  const start = new Date(startedAt)
  const now = new Date('2026-05-05T11:30:00Z')
  const diffMs = now.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  return `${diffMins}m`
}

export default function OperatorsPage() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [selectedOperator, setSelectedOperator] = React.useState<OperatorUser | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [newEmail, setNewEmail] = React.useState('')
  const [newRole, setNewRole] = React.useState<OperatorRole | ''>('')

  const handleRowClick = (operator: OperatorUser) => {
    setSelectedOperator(operator)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Active Impersonation Sessions */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-2 rounded-full bg-purple-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-foreground">Active Impersonation Sessions</h2>
        </div>
        
        <Card className="border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/10">
          <CardContent className="p-0">
            {activeImpersonations.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-600" />
                No active impersonation sessions across the platform.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-purple-200 dark:border-purple-800/50">
                    <TableHead className="text-[12px]">Operator</TableHead>
                    <TableHead className="text-[12px]">Role</TableHead>
                    <TableHead className="text-[12px]">Workspace</TableHead>
                    <TableHead className="text-[12px]">Started</TableHead>
                    <TableHead className="text-[12px]">Duration</TableHead>
                    <TableHead className="text-[12px]">Mode</TableHead>
                    <TableHead className="text-[12px]">Reason</TableHead>
                    <TableHead className="text-[12px] w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeImpersonations.map((session) => (
                    <TableRow key={session.id} className="border-purple-200 dark:border-purple-800/50">
                      <TableCell className="py-2 text-[13px] font-medium text-foreground">
                        {session.operatorName}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className={cn('text-[11px]', roleColors[session.operatorRole])}>
                          {roleLabels[session.operatorRole]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-[13px]">
                        <Link 
                          href={`/admin/workspaces/${session.workspaceId}`}
                          className="text-purple-600 hover:underline"
                        >
                          {session.workspaceName}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 text-[13px] font-mono text-muted-foreground">
                        {formatDateTime(session.startedAt)}
                      </TableCell>
                      <TableCell className="py-2 text-[13px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-purple-500" />
                          {calculateDuration(session.startedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-[11px]',
                            session.mode === 'read-only' 
                              ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400' 
                              : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                          )}
                        >
                          {session.mode === 'read-only' ? (
                            <><Eye className="size-3 mr-1" /> Read-only</>
                          ) : (
                            <><AlertTriangle className="size-3 mr-1" /> Write</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-[13px] text-muted-foreground max-w-[200px] truncate">
                        {session.reason}
                      </TableCell>
                      <TableCell className="py-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-[12px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950"
                        >
                          <UserX className="size-3 mr-1.5" />
                          End session
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-2">
          <Link 
            href="/admin/audit-log?action=impersonation_started,impersonation_ended"
            className="text-[12px] text-purple-600 hover:underline inline-flex items-center gap-1"
          >
            <History className="size-3" />
            Impersonation history
          </Link>
        </div>
      </div>

      {/* Section 2: Operator Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Operator Users</h2>
            <p className="text-[13px] text-muted-foreground">Manage internal admin access and permissions.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add operator user
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add operator user</DialogTitle>
                <DialogDescription>
                  Send an SSO-only invite link to add a new admin panel user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-[12px] font-medium text-foreground">Email</label>
                  <Input 
                    className="mt-1 text-[13px]" 
                    type="email" 
                    placeholder="newuser@dosi.ai"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground">Role</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as OperatorRole)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="ops">Ops</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="auditor">Read-only Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                  <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-blue-700 dark:text-blue-400">
                    MFA is required and cannot be disabled. The new user will be prompted to set up MFA during their first sign-in.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button disabled={!newEmail || !newRole}>Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Operators Table */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[12px]">Name</TableHead>
                <TableHead className="text-[12px]">Email</TableHead>
                <TableHead className="text-[12px]">Role</TableHead>
                <TableHead className="text-[12px]">MFA</TableHead>
                <TableHead className="text-[12px]">Last Sign-in</TableHead>
                <TableHead className="text-[12px]">Created</TableHead>
                <TableHead className="text-[12px]">Created By</TableHead>
                <TableHead className="text-[12px]">Status</TableHead>
                <TableHead className="text-[12px] w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOperators.map((operator) => (
                <TableRow 
                  key={operator.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(operator)}
                >
                  <TableCell className="py-2 text-[13px] font-medium text-foreground">
                    {operator.name}
                  </TableCell>
                  <TableCell className="py-2 text-[13px] font-mono text-muted-foreground">
                    {operator.email}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={cn('text-[11px]', roleColors[operator.role])}>
                      {roleLabels[operator.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {operator.mfaEnabled ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <XCircle className="size-4 text-red-500" />
                        <span className="text-[11px] text-red-600 font-medium">No</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-[13px] text-muted-foreground">
                    {formatRelativeTime(operator.lastSignIn)}
                  </TableCell>
                  <TableCell className="py-2 text-[13px] text-muted-foreground">
                    {formatDate(operator.createdAt)}
                  </TableCell>
                  <TableCell className="py-2 text-[13px] text-muted-foreground">
                    {operator.createdBy ? operator.createdBy : (
                      <span className="text-[11px] italic">N/A (founding)</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[11px]',
                        operator.status === 'active' 
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      )}
                    >
                      {operator.status === 'active' ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRowClick(operator)}>
                          <ExternalLink className="mr-2 size-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="mr-2 size-4" />
                          Edit role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {operator.status === 'active' ? (
                          <DropdownMenuItem className="text-red-600">
                            <UserX className="mr-2 size-4" />
                            Suspend user
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-green-600">
                            <CheckCircle2 className="mr-2 size-4" />
                            Reactivate user
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Operator Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          {selectedOperator && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  {selectedOperator.name}
                  <Badge variant="outline" className={cn('text-[11px]', roleColors[selectedOperator.role])}>
                    {roleLabels[selectedOperator.role]}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[11px]',
                      selectedOperator.status === 'active' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-red-100 text-red-700 border-red-200'
                    )}
                  >
                    {selectedOperator.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="font-mono text-[13px]">
                  {selectedOperator.email}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Account Info */}
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Last Sign-in
                    </div>
                    <div className="text-foreground">{formatDateTime(selectedOperator.lastSignIn)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Created
                    </div>
                    <div className="text-foreground">{formatDate(selectedOperator.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Created By
                    </div>
                    <div className="text-foreground">
                      {selectedOperator.createdBy || <span className="italic text-muted-foreground">N/A (founding)</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      MFA Status
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedOperator.mfaEnabled ? (
                        <>
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span className="text-green-600">Enabled</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4 text-red-500" />
                          <span className="text-red-600">Not enabled</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role History */}
                <div>
                  <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3">
                    Role Change History
                  </h3>
                  {mockRoleHistory.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground italic">No role changes recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {mockRoleHistory.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 text-[13px] py-2 border-b border-border last:border-0">
                          <span className="text-muted-foreground font-mono text-[12px]">
                            {formatDate(entry.timestamp)}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px]', roleColors[entry.fromRole])}>
                            {entry.fromRole}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className={cn('text-[10px]', roleColors[entry.toRole])}>
                            {entry.toRole}
                          </Badge>
                          <span className="text-muted-foreground">by {entry.changedBy}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3">
                    Recent Activity
                  </h3>
                  <div className="space-y-1">
                    {mockActivityLog.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 py-2 text-[13px] border-b border-border last:border-0">
                        <span className="text-muted-foreground font-mono text-[11px] shrink-0 w-[140px]">
                          {formatDateTime(activity.timestamp)}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{activity.action}</span>
                          {' — '}
                          <span className="text-muted-foreground">{activity.target}</span>
                          {activity.details && (
                            <span className="text-muted-foreground"> ({activity.details})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-border space-y-2">
                  {selectedOperator.status === 'active' ? (
                    <Button variant="destructive" className="w-full">
                      <UserX className="mr-2 size-4" />
                      Suspend User
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                      <CheckCircle2 className="mr-2 size-4" />
                      Reactivate User
                    </Button>
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
