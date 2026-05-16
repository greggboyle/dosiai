'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Bookmark, X, Trash2 } from 'lucide-react'

export interface ListBulkActionsProps {
  selectedCount: number
  onMarkRead: () => void | Promise<void>
  onSave?: () => void | Promise<void>
  onDismiss?: () => void | Promise<void>
  onClear: () => void
  className?: string
}

export function ListBulkActions({
  selectedCount,
  onMarkRead,
  onSave,
  onDismiss,
  onClear,
  className,
}: ListBulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-4 py-2 shadow-lg backdrop-blur',
        className
      )}
    >
      <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => void onMarkRead()}>
        <Check className="size-3.5" />
        Mark read
      </Button>
      {onSave ? (
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => void onSave()}>
          <Bookmark className="size-3.5" />
          Save
        </Button>
      ) : null}
      {onDismiss ? (
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => void onDismiss()}>
          <X className="size-3.5" />
          Dismiss
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground" onClick={onClear}>
        <Trash2 className="size-3.5" />
        Clear
      </Button>
    </div>
  )
}
