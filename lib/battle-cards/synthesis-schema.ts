import { z } from 'zod'
import type { BattleCardSectionType } from '@/lib/types'
import {
  bulletListSchema,
  objectionsContentSchema,
  pricingContentSchema,
  proofPointsContentSchema,
  recentActivityContentSchema,
  talkTracksContentSchema,
  trapSettersContentSchema,
  tldrContentSchema,
} from '@/lib/battle-cards/section-json'

export function synthesisResponseSchema(type: BattleCardSectionType): z.ZodType<unknown> {
  switch (type) {
    case 'tldr':
      return tldrContentSchema
    case 'why_we_win':
    case 'why_they_win':
      return bulletListSchema
    case 'objections':
      return objectionsContentSchema
    case 'trap_setters':
      return trapSettersContentSchema
    case 'proof_points':
      return proofPointsContentSchema
    case 'pricing':
      return pricingContentSchema
    case 'recent_activity':
      return recentActivityContentSchema
    case 'talk_tracks':
      return talkTracksContentSchema
    default:
      return z.object({}).passthrough()
  }
}
