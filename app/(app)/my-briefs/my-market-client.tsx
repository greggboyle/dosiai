'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { MyMarketBriefRow } from '@/lib/brief/my-market-queries'
import { BRIEF_KIND_LABELS } from '@/lib/brief/brief-kind'
import type { BriefKind } from '@/lib/types'
import { updateBriefSubscription } from '@/lib/brief/my-market-actions'
import { toast } from 'sonner'

const SUBSCRIPTION_ORDER: BriefKind[] = [
  'manual',
  'daily_summary',
  'weekly_intelligence',
  'regulatory_summary',
  'competitor',
  'sweep_summary',
]

export interface MyMarketBriefsClientProps {
  rows: MyMarketBriefRow[]
  subscriptions: Array<{ brief_kind: BriefKind; subscribed: boolean }>
}

export function MyMarketBriefsClient({ rows, subscriptions }: MyMarketBriefsClientProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState<BriefKind | null>(null)
  const subMap = React.useMemo(() => {
    const m = new Map<BriefKind, boolean>()
    for (const s of subscriptions) {
      m.set(s.brief_kind, s.subscribed)
    }
    return m
  }, [subscriptions])

  const enabledSubCount = React.useMemo(
    () => SUBSCRIPTION_ORDER.filter((k) => subMap.get(k)).length,
    [subMap]
  )

  const toggle = async (kind: BriefKind, next: boolean) => {
    setPending(kind)
    try {
      await updateBriefSubscription(kind, next)
      toast.success('Preferences saved')
      router.refresh()
    } catch {
      toast.error('Could not update subscription')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Market Briefs</h1>
        <p className="text-sm text-muted-foreground">
          Briefs you follow appear here. Unread items stay highlighted until you open them.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your briefs</h2>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                No briefs match your current selections yet. When new briefs are published,
                they&apos;ll show up here.
              </p>
              <Link
                href="/briefs"
                className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Browse all workspace briefs
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ brief, readAt, relativeUpdated }) => (
              <li key={brief.id}>
                <Link
                  href={`/briefs/${brief.id}`}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50',
                    !readAt && 'border-primary/30 bg-muted/30'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {!readAt ? (
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    ) : null}
                    <span className="font-medium">{brief.title}</span>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {BRIEF_KIND_LABELS[brief.briefKind]}
                    </Badge>
                  </div>
                  {brief.summary ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{brief.summary}</p>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    Updated {relativeUpdated}
                    {readAt ? ' · Read' : ' · Unread'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Collapsible defaultOpen={false} className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <CollapsibleTrigger className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/40 [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Which brief types appear here</p>
            <p className="text-xs text-muted-foreground">
              {enabledSubCount} of {SUBSCRIPTION_ORDER.length} enabled · expand to change in-app list and publish
              notifications
            </p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3">
            <p className="mb-3 text-xs text-muted-foreground">
              These toggles are only for this page and notifications — most visits are just reading briefs above.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUBSCRIPTION_ORDER.map((kind) => (
                <div
                  key={kind}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={`sub-${kind}`} className="text-sm font-medium leading-tight">
                      {BRIEF_KIND_LABELS[kind]}
                    </Label>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {kind === 'sweep_summary'
                        ? 'Off by default — tied to sweep runs.'
                        : kind === 'manual'
                          ? 'Team-authored briefs.'
                          : 'Automated when available.'}
                    </p>
                  </div>
                  <Switch
                    id={`sub-${kind}`}
                    className="shrink-0"
                    checked={subMap.get(kind) ?? false}
                    disabled={pending === kind}
                    onCheckedChange={(v) => void toggle(kind, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
