import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadBriefSubscriptions, loadMyMarketBriefs } from '@/lib/brief/my-market-queries'
import { MyMarketBriefsClient } from './my-market-client'

export default async function MyMarketBriefsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) redirect('/onboarding')

  const authorSelfLabel =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'You'

  const [rows, subscriptions] = await Promise.all([
    loadMyMarketBriefs(member.workspace_id, user.id, authorSelfLabel),
    loadBriefSubscriptions(member.workspace_id, user.id),
  ])

  return <MyMarketBriefsClient rows={rows} subscriptions={subscriptions} />
}
