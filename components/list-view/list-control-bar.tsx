'use client'

import { cn } from '@/lib/utils'

export interface ListControlBarProps {
  children: React.ReactNode
  className?: string
}

/** Horizontal row for list search, filters, sort, density, view toggles. */
export function ListControlBar({ children, className }: ListControlBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {children}
    </div>
  )
}
