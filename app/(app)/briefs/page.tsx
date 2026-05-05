import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { briefRowToBrief, listBriefsForWorkspace } from '@/lib/brief/queries'
import { BriefsListClient } from './briefs-list-client'
import { getRelativeTime } from '@/lib/types'

export default async function BriefsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
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

  const rows = await listBriefsForWorkspace(member.workspace_id)
  const briefs = rows.map((r) => {
    const label =
      r.author_id === session.user.id
        ? ((session.user.user_metadata?.full_name as string | undefined) ??
            session.user.email?.split('@')[0] ??
            'You')
        : 'Teammate'
    const b = briefRowToBrief(r, label)
    return {
      ...b,
      updatedAt: getRelativeTime(r.updated_at),
    }
  })

  const canAuthor = member.role === 'admin' || member.role === 'analyst'

  return (
    <BriefsListClient briefs={briefs} canAuthor={canAuthor} currentUserId={session.user.id} />
  )
}
