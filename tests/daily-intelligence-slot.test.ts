import { describe, expect, it } from 'vitest'
import {
  clampDailyIntelligenceSweepHourUtc,
  shouldEnqueueScheduledIntelligenceSweep,
} from '@/lib/sweep/daily-intelligence-slot'

describe('clampDailyIntelligenceSweepHourUtc', () => {
  it('clamps and floors', () => {
    expect(clampDailyIntelligenceSweepHourUtc(17)).toBe(17)
    expect(clampDailyIntelligenceSweepHourUtc(17.9)).toBe(17)
    expect(clampDailyIntelligenceSweepHourUtc(-1)).toBe(0)
    expect(clampDailyIntelligenceSweepHourUtc(99)).toBe(23)
    expect(clampDailyIntelligenceSweepHourUtc(NaN)).toBe(17)
  })
})

describe('shouldEnqueueScheduledIntelligenceSweep', () => {
  const H = 17

  it('skips before the slot on the same UTC day', () => {
    const now = new Date('2026-06-15T16:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: null,
      })
    ).toBe(false)
  })

  it('enqueues at the slot with no prior sweep', () => {
    const now = new Date('2026-06-15T17:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: null,
      })
    ).toBe(true)
  })

  it('catch-up same UTC day if the tick missed H:00', () => {
    const now = new Date('2026-06-15T18:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: null,
      })
    ).toBe(true)
  })

  it('skips after a sweep since today slot start', () => {
    const now = new Date('2026-06-15T18:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: '2026-06-15T17:05:00.000Z',
      })
    ).toBe(false)
  })

  it('blocks evening slot when manual sweep same morning (24h rule)', () => {
    const now = new Date('2026-06-15T17:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: '2026-06-15T10:00:00.000Z',
      })
    ).toBe(false)
  })

  it('runs next day at slot after prior day sweep', () => {
    const now = new Date('2026-06-16T17:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: H,
        lastSweepAt: '2026-06-15T17:05:00.000Z',
      })
    ).toBe(true)
  })

  it('handles slot hour 0 UTC crossing calendar day', () => {
    const now = new Date('2026-06-15T00:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: 0,
        lastSweepAt: '2026-06-14T01:00:00.000Z',
      })
    ).toBe(true)
  })

  it('before midnight slot same day is false', () => {
    const now = new Date('2026-06-14T23:00:00.000Z')
    expect(
      shouldEnqueueScheduledIntelligenceSweep({
        now,
        scheduledHourUtc: 0,
        lastSweepAt: null,
      })
    ).toBe(false)
  })
})
