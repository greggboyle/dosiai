'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mergeListViewHref } from '@/lib/utils/list-view-url'
import type { ListCardDensity } from '@/components/list-view/list-card'

const MODES: { id: ListCardDensity; label: string }[] = [
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'compact', label: 'Compact' },
  { id: 'dense', label: 'Dense' },
]

export function ListDensityToggle({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = (searchParams.get('density') as ListCardDensity | null) ?? 'comfortable'

  return (
    <div className={cn('inline-flex rounded-md border p-0.5', className)}>
      {MODES.map((m) => (
        <Button
          key={m.id}
          type="button"
          size="sm"
          variant={current === m.id ? 'secondary' : 'ghost'}
          className="h-7 text-xs"
          onClick={() => {
            router.replace(
              mergeListViewHref(pathname, searchParams, {
                density: m.id === 'comfortable' ? null : m.id,
              }),
              { scroll: false }
            )
          }}
        >
          {m.label}
        </Button>
      ))}
    </div>
  )
}
