'use client'

import * as React from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Share2, Copy, AlertTriangle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MISBadge } from '@/components/mis-badge'
import type { Brief, IntelligenceItem } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'

/** Turn "Item N" in markdown into anchor links when N matches a linked feed item index (1-based). */
function linkifyItemAnchors(body: string, linkedCount: number): string {
  if (linkedCount === 0 || !body.trim()) return body
  return body.replace(/\bItem\s+(\d+)\b/gi, (full, numStr: string) => {
    const n = parseInt(numStr, 10)
    if (Number.isFinite(n) && n >= 1 && n <= linkedCount) {
      return `[${full}](#linked-item-${n})`
    }
    return full
  })
}

const audienceLabels: Record<Brief['audience'], string> = {
  leadership: 'Leadership',
  sales: 'Sales',
  product: 'Product',
  general: 'General',
}

const audienceColors: Record<Brief['audience'], string> = {
  leadership: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  sales: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  product: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  general: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
}

const priorityLabels: Record<Brief['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
}

const priorityColors: Record<Brief['priority'], string> = {
  critical: 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  high: 'bg-mis-high/15 text-mis-high border-mis-high/30',
  medium: 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
}

export interface BriefReaderClientProps {
  brief: Brief
  linkedItems: IntelligenceItem[]
  canEdit: boolean
}

export function BriefReaderClient({ brief, linkedItems, canEdit }: BriefReaderClientProps) {
  const [copied, setCopied] = React.useState(false)

  const bodyWithItemAnchors = React.useMemo(
    () => linkifyItemAnchors(brief.body, linkedItems.length),
    [brief.body, linkedItems.length]
  )

  const handleCopyMarkdown = () => {
    void navigator.clipboard.writeText(brief.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/briefs/${brief.id}`)
  }

  const published = brief.publishedAt ?? brief.createdAt

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/briefs">
            <ArrowLeft className="size-4 mr-2" />
            Back to briefs
          </Link>
        </Button>
      </div>

      <article className="max-w-[720px] mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="size-4 mr-2" />
            Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
            <Copy className="size-4 mr-2" />
            {copied ? 'Copied' : 'Copy markdown'}
          </Button>
          {canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/briefs/${brief.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="outline" className={cn('text-xs', audienceColors[brief.audience])}>
            {audienceLabels[brief.audience]}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', priorityColors[brief.priority])}>
            {priorityLabels[brief.priority]}
          </Badge>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={brief.author.avatar} />
              <AvatarFallback className="text-[10px]">
                {brief.author.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{brief.author.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {brief.status === 'published' ? `Published ${getRelativeTime(published)}` : `Updated ${getRelativeTime(brief.updatedAt)}`}
          </span>
          <span className="text-sm text-muted-foreground">{brief.wordCount} words</span>
        </div>

        {brief.aiDrafted && !brief.humanReviewed && (
          <div className="flex items-center gap-2 px-4 py-2 mb-6 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="size-4 text-warning" />
            <span className="text-sm text-warning">Auto Brief</span>
          </div>
        )}

        <p className="text-muted-foreground mb-6">{brief.summary}</p>

        <h1 className="text-[32px] font-semibold leading-tight tracking-tight mb-8">{brief.title}</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none mb-12 [&_p]:leading-[1.7] [&_p]:text-base [&_li]:leading-[1.7] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_strong]:font-semibold [&_hr]:my-8 [&_ul]:my-4 [&_ol]:my-4 [&_a]:text-accent [&_a]:underline-offset-2">
          <ReactMarkdown>{bodyWithItemAnchors}</ReactMarkdown>
        </div>

        <Separator className="my-8" />

        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Linked intelligence items</h2>
          <div className="grid gap-3">
            {linkedItems.map((item, index) => (
              <Card
                key={item.id}
                id={`linked-item-${index + 1}`}
                className="hover:border-accent/50 transition-colors scroll-mt-24"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Badge variant="secondary" className="shrink-0 font-mono text-xs tabular-nums">
                      {index + 1}
                    </Badge>
                    <MISBadge score={item.mis} size="sm" />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/intel?item=${item.id}`}
                        className="font-medium text-sm hover:underline line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{getRelativeTime(item.timestamp)}</span>
                        <span className="flex items-center gap-1">
                          {item.sourceUrls[0]?.domain}
                          <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </article>
    </div>
  )
}
