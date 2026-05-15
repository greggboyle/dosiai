'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Check,
  ChevronDown,
  Filter,
  LayoutGrid,
  ListOrdered,
  Rows3,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { MyBriefsPagePayload } from '@/lib/brief/my-briefs-types'
import type { Brief, BriefKind } from '@/lib/types'
import { BRIEF_KIND_LABELS } from '@/lib/brief/brief-kind'
import type { MyBriefsViewMode } from '@/lib/brief/my-briefs-types'
import { MyBriefCard } from '@/components/feature/brief/my-brief-card'
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

const TYPE_FILTER_OPTIONS: { id: BriefKind; label: string }[] = [
  { id: 'manual', label: 'Team' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'sweep_summary', label: 'Sweep' },
  { id: 'regulatory_summary', label: 'Regulatory' },
  { id: 'daily_summary', label: 'Daily' },
  { id: 'weekly_intelligence', label: 'Weekly' },
]

const AUDIENCE_OPTIONS: { id: Brief['audience']; label: string }[] = [
  { id: 'leadership', label: 'Leadership' },
  { id: 'sales', label: 'Sales' },
  { id: 'product', label: 'Product' },
  { id: 'general', label: 'General' },
]

function mergeHref(pathname: string, current: URLSearchParams, patch: Record<string, string | null | undefined>) {
  const next = new URLSearchParams(current.toString())
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') next.delete(k)
    else next.set(k, v)
  }
  const s = next.toString()
  return s ? `${pathname}?${s}` : pathname
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function MyBriefsClient({ data }: { data: MyBriefsPagePayload }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [qInput, setQInput] = React.useState(data.searchQuery)
  const debouncedQ = useDebouncedValue(qInput, 300)
  const [prefsOpen, setPrefsOpen] = React.useState(false)
  const [pendingKind, setPendingKind] = React.useState<BriefKind | null>(null)

  React.useEffect(() => {
    setQInput(data.searchQuery)
  }, [data.searchQuery])

  React.useEffect(() => {
    const next = debouncedQ.trim()
    const cur = (searchParams.get('q') ?? '').trim()
    if (next === cur) return
    router.replace(mergeHref(pathname, searchParams, { q: next || null }))
  }, [debouncedQ, pathname, router, searchParams])

  const subMap = React.useMemo(() => {
    const m = new Map<BriefKind, boolean>()
    for (const s of data.subscriptions) m.set(s.brief_kind, s.subscribed)
    return m
  }, [data.subscriptions])

  const enabledSubCount = SUBSCRIPTION_ORDER.filter((k) => subMap.get(k)).length

  const setView = (view: MyBriefsViewMode) => {
    router.push(
      mergeHref(pathname, searchParams, {
        view: view === 'importance' ? null : view,
        roffset: null,
        coffset: null,
      })
    )
  }

  const togglePref = async (kind: BriefKind, next: boolean) => {
    setPendingKind(kind)
    try {
      await updateBriefSubscription(kind, next)
      toast.success('Preferences saved')
      router.refresh()
    } catch {
      toast.error('Could not update')
    } finally {
      setPendingKind(null)
    }
  }

  const selectedTypes = new Set((searchParams.get('types') ?? '').split(',').filter(Boolean) as BriefKind[])
  const selectedAudience = new Set(
    (searchParams.get('audience') ?? '').split(',').filter(Boolean) as Brief['audience'][]
  )

  const toggleTypeFilter = (id: BriefKind, checked: boolean) => {
    const next = new Set(selectedTypes)
    if (checked) next.add(id)
    else next.delete(id)
    router.push(
      mergeHref(pathname, searchParams, {
        types: next.size ? [...next].join(',') : null,
      })
    )
  }

  const toggleAudienceFilter = (id: Brief['audience'], checked: boolean) => {
    const next = new Set(selectedAudience)
    if (checked) next.add(id)
    else next.delete(id)
    router.push(
      mergeHref(pathname, searchParams, {
        audience: next.size ? [...next].join(',') : null,
      })
    )
  }

  const setStatusFilter = (status: string) => {
    router.push(mergeHref(pathname, searchParams, { status: status === 'all' ? null : status }))
  }

  const setFromFilter = (from: string) => {
    router.push(mergeHref(pathname, searchParams, { from: from === 'all' ? null : from }))
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const filterCount = data.activeFilterCount

  const sweepSuffix = data.lastSweepRelative ? ` · Last sweep ${data.lastSweepRelative}` : ''

  const renderCard = (c: (typeof data.newForYou)[0]) => (
    <MyBriefCard key={c.brief.id} data={c} regulatoryTint={c.brief.briefKind === 'regulatory_summary'} />
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Briefs</h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {data.unreadCount === 0 ? (
              <>
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>All caught up · {data.totalCount} total{sweepSuffix}</span>
              </>
            ) : (
              <span>
                {data.unreadCount} unread · {data.totalCount} total{sweepSuffix}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5">
            <Button
              type="button"
              variant={data.view === 'importance' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1"
              onClick={() => setView('importance')}
            >
              <LayoutGrid className="size-3.5" />
              Importance
            </Button>
            <Button
              type="button"
              variant={data.view === 'type' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1"
              onClick={() => setView('type')}
            >
              <Rows3 className="size-3.5" />
              By type
            </Button>
            <Button
              type="button"
              variant={data.view === 'chronological' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1"
              onClick={() => setView('chronological')}
            >
              <ListOrdered className="size-3.5" />
              Chronological
            </Button>
          </div>
          <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="My Briefs preferences">
                <Settings2 className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>My Briefs preferences</SheetTitle>
                <SheetDescription>
                  These preferences control what appears on this page and your brief notifications. Workspace publishing
                  settings are separate.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {enabledSubCount} of {SUBSCRIPTION_ORDER.length} brief types enabled.
                </p>
                <div className="grid gap-2">
                  {SUBSCRIPTION_ORDER.map((kind) => (
                    <div
                      key={kind}
                      className="flex items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <Label htmlFor={`pref-${kind}`} className="text-sm font-medium">
                          {BRIEF_KIND_LABELS[kind]}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          {kind === 'sweep_summary'
                            ? 'Off by default — tied to sweep runs.'
                            : kind === 'manual'
                              ? 'Team-authored briefs.'
                              : 'Automated when available.'}
                        </p>
                      </div>
                      <Switch
                        id={`pref-${kind}`}
                        checked={subMap.get(kind) ?? false}
                        disabled={pendingKind === kind}
                        onCheckedChange={(v) => void togglePref(kind, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search briefs..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="w-full sm:max-w-[280px]"
          aria-label="Search briefs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {filterCount > 0 ? (
            <Button type="button" variant="link" size="sm" className="h-8 px-1 text-xs" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Filter className="size-3.5" />
                Filters
                {filterCount > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {filterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4" align="end">
              <div className="space-y-2">
                <p className="text-xs font-medium">Brief types</p>
                <div className="grid gap-2">
                  {TYPE_FILTER_OPTIONS.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border"
                        checked={selectedTypes.has(t.id)}
                        onChange={(e) => toggleTypeFilter(t.id, e.target.checked)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Audience</p>
                <div className="grid gap-2">
                  {AUDIENCE_OPTIONS.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border"
                        checked={selectedAudience.has(a.id)}
                        onChange={(e) => toggleAudienceFilter(a.id, e.target.checked)}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Status</p>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={searchParams.get('status') ?? 'all'}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="unread">Unread only</option>
                  <option value="saved">Saved only</option>
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Date range</p>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={searchParams.get('from') ?? 'all'}
                  onChange={(e) => setFromFilter(e.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {data.noSubscriptions ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Choose which brief types you follow using the gear icon — then published briefs will appear here.
          </p>
          <Button type="button" className="mt-4" variant="secondary" onClick={() => setPrefsOpen(true)}>
            Open preferences
          </Button>
        </div>
      ) : data.emptyWorkspace ? (
        <div className="flex flex-col items-center rounded-lg border bg-card py-16 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Briefs from your team and automated sweeps will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/briefs/new">Write your first brief</Link>
          </Button>
        </div>
      ) : data.totalCount === 0 && data.emptyBecauseFilters ? (
        <div className="flex flex-col items-center rounded-lg border py-12 text-center">
          <p className="text-sm text-muted-foreground">No briefs match your filters. Clear filters to see everything.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : data.totalCount === 0 ? (
        <div className="rounded-lg border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No published briefs match your subscriptions yet. Enable more types in preferences or wait for the next
            sweep.
          </p>
        </div>
      ) : data.view === 'importance' ? (
        <div className="space-y-10">
          {data.newForYou.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold">New for you</h2>
                <p className="text-sm text-muted-foreground">
                  {data.newForYou.length} brief{data.newForYou.length === 1 ? '' : 's'} unread
                </p>
              </div>
              <ul className="space-y-3">{data.newForYou.map((c) => renderCard(c))}</ul>
              {data.newForYouOverflow > 0 ? (
                <Link
                  href={mergeHref(pathname, searchParams, { status: 'unread', view: null })}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View {data.newForYouOverflow} more new briefs →
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Recent</h2>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No read briefs in this view yet.</p>
            ) : (
              <>
                <ul className="space-y-3">{data.recent.map((c) => renderCard(c))}</ul>
                {data.hasMoreRecent ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={mergeHref(pathname, searchParams, {
                        roffset: String(data.recentOffset + 20),
                      })}
                    >
                      Load more
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </section>

          {data.archived.length > 0 ? (
            <Collapsible defaultOpen={false} className="group">
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-left text-xl font-semibold">
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
                Archived
                <Badge variant="secondary">{data.archived.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <ul className="space-y-3">{data.archived.map((c) => renderCard(c))}</ul>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      ) : data.view === 'chronological' ? (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">All briefs</h2>
          {data.chronological.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to show.</p>
          ) : (
            <>
              <ul className="space-y-3">{data.chronological.map((c) => renderCard(c))}</ul>
              {data.hasMoreChronological ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={mergeHref(pathname, searchParams, {
                      coffset: String(data.chronologicalOffset + 20),
                    })}
                  >
                    Load more
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {data.byType.map((sec) => (
            <section key={sec.sectionTitle} className="space-y-3">
              <h2 className="text-xl font-semibold">{sec.sectionTitle}</h2>
              <ul className="space-y-3">{sec.cards.map((c) => renderCard(c))}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export { MyBriefsClient as MyMarketBriefsClient }
