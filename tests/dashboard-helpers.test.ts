import { describe, it, expect } from 'vitest'
import { formatRelativeLabel } from '@/lib/dashboard/queries'

describe('dashboard helpers', () => {
  it('formatRelativeLabel formats a recent timestamp', () => {
    const s = formatRelativeLabel(new Date().toISOString())
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
  })
})
