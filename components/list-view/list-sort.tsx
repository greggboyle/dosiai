'use client'

import { ArrowDownUp } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { mergeListViewHref } from '@/lib/utils/list-view-url'

export interface ListSortOption {
  id: string
  label: string
}

export interface ListSortProps {
  paramKey?: string
  options: ListSortOption[]
  /** Sort value that clears the URL param (default sort). */
  defaultId: string
  label?: string
  className?: string
}

export function ListSort({
  paramKey = 'sort',
  options,
  defaultId,
  label = 'Sort',
  className,
}: ListSortProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramKey) ?? defaultId
  const currentLabel = options.find((o) => o.id === current)?.label ?? label

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-8 gap-1.5 text-xs', className)}>
          <ArrowDownUp className="size-3" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => {
            router.push(
              mergeListViewHref(pathname, searchParams, {
                [paramKey]: value === defaultId ? null : value,
              })
            )
          }}
        >
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.id} value={opt.id} className="text-xs">
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
