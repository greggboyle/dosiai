import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget } from '@/lib/ai/cost'
import type { WorkspacePlan } from '@/lib/types/dosi'

/** Hourly: enqueue scheduled sweeps for paid workspaces past cadence. */
export const scheduleSweeps = inngest.createFunction(
  { id: 'schedule-sweeps' },
  { cron: '0 * * * *' },
  async () => {
    const supabase = createSupabaseAdminClient()
    const { data: workspaces, error } = await supabase
      .from('workspace')
      .select('id, plan, status, last_sweep_at')
      .eq('status', 'active')
      .in('plan', ['starter', 'team', 'business', 'enterprise'])

    if (error) throw error
    const events: { name: 'sweep/run'; data: { workspaceId: string; trigger: 'scheduled'; triggerUserId: null } }[] = []
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000

    for (const w of workspaces ?? []) {
      const last = w.last_sweep_at ? new Date(w.last_sweep_at).getTime() : 0
      if (last > dayAgo) continue
      const budget = await checkCostBudget(w.id, w.plan as WorkspacePlan)
      if (!budget.ok) continue
      events.push({
        name: 'sweep/run',
        data: { workspaceId: w.id, trigger: 'scheduled', triggerUserId: null },
      })
    }

    if (events.length) {
      await inngest.send(events)
    }
    return { scheduled: events.length }
  }
)
