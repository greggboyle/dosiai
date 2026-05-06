/**
 * Approximate USD per 1M tokens (input/output) for cost_cents estimation.
 * Adjust as provider pricing changes.
 */
const TABLE: Record<string, { inPerM: number; outPerM: number }> = {
  'gpt-4o': { inPerM: 2.5, outPerM: 10 },
  'gpt-4.1-mini': { inPerM: 0.4, outPerM: 1.6 },
  'gpt-4o-mini': { inPerM: 0.15, outPerM: 0.6 },
  'gpt-4-turbo': { inPerM: 10, outPerM: 30 },
  'text-embedding-3-small': { inPerM: 0.02, outPerM: 0 },
  'text-embedding-3-large': { inPerM: 0.13, outPerM: 0 },
  'claude-opus-4-7': { inPerM: 15, outPerM: 75 },
  'claude-sonnet-4-5': { inPerM: 3, outPerM: 15 },
  'claude-haiku-3-5': { inPerM: 0.8, outPerM: 4 },
  'grok-4': { inPerM: 3, outPerM: 15 },
  'grok-3-mini': { inPerM: 0.3, outPerM: 0.5 },
}

export function pricePerMillionTokens(
  model: string,
  direction: 'input' | 'output'
): number {
  const row = TABLE[model] ?? { inPerM: 3, outPerM: 15 }
  return direction === 'input' ? row.inPerM : row.outPerM
}

/** Returns integer cents for a completed call. */
export function estimateCallCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const inputUsd =
    (inputTokens / 1_000_000) * pricePerMillionTokens(model, 'input')
  const outputUsd =
    (outputTokens / 1_000_000) * pricePerMillionTokens(model, 'output')
  return Math.max(0, Math.round((inputUsd + outputUsd) * 100))
}
