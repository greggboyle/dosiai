import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listFeedItems } from '@/lib/feed/queries'
import { briefRowToBrief, getBriefById } from '@/lib/brief/queries'
import { BriefEditorClient } from './brief-editor-client'

export default async function BriefEditPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!member || member.role === 'viewer') notFound()

  const row = await getBriefById(id)
  if (!row || row.workspace_id !== member.workspace_id) notFound()

  const { data: workspace } = await supabase.from('workspace').select('status').eq('id', member.workspace_id).single()

  const authorLabel =
    row.author_id === session.user.id
      ? ((session.user.user_metadata?.full_name as string | undefined) ??
          session.user.email?.split('@')[0] ??
          'You')
      : 'Teammate'

  const brief = briefRowToBrief(row, authorLabel)
  const feedItems = await listFeedItems(member.workspace_id, { limit: 250 })
  const readOnly = workspace?.status === 'read_only'

  return <BriefEditorClient initialBrief={brief} feedItems={feedItems} readOnly={readOnly} />
}
