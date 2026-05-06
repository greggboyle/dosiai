import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OperatorRow = {
  id: string
  name: string
  email: string
  role: string
}

export async function requireOperator(): Promise<{ operator: OperatorRow }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError

  const email = user?.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Unauthorized')
  }

  const admin = createSupabaseAdminClient()
  const { data: operator, error } = await admin
    .from('operator_user')
    .select('id,name,email,role')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!operator) {
    throw new Error('Forbidden')
  }

  return { operator }
}

export async function requireOperatorAdminOrOwner(): Promise<{ operator: OperatorRow }> {
  const { operator } = await requireOperator()
  if (operator.role !== 'admin' && operator.role !== 'owner') {
    throw new Error('Forbidden')
  }
  return { operator }
}
