'use client'

import { cn } from '@/lib/utils'
import type { MISScore } from '@/lib/types'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ListConsensusIndicator } from '@/components/list-view/list-consensus-indicator'

interface MISBadgeProps {
  score: MISScore
  size?: 'sm' | 'md' | 'lg'
  showConfidence?: boolean
  className?: string
}

const bandColors = {
  noise: 'bg-mis-noise',
  low: 'bg-mis-low',
  medium: 'bg-mis-medium',
  high: 'bg-mis-high',
  critical: 'bg-mis-critical',
}

const bandTextColors = {
  noise: 'text-white',
  low: 'text-white',
  medium: 'text-foreground',
  high: 'text-foreground',
  critical: 'text-white',
}

const sizeClasses = {
  sm: 'h-5 px-1.5 text-xs',
  md: 'h-6 px-2 text-sm',
  lg: 'h-7 px-2.5 text-sm',
}

// Confidence indicator: different shapes for different levels
function ConfidenceIndicator({ confidence, size }: { confidence: MISScore['confidence']; size: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'size-2',
    md: 'size-2.5',
    lg: 'size-3',
  }

  // High = filled circle, Medium = diamond, Low = triangle
  if (confidence === 'high') {
    return (
      <span
        className={cn(sizeMap[size], 'rounded-full bg-confidence-high')}
        aria-label="High confidence"
      />
    )
  }

  if (confidence === 'medium') {
    return (
      <span
        className={cn(sizeMap[size], 'rotate-45 bg-confidence-medium')}
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        aria-label="Medium confidence"
      />
    )
  }

  // Low confidence = triangle
  return (
    <span
      className={cn(sizeMap[size], 'bg-confidence-low')}
      style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
      aria-label="Low confidence"
    />
  )
}

export function MISBadge({ 
  score, 
  size = 'md', 
  showConfidence = true,
  className 
}: MISBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded font-mono font-medium tabular-nums',
          bandColors[score.band],
          bandTextColors[score.band],
          sizeClasses[size]
        )}
      >
        {score.value}
      </span>
      {showConfidence && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <ConfidenceIndicator confidence={score.confidence} size={size} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              <span className="font-medium capitalize">{score.confidence} confidence</span>
              {score.confidenceReason && (
                <>: {score.confidenceReason}</>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// Extended badge with vendor consensus
interface MISBadgeExtendedProps extends MISBadgeProps {
  vendorConsensus?: {
    confirmed: number
    total: number
  }
}

export function MISBadgeExtended({ 
  score, 
  size = 'md', 
  showConfidence = true,
  vendorConsensus,
  className 
}: MISBadgeExtendedProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <MISBadge score={score} size={size} showConfidence={showConfidence} />
      {vendorConsensus && (
        <ListConsensusIndicator confirmed={vendorConsensus.confirmed} total={vendorConsensus.total} />
      )}
    </div>
  )
}
