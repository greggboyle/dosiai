import type { BriefKind } from '@/lib/types'

/** Inngest event name for drafting a brief of the given kind (one function per kind). */
export function briefDraftRequestedEventName(kind: BriefKind): string {
  return `brief/draft-requested/${kind}`
}
