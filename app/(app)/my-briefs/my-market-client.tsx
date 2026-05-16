'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Check,
  ChevronDown,
  LayoutGrid,
  ListOrdered,
  Rows3,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { MyBriefsPagePayload } from '@/lib/brief/my-briefs-types'
import type { Brief, BriefKind } from '@/lib/types'
import { BRIEF_KIND_LABELS } from '@/lib/brief/brief-kind'
import { MyBriefCard } from '@/components/feature/brief/my-brief-card'
import { updateBriefSubscription } from '@/lib/brief/my-market-actions'
import { toast } from 'sonner'
import { ListViewLayout } from '@/components/list-view/list-view-layout'
import { ListViewSection } from '@/components/list-view/list-view-section'
import { ListControlBar } from '@/components/list-view/list-control-bar'
import { ListSearch } from '@/components/list-view/list-search'
import { ListViewToggle } from '@/components/list-view/list-view-toggle'
import { ListClearFilters } from '@/components/list-view/list-clear-filters'
import { ListFilters } from '@/components/list-view/list-filters'
import { ListEmptyState } from '@/components/list-view/list-empty-state'
import { mergeListViewHref } from '@/lib/utils/list-view-url'
import { useUserRecordStateBroadcast } from '@/lib/realtime/user-record-state'

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

export function MyBriefsClient({ data, userId }: { data: MyBriefsPagePayload; userId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [prefsOpen, setPrefsOpen] = React.useState(false)
  const [pendingKind, setPendingKind] = React.useState<BriefKind | null>(null)

  const onRecordStateEvent = React.useCallback(() => {
    router.refresh()
  }, [router])
  useUserRecordStateBroadcast(userId, onRecordStateEvent)

  const subMap = React.useMemo(() => {
    const m = new Map<BriefKind, boolean>()
    for (const s of data.subscriptions) m.set(s.brief_kind, s.subscribed)
    return m
  }, [data.subscriptions])

  const enabledSubCount = SUBSCRIPTION_ORDER.filter((k) => subMap.get(k)).length

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
      mergeListViewHref(pathname, searchParams, {
        types: next.size ? [...next].join(',') : null,
      })
    )
  }

  const toggleAudienceFilter = (id: Brief['audience'], checked: boolean) => {
    const next = new Set(selectedAudience)
    if (checked) next.add(id)
    else next.delete(id)
    router.push(
      mergeListViewHref(pathname, searchParams, {
        audience: next.size ? [...next].join(',') : null,
      })
    )
  }

  const setStatusFilter = (status: string) => {
    router.push(mergeListViewHref(pathname, searchParams, { status: status === 'all' ? null : status }))
  }

  const setFromFilter = (from: string) => {
    router.push(mergeListViewHref(pathname, searchParams, { from: from === 'all' ? null : from }))
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const filterCount = data.activeFilterCount

  const sweepSuffix = data.lastSweepRelative ? ` · Last sweep ${data.lastSweepRelative}` : ''

  const renderCard = (c: (typeof data.newForYou)[0]) => (
    <MyBriefCard key={c.brief.id} data={c} regulatoryTint={c.brief.briefKind === 'regulatory_summary'} />
  )

  const subtitle = (
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
  )

  return (
    <ListViewLayout
      className="mx-auto max-w-4xl px-4 py-6 md:px-6"
      title="Briefs"
      subtitle={subtitle}
      headerActions={
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ListViewToggle
            defaultId="importance"
            clearParams={['roffset', 'coffset']}
            options={[
              { id: 'importance', label: 'Importance', icon: <LayoutGrid className="size-3.5" /> },
              { id: 'type', label: 'By type', icon: <Rows3 className="size-3.5" /> },
              { id: 'chronological', label: 'Chronological', icon: <ListOrdered className="size-3.5" /> },
            ]}
          />
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
      }
      controlBar={
        <ListControlBar>
        <ListSearch
          placeholder="Search briefs..."
          initialValue={data.searchQuery}
          className="w-full sm:max-w-[280px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <ListClearFilters activeCount={filterCount} />
          <ListFilters activeCount={filterCount}>
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
          </ListFilters>
        </div>
        </ListControlBar>
      }
    >
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
        <ListEmptyState variant="filtered_empty" recordLabel="briefs" clearFiltersHref={pathname} />
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
            <ListViewSection
              title="New for you"
              subtitle={`${data.newForYou.length} brief${data.newForYou.length === 1 ? '' : 's'} unread`}
            >
              <ul className="space-y-3">{data.newForYou.map((c) => renderCard(c))}</ul>
              {data.newForYouOverflow > 0 ? (
                <Link
                  href={mergeListViewHref(pathname, searchParams, { status: 'unread', view: null })}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View {data.newForYouOverflow} more new briefs →
                </Link>
              ) : null}
            </ListViewSection>
          ) : null}

          <ListViewSection title="Recent">
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No read briefs in this view yet.</p>
            ) : (
              <>
                <ul className="space-y-3">{data.recent.map((c) => renderCard(c))}</ul>
                {data.hasMoreRecent ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={mergeListViewHref(pathname, searchParams, {
                        roffset: String(data.recentOffset + 20),
                      })}
                    >
                      Load more
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </ListViewSection>

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
        <ListViewSection title="All briefs">
          {data.chronological.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to show.</p>
          ) : (
            <>
              <ul className="space-y-3">{data.chronological.map((c) => renderCard(c))}</ul>
              {data.hasMoreChronological ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={mergeListViewHref(pathname, searchParams, {
                      coffset: String(data.chronologicalOffset + 20),
                    })}
                  >
                    Load more
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </ListViewSection>
      ) : (
        <div className="space-y-10">
          {data.byType.map((sec) => (
            <ListViewSection key={sec.sectionTitle} title={sec.sectionTitle}>
              <ul className="space-y-3">{sec.cards.map((c) => renderCard(c))}</ul>
            </ListViewSection>
          ))}
        </div>
      )}
    </ListViewLayout>
  )
}

export { MyBriefsClient as MyMarketBriefsClient }
