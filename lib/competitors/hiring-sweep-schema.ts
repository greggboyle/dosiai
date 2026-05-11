import { z } from 'zod'

const postingStatusSchema = z.enum(['open', 'closed', 'unknown'])

/** One job row from the hiring sweep LLM (web search). */
export const hiringSweepJobItemSchema = z.object({
  job_url: z.string().min(1),
  title: z.string().min(1),
  status: postingStatusSchema.optional(),
  raw_description: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  function: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  location_raw: z.string().nullable().optional(),
  date_posted: z.string().nullable().optional(),
})

export const hiringSweepAiResponseSchema = z.object({
  jobs: z.array(hiringSweepJobItemSchema),
})

export type HiringSweepJobItem = z.infer<typeof hiringSweepJobItemSchema>
export type HiringSweepAiResponse = z.infer<typeof hiringSweepAiResponseSchema>
