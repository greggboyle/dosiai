'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mergeListViewHref } from '@/lib/utils/list-view-url'

export interface ListViewToggleOption {
  id: string
  label: string
  icon?: React.ReactNode
}

export interface ListViewToggleProps {
  paramKey?: string
  options: ListViewToggleOption[]
  /** Value that clears the param (default view). */
  defaultId: string
  /** Additional query keys to clear when switching (e.g. pagination offsets). */
  clearParams?: string[]
  className?: string
}

export function ListViewToggle({
  paramKey = 'view',
  options,
  defaultId,
  clearParams = [],
  className,
}: ListViewToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramKey) ?? defaultId

  return (
    <div className={cn('inline-flex rounded-md border p-0.5', className)}>
      {options.map((opt) => (
        <Button
          key={opt.id}
          type="button"
          variant={current === opt.id ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 gap-1"
          onClick={() => {
            const patch: Record<string, string | null> = {
              [paramKey]: opt.id === defaultId ? null : opt.id,
            }
            for (const key of clearParams) patch[key] = null
            router.push(mergeListViewHref(pathname, searchParams, patch))
          }}
        >
          {opt.icon}
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
