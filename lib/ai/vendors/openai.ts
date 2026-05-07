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

export function createOpenAiClient(modelDefault: string): AiVendorClient {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new AiVendorError('OPENAI_API_KEY is not set')
  }
  const client = new OpenAI({ apiKey })

  return {
    async complete(input: CompleteInput): Promise<CompleteResult> {
      const model = modelDefault
      let lastErr: unknown
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await client.responses.create({
            model,
            input: input.prompt,
            max_output_tokens: input.maxTokens ?? 4096,
            ...(input.webSearch ? { tools: [{ type: 'web_search_preview' as const }] } : {}),
          })
          const text = extractResponseText(response as unknown as Record<string, unknown>)
          const usage = (response as unknown as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
          let parsed: unknown
          if (input.responseSchema) {
            const json = parseJsonFromLlmText(text)
            const safe = (input.responseSchema as z.ZodType<unknown>).safeParse(json)
            if (!safe.success) {
              throw new AiVendorError(`OpenAI JSON did not match schema: ${safe.error.message}`)
            }
            parsed = safe.data
          }
          return {
            content: text,
            parsed,
            usage: {
              inputTokens: usage?.input_tokens ?? 0,
              outputTokens: usage?.output_tokens ?? 0,
            },
            rawResponse: response,
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
      throw lastErr instanceof Error ? lastErr : new AiVendorError('OpenAI call failed')
    },

    async embed(input: EmbedInput): Promise<EmbedResult> {
      const model = input.model ?? 'text-embedding-3-small'
      const inputTexts = Array.isArray(input.input) ? input.input : [input.input]
      const res = await client.embeddings.create({
        model,
        input: inputTexts,
      })
      const embeddings = res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding as number[])
      const tokens = res.usage?.total_tokens ?? 0
      return {
        embeddings,
        usage: { inputTokens: tokens },
        rawResponse: res,
      }
    },
  }
}

function extractResponseText(payload: Record<string, unknown>): string {
  const outputText = payload.output_text
  if (typeof outputText === 'string' && outputText.trim()) return outputText

  const output = payload.output
  if (!Array.isArray(output)) return ''
  const chunks: string[] = []
  for (const o of output) {
    if (!o || typeof o !== 'object') continue
    const content = (o as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const c of content) {
      if (!c || typeof c !== 'object') continue
      const text = (c as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) chunks.push(text)
    }
  }
  return chunks.join('\n').trim()
}
