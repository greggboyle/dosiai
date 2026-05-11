import type { AiPurposeDb } from '@/lib/supabase/types'

/** Purposes the sweep orchestrator may run (subset or full). Excludes deprecated `sweep_umbrella`. */
export const SWEEP_ORCHESTRATION_PURPOSES: readonly AiPurposeDb[] = [
  'sweep_buy',
  'sweep_sell',
  'sweep_channel',
  'sweep_regulatory',
  'sweep_topic',
  'sweep_self',
]

export function resolveOrchestrationPurposes(
  requested: readonly AiPurposeDb[] | undefined
): AiPurposeDb[] {
  const allow = new Set(SWEEP_ORCHESTRATION_PURPOSES)
  if (!requested?.length) return [...SWEEP_ORCHESTRATION_PURPOSES]
  const out: AiPurposeDb[] = []
  for (const p of requested) {
    if (p === 'sweep_umbrella') {
      throw new Error(
        'sweep_umbrella is deprecated; use sweep_buy, sweep_sell, sweep_channel, sweep_regulatory, sweep_topic, or sweep_self'
      )
    }
    if (allow.has(p) && !out.includes(p)) out.push(p)
  }
  return out.length > 0 ? out : [...SWEEP_ORCHESTRATION_PURPOSES]
}

export const SWEEP_ORCHESTRATION_PURPOSE_LABELS: Record<(typeof SWEEP_ORCHESTRATION_PURPOSES)[number], string> = {
  sweep_buy: 'Buy-side',
  sweep_sell: 'Sell-side',
  sweep_channel: 'Channel',
  sweep_regulatory: 'Regulatory',
  sweep_topic: 'Topics',
  sweep_self: 'Own company',
}
