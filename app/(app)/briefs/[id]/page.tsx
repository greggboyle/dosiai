import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getFeedItemsByIds } from '@/lib/feed/queries'
import { briefRowToBrief, getBriefById } from '@/lib/brief/queries'
import { BriefReaderClient } from './brief-reader-client'

export default async function BriefReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) notFound()

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) notFound()

  const row = await getBriefById(id)
  if (!row || row.workspace_id !== member.workspace_id) notFound()
  if (row.status === 'archived') notFound()

  const isViewer = member.role === 'viewer'
  if (isViewer && row.status !== 'published') notFound()

  const authorLabel =
    row.author_id === session.user.id
      ? ((session.user.user_metadata?.full_name as string | undefined) ??
          session.user.email?.split('@')[0] ??
          'You')
      : 'Teammate'

  const brief = briefRowToBrief(row, authorLabel)

  const linkedRaw = await getFeedItemsByIds(member.workspace_id, row.linked_item_ids ?? [])
  const order = new Map((row.linked_item_ids ?? []).map((lid, i) => [lid, i]))
  const linkedItems = [...linkedRaw].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  const canEdit =
    member.role !== 'viewer' && (row.author_id === session.user.id || member.role === 'admin')

  return <BriefReaderClient brief={brief} linkedItems={linkedItems} canEdit={canEdit} />
}
