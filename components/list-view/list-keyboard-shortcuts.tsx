'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ListKeyboardShortcutsProps {
  enabled?: boolean
  focusedIndex: number
  itemCount: number
  onFocusIndex: (index: number) => void
  onOpenFocused?: () => void
  onMarkRead?: () => void
  onSave?: () => void
  onDismiss?: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]') ||
      target.getAttribute('role') === 'textbox'
  )
}

/** j/k navigate, x read, s save, e dismiss, Enter open, ? help */
export function ListKeyboardShortcuts({
  enabled = true,
  focusedIndex,
  itemCount,
  onFocusIndex,
  onOpenFocused,
  onMarkRead,
  onSave,
  onDismiss,
}: ListKeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(() => {
    if (!enabled || itemCount === 0) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()

      if (key === '?') {
        event.preventDefault()
        setHelpOpen(true)
        return
      }

      if (key === 'j') {
        event.preventDefault()
        onFocusIndex(Math.min(itemCount - 1, focusedIndex + 1))
        return
      }

      if (key === 'k') {
        event.preventDefault()
        onFocusIndex(Math.max(0, focusedIndex - 1))
        return
      }

      if (key === 'enter') {
        event.preventDefault()
        onOpenFocused?.()
        return
      }

      if (key === 'x') {
        event.preventDefault()
        onMarkRead?.()
        return
      }

      if (key === 's') {
        event.preventDefault()
        onSave?.()
        return
      }

      if (key === 'e') {
        event.preventDefault()
        onDismiss?.()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    enabled,
    focusedIndex,
    itemCount,
    onDismiss,
    onFocusIndex,
    onMarkRead,
    onOpenFocused,
    onSave,
  ])

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Works when focus is not in a text field.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">j</kbd> /{' '}
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">k</kbd> — next / previous item
          </li>
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Enter</kbd> — open item
          </li>
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">x</kbd> — mark read
          </li>
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">s</kbd> — save
          </li>
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">e</kbd> — dismiss
          </li>
          <li>
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">?</kbd> — this help
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
