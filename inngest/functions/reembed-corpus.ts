import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/** Operator-triggered embedding migration (batch processing placeholder). */
export const reembedCorpus = inngest.createFunction(
  { id: 'reembed-corpus', retries: 1 },
  { event: 'embedding/reembed-corpus' },
  async ({ event }) => {
    const { oldModel, newModel } = event.data as { oldModel: string; newModel: string }
    const supabase = createSupabaseAdminClient()
    await supabase.from('embedding_migration_state').insert({
      old_model: oldModel,
      new_model: newModel,
      progress_pct: 0,
      status: 'running',
    })
    return { ok: true, message: 'Migration queued — implement batch worker to process intelligence_item rows.' }
  }
)
