'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/auth/workspace'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import type { JobPostingPayload, JobPostingStatus } from '@/lib/competitors/job-posting-types'

export type UpsertCompetitorJobPostingInput = {
  competitorId: string
  jobUrl: string
  title: string
  postingStatus: JobPostingStatus
  payload: JobPostingPayload
  rawDescription?: string | null
}

export async function upsertCompetitorJobPosting(input: UpsertCompetitorJobPostingInput): Promise<{ id: string }> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) throw new Error('Unauthorized')
  const { competitorId, jobUrl, title, postingStatus, payload, rawDescription } = input
  if (!competitorId || !jobUrl) throw new Error('Missing competitor or job URL')

  return withWorkspace(workspaceId, ['admin', 'analyst'], async () => {
    const supabase = await createSupabaseServerClient()
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
      revalidatePath(`/competitors/${competitorId}`)
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
    revalidatePath(`/competitors/${competitorId}`)
    return { id: data.id }
  })
}
