import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/** Keeps only intelligence rows produced by the dedicated sweep_regulatory pass (see orchestrator). */
export async function filterItemIdsToSweepRegulatoryOnly(
  workspaceId: string,
  itemIds: string[]
): Promise<string[]> {
  if (itemIds.length === 0) return []

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('intelligence_item')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', itemIds)
    .eq('ingestion_purpose', 'sweep_regulatory')

  if (error) throw error
  return (data ?? []).map((r) => r.id)
}
