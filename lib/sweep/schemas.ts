import { z } from 'zod'

export const SWEEP_CATEGORY_VALUES = ['buy-side', 'sell-side', 'channel', 'regulatory'] as const

export type SweepCategoryValue = (typeof SWEEP_CATEGORY_VALUES)[number]

/** Maps vendor JSON to one of four feed categories — models often emit synonyms or hyphenated misc labels. */
export function normalizeSweepCategory(raw: unknown, fallback: SweepCategoryValue = 'buy-side'): SweepCategoryValue {
  if (raw == null || raw === '') return fallback

  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

  if ((SWEEP_CATEGORY_VALUES as readonly string[]).includes(s)) {
    return s as SweepCategoryValue
  }

  const aliases: Record<string, SweepCategoryValue> = {
    buy: 'buy-side',
    sell: 'sell-side',
    channel: 'channel',
    regulatory: 'regulatory',
    'buy_side': 'buy-side',
    'sell_side': 'sell-side',
    'competitive-intelligence': 'buy-side',
    'competitive_intelligence': 'buy-side',
    intelligence: 'buy-side',
    'market-intelligence': 'buy-side',
    industry: 'channel',
    partner: 'channel',
    alliances: 'channel',
    ecosystem: 'channel',
    compliance: 'regulatory',
    legal: 'regulatory',
    policy: 'regulatory',
  }

  const compact = s.replace(/_/g, '-')
  if (aliases[compact]) return aliases[compact]

  if (/regul|complian|policy|legal/.test(compact)) return 'regulatory'
  if (/channel|partner|reseller|distribution|ecosystem/.test(compact)) return 'channel'
  if (/sell|vendor-selection|evaluation|rfp|pricing/.test(compact)) return 'sell-side'
  if (/buy|procurement|competitive|intel|market|strategy/.test(compact)) return 'buy-side'

  return fallback
}

export const sweepCategorySchema = z
  .union([z.enum(SWEEP_CATEGORY_VALUES), z.string(), z.number()])
  .transform((v) => normalizeSweepCategory(v, 'buy-side'))

export const sourceRefSchema = z.object({
  name: z.string(),
  url: z.string(),
  domain: z.string(),
  isPrimary: z.boolean().optional(),
})

export const fiveWhSchema = z.object({
  who: z.string().optional(),
  what: z.string().optional(),
  when: z.string().optional(),
  where: z.string().optional(),
  why: z.string().optional(),
  how: z.string().optional(),
})

/** Vendors sometimes return fiveWH as a plain string or JSON string instead of an object. */
function preprocessFiveWh(raw: unknown): unknown {
  if (raw == null || raw === '') return undefined
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return undefined
    try {
      const o: unknown = JSON.parse(t)
      if (o !== null && typeof o === 'object' && !Array.isArray(o)) return o
    } catch {
      /* treat as prose */
    }
    return { what: t }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  return undefined
}

export const fiveWhFieldSchema = z.preprocess(preprocessFiveWh, fiveWhSchema.optional())

export const parsedSweepItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string().optional().default(''),
  fullSummary: z.string().optional(),
  category: sweepCategorySchema,
  subcategory: z.string().optional(),
  fiveWH: fiveWhFieldSchema.optional(),
  sourceUrls: z.array(sourceRefSchema).default([]),
  confidence: z.enum(['low', 'medium', 'high']),
  confidenceReason: z.string(),
  eventAt: z.string().optional(),
  sourceType: z.string().optional(),
  entitiesMentioned: z
    .array(z.object({ name: z.string(), role: z.string().optional() }))
    .optional(),
  relatedCompetitorNames: z.array(z.string()).optional(),
  reviewMetadata: z
    .object({
      platform: z.string().optional(),
      rating: z.number().optional(),
      sentiment: z.enum(['positive', 'negative', 'mixed', 'neutral']).optional(),
      reviewerRole: z.string().optional(),
      excerpt: z.string().optional(),
    })
    .optional(),
})

export const sweepAiResponseSchema = z.object({
  items: z.array(parsedSweepItemSchema),
})

export type ParsedSweepItem = z.infer<typeof parsedSweepItemSchema>
