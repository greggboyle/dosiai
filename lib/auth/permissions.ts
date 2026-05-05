import type { Workspace } from '@/lib/types/dosi'

export type MutationAction = 'invite_member' | 'add_competitor' | 'add_topic' | 'generic'

export function canMutate(workspace: Pick<Workspace, 'status'>, _action: MutationAction) {
  return !['read_only', 'cancelled', 'grace_period'].includes(workspace.status)
}

export function mutationBlockedReason(workspace: Pick<Workspace, 'status'>) {
  if (workspace.status === 'read_only') return 'Workspace is read-only after trial expiration.'
  if (workspace.status === 'grace_period') return 'Workspace is in grace period. Upgrade to re-enable mutations.'
  if (workspace.status === 'cancelled') return 'Workspace is cancelled. Reactivate to make changes.'
  return ''
}
