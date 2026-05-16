import type { ListCardData } from '@/lib/types/dosi'
import type { BattleCardListRow } from '@/lib/battle-cards/battle-card-types'

export function battleCardRowToListCardData(row: BattleCardListRow): ListCardData<BattleCardListRow> {
  const statusVariant =
    row.status === 'published' ? 'success' : row.status === 'draft' ? 'warning' : 'neutral'

  return {
    recordId: row.id,
    recordType: 'battle_card',
    title: row.competitorName,
    preview:
      row.aiDraftStatus === 'queued' || row.aiDraftStatus === 'processing'
        ? 'AI draft in progress…'
        : undefined,
    primaryBadge: { label: row.status, variant: statusVariant },
    scoreIndicator:
      row.freshness_score != null
        ? { value: row.freshness_score, label: 'Freshness' }
        : undefined,
    metadata: {
      sourceLabel: `v${row.version}`,
    },
    scopeLabel: row.freshness_score != null ? `Freshness ${row.freshness_score}/100` : undefined,
    timestamp: row.updated_at,
    userState: 'read',
    raw: row,
  }
}
