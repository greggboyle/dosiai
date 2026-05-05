import { createSupabaseServerClient } from '@/lib/supabase/server'
import { intelligenceItemFromDb } from '@/lib/intelligence/map-row'
import type { IntelligenceItem, ReviewMetadata, Sentiment } from '@/lib/types'

export type CustomerVoiceFilters = {
  subjectId?: string | 'all' | 'our-company'
  sentiment?: Sentiment | 'all'
  platform?: ReviewMetadata['platform'] | 'all'
  /** ISO strings */
  from?: string
  to?: string
  sort?: 'recency' | 'mis_desc'
}

function itemHasReviews(row: { review_metadata: unknown }) {
  return row.review_metadata !== null && row.review_metadata !== undefined && typeof row.review_metadata === 'object'
}

export async function listCustomerVoiceItems(
  workspaceId: string,
  filters: CustomerVoiceFilters = {}
): Promise<IntelligenceItem[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from('intelligence_item')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('visibility', 'feed')
    .eq('category', 'buy-side')
    .not('review_metadata', 'is', null)

  const fromIso = filters.from
  const toIso = filters.to
  if (fromIso) q = q.gte('ingested_at', fromIso)
  if (toIso) q = q.lte('ingested_at', toIso)

  if (filters.sort === 'mis_desc') q = q.order('mi_score', { ascending: false })
  else q = q.order('ingested_at', { ascending: false })

  const limit = 200
  const { data: rows, error } = await q.limit(limit)

  if (error) throw error
  let items = (rows ?? [])
    .filter((r) => itemHasReviews(r))
    .map((r) => intelligenceItemFromDb(r))

  const platform = filters.platform
  const sentiment = filters.sentiment
  const subjectId = filters.subjectId

  if (platform && platform !== 'all') {
    items = items.filter((i) => i.reviewMetadata?.platform === platform)
  }
  if (sentiment && sentiment !== 'all') {
    items = items.filter((i) => i.reviewMetadata?.sentiment === sentiment)
  }
  if (subjectId && subjectId !== 'all') {
    items = items.filter((i) => i.reviewMetadata?.subjectId === subjectId)
  }

  return items
}

export type SubjectSummary = {
  positive: number
  negative: number
  neutral: number
  mixed: number
  total: number
  netScore: number
  themes: Map<string, number>
}

/** Single-subject rollup for header summary (prior period compares same-length window ending at `priorTo`). */
export function summarizeSubjects(
  items: IntelligenceItem[],
  subjectId?: string | 'all' | 'our-company'
): SubjectSummary | null {
  const filtered =
    subjectId && subjectId !== 'all'
      ? items.filter((i) => i.reviewMetadata?.subjectId === subjectId)
      : items

  if (!filtered.length) return null

  let positive = 0
  let negative = 0
  let neutral = 0
  let mixed = 0
  const themes = new Map<string, number>()

  for (const i of filtered) {
    const s = i.reviewMetadata?.sentiment
    if (s === 'positive') positive += 1
    else if (s === 'negative') negative += 1
    else if (s === 'mixed') mixed += 1
    else neutral += 1

    for (const t of i.reviewMetadata?.themes ?? []) {
      themes.set(t, (themes.get(t) ?? 0) + 1)
    }
  }

  const total = positive + negative + neutral + mixed
  const netScore = total ? Math.round(((positive - negative) / total) * 100) : 0

  return { positive, negative, neutral, mixed, total, netScore, themes }
}
