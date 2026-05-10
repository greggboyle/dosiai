import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget, recordVendorCall } from '@/lib/ai/cost'
import { estimateCallCostCents } from '@/lib/ai/pricing'
import { getRoutingFor } from '@/lib/ai/router'
import { getVendorClient } from '@/lib/ai/factory'
import { getActivePromptTemplateFor, renderPromptTemplate } from '@/lib/ai/prompt-template'
import { briefDraftResponseSchema } from '@/lib/brief/schema'
import { buildBriefDraftPromptVariables, getBriefDraftPromptTemplateForKind } from '@/lib/brief/draft-prompt'
import { countWords } from '@/lib/brief/queries'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { notifyBriefSubscribersOfPublish } from '@/lib/notifications/brief-published'
import { filterItemIdsToSweepRegulatoryOnly } from '@/lib/brief/regulatory-items'
import { briefKindToPromptPurpose } from '@/lib/brief/prompt-purpose'

export const draftBrief = inngest.createFunction(
  { id: 'draft-brief', retries: 2 },
  { event: 'brief/draft-requested' },
  async ({ event, step }) => {
    const { briefId, workspaceId, itemIds, audienceHint, autoPublish } = event.data as {
      briefId: string
      workspaceId: string
      itemIds: string[]
      audienceHint?: string
      autoPublish?: boolean
    }

    return step.run('generate-brief-draft', async () => {
      const supabase = createSupabaseAdminClient()

      const { data: workspace, error: wsErr } = await supabase
        .from('workspace')
        .select('*')
        .eq('id', workspaceId)
        .single()
      if (wsErr || !workspace) throw new Error('Workspace not found')

      if (workspace.status === 'read_only') {
        throw new Error('Workspace is read-only')
      }

      const plan = workspace.plan as WorkspacePlan
      const budget = await checkCostBudget(workspaceId, plan)
      if (!budget.ok) {
        throw new Error(
          `AI cost ceiling exceeded (${budget.mtdCents}/${budget.ceilingCents} cents)`
        )
      }

      const { data: brief, error: bErr } = await supabase.from('brief').select('*').eq('id', briefId).single()
      if (bErr || !brief) throw new Error('Brief not found')

      let draftItemIds = itemIds
      if (brief.brief_kind === 'regulatory_summary') {
        draftItemIds = await filterItemIdsToSweepRegulatoryOnly(workspaceId, itemIds)
        if (draftItemIds.length === 0) {
          throw new Error(
            'Regulatory summary briefs require intelligence items from the regulatory sweep pass (ingestion sweep_regulatory).'
          )
        }
      }

      const { data: items, error: iErr } = await supabase
        .from('intelligence_item')
        .select('id,title,summary,content')
        .eq('workspace_id', workspaceId)
        .in('id', draftItemIds)
      if (iErr) throw iErr
      if (!items?.length) throw new Error('No intelligence items found for draft')

      const promptPurpose = briefKindToPromptPurpose(brief.brief_kind)
      const routing = await getRoutingFor(promptPurpose)
      const vendorClient = getVendorClient(routing.vendor, routing.model)
      const template = await getActivePromptTemplateFor(promptPurpose, routing.vendor)
      const promptVars = buildBriefDraftPromptVariables({
        audience: brief.audience,
        audienceHint,
        items: items.map((it) => ({
          title: it.title,
          summary: it.summary ?? '',
          content: it.content ?? '',
        })),
      })
      const prompt = renderPromptTemplate(
        template?.content ?? getBriefDraftPromptTemplateForKind(brief.brief_kind),
        promptVars
      )

      const started = Date.now()
      const result = await vendorClient.complete({
        prompt,
        responseSchema: briefDraftResponseSchema,
        maxTokens: 8192,
      })
      const latencyMs = Date.now() - started

      const parsed = result.parsed
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Brief draft JSON parse failed')
      }
      const safe = briefDraftResponseSchema.safeParse(parsed)
      if (!safe.success) {
        throw new Error(`Brief draft schema: ${safe.error.message}`)
      }

      const costCents = estimateCallCostCents(
        routing.model,
        result.usage.inputTokens,
        result.usage.outputTokens
      )

      await recordVendorCall(workspaceId, plan, {
        purpose: promptPurpose,
        vendor: routing.vendor,
        model: routing.model,
        promptTemplateId: template?.id ?? null,
        promptTemplateVersion: template?.version ?? null,
        requestTokens: result.usage.inputTokens,
        responseTokens: result.usage.outputTokens,
        costCents,
        latencyMs,
        success: true,
        citationCount: draftItemIds.length,
        responsePayload: { briefId, itemIds: draftItemIds },
      })

      const wordCount = countWords(safe.data.body)

      const { error: upErr } = await supabase
        .from('brief')
        .update({
          title: safe.data.title,
          summary: safe.data.summary,
          body: safe.data.body,
          word_count: wordCount,
          ai_drafted: true,
          human_reviewed: false,
          linked_item_ids: draftItemIds,
          ...(autoPublish
            ? {
                status: 'published' as const,
                published_at: new Date().toISOString(),
              }
            : {}),
        })
        .eq('id', briefId)

      if (upErr) throw upErr

      if (autoPublish) {
        try {
          await notifyBriefSubscribersOfPublish(briefId)
        } catch {
          // Brief is published; notification delivery is best-effort
        }
      }

      return { ok: true as const, briefId }
    })
  }
)
