import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/** First day of month 00:00 UTC — reset MTD AI cost counters. */
export const monthlyCostReset = inngest.createFunction(
  { id: 'monthly-cost-reset' },
  { cron: '0 0 1 * *' },
  async () => {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('workspace').update({ ai_cost_mtd_cents: 0 }).not('name', 'is', null)
    if (error) throw error
    return { reset: true }
  }
)
