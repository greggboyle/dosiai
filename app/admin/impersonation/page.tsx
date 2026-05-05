import { getOperatorSession } from '@/lib/auth/operator'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ImpersonationClient } from '@/app/admin/impersonation/page-client'
import { redirect } from 'next/navigation'

export default async function ImpersonationPage() {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) redirect('/admin/sign-in')

  const supabase = await createSupabaseServerClient()
  const [{ data: sessions }, { data: workspaces }] = await Promise.all([
    supabase
      .from('impersonation_session')
      .select('id,operator_id,workspace_id,mode,reason,started_at,ended_at,approved_by_id,workspace:workspace_id(name),operator:operator_id(name,email)')
      .order('started_at', { ascending: false })
      .limit(100),
    supabase.from('workspace').select('id,name').order('name', { ascending: true }).limit(200),
  ])

  return (
    <ImpersonationClient
      operatorId={operatorSession.operator.id}
      sessions={(sessions ?? []) as never[]}
      workspaces={(workspaces ?? []) as never[]}
    />
  )
}
