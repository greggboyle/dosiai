import type { AiVendorClient } from '@/lib/ai/types'
import type { AiVendorDb } from '@/lib/supabase/types'
import { createAnthropicClient } from '@/lib/ai/vendors/anthropic'
import { createOpenAiClient } from '@/lib/ai/vendors/openai'
import { createXaiClient } from '@/lib/ai/vendors/xai'

const clientCache = new Map<string, AiVendorClient>()

export function getVendorClient(vendor: AiVendorDb, model: string): AiVendorClient {
  const key = `${vendor}:${model}`
  const existing = clientCache.get(key)
  if (existing) return existing
  let c: AiVendorClient
  switch (vendor) {
    case 'openai':
      c = createOpenAiClient(model)
      break
    case 'anthropic':
      c = createAnthropicClient(model)
      break
    case 'xai':
      c = createXaiClient(model)
      break
    default: {
      const x: never = vendor
      throw new Error(`Unknown vendor ${x}`)
    }
  }
  clientCache.set(key, c)
  return c
}
