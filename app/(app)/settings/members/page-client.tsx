'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  inviteMember,
  changeMemberRole,
  removeMember,
  revokeInvite,
  resendInvite,
  leaveWorkspace,
  transferOwnership,
} from '@/app/(app)/settings/members/actions'
import type { WorkspaceRole } from '@/lib/types/dosi'

type MemberRow = {
  user_id: string
  role: WorkspaceRole
  joined_at: string
  status: string
}

type InviteRow = {
  id: string
  email: string
  role: WorkspaceRole
  created_at: string
}

export function MembersClient({
  currentUserId,
  currentRole,
  members,
  invites,
}: {
  currentUserId: string
  currentRole: WorkspaceRole
  members: MemberRow[]
  invites: InviteRow[]
}) {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<WorkspaceRole>('viewer')
  const [error, setError] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<string | null>(null)
  const isAdmin = currentRole === 'admin'

  async function onInvite() {
    try {
      setError(null)
      setInfo(null)
      await inviteMember(email, role)
      setEmail('')
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">Invite teammates and manage workspace access.</p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium">Invite member</h2>
          <div className="flex gap-2">
            <Input placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="viewer">viewer</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={onInvite} disabled={!email}>
              Invite
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
      {info && <p className="text-sm text-emerald-500">{info}</p>}

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Active members</h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-mono text-sm">{member.user_id}</div>
                <div className="text-xs text-muted-foreground">{new Date(member.joined_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{member.role}</Badge>
                {isAdmin && member.user_id !== currentUserId && (
                  <>
                    <select
                      value={member.role}
                      onChange={async (e) => {
                        try {
                          setError(null)
                          await changeMemberRole(member.user_id, e.target.value as WorkspaceRole)
                          window.location.reload()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to update role')
                        }
                      }}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="viewer">viewer</option>
                      <option value="analyst">analyst</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          setError(null)
                          await removeMember(member.user_id)
                          window.location.reload()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to remove member')
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Pending invites</h2>
        <div className="space-y-2">
          {invites.length === 0 && <p className="text-sm text-muted-foreground">No pending invites.</p>}
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-sm">{invite.email}</div>
                <div className="text-xs text-muted-foreground">{invite.role}</div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        setError(null)
                        await resendInvite(invite.id)
                        setInfo('Invite resent.')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to resend invite')
                      }
                    }}
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        setError(null)
                        await revokeInvite(invite.id)
                        window.location.reload()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to revoke invite')
                      }
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Ownership and access</h2>
        {isAdmin && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Transfer ownership by promoting another member to admin and demoting yourself.
            </p>
            <div className="flex flex-wrap gap-2">
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <Button
                    key={m.user_id}
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        setError(null)
                        await transferOwnership(m.user_id)
                        window.location.reload()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to transfer ownership')
                      }
                    }}
                  >
                    Transfer to {m.user_id.slice(0, 8)}...
                  </Button>
                ))}
            </div>
          </div>
        )}
        <Button
          variant="outline"
          onClick={async () => {
            try {
              setError(null)
              await leaveWorkspace()
              window.location.href = '/onboarding'
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to leave workspace')
            }
          }}
        >
          Leave workspace
        </Button>
      </div>
    </div>
  )
}
