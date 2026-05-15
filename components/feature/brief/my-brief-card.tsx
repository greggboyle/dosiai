'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bookmark,
  Link2,
  Sparkles,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { BriefCardData } from '@/lib/brief/my-briefs-types'
import type { Brief } from '@/lib/types'
import { markBriefRead, toggleBriefSaved, dismissBrief } from '@/lib/brief/my-market-actions'
import { toast } from 'sonner'

const audienceDisplay: Record<Brief['audience'], string> = {
  leadership: 'For leadership',
  sales: 'For sales',
  product: 'For product',
  general: 'For general',
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[1][0]).toUpperCase()
}

export interface MyBriefCardProps {
  data: BriefCardData
  regulatoryTint: boolean
}

export function MyBriefCard({ data, regulatoryTint }: MyBriefCardProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [shareOpen, setShareOpen] = React.useState(false)
  const { brief, userStatus, displayTitle, scopeLabel, typeBadgeLabel, relativeUpdated, stale, isUnreadVisual } =
    data

  const isCritical = brief.priority === 'critical'

  const titleClass = cn(
    'text-lg leading-snug',
    isUnreadVisual ? 'font-medium text-foreground' : 'font-normal',
    !isUnreadVisual && !stale && 'text-slate-700 dark:text-slate-300',
    stale && 'text-slate-500 dark:text-slate-500'
  )

  const previewClass = cn(
    'line-clamp-2 text-sm',
    stale ? 'text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'
  )

  const metaClass = cn('text-xs', stale ? 'text-slate-500' : 'text-slate-500')

  const onNavigate = () => {
    startTransition(() => {
      void markBriefRead(brief.id).catch(() => {})
    })
  }

  const onSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(() => {
      void toggleBriefSaved(brief.id)
        .then(() => {
          toast.success(userStatus === 'saved' ? 'Removed from saved' : 'Saved')
          router.refresh()
        })
        .catch(() => toast.error('Could not update'))
    })
  }

  const onDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(() => {
      void dismissBrief(brief.id)
        .then(() => {
          toast.success('Brief archived from this list')
          router.refresh()
        })
        .catch(() => toast.error('Could not dismiss'))
    })
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/briefs/${brief.id}`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/briefs/${brief.id}`

  const provenance = (() => {
    if (brief.aiDrafted && !brief.humanReviewed) {
      return (
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
          <span>Drafted by DOSI.AI</span>
        </span>
      )
    }
    if (brief.aiDrafted && brief.humanReviewed) {
      return (
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">{initials(brief.author.name)}</AvatarFallback>
          </Avatar>
          <span>
            Drafted by DOSI.AI · Reviewed by {brief.author.name}
          </span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5">
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initials(brief.author.name)}</AvatarFallback>
        </Avatar>
        <span>By {brief.author.name}</span>
      </span>
    )
  })()

  return (
    <>
      <Link
        href={`/briefs/${brief.id}`}
        onClick={onNavigate}
        className={cn(
          'group relative block rounded-lg border p-4 transition-colors',
          isUnreadVisual ? 'border-l-4 border-l-accent border-border' : 'border-border',
          isUnreadVisual ? 'bg-[var(--brief-card-unread)]' : 'bg-[var(--brief-card-read)]',
          'hover:bg-muted/30'
        )}
      >
        {isCritical ? <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-rose-500" aria-hidden /> : null}
        {isUnreadVisual ? (
          <span
            className="absolute right-4 top-4 size-2 rounded-full bg-accent"
            aria-hidden
            title="Unread"
          />
        ) : null}

        <div className={cn('flex flex-wrap items-start justify-between gap-2 pr-6', isCritical ? 'pt-1' : '')}>
          <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs', metaClass)}>
            {provenance}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'relative shrink-0 text-xs font-normal',
              regulatoryTint && 'border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400'
            )}
          >
            {typeBadgeLabel}
          </Badge>
        </div>

        <h3 className={cn('mt-2 pr-7', titleClass)}>{displayTitle || brief.title}</h3>

        {brief.summary?.trim() ? <p className={cn('mt-2', previewClass)}>{brief.summary}</p> : null}

        <p className={cn('mt-2 text-xs', metaClass)}>{scopeLabel}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {audienceDisplay[brief.audience]}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={cn('text-xs', metaClass)}>Updated {relativeUpdated}</span>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isUnreadVisual ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                title="Mark as read"
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  startTransition(() => {
                    void markBriefRead(brief.id)
                      .then(() => {
                        toast.success('Marked read')
                        router.refresh()
                      })
                      .catch(() => toast.error('Could not update'))
                  })
                }}
              >
                <Check className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title={userStatus === 'saved' ? 'Unsave' : 'Save'}
              disabled={pending}
              onClick={onSave}
            >
              <Bookmark className={cn('size-4', userStatus === 'saved' && 'fill-current')} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="Share"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShareOpen(true)
              }}
            >
              <Link2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="Dismiss from list"
              disabled={pending}
              onClick={onDismiss}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </Link>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share brief</DialogTitle>
            <DialogDescription>Copy a link or share by email.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl)
                toast.success('Link copied')
              }}
            >
              Copy link
            </Button>
            <Button type="button" variant="outline" asChild>
              <a
                href={`mailto:?subject=${encodeURIComponent(brief.title)}&body=${encodeURIComponent(`Read this brief: ${shareUrl}`)}`}
              >
                Share via email
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
