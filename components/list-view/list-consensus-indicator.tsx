'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface ListConsensusIndicatorProps {
  confirmed: number
  total: number
  className?: string
}

/** Replaces numeric "1/1" with filled / hollow dots for vendor confirmation. */
export function ListConsensusIndicator({ confirmed, total, className }: ListConsensusIndicatorProps) {
  const safeTotal = Math.max(1, total)
  const safeConfirmed = Math.min(Math.max(0, confirmed), safeTotal)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('inline-flex items-center gap-0.5', className)}
          aria-label={`${safeConfirmed} of ${safeTotal} vendors confirmed`}
        >
          {Array.from({ length: safeTotal }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-1.5 rounded-full border border-muted-foreground/40',
                i < safeConfirmed ? 'bg-accent border-accent' : 'bg-transparent'
              )}
            />
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">
          {safeConfirmed} of {safeTotal} AI vendors confirmed this signal
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
