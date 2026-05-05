'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MISBadge } from '@/components/mis-badge'
import { cn } from '@/lib/utils'
import type { IntelligenceItem, ReviewPlatform, Sentiment } from '@/lib/types'
import type { SubjectSummary } from '@/lib/customer-voice/queries'

export type SubjectOption = { id: string; name: string }

const platforms: { value: ReviewPlatform | 'all'; label: string }[] = [
  { value: 'all', label: 'All platforms' },
  { value: 'g2', label: 'G2' },
  { value: 'capterra', label: 'Capterra' },
  { value: 'trustradius', label: 'TrustRadius' },
  { value: 'app-store', label: 'App Store' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'hacker-news', label: 'Hacker News' },
  { value: 'communities', label: 'Communities' },
]

const sentiments: { value: Sentiment | 'all'; label: string }[] = [
  { value: 'all', label: 'All sentiment' },
  { value: 'positive', label: 'Positive' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
]

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function filterItems(
  items: IntelligenceItem[],
  subjectId: string | 'all',
  sentiment: Sentiment | 'all',
  platform: ReviewPlatform | 'all'
): IntelligenceItem[] {
  return items.filter((i) => {
    const rm = i.reviewMetadata
    if (!rm) return false
    if (subjectId !== 'all' && rm.subjectId !== subjectId) return false
    if (sentiment !== 'all' && rm.sentiment !== sentiment) return false
    if (platform !== 'all' && rm.platform !== platform) return false
    return true
  })
}

function summarizeLocal(items: IntelligenceItem[], subjectId: string | 'all'): SubjectSummary | null {
  const filtered = subjectId === 'all' ? items : items.filter((i) => i.reviewMetadata?.subjectId === subjectId)
  if (!filtered.length) return null
  let positive = 0
  let negative = 0
  let neutral = 0
  let mixed = 0
  const themes = new Map<string, number>()
  for (const i of filtered) {
    const s = i.reviewMetadata?.sentiment
    if (s === 'positive') positive += 1
    else if (s === 'negative') negative += 1
    else if (s === 'mixed') mixed += 1
    else neutral += 1
    for (const t of i.reviewMetadata?.themes ?? []) {
      themes.set(t, (themes.get(t) ?? 0) + 1)
    }
  }
  const total = positive + negative + neutral + mixed
  const netScore = total ? Math.round(((positive - negative) / total) * 100) : 0
  return { positive, negative, neutral, mixed, total, netScore, themes }
}

export function CustomerVoiceClient(props: { items: IntelligenceItem[]; subjects: SubjectOption[] }) {
  const [subjectId, setSubjectId] = React.useState<string | 'all'>('all')
  const [sentiment, setSentiment] = React.useState<Sentiment | 'all'>('all')
  const [platform, setPlatform] = React.useState<ReviewPlatform | 'all'>('all')
  const [selectedId, setSelectedId] = React.useState<string | null>(props.items[0]?.id ?? null)

  const filtered = React.useMemo(
    () => filterItems(props.items, subjectId, sentiment, platform),
    [props.items, subjectId, sentiment, platform]
  )

  const summary = React.useMemo(() => summarizeLocal(filtered, subjectId), [filtered, subjectId])

  React.useEffect(() => {
    if (selectedId && filtered.some((i) => i.id === selectedId)) return
    setSelectedId(filtered[0]?.id ?? null)
  }, [filtered, selectedId])

  const selected = filtered.find((i) => i.id === selectedId) ?? null
  const rm = selected?.reviewMetadata

  const topThemes = summary
    ? [...summary.themes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer voice</h1>
        <p className="text-sm text-muted-foreground">Buy-side reviews and ratings (last {props.items.length} items)</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={subjectId} onValueChange={(v) => setSubjectId(v as typeof subjectId)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {props.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentiment} onValueChange={(v) => setSentiment(v as typeof sentiment)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sentiments.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reviews</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{summary.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net score</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{summary.netScore > 0 ? '+' : ''}{summary.netScore}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Mix</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">+ {summary.positive}</Badge>
              <Badge variant="secondary">− {summary.negative}</Badge>
              <Badge variant="outline">mixed {summary.mixed}</Badge>
              <Badge variant="outline">neutral {summary.neutral}</Badge>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No items match filters.</p>
      )}

      {topThemes.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Themes</CardTitle>
            <CardDescription>Most mentioned in current filter</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topThemes.map(([t, n]) => (
              <Badge key={t} variant="secondary">{t} · {n}</Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] min-h-[420px]">
        <Card className="flex flex-col min-h-0">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 min-h-[320px] border-t">
            <div className="p-2 space-y-1">
              {filtered.map((i) => {
                const r = i.reviewMetadata
                const active = i.id === selectedId
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setSelectedId(i.id)}
                    className={cn(
                      'w-full text-left rounded-md px-2 py-2 text-sm transition-colors',
                      active ? 'bg-accent' : 'hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium line-clamp-2">{r?.subjectName ?? i.title}</span>
                      <MISBadge score={i.mis} size="sm" showConfidence={false} className="shrink-0 scale-90" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                      {r?.platform ? <span className="capitalize">{r.platform.replace('-', ' ')}</span> : null}
                      {r?.sentiment ? (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {r.sentiment}
                        </Badge>
                      ) : null}
                      <span>· {formatDate(i.timestamp)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selected ? (
              <p className="text-muted-foreground">Select an item.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{rm?.subjectName ?? selected.title}</span>
                  <MISBadge score={selected.mis} size="sm" />
                  {selected.sourceUrls[0]?.url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selected.sourceUrls[0].url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5 mr-1" /> Source
                      </a>
                    </Button>
                  ) : null}
                </div>
                <Separator />
                {rm?.rating != null ? (
                  <p>
                    Rating: <span className="font-medium">{rm.rating}</span>
                    {rm.maxRating ? ` / ${rm.maxRating}` : null}
                  </p>
                ) : null}
                <blockquote className="border-l-2 pl-3 text-muted-foreground italic">{rm?.excerpt ?? selected.summary}</blockquote>
                <p className="whitespace-pre-wrap text-foreground/90">{rm?.fullText ?? selected.content}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
