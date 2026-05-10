import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { Brief } from '@/lib/types'

type BriefRow = Database['public']['Tables']['brief']['Row']

export function countWords(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length
}

export function briefRowToBrief(row: BriefRow, authorLabel: string): Brief {
  return {
    id: row.id,
    title: row.title,
    briefKind: row.brief_kind,
    audience: row.audience,
    priority: row.priority,
    summary: row.summary,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
    wordCount: row.word_count,
    author: { id: row.author_id, name: authorLabel },
    linkedItemIds: row.linked_item_ids ?? [],
    status: row.status,
    aiDrafted: row.ai_drafted,
    humanReviewed: row.human_reviewed,
  }
}

export async function getBriefById(briefId: string): Promise<BriefRow | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('brief').select('*').eq('id', briefId).maybeSingle()
  if (error) throw error
  return data
}

export async function listBriefsForWorkspace(workspaceId: string): Promise<BriefRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('brief')
    .select('*')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
