'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bookmark, Check, Link2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MISBadge } from '@/components/mis-badge'
import { ListConsensusIndicator } from '@/components/list-view/list-consensus-indicator'
import type { ListCardData, ListCardBadgeVariant } from '@/lib/types/dosi'
import { getRelativeTime } from '@/lib/types'
import { warnIfPreviewTooLong } from '@/lib/utils/list-view'

const badgeVariantClass: Record<ListCardBadgeVariant, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  buy_side: 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  sell_side: 'border-0 bg-purple-500/15 text-purple-700 dark:text-purple-300',
  channel: 'border-0 bg-amber-500/15 text-amber-800 dark:text-amber-200',
  regulatory: 'border-0 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  critical: 'border-0 bg-mis-critical/20 text-mis-critical',
  success: 'border-0 bg-positive/15 text-positive',
  warning: 'border-0 bg-amber-500/15 text-amber-800 dark:text-amber-200',
}

const scoreBandClass: Record<string, string> = {
  noise: 'bg-mis-noise text-white',
  low: 'bg-mis-low text-white',
  medium: 'bg-mis-medium text-foreground',
  high: 'bg-mis-high text-foreground',
  critical: 'bg-mis-critical text-white',
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[1][0]).toUpperCase()
}

function renderAttribution(meta: ListCardData['metadata']) {
  const a = meta.attribution
  if (!a) return null
  if (a.type === 'system') {
    return <span>Auto-generated</span>
  }
  if (a.type === 'ai_drafted') {
    return (
      <span className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
        <span>Drafted by DOSI.AI</span>
      </span>
    )
  }
  if (a.type === 'ai_drafted_human_reviewed') {
    return (
      <span className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
        {a.authorName ? (
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">{initials(a.authorName)}</AvatarFallback>
          </Avatar>
        ) : null}
        <span>
          Drafted by DOSI.AI{a.authorName ? ` · Reviewed by ${a.authorName}` : ''}
        </span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      {a.authorName ? (
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initials(a.authorName)}</AvatarFallback>
        </Avatar>
      ) : null}
      <span>{a.authorName ? `By ${a.authorName}` : 'Human-authored'}</span>
    </span>
  )
}

export type ListCardDensity = 'comfortable' | 'compact' | 'dense'

export interface ListCardProps<T = unknown> {
  data: ListCardData<T>
  href: string
  density?: ListCardDensity
  primaryBadgeClassName?: string
  /** Vendor consensus for intel-style rows */
  vendorConsensus?: { confirmed: number; total: number }
  /** When set, renders MIS score + optional consensus */
  misScore?: import('@/lib/types').MISScore
  onNavigate?: () => void
  onMarkRead?: () => void | Promise<void>
  onToggleSave?: () => void | Promise<void>
  onDismiss?: () => void | Promise<void>
  onShareClick?: (e: React.MouseEvent) => void
  customLeft?: React.ReactNode
  customRight?: React.ReactNode
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (e: React.MouseEvent) => void
  /** aria label for the row link */
  ariaLabel?: string
}

export function ListCard<T = unknown>({
  data,
  href,
  density = 'comfortable',
  primaryBadgeClassName,
  vendorConsensus,
  misScore,
  onNavigate,
  onMarkRead,
  onToggleSave,
  onDismiss,
  onShareClick,
  customLeft,
  customRight,
  selectionMode,
  selected,
  onToggleSelect,
  ariaLabel,
}: ListCardProps<T>) {
  const [hovered, setHovered] = React.useState(false)
  warnIfPreviewTooLong(data.preview, data.recordId)

  const isUnread = data.userState === 'unread'
  const isCritical = data.priority === 'critical'
  const ts = data.timestamp
  const stale =
    (data.userState === 'read' || data.userState === 'saved') &&
    Date.now() - new Date(ts).getTime() > 7 * 24 * 60 * 60 * 1000

  const titleLines = density === 'comfortable' ? 'line-clamp-2' : 'line-clamp-1'
  const showPreview = density !== 'dense' && Boolean(data.preview?.trim())
  const previewLines = density === 'comfortable' ? 'line-clamp-2' : 'line-clamp-1'

  const titleClass = cn(
    density === 'comfortable' ? 'text-lg leading-snug' : 'text-base leading-snug',
    isUnread ? 'font-medium text-foreground' : 'font-normal',
    !isUnread && !stale && 'text-slate-700 dark:text-slate-300',
    stale && 'text-slate-500 dark:text-slate-500'
  )

  const previewClass = cn(
    'text-sm',
    stale ? 'text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300',
    previewLines
  )

  const metaClass = cn('text-xs', stale ? 'text-slate-500' : 'text-slate-500')

  const actionsAlwaysVisible = density !== 'comfortable'

  const readStateLabel =
    data.userState === 'unread' ? `Unread ${data.recordType.replace('_', ' ')}: ${data.title}` : data.title

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {selectionMode ? (
        <button
          type="button"
          className="absolute left-2 top-4 z-10 size-4 rounded border"
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect?.(e)
          }}
        />
      ) : null}

      <Link
        href={href}
        aria-label={ariaLabel ?? readStateLabel}
        onClick={() => {
          void onNavigate?.()
        }}
        className={cn(
          'group relative block rounded-lg border p-4 transition-colors',
          selectionMode && 'pl-9',
          isUnread ? 'border-l-4 border-l-accent border-border' : 'border-border',
          isUnread ? 'bg-[var(--brief-card-unread)]' : 'bg-[var(--brief-card-read)]',
          'hover:bg-muted/30'
        )}
      >
        {isCritical ? (
          <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-rose-500" aria-hidden />
        ) : null}
        {isUnread ? (
          <span
            className="absolute right-4 top-4 size-2 rounded-full bg-accent"
            aria-hidden
            title="Unread"
          />
        ) : null}

        <div className={cn('flex gap-3', isCritical ? 'pt-1' : '')}>
          {customLeft ? <div className="shrink-0">{customLeft}</div> : null}
          <div className="min-w-0 flex-1 space-y-2 pr-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-2', metaClass)}>
                {renderAttribution(data.metadata)}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {misScore ? (
                  <div className="flex items-center gap-1">
                    <MISBadge score={misScore} size="sm" />
                    {vendorConsensus ? (
                      <ListConsensusIndicator
                        confirmed={vendorConsensus.confirmed}
                        total={vendorConsensus.total}
                      />
                    ) : null}
                  </div>
                ) : data.scoreIndicator != null ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'font-mono text-xs font-medium tabular-nums',
                      data.scoreIndicator.band
                        ? scoreBandClass[data.scoreIndicator.band]
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {data.scoreIndicator.label
                      ? `${data.scoreIndicator.value} ${data.scoreIndicator.label}`
                      : data.scoreIndicator.value}
                  </Badge>
                ) : null}
                {data.primaryBadge ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-normal',
                      badgeVariantClass[data.primaryBadge.variant],
                      primaryBadgeClassName
                    )}
                  >
                    {data.primaryBadge.label}
                  </Badge>
                ) : null}
                {data.secondaryBadges?.map((b) => (
                  <Badge key={b.label} variant="outline" className={cn('text-[10px]', badgeVariantClass[b.variant])}>
                    {b.label}
                  </Badge>
                ))}
              </div>
            </div>

            <h3 className={cn(titleClass, titleLines)}>{data.title}</h3>

            {showPreview ? <p className={previewClass}>{data.preview}</p> : null}

            {data.scopeLabel ? <p className={cn('text-xs', metaClass)}>{data.scopeLabel}</p> : null}

            {data.metadata.relatedEntities && data.metadata.relatedEntities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.metadata.relatedEntities.map((e) =>
                  e.href ? (
                    <Link
                      key={e.label}
                      href={e.href}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs hover:underline"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {e.label}
                    </Link>
                  ) : (
                    <span key={e.label} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {e.label}
                    </span>
                  )
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn('text-xs', metaClass)}>
                Updated {getRelativeTime(ts)}
                {data.metadata.sourceLabel ? (
                  <span className="text-muted-foreground/70"> · {data.metadata.sourceLabel}</span>
                ) : null}
              </span>
              <div
                className={cn(
                  'flex gap-1',
                  actionsAlwaysVisible || hovered ? 'opacity-100' : 'opacity-0 sm:opacity-0 sm:group-hover:opacity-100'
                )}
                onClick={(e) => e.preventDefault()}
              >
                {isUnread && onMarkRead ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Mark as read"
                    aria-label="Mark as read"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onMarkRead()
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                ) : null}
                {onToggleSave ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title={data.userState === 'saved' ? 'Unsave' : 'Save'}
                    aria-label={data.userState === 'saved' ? 'Unsave' : 'Save'}
                    onClick={(e) => {
                      e.stopPropagation()
                      void onToggleSave()
                    }}
                  >
                    <Bookmark className={cn('size-4', data.userState === 'saved' && 'fill-current')} />
                  </Button>
                ) : null}
                {onShareClick ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Share"
                    aria-label="Share"
                    onClick={(e) => {
                      e.stopPropagation()
                      onShareClick(e)
                    }}
                  >
                    <Link2 className="size-4" />
                  </Button>
                ) : null}
                {onDismiss ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Dismiss"
                    aria-label="Dismiss from list"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDismiss()
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {customRight ? <div className="hidden shrink-0 sm:block">{customRight}</div> : null}
        </div>
      </Link>
    </div>
  )
}
