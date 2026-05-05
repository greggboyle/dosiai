import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Topic } from '@/lib/types'

export async function listTopicsForWorkspace(workspaceId: string): Promise<Topic[]> {
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('topic')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) throw error
  if (!rows?.length) return []

  const allRelated = new Set<string>()
  for (const r of rows) {
    for (const id of r.related_topic_ids ?? []) allRelated.add(id)
  }

  const idSet = new Set(rows.map((r) => r.id))
  const missing = [...allRelated].filter((id) => !idSet.has(id))
  const extra =
    missing.length > 0
      ? await supabase.from('topic').select('id,name').eq('workspace_id', workspaceId).in('id', missing)
      : { data: [] as { id: string; name: string }[] }

  const nameById = Object.fromEntries(rows.map((r) => [r.id, r.name]))
  for (const r of extra.data ?? []) nameById[r.id] = r.name

  return rows.map((r) => {
    const relatedIds = r.related_topic_ids ?? []
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      importance: r.importance,
      searchSeeds: r.search_seeds ?? [],
      itemCountLast7Days: 0,
      itemCountLast7DaysChange: 0,
      itemCountLast30Days: 0,
      itemCountLast30DaysChange: 0,
      linkedCompetitorIds: [],
      linkedCompetitorNames: [],
      relatedTopicIds: relatedIds,
      relatedTopicNames: relatedIds.map((id) => nameById[id]).filter(Boolean),
      createdAt: r.created_at,
      updatedAt: r.created_at,
      status: r.status,
    }
  })
}
