'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export interface ListClearFiltersProps {
  activeCount: number
  /** Clear to pathname only, or custom href */
  clearHref?: string
  /** Run before navigation (e.g. reset local filter state). */
  onClear?: () => void
}

export function ListClearFilters({ activeCount, clearHref, onClear }: ListClearFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (activeCount <= 0) return null

  const href = clearHref ?? pathname

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-8 px-1 text-xs"
      onClick={() => {
        onClear?.()
        router.push(href)
      }}
    >
      Clear filters
    </Button>
  )
}
