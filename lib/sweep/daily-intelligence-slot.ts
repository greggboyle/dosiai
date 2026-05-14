const DAY_MS = 24 * 60 * 60 * 1000

/** Clamp DB / form values to a valid UTC sweep hour. */
export function clampDailyIntelligenceSweepHourUtc(h: unknown): number {
  const n = typeof h === 'number' ? h : Number(h)
  if (!Number.isFinite(n)) return 17
  return Math.min(23, Math.max(0, Math.floor(n)))
}

/**
 * Whether the hourly scheduler should enqueue a scheduled intelligence sweep.
 * Uses today's UTC calendar date at H:00 as the slot start, with same-day catch-up
 * if Inngest runs after H, and a 24h rolling minimum since last_sweep_at (any trigger).
 */
export function shouldEnqueueScheduledIntelligenceSweep(params: {
  now: Date
  scheduledHourUtc: number
  lastSweepAt: string | null
}): boolean {
  const H = clampDailyIntelligenceSweepHourUtc(params.scheduledHourUtc)
  const now = params.now
  const todaySlotStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    H,
    0,
    0,
    0
  )

  const slotOpen = now.getTime() >= todaySlotStartMs
  const lastMs = params.lastSweepAt ? new Date(params.lastSweepAt).getTime() : null
  const noSweepSinceSlotOpened = lastMs === null || lastMs < todaySlotStartMs
  const rolling24hOk = lastMs === null || lastMs <= now.getTime() - DAY_MS

  return slotOpen && noSweepSinceSlotOpened && rolling24hOk
}
