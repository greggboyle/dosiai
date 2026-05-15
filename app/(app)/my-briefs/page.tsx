import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadMyBriefsPageData, type MyBriefsSearchParams } from '@/lib/brief/my-market-queries'
import { MyBriefsClient } from './my-market-client'

export default async function MyMarketBriefsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
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

  const raw = await searchParams
  const pick = (k: string): string | undefined => {
    const v = raw[k]
    return Array.isArray(v) ? v[0] : v
  }

  const sp: MyBriefsSearchParams = {
    view: pick('view'),
    q: pick('q'),
    types: pick('types'),
    audience: pick('audience'),
    status: pick('status'),
    from: pick('from'),
    roffset: pick('roffset'),
    coffset: pick('coffset'),
  }

  const authorSelfLabel =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'You'

  const data = await loadMyBriefsPageData(member.workspace_id, user.id, authorSelfLabel, sp)

  return <MyBriefsClient data={data} />
}
