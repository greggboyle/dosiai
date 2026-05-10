import type { BriefKind } from '@/lib/types'

export const BRIEF_KIND_LABELS: Record<BriefKind, string> = {
  manual: 'Team brief',
  sweep_summary: 'Sweep summary',
  daily_summary: 'Daily summary',
  weekly_intelligence: 'Weekly intelligence',
  regulatory_summary: 'Regulatory summary',
  competitor: 'Competitor brief',
}

/** Short label used in notification titles (e.g. "Weekly Intelligence Brief"). */
export function briefKindNotificationTitle(kind: BriefKind): string {
  switch (kind) {
    case 'manual':
      return 'Team brief'
    case 'sweep_summary':
      return 'Sweep Summary Brief'
    case 'daily_summary':
      return 'Daily Summary Brief'
    case 'weekly_intelligence':
      return 'Weekly Intelligence Brief'
    case 'regulatory_summary':
      return 'Regulatory Summary Brief'
    case 'competitor':
      return 'Competitor Brief'
    default:
      return 'Brief'
  }
}

export function briefReadyNotificationCopy(kind: BriefKind): { title: string; bodyFallback: string } {
  const label = briefKindNotificationTitle(kind)
  const title =
    kind === 'weekly_intelligence'
      ? `Your ${label} is available`
      : kind === 'manual'
        ? `A ${label.toLowerCase()} is ready`
        : `Your ${label} is ready`
  return {
    title,
    bodyFallback: `Open to read`,
  }
}
