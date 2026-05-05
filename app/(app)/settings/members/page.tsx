import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { MembersClient } from '@/app/(app)/settings/members/page-client'

export default async function MembersPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const supabase = await createSupabaseServerClient()
  const { data: membership } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: members } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  const { data: invites } = await supabase
    .from('workspace_invite')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <MembersClient
      currentUserId={session.user.id}
      currentRole={membership.role}
      members={members ?? []}
      invites={invites ?? []}
    />
  )
}
