function clampUtcHour(h: unknown): number {
  const n = typeof h === 'number' ? h : Number(h)
  if (!Number.isFinite(n)) return 17
  return Math.min(23, Math.max(0, Math.floor(n)))
}

/**
 * Label for one UTC clock hour (0–23), shown in the user's profile IANA timezone when set.
 * Uses today's UTC calendar date so DST reflects the current offset.
 */
export function formatUtcSweepHourForProfileDisplay(
  utcHour: unknown,
  profileTimeZone: string | null | undefined
): string {
  const h = clampUtcHour(utcHour)
  const ref = new Date()
  const instant = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), h, 0, 0, 0))
  const utcLabel = `${String(h).padStart(2, '0')}:00 UTC`

  const tz = typeof profileTimeZone === 'string' ? profileTimeZone.trim() : ''
  if (!tz) return utcLabel

  try {
    const local = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(instant)
    return `${local} (${utcLabel})`
  } catch {
    return utcLabel
  }
}
