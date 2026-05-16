'use client'

import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ListFiltersProps {
  activeCount: number
  label?: string
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  contentClassName?: string
  className?: string
}

/** Popover trigger + panel for list filter controls (checkboxes, selects, etc.). */
export function ListFilters({
  activeCount,
  label = 'Filters',
  children,
  align = 'end',
  contentClassName,
  className,
}: ListFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn('gap-2', className)}>
          <Filter className="size-3.5" />
          {label}
          {activeCount > 0 ? (
            <Badge variant="secondary" className="font-normal">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-80 space-y-4', contentClassName)} align={align}>
        {children}
      </PopoverContent>
    </Popover>
  )
}
