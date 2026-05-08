import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CreateEmptyBriefDraftResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unauthorized' | 'no_workspace' | 'forbidden' | 'read_only' | 'insert_failed'; message?: string }

/**
 * Creates an empty draft brief for the current session (Server Component / Route Handler safe).
 * Avoids calling a `"use server"` entry point from RSC for `/briefs/new`.
 */
export async function createEmptyBriefDraftForSession(): Promise<CreateEmptyBriefDraftResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, reason: 'unauthorized' }

  const { data: member, error: mErr } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (mErr || !member) return { ok: false, reason: 'no_workspace' }
  if (member.role === 'viewer') return { ok: false, reason: 'forbidden' }

  const { data: ws, error: wErr } = await supabase
    .from('workspace')
    .select('status')
    .eq('id', member.workspace_id)
    .single()

  if (wErr || !ws) return { ok: false, reason: 'insert_failed', message: 'Workspace not found' }
  if (ws.status === 'read_only') return { ok: false, reason: 'read_only' }

  const { data, error } = await supabase
    .from('brief')
    .insert({
      workspace_id: member.workspace_id,
      author_id: user.id,
      title: 'Untitled brief',
      summary: '',
      body: '',
      word_count: 0,
      audience: 'general',
      priority: 'medium',
      status: 'draft',
      ai_drafted: false,
      human_reviewed: false,
      linked_item_ids: [],
      linked_topic_ids: [],
      linked_competitor_ids: [],
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, reason: 'insert_failed', message: error?.message }
  }

  return { ok: true, id: data.id }
}
