import { inngest } from '@/inngest/client'

export type SweepRunPayload = {
  workspaceId: string
  trigger: 'manual' | 'scheduled'
  triggerUserId: string | null
}

function useInngestCloud(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY?.trim())
}

/**
 * Schedules a sweep: sends `sweep/run` to Inngest Cloud when `INNGEST_EVENT_KEY` is set.
 *
 * **Local development:** If the event key is missing and `NODE_ENV === 'development'`, runs
 * `orchestrateSweep` in the background so sweeps work without Inngest credentials (same fast
 * response as queueing). Failures are logged to the server console.
 *
 * **Production / preview** without a key: throws so misconfiguration is visible.
 */
export async function dispatchSweepRun(payload: SweepRunPayload): Promise<void> {
  if (useInngestCloud()) {
    await inngest.send({
      name: 'sweep/run',
      data: payload,
    })
    return
  }

  if (process.env.NODE_ENV === 'development') {
    const { orchestrateSweep } = await import('@/lib/sweep/orchestrator')
    void orchestrateSweep({
      workspaceId: payload.workspaceId,
      trigger: payload.trigger,
      triggerUserId: payload.triggerUserId,
    }).catch((err) => {
      console.error('[dispatchSweepRun] development inline sweep failed:', err)
    })
    return
  }

  throw new Error(
    'Sweep scheduling is not configured: set INNGEST_EVENT_KEY from your Inngest dashboard (Events → Sending → Keys).'
  )
}
