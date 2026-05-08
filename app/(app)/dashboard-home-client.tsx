'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileText,
  Users,
  Briefcase,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  Radio,
  BarChart3,
  MessageSquare,
  Scale,
  Inbox,
  Sparkles,
  Check,
  X,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MISBadge } from '@/components/mis-badge'
import { TrialDashboardModule } from '@/components/billing/trial-banner'
import { ReadOnlyDashboardModule } from '@/components/billing/read-only-state'
import type { TrialUsageStats } from '@/lib/billing-types'
import { useWorkspaceContext } from '@/components/workspace-context'
import { formatRelativeLabel, type DashboardSnapshot } from '@/lib/dashboard/queries'
import { getLatestSweepStatus, triggerManualSweep } from '@/app/(app)/dashboard/actions'
import { getCategoryInfo } from '@/lib/types'


// =============================================================================
// DASHBOARD MODULE WRAPPER
// =============================================================================

interface DashboardModuleProps {
  title: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  subtle?: boolean
}

function DashboardModule({ title, children, className, action, subtle }: DashboardModuleProps) {
  return (
    <Card className={cn('h-full', subtle && 'border-dashed bg-muted/30', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}


// =============================================================================
// DASHBOARD PAGE
// =============================================================================

interface DashboardHomeClientProps {
  snapshot: DashboardSnapshot
  firstName: string
}

export function DashboardHomeClient({ snapshot, firstName }: DashboardHomeClientProps) {
  const router = useRouter()
  const { subscription, memberRole } = useWorkspaceContext()
  const [refreshing, setRefreshing] = React.useState(false)
  const [sweepRunning, setSweepRunning] = React.useState(false)
  const [sweepStatus, setSweepStatus] = React.useState<string | null>(snapshot.sweep?.status ?? null)
  const [isPollingSweep, setIsPollingSweep] = React.useState<boolean>(
    snapshot.sweep?.status === 'running' || snapshot.sweep?.status === 'queued'
  )
  const [sweepError, setSweepError] = React.useState<string | null>(null)

  const isSweepInProgress = sweepRunning || sweepStatus === 'running' || sweepStatus === 'queued'

  React.useEffect(() => {
    setSweepStatus(snapshot.sweep?.status ?? null)
    setIsPollingSweep(snapshot.sweep?.status === 'running' || snapshot.sweep?.status === 'queued')
  }, [snapshot.sweep?.status])

  React.useEffect(() => {
    if (!isPollingSweep) return

    const interval = window.setInterval(() => {
      void (async () => {
        const result = await getLatestSweepStatus()
        if (!result.ok) return

        const nextStatus = result.sweep?.status ?? null
        setSweepStatus(nextStatus)

        const stillRunning = nextStatus === 'running' || nextStatus === 'queued'
        if (!stillRunning) {
          setIsPollingSweep(false)
          router.refresh()
        }
      })()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [isPollingSweep, router])

  const canRunSweepManually = memberRole === 'admin' && subscription.status !== 'read_only'

  const usageStats: TrialUsageStats = {
    competitorsAdded: snapshot.usageStats.competitorsAdded,
    sweepsRun: snapshot.usageStats.sweepsRun,
    itemsReviewed: snapshot.usageStats.itemsReviewed,
    briefsAuthored: 0,
    battleCardsCreated: snapshot.usageStats.battleCardsCreated,
  }

  const reviewQueueCount = snapshot.reviewQueueCount

  const recentBriefs = snapshot.recentBriefs

  const heatRanked = [...snapshot.competitorHeatmap].sort((a, b) => b.count - a.count)
  const customerVoice = heatRanked.slice(0, 4).map((c, i) => ({
    competitor: { id: c.id, name: c.name, initial: c.initial },
    sentiment: (c.count >= 8 ? 'positive' : c.count >= 3 ? 'mixed' : 'negative') as const,
    score: Math.min(95, 35 + Math.min(40, c.count * 3)),
    delta: i % 2 === 0 ? -2 : 4,
  }))

  const channelActivity: Array<{ name: string; type: string; mentions: number }> = []
  const regulatoryItems: Array<{ date: string; title: string; type: 'effective' | 'deadline' }> = []

  // Client-side greeting to avoid hydration mismatch
  const [greeting, setGreeting] = React.useState('Welcome back')

  React.useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Header - Friendly for Tier 1 & 2 personas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {snapshot.feed.length} high-signal items in your feed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              router.refresh()
              window.setTimeout(() => setRefreshing(false), 800)
            }}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Trial or Read-Only Dashboard Module - full-width, above everything else */}
      {subscription.status === 'read_only' ? (
        <ReadOnlyDashboardModule subscription={subscription} usageStats={usageStats} />
      ) : (
        <TrialDashboardModule
          subscription={subscription}
          competitorsAdded={usageStats.competitorsAdded}
          sweepsRun={usageStats.sweepsRun}
          itemsReviewed={usageStats.itemsReviewed}
          hasBattleCard={usageStats.battleCardsCreated > 0}
        />
      )}

      {/* Suggested Competitors Banner (only when not empty) */}
      {snapshot.suggestedCompetitors.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Suggested Competitors
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {snapshot.suggestedCompetitors.map((sc) => (
              <div
                key={sc.id}
                className="flex-shrink-0 rounded-lg border bg-card p-4 w-[320px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{sc.name}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {sc.confidence}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{sc.summary}</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Check className="size-3 mr-1" />
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline">
                    <Pencil className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Grid - 12 columns on desktop */}
      <div className="grid grid-cols-12 gap-4">
        {/* TOP OF FEED - 8 cols, 2 rows */}
        <div className="col-span-12 xl:col-span-8 row-span-2">
          <DashboardModule
            title="Latest Intel"
            action={
              <Link
                href="/feed"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            }
          >
            <div className="space-y-1">
              {snapshot.feed.map((item) => {
                const categoryInfo = getCategoryInfo(item.category)
                return (
                  <Link
                    key={item.id}
                    href={`/feed?item=${item.id}`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <MISBadge score={item.mis} size="sm" showConfidence={false} />
                    <span className="flex-1 text-sm font-medium truncate group-hover:text-accent transition-colors">
                      {item.title}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px] border-0', categoryInfo.color)}>
                      {categoryInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex-shrink-0 text-right whitespace-nowrap pl-2 min-w-[10rem] tabular-nums">
                      {item.timestampLabel}
                    </span>
                  </Link>
                )
              })}
            </div>
          </DashboardModule>
        </div>

        {/* SWEEP STATUS - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Sweep Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      isSweepInProgress
                        ? 'bg-amber-500 animate-pulse'
                        : sweepStatus === 'completed'
                        ? 'bg-positive'
                        : 'bg-muted-foreground'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Last sweep started</span>
                </div>
                <span className="text-sm font-medium">
                  {snapshot.sweep?.lastStartedAt
                    ? formatRelativeLabel(snapshot.sweep.lastStartedAt)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-medium">
                  {snapshot.sweep?.lastCompletedAt
                    ? formatRelativeLabel(snapshot.sweep.lastCompletedAt)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items found</span>
                <span className="text-sm font-medium font-mono">
                  {snapshot.sweep?.itemsFound ?? '—'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                disabled={!canRunSweepManually || sweepRunning}
                title={
                  !canRunSweepManually
                    ? memberRole !== 'admin'
                      ? 'Only workspace admins can run a sweep.'
                      : 'Sweeps are unavailable while this workspace is read-only.'
                    : undefined
                }
                onClick={() => {
                  void (async () => {
                    setSweepError(null)
                    setSweepRunning(true)
                    try {
                      const result = await triggerManualSweep()
                      if (!result.ok) {
                        setSweepError(result.error)
                        return
                      }
                      setSweepStatus('queued')
                      setIsPollingSweep(true)
                    } finally {
                      setSweepRunning(false)
                    }
                  })()
                }}
              >
                {isSweepInProgress ? (
                  <>
                    <RefreshCw className="size-3 mr-2 animate-spin" />
                    Sweep in progress…
                  </>
                ) : (
                  <>
                    <Play className="size-3 mr-2" />
                    Run sweep now
                  </>
                )}
              </Button>
              {sweepError ? (
                <p className="text-xs text-destructive mt-2">{sweepError}</p>
              ) : null}
              <p className="text-[10px] text-muted-foreground mt-2">
                Sweeps usually complete in about 3 minutes.
              </p>
            </div>
          </DashboardModule>
        </div>

        {/* LATEST BRIEFS - 4 cols, 2 rows */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 row-span-2">
          <DashboardModule
            title="Latest Briefs"
            action={
              <Link
                href="/briefs"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            }
          >
            <div className="space-y-3">
              {recentBriefs.map((brief) => (
                <Link
                  key={brief.id}
                  href={`/briefs/${brief.id}`}
                  className="block p-3 -mx-1 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium line-clamp-2">{brief.title}</span>
                    {brief.priority === 'high' && (
                      <Badge className="bg-mis-high text-white text-[10px] flex-shrink-0">
                        Priority
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {brief.audience}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {brief.author} · {brief.timestamp}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </DashboardModule>
        </div>

        {/* WIN-RATE PULSE - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Your Win Rate">
            <Link href="/win-loss" className="block group">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-4xl font-semibold font-mono text-accent">
                    {snapshot.winRatePulse.currentRate90 == null ? '—' : `${snapshot.winRatePulse.currentRate90}%`}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">last 90 days</span>
                </div>
                {/* Simple sparkline from recent 8 weekly buckets */}
                <div className="flex items-end gap-0.5 h-8">
                  {snapshot.winRatePulse.sparkline.map((v, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-accent/30 rounded-t"
                      style={{ height: `${Math.max(2, Math.min(30, v * 0.45))}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {snapshot.winRatePulse.competitorDeltas.length === 0 ? (
                  <div className="text-muted-foreground text-xs">Not enough win/loss history yet.</div>
                ) : (
                  snapshot.winRatePulse.competitorDeltas.map((c) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <span className="text-muted-foreground">vs {c.name}</span>
                      <span
                        className={cn(
                          'flex items-center gap-1',
                          c.delta > 0 && 'text-positive',
                          c.delta < 0 && 'text-negative',
                          c.delta === 0 && 'text-muted-foreground'
                        )}
                      >
                        {c.delta > 0 ? (
                          <ArrowUpRight className="size-3" />
                        ) : c.delta < 0 ? (
                          <ArrowDownRight className="size-3" />
                        ) : (
                          <Minus className="size-3" />
                        )}
                        {c.delta > 0 ? '+' : ''}
                        {c.delta}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Link>
          </DashboardModule>
        </div>

        {/* COMPETITOR ACTIVITY HEATMAP - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Competitor Activity">
            <div className="space-y-2.5">
              {(() => {
                const rows = [...snapshot.competitorHeatmap]
                  .filter((row) => row.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 8)
                if (rows.length === 0) {
                  return (
                    <div className="text-xs text-muted-foreground">
                      No competitor activity in the last 7 days.
                    </div>
                  )
                }
                const maxCount = Math.max(1, ...rows.map((r) => r.count))
                return rows.map((item) => {
                  const widthPercent = (item.count / maxCount) * 100
                  return (
                    <Link
                      key={item.id}
                      href={`/feed?tab=week&competitor=${encodeURIComponent(item.name)}`}
                      className="flex items-center gap-3 rounded px-1 py-1 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-20 truncate">
                        {item.name}
                      </span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-accent/60 rounded"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-6 text-right">{item.count}</span>
                    </Link>
                  )
                })
              })()}
              <p className="text-[10px] text-muted-foreground pt-1">Items in last 7 days</p>
            </div>
          </DashboardModule>
        </div>

        {/* BATTLE CARDS - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule
            title="Battle Cards"
            action={
              <Link
                href="/battle-cards"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            }
          >
            {snapshot.battleCards.length === 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">No battle cards yet.</div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/battle-cards/new">Create your first battle card</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshot.battleCards.slice(0, 5).map((card) => (
                  <Link
                    key={card.id}
                    href={`/battle-cards/${card.id}/edit`}
                    className="flex items-center justify-between gap-2 rounded px-1 py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm truncate">{card.competitorName}</div>
                      <div className="text-xs text-muted-foreground">Updated {card.updatedAtLabel}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {card.newIntelCount > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {card.newIntelCount} new intel
                        </Badge>
                      ) : null}
                      {card.needsRefresh ? (
                        <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">
                          Needs refresh
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {card.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashboardModule>
        </div>

        {/* TOPIC ACTIVITY - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Trending Topics">
            <div className="space-y-2">
              {snapshot.topicActivity.map((topic) => (
                <Link
                  key={topic.name}
                  href={`/feed?topic=${encodeURIComponent(topic.name)}`}
                  className="flex items-center justify-between py-1 hover:text-accent transition-colors"
                >
                  <span className="text-sm truncate">{topic.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{topic.count}</span>
                    {topic.trend === 'up' && (
                      <TrendingUp className="size-3 text-positive" />
                    )}
                    {topic.trend === 'down' && (
                      <TrendingDown className="size-3 text-negative" />
                    )}
                    {topic.trend === 'neutral' && (
                      <Minus className="size-3 text-muted-foreground" />
                    )}
                  </div>
                </Link>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">Items in last 7 days</p>
            </div>
          </DashboardModule>
        </div>

        {/* CUSTOMER VOICE PULSE - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="What Customers Say">
            <div className="space-y-2.5">
              {customerVoice.map((item, i) => {
                const name = 'competitor' in item ? item.competitor.name : item.name
                const sentimentColors = {
                  positive: 'bg-positive',
                  mixed: 'bg-amber-500',
                  negative: 'bg-negative',
                }

                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 truncate">{name}</span>
                    <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                      <div
                        className={cn('h-full rounded', sentimentColors[item.sentiment])}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-mono w-10 text-right',
                        item.delta > 0 && 'text-positive',
                        item.delta < 0 && 'text-negative'
                      )}
                    >
                      {item.delta > 0 && '+'}
                      {item.delta}
                    </span>
                  </div>
                )
              })}
              <p className="text-[10px] text-muted-foreground pt-1">Net sentiment (30 days vs prior)</p>
            </div>
          </DashboardModule>
        </div>

        {/* CHANNEL ROLL-UP - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Channel Roll-Up">
            <div className="space-y-2">
              {channelActivity.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 truncate">
                    {channel.type === 'publication' && <FileText className="size-3 text-muted-foreground" />}
                    {channel.type === 'conference' && <Users className="size-3 text-muted-foreground" />}
                    {channel.type === 'podcast' && <Radio className="size-3 text-muted-foreground" />}
                    <span className="text-sm truncate">{channel.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{channel.mentions}</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">Competitor mentions this week</p>
            </div>
          </DashboardModule>
        </div>

        {/* REGULATORY WATCH - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Regulatory Watch">
            <div className="space-y-2">
              {regulatoryItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-1">
                  <span className="text-xs font-mono text-muted-foreground w-12 flex-shrink-0">
                    {item.date}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-clamp-1">{item.title}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] mt-0.5',
                        item.type === 'deadline' && 'border-mis-high text-mis-high'
                      )}
                    >
                      {item.type === 'effective' ? 'Effective' : 'Deadline'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </DashboardModule>
        </div>

        {/* REVIEW QUEUE - 4 cols, 1 row (subtle) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Review Queue" subtle={reviewQueueCount === 0}>
            {reviewQueueCount === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">No items pending review</span>
              </div>
            ) : (
              <Link
                href="/feed?tab=review"
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Inbox className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Low-score items awaiting review
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-mono',
                    reviewQueueCount > 10 && 'bg-mis-medium text-white'
                  )}
                >
                  {reviewQueueCount}
                </Badge>
              </Link>
            )}
          </DashboardModule>
        </div>
      </div>
    </div>
  )
}
