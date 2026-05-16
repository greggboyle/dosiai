'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { mergeListViewHref } from '@/lib/utils/list-view-url'

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export interface ListSearchProps {
  paramKey?: string
  placeholder?: string
  initialValue?: string
  className?: string
  debounceMs?: number
}

export function ListSearch({
  paramKey = 'q',
  placeholder = 'Search…',
  initialValue = '',
  className,
  debounceMs = 300,
}: ListSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [qInput, setQInput] = React.useState(initialValue)
  const debouncedQ = useDebouncedValue(qInput, debounceMs)

  React.useEffect(() => {
    setQInput(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const next = debouncedQ.trim()
    const cur = (searchParams.get(paramKey) ?? '').trim()
    if (next === cur) return
    router.replace(mergeListViewHref(pathname, searchParams, { [paramKey]: next || null }), {
      scroll: false,
    })
  }, [debouncedQ, paramKey, pathname, router, searchParams])

  return (
    <Input
      placeholder={placeholder}
      value={qInput}
      onChange={(e) => setQInput(e.target.value)}
      className={className}
      aria-label={placeholder}
    />
  )
}
