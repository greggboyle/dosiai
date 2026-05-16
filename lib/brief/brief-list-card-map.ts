import type { Brief } from '@/lib/types'
import type { ListCardBadgeVariant, ListCardData } from '@/lib/types/dosi'
import type { BriefCardData } from '@/lib/brief/my-briefs-types'
import { stripRedundantPrefix } from '@/lib/utils/brief'

function briefKindToBadgeVariant(kind: Brief['briefKind']): ListCardBadgeVariant {
  switch (kind) {
    case 'regulatory_summary':
      return 'regulatory'
    default:
      return 'neutral'
  }
}

function provenanceType(b: Brief): NonNullable<ListCardData['metadata']['attribution']> {
  if (b.aiDrafted && !b.humanReviewed) return { type: 'ai_drafted' }
  if (b.aiDrafted && b.humanReviewed)
    return { type: 'ai_drafted_human_reviewed', authorName: b.author.name }
  return { type: 'human_authored', authorName: b.author.name }
}

export function briefCardDataToListCardData(data: BriefCardData): ListCardData<Brief> {
  const { brief, userStatus, displayTitle, scopeLabel, typeBadgeLabel, stale: _stale, isUnreadVisual: _u } = data
  const title = displayTitle || brief.title
  return {
    recordId: brief.id,
    recordType: 'brief',
    title,
    preview: brief.summary?.trim() || undefined,
    primaryBadge: {
      label: typeBadgeLabel,
      variant: briefKindToBadgeVariant(brief.briefKind),
    },
    priority: brief.priority === 'critical' ? 'critical' : brief.priority === 'high' ? 'high' : 'medium',
    metadata: {
      attribution: provenanceType(brief),
      relatedEntities: [
        {
          label:
            brief.audience === 'leadership'
              ? 'For leadership'
              : brief.audience === 'sales'
                ? 'For sales'
                : brief.audience === 'product'
                  ? 'For product'
                  : 'For general',
          type: 'audience',
        },
      ],
    },
    scopeLabel: scopeLabel || undefined,
    timestamp: brief.updatedAt,
    userState: userStatus,
    raw: brief,
  }
}

/** Display title helper re-export for list views that only have Brief + kind. */
export function briefDisplayTitle(title: string, kind: Brief['briefKind']): string {
  return stripRedundantPrefix(title, kind)
}
