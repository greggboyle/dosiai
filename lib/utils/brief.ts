import type { BriefKind } from '@/lib/types'

function stripLeading(value: string, pattern: RegExp): string {
  const m = value.match(pattern)
  if (!m) return value
  return value.slice(m[0].length).trimStart()
}

/**
 * Remove redundant type prefixes from brief titles when the badge already names the type.
 * Display-only; do not mutate stored titles.
 */
export function stripRedundantPrefix(title: string, briefKind: BriefKind): string {
  const t = title.trim()
  if (!t) return t

  switch (briefKind) {
    case 'sweep_summary':
      return stripLeading(
        t,
        /^(sweep\s+summary\s*:\s*|sweep\s+summary\s*[—–-]\s*|sweep\s*:\s*)/i
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
