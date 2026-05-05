import Anthropic from '@anthropic-ai/sdk'
import type { z } from 'zod'
import type { AiVendorClient, CompleteInput, CompleteResult, EmbedInput, EmbedResult } from '@/lib/ai/types'
import { AiRateLimitError, AiVendorError } from '@/lib/ai/types'

const MAX_RETRIES = 4
const BASE_MS = 500

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function createAnthropicClient(modelDefault: string): AiVendorClient {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AiVendorError('ANTHROPIC_API_KEY is not set')
  }
  const client = new Anthropic({ apiKey })

  return {
    async complete(input: CompleteInput): Promise<CompleteResult> {
      const model = modelDefault
      let lastErr: unknown
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const msg = await client.messages.create({
            model,
            max_tokens: input.maxTokens ?? 4096,
            messages: [{ role: 'user', content: input.prompt }],
          })
          const textBlock = msg.content.find((b) => b.type === 'text')
          const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
          let parsed: unknown
          if (input.responseSchema) {
            const json = JSON.parse(text)
            const safe = (input.responseSchema as z.ZodType<unknown>).safeParse(json)
            if (!safe.success) {
              throw new AiVendorError(`Anthropic JSON did not match schema: ${safe.error.message}`)
            }
            parsed = safe.data
          }
          const inTok = msg.usage.input_tokens
          const outTok = msg.usage.output_tokens
          return {
            content: text,
            parsed,
            usage: { inputTokens: inTok, outputTokens: outTok },
            rawResponse: msg,
          }
        } catch (e: unknown) {
          lastErr = e
          const msg = e instanceof Error ? e.message : String(e)
          if (/rate limit|429|529|timeout/i.test(msg) && attempt < MAX_RETRIES - 1) {
            await sleep(BASE_MS * 2 ** attempt)
            continue
          }
          if (/rate limit|429/i.test(msg)) throw new AiRateLimitError(msg)
          if (e instanceof AiVendorError || e instanceof AiRateLimitError) throw e
          throw new AiVendorError(msg)
        }
      }
      throw lastErr instanceof Error ? lastErr : new AiVendorError('Anthropic call failed')
    },

    async embed(_input: EmbedInput): Promise<EmbedResult> {
      throw new AiVendorError('Anthropic embeddings not used in DOSI routing; use OpenAI for embedding purpose')
    },
  }
}
