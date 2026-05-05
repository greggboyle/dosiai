import { inngest } from '@/inngest/client'
import { orchestrateSweep } from '@/lib/sweep/orchestrator'
import { SweepRejectedError } from '@/lib/sweep/errors'

export const runSweep = inngest.createFunction(
  { id: 'run-sweep', retries: 2 },
  { event: 'sweep/run' },
  async ({ event, step }) => {
    const { workspaceId, trigger, triggerUserId } = event.data as {
      workspaceId: string
      trigger: 'manual' | 'scheduled'
      triggerUserId?: string | null
    }

    const result = await step.run('orchestrate-sweep', async () => {
      try {
        const out = await orchestrateSweep({
          workspaceId,
          trigger,
          triggerUserId: triggerUserId ?? null,
        })
        return { ok: true as const, ...out }
      } catch (e) {
        if (e instanceof SweepRejectedError) {
          return { ok: false as const, code: e.code, message: e.message }
        }
        throw e
      }
    })

    if (!result.ok) {
      return { status: 'rejected', code: result.code, message: result.message }
    }

    await step.sendEvent('sweep-complete-notify', {
      name: 'sweep/complete',
      data: { workspaceId, sweepId: result.sweepId },
    })

    return { status: 'completed', sweepId: result.sweepId, itemsIngested: result.itemsIngested }
  }
)
