import type { BattleCardSectionType } from '@/lib/types'

/** Canonical section order: interview wizard + author sidebar + rep view ordering concerns. */
export const BATTLE_SECTION_ORDER: BattleCardSectionType[] = [
  'tldr',
  'why_we_win',
  'objections',
  'trap_setters',
  'why_they_win',
  'proof_points',
  'pricing',
  'talk_tracks',
  'recent_activity',
]

export const BATTLE_SECTION_LABEL: Record<BattleCardSectionType, string> = {
  tldr: 'TL;DR',
  why_we_win: 'Why We Win',
  why_they_win: 'Why They Win',
  objections: 'Top Objections',
  trap_setters: 'Trap-Setting Questions',
  proof_points: 'Proof Points',
  pricing: 'Pricing',
  recent_activity: 'Recent Activity',
  talk_tracks: 'Talk Tracks',
}
