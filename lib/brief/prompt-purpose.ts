import type { AiPurposeDb } from '@/lib/supabase/types'
import type { BriefKind } from '@/lib/types'

export function briefKindToPromptPurpose(kind: BriefKind): AiPurposeDb {
  switch (kind) {
    case 'manual':
      return 'brief_drafting_manual'
    case 'sweep_summary':
      return 'brief_drafting_sweep_summary'
    case 'daily_summary':
      return 'brief_drafting_daily_summary'
    case 'weekly_intelligence':
      return 'brief_drafting_weekly_intelligence'
    case 'regulatory_summary':
      return 'brief_drafting_regulatory_summary'
    case 'competitor':
      return 'brief_drafting_competitor'
    default:
      return 'brief_drafting_manual'
  }
}
