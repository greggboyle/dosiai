import type { WorkspacePlan } from '@/lib/types/dosi'

export type CompetitorProfileRefreshPolicy = {
  allowed: boolean
  reason?: string
  nextAllowedAt?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function getCompetitorProfileRefreshPolicy(params: {
  plan: WorkspacePlan
  lastProfileRefreshAt: string | null
  bypassLimits?: boolean
}): CompetitorProfileRefreshPolicy {
  const { plan, lastProfileRefreshAt, bypassLimits = false } = params

  if (bypassLimits) return { allowed: true }
  if (plan === 'enterprise') return { allowed: true }

  if (plan === 'trial') {
    return {
      allowed: false,
      reason: 'Trial workspaces run profile refresh automatically during the first sweep.',
    }
  }

  if (!lastProfileRefreshAt) return { allowed: true }

  const last = new Date(lastProfileRefreshAt).getTime()
  if (!Number.isFinite(last)) return { allowed: true }
  const nextAllowedAtMs = last + DAY_MS
  if (Date.now() >= nextAllowedAtMs) return { allowed: true }

  return {
    allowed: false,
    reason: 'Profile refresh is limited to once per day on this plan.',
    nextAllowedAt: new Date(nextAllowedAtMs).toISOString(),
  }
}

export function shouldAutoRefreshTrialOnFirstSweep(plan: WorkspacePlan, lastSweepAt: string | null): boolean {
  return plan === 'trial' && !lastSweepAt
}
