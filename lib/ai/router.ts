import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AiPurposeDb, AiVendorDb } from '@/lib/supabase/types'
import type { AiRoutingRuleRow } from '@/lib/types/dosi'

type CacheEntry = { loadedAt: number; map: Map<AiPurposeDb, { mode: string; rules: AiRoutingRuleRow[] }> }
let cache: CacheEntry | null = null
const TTL_MS = 60_000

async function loadAllRouting(): Promise<Map<AiPurposeDb, { mode: string; rules: AiRoutingRuleRow[] }>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('ai_routing_config').select('purpose, mode, rules')
  if (error) throw error
  const map = new Map<AiPurposeDb, { mode: string; rules: AiRoutingRuleRow[] }>()
  for (const row of data ?? []) {
    map.set(row.purpose as AiPurposeDb, {
      mode: row.mode,
      rules: (row.rules as unknown as AiRoutingRuleRow[]) ?? [],
    })
  }
  return map
}

/** Invalidate in-process cache (call after operator updates routing). */
export function invalidateRoutingCache() {
  cache = null
}

export interface RoutingSelection {
  vendor: AiVendorDb
  model: string
  mode: 'single-vendor' | 'multi-vendor'
  /** All enabled rules for this purpose (multi-vendor uses each). */
  activeRules: AiRoutingRuleRow[]
}

function routingSelectionFromEntry(entry: {
  mode: string
  rules: AiRoutingRuleRow[]
}): RoutingSelection | null {
  const rules = (entry.rules ?? []).filter((r) => r.isEnabled)
  if (rules.length === 0) return null
  const primary = rules.find((r) => r.isPrimary) ?? rules[0]
  const mode = entry.mode === 'multi-vendor' ? 'multi-vendor' : 'single-vendor'
  const activeRules = mode === 'multi-vendor' ? rules : [primary]
  return {
    vendor: primary.vendor as AiVendorDb,
    model: primary.model,
    mode,
    activeRules,
  }
}

export async function getRoutingFor(purpose: AiPurposeDb): Promise<RoutingSelection> {
  const now = Date.now()
  if (!cache || now - cache.loadedAt > TTL_MS) {
    const map = await loadAllRouting()
    cache = { loadedAt: now, map }
  }
  const entry = cache!.map.get(purpose)
  if (!entry) {
    throw new Error(`No ai_routing_config row for purpose ${purpose}`)
  }
  const sel = routingSelectionFromEntry(entry)
  if (!sel) {
    throw new Error(`No enabled routing rules for ${purpose}`)
  }
  return sel
}
