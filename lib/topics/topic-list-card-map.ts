import type { Topic, TopicImportance } from '@/lib/types'
import type { ListCardBadgeVariant, ListCardData } from '@/lib/types/dosi'

const importanceVariant: Record<TopicImportance, ListCardBadgeVariant> = {
  critical: 'critical',
  high: 'warning',
  medium: 'neutral',
  low: 'neutral',
}

export function topicToListCardData(topic: Topic): ListCardData<Topic> {
  return {
    recordId: topic.id,
    recordType: 'topic',
    title: topic.name,
    preview: topic.description,
    primaryBadge: {
      label: topic.importance,
      variant: importanceVariant[topic.importance],
    },
    metadata: {
      relatedEntities: topic.linkedCompetitorNames.slice(0, 3).map((name) => ({
        label: name,
        type: 'competitor',
      })),
      sourceLabel: `${topic.itemCountLast7Days} items (7d)`,
    },
    scopeLabel: `${topic.itemCountLast30Days} items (30d)`,
    timestamp: topic.updatedAt,
    userState: 'read',
    raw: topic,
  }
}
