import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { CompetitorHiringRollup, CompetitorJobPosting, JobPostingPayload } from './job-posting-types'

type JobRow = Database['public']['Tables']['competitor_job_posting']['Row']

const SENIOR_LEVELS = new Set(['senior', 'lead', 'manager', 'director', 'vp', 'c_level'])

export function jobPostingFromRow(row: JobRow): CompetitorJobPosting {
  const payload = (row.payload ?? {}) as JobPostingPayload
  return {
    id: row.id,
    jobUrl: row.job_url,
    title: row.title || (typeof payload.title === 'string' ? payload.title : '') || 'Untitled role',
    postingStatus: row.posting_status,
    payload,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }
}

export async function listJobPostingsForCompetitor(
  workspaceId: string,
  competitorId: string,
  opts?: { limit?: number; days?: number }
): Promise<CompetitorJobPosting[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500)
  const days = opts?.days ?? 365
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from('competitor_job_posting')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('competitor_id', competitorId)
    .gte('last_seen_at', since)
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (rows ?? []).map((r) => jobPostingFromRow(r as JobRow))
}

function seniorityFromPosting(p: CompetitorJobPosting): string {
  const raw = p.payload.seniority
  return (raw ?? 'unknown').toLowerCase()
}

export function computeHiringRollup(postings: CompetitorJobPosting[]): CompetitorHiringRollup {
  const now = Date.now()
  const d30 = now - 30 * 86400000
  const d60 = now - 60 * 86400000

  let openCount = 0
  let newOpensLast30d = 0
  let newOpensPrior30d = 0
  let watchlistOpenCount = 0
  let highThreatOpenCount = 0
  let seniorOpen = 0

  for (const p of postings) {
    if (p.postingStatus !== 'open') continue
    openCount++
    const first = new Date(p.firstSeenAt).getTime()
    if (first >= d30) newOpensLast30d++
    else if (first >= d60 && first < d30) newOpensPrior30d++

    const ca = p.payload.competitive_analysis
    if (ca?.watchlist) watchlistOpenCount++
    if (ca?.threat_level === 'high') highThreatOpenCount++

    if (SENIOR_LEVELS.has(seniorityFromPosting(p))) seniorOpen++
  }

  return {
    openCount,
    newOpensLast30d,
    newOpensPrior30d,
    watchlistOpenCount,
    highThreatOpenCount,
    seniorPlusOpenShare: openCount ? Math.round((seniorOpen / openCount) * 100) : 0,
  }
}
