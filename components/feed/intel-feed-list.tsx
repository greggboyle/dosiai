'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ListCard, type ListCardDensity } from '@/components/list-view/list-card'
import { intelligenceItemToListCardData } from '@/lib/intel/intel-list-card-map'
import type { IntelligenceItem } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  bulkMarkIntelItemsRead,
  setIntelligenceItemBookmarked,
} from '@/lib/intelligence/actions'
import { toast } from 'sonner'

export interface IntelFeedListProps {
  items: IntelligenceItem[]
  selectedId?: string
  focusedIndex?: number
  density?: ListCardDensity
  onSelect: (item: IntelligenceItem) => void
  bulkSelectMode?: boolean
  bulkSelectedIds?: string[]
  onToggleBulkSelect?: (itemId: string) => void
}

export function IntelFeedList({
  items,
  selectedId,
  focusedIndex = 0,
  density = 'comfortable',
  onSelect,
  bulkSelectMode,
  bulkSelectedIds,
  onToggleBulkSelect,
}: IntelFeedListProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h3 className="text-base font-medium">All caught up!</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No new items match your current filters. Try adjusting them or check back later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 px-2 py-2 sm:px-4">
        {items.map((item, index) => {
          const data = intelligenceItemToListCardData(item)
          const isFocused = index === focusedIndex
          const isSelected = selectedId === item.id

          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg outline-none',
                isFocused && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
                isSelected && !isFocused && 'ring-1 ring-border'
              )}
            >
              <ListCard
                data={data}
                href={`/intel?item=${item.id}`}
                density={density}
                misScore={item.mis}
                vendorConsensus={item.vendorConsensus}
                selectionMode={bulkSelectMode}
                selected={bulkSelectedIds?.includes(item.id)}
                onToggleSelect={() => onToggleBulkSelect?.(item.id)}
                onNavigate={() => onSelect(item)}
                onMarkRead={async () => {
                  await bulkMarkIntelItemsRead([item.id])
                  router.refresh()
                }}
                onToggleSave={async () => {
                  try {
                    await setIntelligenceItemBookmarked(item.id, !item.isBookmarked)
                    toast.success(item.isBookmarked ? 'Removed bookmark' : 'Bookmarked')
                    router.refresh()
                  } catch {
                    toast.error('Could not update')
                  }
                }}
                onDismiss={async () => {
                  await bulkMarkIntelItemsRead([item.id])
                  router.refresh()
                }}
              />
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
