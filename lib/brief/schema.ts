import { z } from 'zod'

/** Structured response from brief drafting vendor calls (per-kind `brief_drafting_*`). */
export const briefDraftResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  body: z.string(),
})

export type BriefDraftResponse = z.infer<typeof briefDraftResponseSchema>
