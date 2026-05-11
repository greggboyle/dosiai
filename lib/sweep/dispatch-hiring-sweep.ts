import { inngest } from '@/inngest/client'

export type HiringSweepRunPayload = {
  workspaceId: string
  trigger: 'manual' | 'scheduled'
  triggerUserId: string | null
}

function useInngestCloud(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY?.trim())
}

/**
 * Queues a hiring sweep: sends `hiring-sweep/run` when `INNGEST_EVENT_KEY` is set.
 *
 * **Local development:** If the key is missing and `NODE_ENV === 'development'`, runs
 * `orchestrateHiringSweep` in the background (same pattern as {@link dispatchSweepRun}).
 */
export async function dispatchHiringSweepRun(payload: HiringSweepRunPayload): Promise<void> {
  if (useInngestCloud()) {
    await inngest.send({
      name: 'hiring-sweep/run',
      data: payload,
    })
    return
  }

  if (process.env.NODE_ENV === 'development') {
    const { orchestrateHiringSweep } = await import('@/lib/competitors/hiring-sweep-orchestrator')
    void orchestrateHiringSweep({
      workspaceId: payload.workspaceId,
      trigger: payload.trigger,
      triggerUserId: payload.triggerUserId,
    }).catch((err) => {
      console.error('[dispatchHiringSweepRun] development inline hiring sweep failed:', err)
    })
    return
  }

  throw new Error(
    'Hiring sweep scheduling is not configured: set INNGEST_EVENT_KEY from your Inngest dashboard (Events → Sending → Keys).'
  )
}
