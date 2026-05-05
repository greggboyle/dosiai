'use client'

import * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface MutationGuardProps {
  canMutate: boolean
  reason?: string
  children: React.ReactElement<{ disabled?: boolean }>
}

export function MutationGuard({ canMutate, reason, children }: MutationGuardProps) {
  if (canMutate) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">{React.cloneElement(children, { disabled: true })}</span>
      </TooltipTrigger>
      <TooltipContent>{reason ?? 'This action is disabled for your workspace status.'}</TooltipContent>
    </Tooltip>
  )
}
