'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BriefCardData } from '@/lib/brief/my-briefs-types'
import { briefCardDataToListCardData } from '@/lib/brief/brief-list-card-map'
import { ListCard } from '@/components/list-view/list-card'
import { markBriefRead, toggleBriefSaved, dismissBrief } from '@/lib/brief/my-market-actions'
import { toast } from 'sonner'

export interface MyBriefCardProps {
  data: BriefCardData
  regulatoryTint: boolean
}

export function MyBriefCard({ data, regulatoryTint }: MyBriefCardProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [shareOpen, setShareOpen] = React.useState(false)
  const { brief } = data
  const listData = React.useMemo(() => briefCardDataToListCardData(data), [data])

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/briefs/${brief.id}`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/briefs/${brief.id}`

  return (
    <>
      <ListCard
        data={listData}
        href={`/briefs/${brief.id}`}
        density="comfortable"
        primaryBadgeClassName={
          regulatoryTint ? 'border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400' : undefined
        }
        onNavigate={() => {
          startTransition(() => {
            void markBriefRead(brief.id).catch(() => {})
          })
        }}
        onMarkRead={() =>
          startTransition(() => {
            void markBriefRead(brief.id)
              .then(() => {
                toast.success('Marked read')
                router.refresh()
              })
              .catch(() => toast.error('Could not update'))
          })
        }
        onToggleSave={() =>
          startTransition(() => {
            void toggleBriefSaved(brief.id)
              .then(() => {
                toast.success(data.userStatus === 'saved' ? 'Removed from saved' : 'Saved')
                router.refresh()
              })
              .catch(() => toast.error('Could not update'))
          })
        }
        onDismiss={() =>
          startTransition(() => {
            void dismissBrief(brief.id)
              .then(() => {
                toast.success('Brief archived from this list')
                router.refresh()
              })
              .catch(() => toast.error('Could not dismiss'))
          })
        }
        onShareClick={() => setShareOpen(true)}
      />

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
