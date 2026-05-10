import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { WinLossImportClient } from './win-loss-import-client'

export default async function WinLossImportPage() {
  const supabase = await createSupabaseServerClient()
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) redirect('/onboarding')
  if (member.role === 'viewer') notFound()

  const { data: competitors } = await supabase
    .from('competitor')
    .select('id, name')
    .eq('workspace_id', member.workspace_id)
    .eq('status', 'active')
    .order('name')

  return <WinLossImportClient competitors={competitors ?? []} />
}
