import { randomUUID } from 'crypto'
import type { AIPurpose, AIVendor } from '@/lib/admin-types'
import { buildPromptTemplateName, getEmbeddedPromptDefault } from '@/lib/admin/prompt-defaults'

/** Per-kind brief prompts — keyed by `BriefKind` via `briefKindToPromptTemplatePurpose`. Not `brief_drafting_all`. */
export const BRIEF_KIND_TEMPLATE_PURPOSES: readonly AIPurpose[] = [
  'brief_drafting_manual',
  'brief_drafting_sweep_summary',
  'brief_drafting_daily_summary',
  'brief_drafting_weekly_intelligence',
  'brief_drafting_regulatory_summary',
  'brief_drafting_competitor',
] as const

export type BriefPromptSeedContext = {
  now: string
  operatorId: string | null
  operatorName: string
}

/**
 * Builds `prompt_template` insert rows for each brief kind purpose × enabled vendor on `brief_drafting_all`,
 * skipping combinations already present in `existing` (mutated when rows are added).
 */
export function buildMissingBriefKindPromptTemplateRows(
  briefDraftingAllRulesJson: unknown,
  existing: Set<string>,
  ctx: BriefPromptSeedContext
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  const rules = Array.isArray(briefDraftingAllRulesJson) ? briefDraftingAllRulesJson : []
  for (const rule of rules) {
    const vendor = (rule as { vendor?: string; isEnabled?: boolean }).vendor as AIVendor | undefined
    const isEnabled = (rule as { isEnabled?: boolean }).isEnabled !== false
    if (!vendor || !isEnabled) continue
    for (const purpose of BRIEF_KIND_TEMPLATE_PURPOSES) {
      const def = getEmbeddedPromptDefault(purpose)
      if (!def) continue
      const key = `${purpose}::${vendor}`
      if (existing.has(key)) continue
      existing.add(key)
      rows.push({
        id: randomUUID(),
        name: buildPromptTemplateName(purpose, vendor),
        purpose,
        vendor,
        status: 'active',
        version: 1,
        content: def.content,
        draft_content: null,
        draft_note: null,
        deployment_history: [
          {
            version: 1,
            deployedAt: ctx.now,
            deployedBy: ctx.operatorName,
            trafficPercent: 100,
            contentSnapshot: def.content,
          },
        ],
        ab_test: null,
        variables: def.variables,
        updated_at: ctx.now,
        updated_by_operator_id: ctx.operatorId,
      })
    }
  }
  return rows
}
