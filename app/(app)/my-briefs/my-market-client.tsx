'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brief types you receive</CardTitle>
          <CardDescription>
            Choose which automated and team brief categories appear in this list and trigger in-app
            notifications when published.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SUBSCRIPTION_ORDER.map((kind) => (
            <div key={kind} className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor={`sub-${kind}`} className="text-sm font-medium">
                  {BRIEF_KIND_LABELS[kind]}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {kind === 'sweep_summary'
                    ? 'Off by default — summaries tied to sweep runs.'
                    : kind === 'manual'
                      ? 'Briefs authored by your team.'
                      : 'Automated brief when available for your workspace.'}
                </p>
              </div>
              <Switch
                id={`sub-${kind}`}
                checked={subMap.get(kind) ?? false}
                disabled={pending === kind}
                onCheckedChange={(v) => void toggle(kind, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
    </div>
  )
}
