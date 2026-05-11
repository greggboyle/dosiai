import { inngest } from '@/inngest/client'
import { orchestrateHiringSweep } from '@/lib/competitors/hiring-sweep-orchestrator'
import { SweepRejectedError } from '@/lib/sweep/errors'

export const runHiringSweep = inngest.createFunction(
  { id: 'run-hiring-sweep', retries: 2 },
  { event: 'hiring-sweep/run' },
  async ({ event, step }) => {
    const { workspaceId, trigger, triggerUserId } = event.data as {
      workspaceId: string
      trigger: 'manual' | 'scheduled'
      triggerUserId?: string | null
    }

    const result = await step.run('orchestrate-hiring-sweep', async () => {
      try {
        const out = await orchestrateHiringSweep({
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

    return {
      status: 'completed',
      competitorsConsidered: result.competitorsConsidered,
      jobPostingsUpserted: result.jobPostingsUpserted,
    }
  }
)
