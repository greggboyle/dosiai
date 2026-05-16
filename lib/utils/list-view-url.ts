/** Merge URL search params for list-view controls (scroll: false via router.replace in callers). */
export function mergeListViewHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>
): string {
  const next = new URLSearchParams(current.toString())
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') next.delete(k)
    else next.set(k, v)
  }
  const s = next.toString()
  return s ? `${pathname}?${s}` : pathname
}

export function countActiveListParams(
  searchParams: URLSearchParams,
  keys: string[]
): number {
  return keys.filter((k) => {
    const v = searchParams.get(k)
    return v != null && v !== '' && v !== 'all'
  }).length
}
