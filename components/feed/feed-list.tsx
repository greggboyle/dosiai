'use client'

import * as React from 'react'
import { Bookmark, Share2, XCircle, CheckCircle, Eye, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MISBadgeExtended } from '@/components/mis-badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { IntelligenceItem } from '@/lib/types'
import { formatIntelEventDate, getRelativeTime, getCategoryInfo } from '@/lib/types'

interface FeedListProps {
  items: IntelligenceItem[]
  selectedId?: string
  onSelect: (item: IntelligenceItem) => void
}

export function FeedList({ items, selectedId, onSelect }: FeedListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="size-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="size-7 text-accent" />
          </div>
          <h3 className="text-base font-medium">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            No new items match your current filters. Try adjusting them or check back later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {items.map((item) => (
          <FeedListItem
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() => onSelect(item)}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

interface FeedListItemProps {
  item: IntelligenceItem
  isSelected: boolean
  onSelect: () => void
}

function FeedListItem({ item, isSelected, onSelect }: FeedListItemProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const categoryInfo = getCategoryInfo(item.category)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative w-full text-left px-6 py-4 transition-colors cursor-pointer',
        isSelected
          ? 'bg-accent/10'
          : 'hover:bg-muted/50',
        !item.isRead && 'bg-accent/5'
      )}
    >
      {/* Unread indicator */}
      {!item.isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
      )}

      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row: MIS Badge, Consensus, Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <MISBadgeExtended 
              score={item.mis} 
              size="sm" 
              vendorConsensus={item.vendorConsensus}
            />
            <Badge 
              variant="outline" 
              className={cn('text-[10px] h-5 px-1.5 font-medium border-0', categoryInfo.color)}
            >
              {categoryInfo.label}
            </Badge>
            {item.reviewMetadata && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                Customer Voice
              </Badge>
            )}
            {item.mis.confidence === 'low' && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-negative/10 text-negative border-0">
                Low Confidence
              </Badge>
            )}
          </div>

          {/* Title */}
          <h4
            className={cn(
              'text-sm leading-snug line-clamp-2',
              !item.isRead ? 'font-medium' : 'text-foreground/90'
            )}
          >
            {item.title}
          </h4>

          {/* Summary */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.summary}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {/* Competitors (C1: now an array) */}
            {item.relatedCompetitors?.slice(0, 2).map((comp) => (
              <Badge 
                key={comp.id}
                variant="secondary" 
                className="text-[10px] h-5 px-1.5 font-medium cursor-pointer hover:bg-secondary/80"
                onClick={(e) => {
                  e.stopPropagation()
                  // Could filter by competitor
                }}
              >
                {comp.name}
              </Badge>
            ))}
            {(item.relatedCompetitors?.length ?? 0) > 2 && (
              <span className="text-[10px]">+{item.relatedCompetitors!.length - 2} more</span>
            )}
            
            {/* Topics (C1: now TopicRef[]) */}
            {item.relatedTopics?.slice(0, 2).map((topic) => (
              <Badge
                key={topic.id}
                variant="outline"
                className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation()
                  // Could filter by topic
                }}
              >
                {topic.name}
              </Badge>
            ))}
            {(item.relatedTopics?.length ?? 0) > 2 && (
              <span className="text-[10px]">+{item.relatedTopics!.length - 2}</span>
            )}

            <span className="text-muted-foreground/50">·</span>
            
            {/* Event date */}
            <time
              dateTime={item.eventDate ?? item.timestamp}
              className="text-muted-foreground"
            >
              {item.eventDate ? formatIntelEventDate(item.eventDate) : getRelativeTime(item.timestamp)}
            </time>

            <span className="text-muted-foreground/50">·</span>

            {/* Source (C1: now sourceUrls array) */}
            <span className="text-muted-foreground">{item.sourceUrls?.[0]?.domain || 'Unknown'}</span>
          </div>
        </div>

        {/* Quick Actions - Show on Hover */}
        <div 
          className={cn(
            'flex items-center gap-0.5 flex-shrink-0 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn('size-7', item.isBookmarked && 'text-accent')}
              >
                <Bookmark className={cn('size-3.5', item.isBookmarked && 'fill-current')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Bookmark</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <Share2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Share</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <XCircle className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Dismiss</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <CheckCircle className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Mark Read</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn('size-7', item.isWatching && 'text-accent')}
              >
                <Eye className={cn('size-3.5', item.isWatching && 'fill-current')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {item.isWatching ? 'Watching' : 'Add to Watch'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
