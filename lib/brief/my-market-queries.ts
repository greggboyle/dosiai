import { createSupabaseServerClient } from '@/lib/supabase/server'
import { briefRowToBrief } from '@/lib/brief/queries'
import type { Brief, BriefKind } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'

const ALL_BRIEF_KINDS: BriefKind[] = [
  'manual',
  'sweep_summary',
  'daily_summary',
  'weekly_intelligence',
  'regulatory_summary',
  'competitor',
]

export type MyMarketBriefRow = {
  brief: Brief
  readAt: string | null
  relativeUpdated: string
}

export async function loadMyMarketBriefs(
  workspaceId: string,
  userId: string,
  authorSelfLabel: string
): Promise<MyMarketBriefRow[]> {
  const supabase = await createSupabaseServerClient()

  const { data: subs, error: sErr } = await supabase
    .from('workspace_member_brief_subscription')
    .select('brief_kind')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('subscribed', true)

  if (sErr) throw sErr

  const kinds = [...new Set((subs ?? []).map((s) => s.brief_kind))]
  if (kinds.length === 0) return []

  const { data: briefRows, error: bErr } = await supabase
    .from('brief')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .in('brief_kind', kinds)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  if (bErr) throw bErr
  if (!briefRows?.length) return []

  const ids = briefRows.map((b) => b.id)
  const { data: reads, error: rErr } = await supabase
    .from('brief_user_read')
    .select('brief_id, read_at')
    .eq('user_id', userId)
    .in('brief_id', ids)

  if (rErr) throw rErr
  const readMap = new Map((reads ?? []).map((x) => [x.brief_id, x.read_at]))

  return briefRows.map((r) => {
    const label = r.author_id === userId ? authorSelfLabel : 'Teammate'
    const brief = briefRowToBrief(r, label)
    const ra = readMap.get(r.id) ?? null
    return {
      brief,
      readAt: ra,
      relativeUpdated: getRelativeTime(r.updated_at),
    }
  })
}

/** Published briefs matching the user's subscribed kinds that have not been marked read. */
export async function countMyMarketUnread(workspaceId: string, userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient()

  const { data: subs, error: sErr } = await supabase
    .from('workspace_member_brief_subscription')
    .select('brief_kind')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('subscribed', true)

  if (sErr) throw sErr

  const kinds = [...new Set((subs ?? []).map((s) => s.brief_kind))]
  if (kinds.length === 0) return 0

  const { data: briefRows, error: bErr } = await supabase
    .from('brief')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .in('brief_kind', kinds)

  if (bErr) throw bErr
  const briefIds = (briefRows ?? []).map((b) => b.id)
  if (briefIds.length === 0) return 0

  const { data: reads, error: rErr } = await supabase
    .from('brief_user_read')
    .select('brief_id')
    .eq('user_id', userId)
    .in('brief_id', briefIds)

  if (rErr) throw rErr
  const readIds = new Set((reads ?? []).map((r) => r.brief_id))
  return briefIds.filter((id) => !readIds.has(id)).length
}

export async function loadBriefSubscriptions(workspaceId: string, userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workspace_member_brief_subscription')
    .select('brief_kind, subscribed')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error

  const map = new Map<BriefKind, boolean>()
  for (const row of data ?? []) {
    map.set(row.brief_kind as BriefKind, row.subscribed)
  }

  return ALL_BRIEF_KINDS.map((kind) => ({
    brief_kind: kind,
    subscribed: map.get(kind) ?? (kind === 'sweep_summary' ? false : true),
  }))
}
