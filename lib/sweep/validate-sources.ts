import type { ParsedSweepItem } from '@/lib/sweep/schemas'
import type { WebSource } from '@/lib/ai/retrieval'

export type SourceValidationResult<T extends ParsedSweepItem> = {
  kept: T[]
  rejectedBadUrl: number
  rejectedUnknownUrl: number
}

const PLACEHOLDER_HOST_PATTERNS = [
  /(^|\.)example\./i,
  /(^|\.)test\./i,
  /(^|\.)sample\./i,
  /(^|\.)invalid$/i,
  /localhost/i,
]

export function validateSweepItemSources<T extends ParsedSweepItem>(
  items: T[],
  opts?: { enforceRetrievedSourceMembership?: boolean; allowedSources?: WebSource[] }
): SourceValidationResult<T> {
  const enforceMembership = Boolean(opts?.enforceRetrievedSourceMembership)
  const allowed = new Set((opts?.allowedSources ?? []).map((s) => canonicalizeUrl(s.url)).filter(Boolean) as string[])

  const kept: T[] = []
  let rejectedBadUrl = 0
  let rejectedUnknownUrl = 0

  for (const it of items) {
    const refs = it.sourceUrls ?? []
    if (refs.length === 0) {
      rejectedBadUrl++
      continue
    }

    let badUrl = false
    let unknownUrl = false
    for (const ref of refs) {
      const c = canonicalizeUrl(ref.url)
      if (!c || !isValidHttpsUrl(ref.url) || isPlaceholderHost(ref.url)) {
        badUrl = true
        break
      }
      if (enforceMembership && !allowed.has(c)) {
        unknownUrl = true
      }
    }
    if (badUrl) {
      rejectedBadUrl++
      continue
    }
    if (unknownUrl) {
      rejectedUnknownUrl++
      continue
    }
    kept.push(it)
  }

  return { kept, rejectedBadUrl, rejectedUnknownUrl }
}

function isValidHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && Boolean(u.hostname)
  } catch {
    return false
  }
}

function isPlaceholderHost(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase()
    return PLACEHOLDER_HOST_PATTERNS.some((p) => p.test(host))
  } catch {
    return true
  }
}

function canonicalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.protocol}//${u.host}${path}${u.search}`
  } catch {
    return null
  }
}
