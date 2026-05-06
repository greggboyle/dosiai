'use server'

import { getSession } from '@/lib/auth/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { OperatorRole } from '@/lib/types/dosi'

type AdminAuthState = {
  operator: { id: string; name: string; email: string; role: OperatorRole } | null
  impersonation: { workspaceId: string; workspaceName?: string; startedAt: string } | null
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const session = await getSession()
  const email = session?.user?.email?.trim().toLowerCase()
  if (!email) return { operator: null, impersonation: null }

  const admin = createSupabaseAdminClient()
  const { data: operator } = await admin
    .from('operator_user')
    .select('id,name,email,role')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  if (!operator) return { operator: null, impersonation: null }

  const { data: activeImpersonation } = await admin
    .from('impersonation_session')
    .select('workspace_id,started_at,workspace:workspace_id(name)')
    .eq('operator_id', operator.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    operator: {
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role as OperatorRole,
    },
    impersonation: activeImpersonation
      ? {
          workspaceId: activeImpersonation.workspace_id,
          workspaceName: (activeImpersonation.workspace as unknown as { name?: string })?.name,
          startedAt: activeImpersonation.started_at,
        }
      : null,
  }
}
