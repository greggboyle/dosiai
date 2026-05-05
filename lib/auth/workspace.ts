import type { User } from '@supabase/supabase-js'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/types/dosi'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { workspaceFromDb, workspaceMemberFromDb } from '@/lib/supabase/mappers'

export interface WorkspaceContext {
  workspace: Workspace
  member: WorkspaceMember
  user: User
}

function hasRole(memberRole: WorkspaceRole, requiredRole: WorkspaceRole | WorkspaceRole[]) {
  if (Array.isArray(requiredRole)) return requiredRole.includes(memberRole)
  return memberRole === requiredRole
}

export async function withWorkspace<T>(
  workspaceId: string,
  requiredRole: WorkspaceRole | WorkspaceRole[],
  callback: (context: WorkspaceContext) => Promise<T>
): Promise<T> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const supabase = await createSupabaseServerClient()

  const { data: memberRow, error: memberError } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (memberError) throw memberError
  if (!memberRow) throw new Error('Unauthorized')

  const member = workspaceMemberFromDb(memberRow)
  if (!hasRole(member.role, requiredRole)) throw new Error('Forbidden')

  const { data: workspaceRow, error: workspaceError } = await supabase
    .from('workspace')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (workspaceError) throw workspaceError

  return callback({
    workspace: workspaceFromDb(workspaceRow),
    member,
    user: session.user,
  })
}
