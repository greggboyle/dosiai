import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import type { WorkspacePlan } from '@/lib/types/dosi'

/** One-shot / manual: fills empty published brief summaries with a single-sentence summary. */
export const backfillBriefSummaryBatch = inngest.createFunction(
  { id: 'backfill-brief-summary-batch', retries: 1 },
  { event: 'brief/backfill-summary-batch' },
  async ({ step }) => {
    return step.run('backfill-up-to-10', async () => {
      const supabase = createSupabaseAdminClient()
      const { data: rows, error } = await supabase
        .from('brief')
        .select('id, workspace_id, title, body, summary')
        .eq('status', 'published')
        .order('updated_at', { ascending: true })
        .limit(50)

      if (error) throw error
      const candidates = (rows ?? []).filter((r) => !r.summary?.trim() && r.body?.trim()).slice(0, 10)
      let processed = 0

      for (const row of candidates) {
        const { data: ws, error: wErr } = await supabase
          .from('workspace')
          .select('plan, status')
          .eq('id', row.workspace_id)
          .maybeSingle()
        if (wErr || !ws || ws.status === 'read_only') continue

        const plan = ws.plan as WorkspacePlan
        const budget = await checkCostBudget(row.workspace_id, plan)
        if (!budget.ok) break

        const routing = await getRoutingFor('brief_drafting_all')
        const client = getVendorClient(routing.vendor, routing.model)
        const prompt = `Write exactly one concise sentence (max 220 characters) summarizing this executive brief for a busy reader. Output only the sentence, no quotes.
Title: ${row.title}
---
${row.body.slice(0, 12000)}`

        const started = Date.now()
        const result = await client.complete({ prompt, maxTokens: 200 })
        const summary = result.content?.trim().slice(0, 500) ?? ''
        if (!summary) continue

        const { error: upErr } = await supabase.from('brief').update({ summary }).eq('id', row.id)
        if (upErr) continue

        const latencyMs = Date.now() - started
        const costCents = estimateCallCostCents(
          routing.model,
          result.usage.inputTokens,
          result.usage.outputTokens
        )
        await recordVendorCall(row.workspace_id, plan, {
          purpose: 'brief_drafting_all',
          vendor: routing.vendor,
          model: routing.model,
          promptTemplateId: null,
          promptTemplateVersion: null,
          requestTokens: result.usage.inputTokens,
          responseTokens: result.usage.outputTokens,
          costCents,
          latencyMs,
          success: true,
          citationCount: 0,
          responsePayload: { briefId: row.id, backfillSummary: true },
        })
        processed += 1
      }

      return { processed }
    })
  }
)
