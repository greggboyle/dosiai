import type { BattleCardSectionType } from '@/lib/types'

type SectionRow = {
  section_type: BattleCardSectionType
  last_reviewed_at: string | null
  feedback_count: number
  gap_count: number
}

/** Heuristic 0–100 freshness: newer reviews and fewer gaps score higher. */
export function computeFreshnessScore(args: {
  sections: SectionRow[]
  recentFeedItemCount?: number
}): number {
  const { sections, recentFeedItemCount = 0 } = args
  if (!sections.length) return 50

  let score = 70
  const now = Date.now()
  for (const s of sections) {
    if (s.section_type === 'recent_activity') continue
    if (!s.last_reviewed_at) {
      score -= 8
      continue
    }
    const ageDays = (now - new Date(s.last_reviewed_at).getTime()) / (86400 * 1000)
    if (ageDays > 90) score -= 12
    else if (ageDays > 30) score -= 6
    score -= Math.min(15, s.gap_count * 3)
  }

  if (recentFeedItemCount > 10) score -= 5
  return Math.max(0, Math.min(100, Math.round(score)))
}
