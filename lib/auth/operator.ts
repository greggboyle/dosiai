import type { User } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

  const supabase = await createSupabaseServerClient()
  const { data: operator } = await supabase
    .from('operator_user')
    .select('*')
    .eq('email', session.user.email.toLowerCase())
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
