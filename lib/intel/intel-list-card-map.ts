import type { IntelligenceItem, Category } from '@/lib/types'
import type { ListCardBadgeVariant, ListCardData, RecordReadStatus } from '@/lib/types/dosi'
import { getCategoryInfo } from '@/lib/types'

function categoryVariant(category: Category): ListCardBadgeVariant {
  switch (category) {
    case 'buy-side':
      return 'buy_side'
    case 'sell-side':
      return 'sell_side'
    case 'channel':
      return 'channel'
    case 'regulatory':
      return 'regulatory'
    default:
      return 'neutral'
  }
}

function intelUserState(item: IntelligenceItem): RecordReadStatus {
  if (item.isBookmarked) return 'saved'
  if (item.isRead) return 'read'
  return 'unread'
}

function misPriority(item: IntelligenceItem): 'critical' | 'high' | 'medium' | null {
  if (item.mis.band === 'critical') return 'critical'
  if (item.mis.band === 'high') return 'high'
  return null
}

export function intelligenceItemToListCardData(item: IntelligenceItem): ListCardData<IntelligenceItem> {
  const cat = getCategoryInfo(item.category)
  const secondaryBadges: ListCardData['secondaryBadges'] = []
  if (item.reviewMetadata) {
    secondaryBadges.push({ label: 'Customer Voice', variant: 'neutral' })
  }
  if (item.mis.confidence === 'low') {
    secondaryBadges.push({ label: 'Low confidence', variant: 'warning' })
  }

  return {
    recordId: item.id,
    recordType: 'intelligence_item',
    title: item.title,
    preview: item.summary,
    primaryBadge: { label: cat.label, variant: categoryVariant(item.category) },
    secondaryBadges: secondaryBadges.length ? secondaryBadges : undefined,
    scoreIndicator: {
      value: item.mis.value,
      band: item.mis.band,
    },
    confidenceIndicator: item.mis.confidence,
    priority: misPriority(item),
    metadata: {
      relatedEntities: [
        ...(item.relatedCompetitors ?? []).slice(0, 3).map((c) => ({
          label: c.name,
          type: 'competitor' as const,
          href: `/competitors/${c.id}`,
        })),
        ...(item.relatedTopics ?? []).slice(0, 2).map((t) => ({
          label: t.name,
          type: 'topic' as const,
        })),
      ],
      sourceLabel: item.sourceUrls?.[0]?.domain ?? undefined,
    },
    timestamp: item.eventDate ?? item.timestamp,
    userState: intelUserState(item),
    raw: item,
  }
}
