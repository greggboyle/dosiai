import { inngest } from '@/inngest/client'
import { briefDraftRequestedEventName } from '@/lib/brief/inngest-events'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function createAutomatedBriefForSweep(params: {
  workspaceId: string
  sweepId: string
  trigger: 'manual' | 'scheduled'
  autoApproveScheduled: boolean
}): Promise<{ briefId: string | null; itemCount: number }> {
  const supabase = createSupabaseAdminClient()

  const { data: items, error: itemsErr } = await supabase
    .from('intelligence_item')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('sweep_id', params.sweepId)
    .order('ingested_at', { ascending: false })

  if (itemsErr) throw itemsErr
  const itemIds = (items ?? []).map((r) => r.id)
  if (itemIds.length === 0) return { briefId: null, itemCount: 0 }

  const { data: author, error: authorErr } = await supabase
    .from('workspace_member')
    .select('user_id, role')
    .eq('workspace_id', params.workspaceId)
    .eq('status', 'active')
    .in('role', ['admin', 'analyst'])
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (authorErr || !author) {
    throw authorErr ?? new Error('No active author available for automated brief')
  }

  const now = new Date()
  const titlePrefix = params.trigger === 'scheduled' ? 'Daily sweep brief' : 'Sweep brief'
  const { data: inserted, error: insErr } = await supabase
    .from('brief')
    .insert({
      workspace_id: params.workspaceId,
      author_id: author.user_id,
      brief_kind: 'sweep_summary',
      title: `${titlePrefix} — ${now.toISOString().slice(0, 10)}`,
      summary: '',
      body: '',
      word_count: 0,
      audience: 'leadership',
      priority: 'medium',
      status: 'draft',
      ai_drafted: false,
      human_reviewed: false,
      linked_item_ids: itemIds,
      linked_topic_ids: [],
      linked_competitor_ids: [],
    })
    .select('id')
    .single()

  if (insErr || !inserted) throw insErr ?? new Error('Failed to create automated brief')

  const autoPublish = params.trigger === 'scheduled' && params.autoApproveScheduled
  await inngest.send({
    name: briefDraftRequestedEventName('sweep_summary'),
    data: {
      briefId: inserted.id,
      workspaceId: params.workspaceId,
      itemIds,
      audienceHint: 'Leadership summary synthesized from this sweep run.',
      autoPublish,
    },
  })

  return { briefId: inserted.id, itemCount: itemIds.length }
}
