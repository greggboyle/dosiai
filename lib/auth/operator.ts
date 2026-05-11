import type { User } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { OperatorRole } from '@/lib/types/dosi'

export interface OperatorSession {
  user: User
  operator: {
    id: string
    name: string
    email: string
    role: OperatorRole
    status: 'active' | 'disabled'
  }
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  const session = await getSession()
  if (!session?.user?.email) return null

  // `operator_user` has RLS with no member-facing SELECT policies, so the user-scoped client
  // never sees rows. Match `requireOperator`: resolve identity from Auth, then load operator via admin.
  const email = session.user.email.toLowerCase()
  const admin = createSupabaseAdminClient()
  const { data: operator } = await admin
    .from('operator_user')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  if (!operator) return null

  return {
    user: session.user,
    operator: {
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role,
      status: operator.status,
    },
  }
}

export async function withOperator<T>(
  requiredRole: OperatorRole | OperatorRole[],
  callback: (session: OperatorSession) => Promise<T>
): Promise<T> {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')

  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  if (!allowed.includes(operatorSession.operator.role)) {
    throw new Error('Forbidden')
  }

  return callback(operatorSession)
}
