import { z } from 'zod'

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

export const parsedSweepItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string().optional().default(''),
  fullSummary: z.string().optional(),
  category: z.enum(['buy-side', 'sell-side', 'channel', 'regulatory']),
  subcategory: z.string().optional(),
  fiveWH: fiveWhSchema.optional(),
  sourceUrls: z.array(sourceRefSchema).default([]),
  confidence: z.enum(['low', 'medium', 'high']),
  confidenceReason: z.string(),
  eventAt: z.string().optional(),
  sourceType: z.string().optional(),
  entitiesMentioned: z
    .array(z.object({ name: z.string(), role: z.string().optional() }))
    .optional(),
  relatedCompetitorNames: z.array(z.string()).optional(),
})

export const sweepAiResponseSchema = z.object({
  items: z.array(parsedSweepItemSchema),
})

export type ParsedSweepItem = z.infer<typeof parsedSweepItemSchema>
