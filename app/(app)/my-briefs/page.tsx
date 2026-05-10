import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadBriefSubscriptions, loadMyMarketBriefs } from '@/lib/brief/my-market-queries'
import { MyMarketBriefsClient } from './my-market-client'

export default async function MyMarketBriefsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) redirect('/onboarding')

  const authorSelfLabel =
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'You'

  const [rows, subscriptions] = await Promise.all([
    loadMyMarketBriefs(member.workspace_id, session.user.id, authorSelfLabel),
    loadBriefSubscriptions(member.workspace_id, session.user.id),
  ])

  return <MyMarketBriefsClient rows={rows} subscriptions={subscriptions} />
}
