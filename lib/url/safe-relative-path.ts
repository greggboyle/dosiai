/**
 * Same-origin path only (starts with `/`, not `//`). Hardens `?next=` query params against open redirects.
 */
export function safeRelativePath(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}
