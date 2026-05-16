import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isPostgrestMissingTable } from '@/lib/supabase/postgrest-errors'
import type { BriefReadStatus } from '@/lib/types/dosi'

export type BriefReadStateRow = {
  status: BriefReadStatus
  read_at: string | null
}

/** Load per-user brief read state; prefers `user_record_state`, then `brief_user_state`, then `brief_user_read`. */
export async function fetchBriefReadStates(
  workspaceId: string,
  userId: string,
  briefIds: string[]
): Promise<Map<string, BriefReadStateRow>> {
  const map = new Map<string, BriefReadStateRow>()
  if (briefIds.length === 0) return map

  const supabase = await createSupabaseServerClient()

  const { data: universal, error: uErr } = await supabase
    .from('user_record_state')
    .select('record_id, status, read_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('record_type', 'brief')
    .in('record_id', briefIds)

  if (!uErr) {
    for (const row of universal ?? []) {
      map.set(row.record_id, {
        status: row.status as BriefReadStatus,
        read_at: row.read_at,
      })
    }
    return map
  }

  if (!isPostgrestMissingTable(uErr)) throw uErr

  const { data: legacy, error: lErr } = await supabase
    .from('brief_user_state')
    .select('brief_id, status, read_at')
    .eq('user_id', userId)
    .in('brief_id', briefIds)

  if (!lErr) {
    for (const row of legacy ?? []) {
      map.set(row.brief_id, {
        status: row.status as BriefReadStatus,
        read_at: row.read_at,
      })
    }
    return map
  }

  if (!isPostgrestMissingTable(lErr)) throw lErr

  const { data: readRows, error: rErr } = await supabase
    .from('brief_user_read')
    .select('brief_id, read_at')
    .eq('user_id', userId)
    .in('brief_id', briefIds)

  if (rErr) {
    if (isPostgrestMissingTable(rErr)) return map
    throw rErr
  }

  for (const row of readRows ?? []) {
    map.set(row.brief_id, { status: 'read', read_at: row.read_at })
  }

  return map
}
