import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/** Stub for MIS reinforcement; extend with aggregate weight tuning batch job later. */
export const learnFromOutcome = inngest.createFunction(
  { id: 'learn-from-outcome', retries: 1 },
  { event: 'win-loss/learn-from-outcome' },
  async ({ event, step }) => {
    const { outcomeId } = event.data as { outcomeId: string; workspaceId: string }

    return step.run('record-signal', async () => {
      const supabase = createSupabaseAdminClient()
      const { data: row } = await supabase.from('win_loss_outcome').select('*').eq('id', outcomeId).maybeSingle()

      if (!row) return { skipped: true as const }

      // Placeholder: future job would scan intelligence_item around close_date × competitor_id
      // and adjust scoring weight signals keyed by workspace.
      return {
        outcome: row.outcome,
        competitorId: row.competitor_id,
        recorded: true as const,
      }
    })
  }
)
