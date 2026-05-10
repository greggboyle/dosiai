import type { BriefKind } from '@/lib/types'

/** Single source of truth for brief kind iteration (order matches product). */
export const BRIEF_KINDS: readonly BriefKind[] = [
  'manual',
  'sweep_summary',
  'daily_summary',
  'weekly_intelligence',
  'regulatory_summary',
  'competitor',
] as const
