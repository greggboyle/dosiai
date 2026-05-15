import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { recomputeBriefCachedScopeLabel } from '@/lib/brief/scope-label'

/** Refreshes `cached_scope_label` after brief content/structure changes (non-blocking errors). */
export async function recomputeBriefScopeAfterWrite(briefId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: row } = await supabase.from('brief').select('*').eq('id', briefId).maybeSingle()
    if (!row) return
    const { data: ws } = await supabase
      .from('workspace')
      .select('review_queue_threshold')
      .eq('id', row.workspace_id)
      .maybeSingle()
    await recomputeBriefCachedScopeLabel(
      supabase,
      row.workspace_id,
      ws?.review_queue_threshold ?? 30,
      row
    )
  } catch {
    // best-effort
  }
}

export async function recomputeBriefScopeAfterWriteAdmin(briefId: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: row } = await supabase.from('brief').select('*').eq('id', briefId).maybeSingle()
    if (!row) return
    const { data: ws } = await supabase
      .from('workspace')
      .select('review_queue_threshold')
      .eq('id', row.workspace_id)
      .maybeSingle()
    await recomputeBriefCachedScopeLabel(
      supabase,
      row.workspace_id,
      ws?.review_queue_threshold ?? 30,
      row
    )
  } catch {
    // best-effort
  }
}
