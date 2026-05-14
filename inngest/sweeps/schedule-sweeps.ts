import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCostBudget } from '@/lib/ai/cost'
import {
  clampDailyIntelligenceSweepHourUtc,
  shouldEnqueueScheduledIntelligenceSweep,
} from '@/lib/sweep/daily-intelligence-slot'
import type { WorkspacePlan } from '@/lib/types/dosi'

/** Hourly: enqueue scheduled sweeps for paid workspaces past cadence. */
export const scheduleSweeps = inngest.createFunction(
  { id: 'schedule-sweeps' },
  { cron: '0 * * * *' },
  async () => {
    const supabase = createSupabaseAdminClient()
    const { data: workspaces, error } = await supabase
      .from('workspace')
      .select('id, plan, status, last_sweep_at, daily_intelligence_sweep_hour_utc')
      .eq('status', 'active')
      .in('plan', ['starter', 'team', 'business', 'enterprise'])

    if (error) throw error
    const events: { name: 'sweep/run'; data: { workspaceId: string; trigger: 'scheduled'; triggerUserId: null } }[] = []
    const now = new Date()

    for (const w of workspaces ?? []) {
      if (
        !shouldEnqueueScheduledIntelligenceSweep({
          now,
          scheduledHourUtc: clampDailyIntelligenceSweepHourUtc(w.daily_intelligence_sweep_hour_utc),
          lastSweepAt: w.last_sweep_at,
        })
      ) {
        continue
      }
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
