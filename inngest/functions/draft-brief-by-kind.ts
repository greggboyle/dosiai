import { inngest } from '@/inngest/client'
import { BRIEF_KINDS } from '@/lib/brief/brief-kinds'
import { briefDraftRequestedEventName } from '@/lib/brief/inngest-events'
import { runBriefDraftStep } from '@/lib/brief/inngest/run-draft-brief-step'
import type { BriefKind } from '@/lib/types'

function inngestFunctionIdForBriefKind(kind: BriefKind): string {
  return `draft-brief-${kind.replace(/_/g, '-')}`
}

/** One Inngest function per brief kind so ops can configure and observe flows separately. */
export const draftBriefByKindFunctions = BRIEF_KINDS.map((kind) =>
  inngest.createFunction(
    { id: inngestFunctionIdForBriefKind(kind), retries: 2 },
    { event: briefDraftRequestedEventName(kind) },
    async ({ event, step }) => {
      return step.run('generate-brief-draft', async () =>
        runBriefDraftStep({
          briefId: event.data.briefId as string,
          workspaceId: event.data.workspaceId as string,
          itemIds: event.data.itemIds as string[],
          audienceHint: event.data.audienceHint as string | undefined,
          autoPublish: event.data.autoPublish as boolean | undefined,
          expectedBriefKind: kind,
        })
      )
    }
  )
)
