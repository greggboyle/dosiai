import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget } from '@/lib/ai/cost'
import type { WorkspacePlan } from '@/lib/types/dosi'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/** Weekly Monday 06:00 UTC: enqueue hiring sweeps for paid workspaces not recently run. */
export const scheduleHiringSweeps = inngest.createFunction(
  { id: 'schedule-hiring-sweeps' },
  { cron: '0 6 * * 1' },
  async () => {
    const supabase = createSupabaseAdminClient()
    const { data: workspaces, error } = await supabase
      .from('workspace')
      .select('id, plan, status, last_hiring_sweep_at')
      .eq('status', 'active')
      .in('plan', ['starter', 'team', 'business', 'enterprise'])

    if (error) throw error
    const events: {
      name: 'hiring-sweep/run'
      data: { workspaceId: string; trigger: 'scheduled'; triggerUserId: null }
    }[] = []
    const cutoff = Date.now() - SEVEN_DAYS_MS

    for (const w of workspaces ?? []) {
      const last = w.last_hiring_sweep_at ? new Date(w.last_hiring_sweep_at).getTime() : 0
      if (last > cutoff) continue
      const budget = await checkCostBudget(w.id, w.plan as WorkspacePlan)
      if (!budget.ok) continue
      events.push({
        name: 'hiring-sweep/run',
        data: { workspaceId: w.id, trigger: 'scheduled', triggerUserId: null },
      })
    }

    if (events.length) {
      await inngest.send(events)
    }
    return { scheduled: events.length }
  }
)
