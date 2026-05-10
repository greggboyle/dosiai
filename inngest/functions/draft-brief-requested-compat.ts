import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { briefDraftRequestedEventName } from '@/lib/brief/inngest-events'
import type { BriefKind } from '@/lib/types'

/**
 * Temporary compatibility: legacy clients send `brief/draft-requested` without a kind suffix.
 * Loads `brief_kind` and re-emits the kind-specific event so the correct per-kind function runs.
 */
export const draftBriefRequestedCompat = inngest.createFunction(
  { id: 'draft-brief-requested-compat', retries: 2 },
  { event: 'brief/draft-requested' },
  async ({ event, step }) => {
    const data = event.data as {
      briefId: string
      workspaceId: string
      itemIds: string[]
      audienceHint?: string
      autoPublish?: boolean
    }

    const kind = await step.run('resolve-brief-kind', async () => {
      const supabase = createSupabaseAdminClient()
      const { data: brief, error } = await supabase
        .from('brief')
        .select('brief_kind')
        .eq('id', data.briefId)
        .single()
      if (error || !brief) throw new Error('Brief not found')
      return brief.brief_kind as BriefKind
    })

    await step.sendEvent('draft-brief-reemit-by-kind', {
      name: briefDraftRequestedEventName(kind),
      data,
    })

    return { ok: true as const, reemitted: briefDraftRequestedEventName(kind) }
  }
)
