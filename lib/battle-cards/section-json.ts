import { z } from 'zod'
import type { BattleCardSectionType } from '@/lib/types'

/** DB `battle_card_section.content` shapes by section_type. */
export const tldrContentSchema = z.object({
  theyPosition: z.string(),
  weCounter: z.string(),
  remember: z.string(),
})

export const bulletListSchema = z.object({
  bullets: z.array(z.object({ text: z.string(), evidenceItemId: z.string().optional() })),
})

export const objectionsContentSchema = z.object({
  pairs: z.array(z.object({ objection: z.string(), response: z.string() })),
})

export const trapSettersContentSchema = z.object({
  questions: z.array(z.string()),
})

export const proofPointsContentSchema = z.object({
  points: z.array(
    z.object({
      headline: z.string(),
      detail: z.string().optional(),
      customer: z.string().optional(),
      quote: z.string().optional(),
    })
  ),
})

export const pricingContentSchema = z.object({
  theirs: z.string(),
  ours: z.string(),
})

export const recentActivityContentSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      title: z.string(),
      ingestedAt: z.string().optional(),
      miScore: z.number().optional(),
    })
  ),
})

export const talkTracksContentSchema = z.object({
  tracks: z.array(z.object({ scenario: z.string(), content: z.string() })),
})

export function defaultSectionContent(type: BattleCardSectionType): unknown {
  switch (type) {
    case 'tldr':
      return { theyPosition: '', weCounter: '', remember: '' }
    case 'why_we_win':
    case 'why_they_win':
      return { bullets: [] }
    case 'objections':
      return { pairs: [] }
    case 'trap_setters':
      return { questions: [] }
    case 'proof_points':
      return { points: [] }
    case 'pricing':
      return { theirs: '', ours: '' }
    case 'recent_activity':
      return { items: [] }
    case 'talk_tracks':
      return { tracks: [] }
    default:
      return {}
  }
}

export function parseSectionContent(type: BattleCardSectionType, raw: unknown): unknown {
  const fallback = defaultSectionContent(type)
  if (raw === null || raw === undefined) return fallback
  try {
    switch (type) {
      case 'tldr':
        return tldrContentSchema.parse(raw)
      case 'why_we_win':
      case 'why_they_win':
        return bulletListSchema.parse(raw)
      case 'objections':
        return objectionsContentSchema.parse(raw)
      case 'trap_setters':
        return trapSettersContentSchema.parse(raw)
      case 'proof_points':
        return proofPointsContentSchema.parse(raw)
      case 'pricing':
        return pricingContentSchema.parse(raw)
      case 'recent_activity':
        return recentActivityContentSchema.parse(raw)
      case 'talk_tracks':
        return talkTracksContentSchema.parse(raw)
      default:
        return fallback
    }
  } catch {
    return fallback
  }
}
