import type { BriefReadStatus } from '@/lib/types/dosi'
import type { Brief } from '@/lib/types'

export type MyBriefsViewMode = 'importance' | 'type' | 'chronological'

export interface BriefCardData {
  brief: Brief
  userStatus: BriefReadStatus
  relativeUpdated: string
  scopeLabel: string
  typeBadgeLabel: string
  displayTitle: string
  stale: boolean
  isUnreadVisual: boolean
}

export interface MyBriefsSubscriptionsRow {
  brief_kind: Brief['briefKind']
  subscribed: boolean
}

export interface MyBriefsPagePayload {
  view: MyBriefsViewMode
  workspaceId: string
  reviewThreshold: number
  /** No subscribed brief kinds — open preferences to enable types. */
  noSubscriptions: boolean
  /** No published briefs exist in the workspace yet. */
  emptyWorkspace: boolean
  unreadCount: number
  totalCount: number
  lastSweepRelative: string | null
  /** importance default */
  newForYou: BriefCardData[]
  newForYouOverflow: number
  recent: BriefCardData[]
  hasMoreRecent: boolean
  recentOffset: number
  archived: BriefCardData[]
  /** chronological single stream */
  chronological: BriefCardData[]
  hasMoreChronological: boolean
  chronologicalOffset: number
  /** by-type grouping */
  byType: Array<{ sectionTitle: string; briefKinds: Brief['briefKind'][]; cards: BriefCardData[] }>
  subscriptions: MyBriefsSubscriptionsRow[]
  activeFilterCount: number
  searchQuery: string
  emptyBecauseFilters: boolean
}
