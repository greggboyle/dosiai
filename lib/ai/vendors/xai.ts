import OpenAI from 'openai'
import type { z } from 'zod'
import { parseJsonFromLlmText } from '@/lib/ai/parse-model-json'
import type { AiVendorClient, CompleteInput, CompleteResult, EmbedInput, EmbedResult } from '@/lib/ai/types'
import { AiRateLimitError, AiVendorError } from '@/lib/ai/types'

const MAX_RETRIES = 4
const BASE_MS = 400

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** xAI exposes an OpenAI-compatible HTTP API. */
export function createXaiClient(modelDefault: string): AiVendorClient {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    throw new AiVendorError('XAI_API_KEY is not set')
  }
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
  })

  return {
    async complete(input: CompleteInput): Promise<CompleteResult> {
      const model = modelDefault
      let lastErr: unknown
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const completion = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: input.prompt }],
            max_tokens: input.maxTokens ?? 4096,
            ...(input.responseSchema ? { response_format: { type: 'json_object' as const } } : {}),
          })
          const text = completion.choices[0]?.message?.content ?? ''
          const usage = completion.usage
          let parsed: unknown
          if (input.responseSchema) {
            const json = parseJsonFromLlmText(text)
            const safe = (input.responseSchema as z.ZodType<unknown>).safeParse(json)
            if (!safe.success) {
              throw new AiVendorError(`xAI JSON did not match schema: ${safe.error.message}`)
            }
            parsed = safe.data
          }
          return {
            content: text,
            parsed,
            usage: {
              inputTokens: usage?.prompt_tokens ?? 0,
              outputTokens: usage?.completion_tokens ?? 0,
            },
            rawResponse: completion,
          }
        } catch (e: unknown) {
          lastErr = e
          const msg = e instanceof Error ? e.message : String(e)
          if (/rate limit|429|timeout/i.test(msg) && attempt < MAX_RETRIES - 1) {
            await sleep(BASE_MS * 2 ** attempt)
            continue
          }
          if (/rate limit|429/i.test(msg)) throw new AiRateLimitError(msg)
          if (e instanceof AiVendorError || e instanceof AiRateLimitError) throw e
          throw new AiVendorError(msg)
        }
      }
      throw lastErr instanceof Error ? lastErr : new AiVendorError('xAI call failed')
    },

    async embed(_input: EmbedInput): Promise<EmbedResult> {
      throw new AiVendorError('xAI embeddings not configured; use OpenAI for embedding purpose')
    },
  }
}
