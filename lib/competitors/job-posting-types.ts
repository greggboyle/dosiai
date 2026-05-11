/** Client-safe row for competitor job postings (payload shape is enriched at ingestion). */

export type JobPostingStatus = 'open' | 'closed' | 'unknown'

export type JobPostingPayload = {
  company?: string
  title?: string
  job_url?: string
  status?: JobPostingStatus
  department?: string | null
  function?: string | null
  seniority?: string | null
  employment_type?: string | null
  location?: {
    raw?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    workplace_type?: string | null
  }
  date_posted?: string | null
  date_scraped?: string | null
  source?: string | null
  compensation?: {
    salary_min?: number | null
    salary_max?: number | null
    currency?: string | null
    raw_text?: string | null
    salary_period?: string | null
  }
  strategic_metadata?: Record<string, unknown>
  competitive_analysis?: {
    inferred_priority?: string | null
    roadmap_signal?: string | null
    gtm_signal?: string | null
    operational_maturity_signal?: string | null
    threat_level?: 'low' | 'medium' | 'high' | 'unknown' | null
    threat_rationale?: string | null
    watchlist?: boolean
  }
  evidence?: Array<{ claim: string; source_text: string; source_url?: string | null }>
}

export type CompetitorJobPosting = {
  id: string
  jobUrl: string
  title: string
  postingStatus: JobPostingStatus
  payload: JobPostingPayload
  firstSeenAt: string
  lastSeenAt: string
}

export type CompetitorHiringRollup = {
  openCount: number
  newOpensLast30d: number
  newOpensPrior30d: number
  watchlistOpenCount: number
  highThreatOpenCount: number
  seniorPlusOpenShare: number
}
