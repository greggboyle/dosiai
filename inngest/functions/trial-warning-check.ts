import { differenceInCalendarDays } from 'date-fns'
import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { TrialThreshold } from '@/lib/billing/trial-warning-data'

/** Hourly: broadcast trial countdown warnings on Realtime workspace channel (once per threshold per workspace). */
export const trialWarningCheck = inngest.createFunction({ id: 'trial-warning-check' }, { cron: '15 * * * *' }, async () => {
  const supabase = createSupabaseAdminClient()

  const { data: workspaces, error } = await supabase
    .from('workspace')
    .select('id, name, trial_ends_at, plan')
    .eq('plan', 'trial')
    .eq('status', 'active')

  if (error) throw error

  const mappings: [TrialThreshold, number][] = [
    ['t_minus_7', 7],
    ['t_minus_3', 3],
    ['t_minus_1', 1],
  ]

  let emitted = 0

  for (const ws of workspaces ?? []) {
    if (!ws.trial_ends_at) continue
    const daysLeft = differenceInCalendarDays(new Date(ws.trial_ends_at), new Date())
    if (daysLeft < 0) continue

    for (const [threshold, target] of mappings) {
      if (daysLeft !== target) continue

      const { data: existing } = await supabase
        .from('trial_warning_seen')
        .select('workspace_id')
        .eq('workspace_id', ws.id)
        .eq('threshold', threshold)
        .maybeSingle()

      if (existing) continue

      await supabase.from('trial_warning_seen').insert({
        workspace_id: ws.id,
        threshold,
        dismissed: false,
      })

      await supabase.channel(`workspace:${ws.id}`).send({
        type: 'broadcast',
        event: 'trial.warning',
        payload: { workspaceId: ws.id, threshold, daysLeft, trialEndsAt: ws.trial_ends_at },
      })

      emitted += 1
    }
  }

  return { emitted }
})
