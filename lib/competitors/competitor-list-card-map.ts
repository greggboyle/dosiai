import type { ListCardData } from '@/lib/types/dosi'
import type { CompetitorTableRow } from '@/lib/competitors/queries'

const tierLabels: Record<string, string> = {
  primary_direct: 'Primary Direct',
  secondary_indirect: 'Secondary Indirect',
  emerging: 'Emerging',
  adjacent: 'Adjacent',
  watching: 'Watching',
}

export function competitorRowToListCardData(row: CompetitorTableRow): ListCardData<CompetitorTableRow> {
  return {
    recordId: row.id,
    recordType: 'competitor',
    title: row.name,
    preview: row.website ?? undefined,
    primaryBadge: {
      label: tierLabels[row.tier] ?? row.tier,
      variant: row.tier === 'primary_direct' ? 'critical' : 'neutral',
    },
    secondaryBadges: [
      {
        label: row.status,
        variant: row.status === 'active' ? 'success' : 'neutral',
      },
    ],
    scoreIndicator: {
      value: row.overallMIS.value,
      band: row.overallMIS.band,
      label: 'MIS',
    },
    metadata: {
      sourceLabel: `${row.recentActivity} signals (7d)`,
    },
    scopeLabel: row.lastActivityLabel !== '—' ? `Last activity ${row.lastActivityLabel}` : undefined,
    timestamp: row.lastActivityAt ?? new Date(0).toISOString(),
    userState: 'read',
    raw: row,
  }
}
