import type { AIPurpose, AIPurposeConfig, AIRoutingRule, AIVendor } from '@/lib/admin-types'

export type AiRoutingDbRow = {
  purpose: string
  mode: string
  rules: unknown
}

export function mergeDbIntoConfigs(seed: AIPurposeConfig[], rows: AiRoutingDbRow[]): AIPurposeConfig[] {
  const byPurpose = new Map(rows.map((r) => [r.purpose, r]))
  return seed.map((cfg) => {
    const row = byPurpose.get(cfg.purpose)
    if (!row) return cfg
    const rules = normalizeRules(cfg.purpose, row.rules)
    return {
      ...cfg,
      mode: row.mode === 'multi-vendor' ? 'multi-vendor' : 'single-vendor',
      rules: rules.length ? rules : cfg.rules,
    }
  })
}

function normalizeRules(purpose: AIPurpose, raw: unknown): AIRoutingRule[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r, i) => {
    const o = r as Record<string, unknown>
    const vendor = o.vendor as AIVendor
    return {
      id: typeof o.id === 'string' ? o.id : `${purpose}-${String(o.vendor)}-${i}`,
      vendor,
      model: String(o.model ?? ''),
      purpose,
      isPrimary: Boolean(o.isPrimary),
      isEnabled: o.isEnabled !== false,
      costPer1MTokens: Number(o.costPer1MTokens ?? 0),
      avgLatencyMs: Number(o.avgLatencyMs ?? 0),
      citationRate: Number(o.citationRate ?? 0),
      factualGroundingScore: Number(o.factualGroundingScore ?? 0),
      notes: String(o.notes ?? ''),
      lastChangedAt: String(o.lastChangedAt ?? new Date().toISOString()),
      lastChangedBy: String(o.lastChangedBy ?? 'system'),
    }
  })
}

/** Persist only fields stored in Postgres JSON (rules column). */
export function serializeRulesForDb(rules: AIRoutingRule[]) {
  return rules.map((r) => ({
    id: r.id,
    vendor: r.vendor,
    model: r.model,
    isPrimary: r.isPrimary,
    isEnabled: r.isEnabled,
    costPer1MTokens: r.costPer1MTokens,
    avgLatencyMs: r.avgLatencyMs,
    citationRate: r.citationRate,
    factualGroundingScore: r.factualGroundingScore,
    notes: r.notes,
    lastChangedAt: r.lastChangedAt,
    lastChangedBy: r.lastChangedBy,
    purpose: r.purpose,
  }))
}
