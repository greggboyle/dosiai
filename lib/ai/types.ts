import type { z } from 'zod'

export interface Citation {
  title?: string
  url: string
}

export interface CompleteInput {
  prompt: string
  responseSchema?: z.ZodType<unknown>
  webSearch?: boolean
  maxTokens?: number
}

export interface CompleteResult {
  content: string
  parsed?: unknown
  usage: { inputTokens: number; outputTokens: number }
  citations?: Citation[]
  rawResponse: unknown
}

export interface EmbedInput {
  input: string | string[]
  model?: string
}

export interface EmbedResult {
  embeddings: number[][]
  usage: { inputTokens: number }
  rawResponse: unknown
}

export interface AiVendorClient {
  complete(input: CompleteInput): Promise<CompleteResult>
  embed(input: EmbedInput): Promise<EmbedResult>
}

export type VendorId = 'openai' | 'anthropic' | 'xai'

export class AiRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiRateLimitError'
  }
}

export class AiVendorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiVendorError'
  }
}
