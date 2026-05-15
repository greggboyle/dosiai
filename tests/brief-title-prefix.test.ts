import { describe, expect, it } from 'vitest'
import { stripRedundantPrefix } from '@/lib/utils/brief'

describe('stripRedundantPrefix', () => {
  it('strips sweep summary variants', () => {
    expect(stripRedundantPrefix('Sweep Summary: Q4 outlook', 'sweep_summary')).toBe('Q4 outlook')
    expect(stripRedundantPrefix('Sweep Summary — Week in review', 'sweep_summary')).toBe('Week in review')
    expect(stripRedundantPrefix('Sweep: Weekly note', 'sweep_summary')).toBe('Weekly note')
  })

  it('strips competitor prefixes', () => {
    expect(stripRedundantPrefix('Competitor Dossier: Acme Co', 'competitor')).toBe('Acme Co')
    expect(stripRedundantPrefix('Competitor Brief: Notes', 'competitor')).toBe('Notes')
  })

  it('strips manual prefixes', () => {
    expect(stripRedundantPrefix('Team Brief: Launch recap', 'manual')).toBe('Launch recap')
  })

  it('strips regulatory prefixes', () => {
    expect(stripRedundantPrefix('Regulatory Summary: FDA update', 'regulatory_summary')).toBe('FDA update')
  })

  it('leaves titles unchanged when no prefix', () => {
    expect(stripRedundantPrefix('Plain title', 'sweep_summary')).toBe('Plain title')
  })
})
