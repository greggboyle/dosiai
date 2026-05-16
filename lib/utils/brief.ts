import type { BriefKind } from '@/lib/types'
import { stripRedundantPrefix as stripFromListView, warnIfPreviewTooLong } from '@/lib/utils/list-view'

export { warnIfPreviewTooLong }

/**
 * Remove redundant type prefixes from brief titles when the badge already names the type.
 * Display-only; do not mutate stored titles.
 */
export function stripRedundantPrefix(title: string, briefKind: BriefKind): string {
  return stripFromListView(title, briefKind)
}
