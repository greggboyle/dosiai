import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import type { UpsertCompetitorJobPostingInput } from '@/lib/competitors/job-postings-actions'

/**
 * Admin upsert for `competitor_job_posting` (no session). Same merge rules as
 * {@link upsertCompetitorJobPosting}: preserve `first_seen_at` on update; bump `last_seen_at`.
 */
export async function upsertCompetitorJobPostingAdmin(
  workspaceId: string,
  input: UpsertCompetitorJobPostingInput
): Promise<{ id: string }> {
  const { competitorId, jobUrl, title, postingStatus, payload, rawDescription } = input
  if (!workspaceId || !competitorId || !jobUrl) throw new Error('Missing workspace, competitor, or job URL')

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data: existing, error: findErr } = await supabase
    .from('competitor_job_posting')
    .select('id,first_seen_at')
    .eq('workspace_id', workspaceId)
    .eq('competitor_id', competitorId)
    .eq('job_url', jobUrl)
    .maybeSingle()
  if (findErr) throw findErr

  if (existing) {
    const { data, error } = await supabase
      .from('competitor_job_posting')
      .update({
        title,
        posting_status: postingStatus,
        payload: payload as Json,
        raw_description: rawDescription ?? null,
        last_seen_at: now,
      })
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    return { id: data.id }
  }

  const { data, error } = await supabase
    .from('competitor_job_posting')
    .insert({
      workspace_id: workspaceId,
      competitor_id: competitorId,
      job_url: jobUrl,
      title,
      posting_status: postingStatus,
      payload: payload as Json,
      raw_description: rawDescription ?? null,
      first_seen_at: now,
      last_seen_at: now,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id }
}
