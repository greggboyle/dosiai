'use server'

import { listFeedItemsFiltered, type FeedSubject } from '@/lib/feed/queries'
import type { Category, IntelligenceItem } from '@/lib/types'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'

export async function fetchFeedItemsForFilters(input: {
  subject: FeedSubject
  categories: Category[]
  competitorNames: string[]
  topicNames: string[]
  minScore: number
  customerVoiceOnly: boolean
}): Promise<IntelligenceItem[]> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) return []

  return listFeedItemsFiltered(workspaceId, {
    subject: input.subject,
    categories: input.categories,
    competitorNames: input.competitorNames,
    topicNames: input.topicNames,
    minScore: input.minScore,
    customerVoiceOnly: input.customerVoiceOnly,
  })
}
