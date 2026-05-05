import { z } from 'zod'

/** Structured response from brief_drafting vendor call. */
export const briefDraftResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
})

export type BriefDraftResponse = z.infer<typeof briefDraftResponseSchema>
