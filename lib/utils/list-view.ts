import type { BriefKind } from '@/lib/types'

function stripLeading(value: string, pattern: RegExp): string {
  const m = value.match(pattern)
  if (!m) return value
  return value.slice(m[0].length).trimStart()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Hyphen, en/em dash, or colon after a type badge in titles (hyphen first — safe in `[]`). */
const TITLE_BADGE_SEP = '[-—–:]'

/**
 * Remove redundant type prefixes from brief titles when the badge already names the type,
 * or when a primary badge label repeats at the start of the title.
 * Display-only; do not mutate stored titles.
 */
export function stripRedundantPrefix(
  title: string,
  ref: BriefKind | string | undefined
): string {
  const t = title.trim()
  if (!t) return t

  if (typeof ref === 'string') {
    const badge = ref.trim()
    if (!badge) return t
    const re = new RegExp(`^${escapeRegex(badge)}\\s*${TITLE_BADGE_SEP}\\s*`, 'i')
    return stripLeading(t, re)
  }

  if (ref == null) return t

  switch (ref) {
    case 'sweep_summary':
      return stripLeading(
        t,
        /^(sweep\s+summary\s*:\s*|sweep\s+summary\s*[-—–]\s*|sweep\s*:\s*)/i
      )
    case 'competitor':
      return stripLeading(
        t,
        /^(competitor\s+dossier\s*:\s*|competitor\s+brief\s*:\s*|competitor\s*:\s*)/i
      )
    case 'manual':
      return stripLeading(t, /^(team\s+brief\s*:\s*|brief\s*:\s*)/i)
    case 'regulatory_summary':
      return stripLeading(
        t,
        /^(regulatory\s+summary\s*:\s*|regulatory\s+brief\s*:\s*)/i
      )
    default:
      return t
  }
}

/** Warn in development when preview exceeds ~35 words (spec guidance). */
export function warnIfPreviewTooLong(preview: string | undefined, context?: string): void {
  if (!preview?.trim() || process.env.NODE_ENV === 'production') return
  const words = preview.trim().split(/\s+/).filter(Boolean)
  if (words.length > 35) {
    console.warn(
      `[list-view] Preview over 35 words (${words.length})${context ? `: ${context}` : ''}`
    )
  }
}
