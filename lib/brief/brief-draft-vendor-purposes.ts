import type { AiPurposeDb } from '@/lib/supabase/types'

/**
 * Historical `vendor_call.purpose` values from before brief drafts used only `brief_drafting_all`.
 * Kept so monthly limits still count older rows.
 */
export const LEGACY_BRIEF_DRAFT_VENDOR_CALL_PURPOSES: readonly AiPurposeDb[] = [
  'brief_drafting_manual',
  'brief_drafting_sweep_summary',
  'brief_drafting_daily_summary',
  'brief_drafting_weekly_intelligence',
  'brief_drafting_regulatory_summary',
  'brief_drafting_competitor',
] as const

/** Purposes counted toward monthly AI brief drafting limits (`brief_drafting_all` + legacy per-kind). */
export const BRIEF_DRAFT_LIMIT_PURPOSES: readonly AiPurposeDb[] = [
  'brief_drafting_all',
  ...LEGACY_BRIEF_DRAFT_VENDOR_CALL_PURPOSES,
] as const
