'use client'

import * as React from 'react'
import Link from 'next/link'
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
import type { MISScore } from '@/lib/types'
import type { WorkspaceSubscription, TrialUsageStats } from '@/lib/billing-types'

// Toggle this to demo different states: 'active_trial' | 'expired_read_only'
const DEMO_STATE: 'active_trial' | 'expired_read_only' = 'active_trial'

// Mock subscription for trial/read-only module
const mockSubscriptions: Record<string, WorkspaceSubscription> = {
  active_trial: {
    planId: 'trial',
    status: 'active',
    billingInterval: null,
    currentPeriodStart: '2026-05-03T00:00:00Z',
    currentPeriodEnd: '2026-05-17T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'active',
    trialStartedAt: '2026-05-03T00:00:00Z',
    trialEndsAt: '2026-05-17T00:00:00Z',
    trialDaysRemaining: 12,
    aiCostUsedCents: 800,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 20,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
  expired_read_only: {
    planId: 'trial',
    status: 'read_only',
    billingInterval: null,
    currentPeriodStart: '2026-04-19T00:00:00Z',
    currentPeriodEnd: '2026-05-03T00:00:00Z',
    cancelAtPeriodEnd: false,
    trialStatus: 'expired',
    trialStartedAt: '2026-04-19T00:00:00Z',
    trialEndsAt: '2026-05-02T00:00:00Z', // Expired 3 days ago
    trialDaysRemaining: 0,
    readOnlySince: '2026-05-02T00:00:00Z',
    aiCostUsedCents: 2400,
    aiCostCeilingCents: 4000,
    aiCostPercentUsed: 60,
    analystSeatsUsed: 1,
    analystSeatsLimit: 1,
  },
}

const mockSubscription = mockSubscriptions[DEMO_STATE]

// Mock usage stats for read-only module
const mockUsageStats: TrialUsageStats = {
  competitorsAdded: 4,
  sweepsRun: 14,
  itemsReviewed: 87,
  briefsAuthored: 2,
  battleCardsCreated: 1,
}

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
// SEED DATA - Based on Acme Logistics, FreightHero, RouteIQ, ChainShield
// =============================================================================

const competitors = [
  { id: '1', name: 'Acme Logistics', initial: 'AL' },
  { id: '2', name: 'FreightHero', initial: 'FH' },
  { id: '3', name: 'RouteIQ', initial: 'RQ' },
  { id: '4', name: 'ChainShield', initial: 'CS' },
]

const topics = ['FMCSA compliance', 'Last-mile automation', 'ELD integration', 'Freight brokerage']

// Top of Feed - 5-7 highest-scoring items in last 24 hours
const topFeedItems: {
  id: string
  title: string
  competitor: typeof competitors[0]
  mis: MISScore
  timestamp: string
}[] = [
  {
    id: '1',
    title: 'Acme Logistics announces $120M Series D led by Andreessen Horowitz',
    competitor: competitors[0],
    mis: { value: 87, band: 'critical', confidence: 'high' },
    timestamp: '2h ago',
  },
  {
    id: '2',
    title: 'FreightHero acquires last-mile startup DeliverNow for $45M',
    competitor: competitors[1],
    mis: { value: 82, band: 'critical', confidence: 'high' },
    timestamp: '4h ago',
  },
  {
    id: '3',
    title: 'RouteIQ launches AI route optimization beating industry benchmarks by 23%',
    competitor: competitors[2],
    mis: { value: 76, band: 'high', confidence: 'high' },
    timestamp: '6h ago',
  },
  {
    id: '4',
    title: 'ChainShield partners with Walmart for cold chain monitoring pilot',
    competitor: competitors[3],
    mis: { value: 74, band: 'high', confidence: 'medium' },
    timestamp: '8h ago',
  },
  {
    id: '5',
    title: 'Acme Logistics hiring 200+ engineers for autonomous fleet division',
    competitor: competitors[0],
    mis: { value: 71, band: 'high', confidence: 'high' },
    timestamp: '12h ago',
  },
  {
    id: '6',
    title: 'FreightHero CEO keynote at LogiTech Summit on "Future of Freight"',
    competitor: competitors[1],
    mis: { value: 68, band: 'high', confidence: 'high' },
    timestamp: '18h ago',
  },
]

// Latest Briefs
const recentBriefs = [
  {
    id: '1',
    title: 'Q2 Competitive Landscape Summary',
    audience: 'Leadership',
    priority: 'high',
    author: 'Sarah Chen',
    timestamp: '2 days ago',
  },
  {
    id: '2',
    title: 'Acme Logistics Deep Dive',
    audience: 'Sales',
    priority: 'medium',
    author: 'Mike Torres',
    timestamp: '4 days ago',
  },
  {
    id: '3',
    title: 'FMCSA Compliance Update',
    audience: 'Product',
    priority: 'high',
    author: 'Lisa Wang',
    timestamp: '1 week ago',
  },
]

// Competitor Activity Heatmap (last 7 days item counts)
const competitorActivity = [
  { competitor: competitors[0], count: 34 },
  { competitor: competitors[1], count: 28 },
  { competitor: competitors[2], count: 19 },
  { competitor: competitors[3], count: 12 },
]

// Battle Card Freshness
const battleCards = [
  { id: '1', competitor: competitors[0], staleSections: 3, newItems: 12 },
  { id: '2', competitor: competitors[1], staleSections: 0, newItems: 8 },
  { id: '3', competitor: competitors[2], staleSections: 2, newItems: 5 },
  { id: '4', competitor: competitors[3], staleSections: 0, newItems: 3 },
  { id: '5', competitor: { id: '5', name: 'LogiPrime', initial: 'LP' }, staleSections: 0, newItems: 0 },
  { id: '6', competitor: { id: '6', name: 'FastFreight', initial: 'FF' }, staleSections: 0, newItems: 0 },
]

// Topic Activity (last 7 days)
const topicActivity = [
  { name: 'FMCSA compliance', count: 18, trend: 'up' as const, delta: 6 },
  { name: 'Last-mile automation', count: 24, trend: 'up' as const, delta: 8 },
  { name: 'ELD integration', count: 9, trend: 'down' as const, delta: -3 },
  { name: 'Freight brokerage', count: 15, trend: 'neutral' as const, delta: 0 },
]

// Customer Voice Pulse (sentiment over 30 days)
const customerVoice = [
  { name: 'Your Company', sentiment: 'positive' as const, score: 72, delta: 5 },
  { competitor: competitors[0], sentiment: 'mixed' as const, score: 48, delta: -8 },
  { competitor: competitors[1], sentiment: 'positive' as const, score: 65, delta: 3 },
]

// Channel Roll-up (top 5 channels this week)
const channelActivity = [
  { name: 'FreightWaves', type: 'publication', mentions: 12 },
  { name: 'Supply Chain Dive', type: 'publication', mentions: 9 },
  { name: 'Logistics Management', type: 'publication', mentions: 7 },
  { name: 'Manifest Conference', type: 'conference', mentions: 5 },
  { name: 'Trucks & Tech Podcast', type: 'podcast', mentions: 4 },
]

// Regulatory Watch
const regulatoryItems = [
  { date: 'May 15', title: 'FMCSA ELD mandate Phase 3 effective date', type: 'effective' as const },
  { date: 'May 22', title: 'DOT autonomous vehicle comment period closes', type: 'deadline' as const },
  { date: 'Jun 1', title: 'EPA emissions standards update', type: 'effective' as const },
]

// Suggested Competitors (only shows when not empty)
const suggestedCompetitors = [
  {
    id: '1',
    name: 'TransitPro',
    confidence: 78,
    summary: 'Regional player expanding nationally, 3 mentions in competitor earnings calls',
  },
]

// =============================================================================
// DASHBOARD PAGE
// =============================================================================

export default function DashboardPage() {
  const [sweepRunning, setSweepRunning] = React.useState(false)

  // Calculate stats
  const staleCards = battleCards.filter((c) => c.staleSections > 0)
  const reviewQueueCount = 7 // Low-score items awaiting review

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
            {greeting}, Sarah
          </h1>
          <p className="text-muted-foreground mt-1">
            {topFeedItems.length} new items since yesterday
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSweepRunning(true)}
            disabled={sweepRunning}
          >
            {sweepRunning ? (
              <RefreshCw className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Trial or Read-Only Dashboard Module - full-width, above everything else */}
      {mockSubscription.status === 'read_only' ? (
        <ReadOnlyDashboardModule 
          subscription={mockSubscription}
          usageStats={mockUsageStats}
        />
      ) : (
        <TrialDashboardModule 
          subscription={mockSubscription}
          competitorsAdded={mockUsageStats.competitorsAdded}
          sweepsRun={mockUsageStats.sweepsRun}
          itemsReviewed={mockUsageStats.itemsReviewed}
          hasBattleCard={mockUsageStats.battleCardsCreated > 0}
        />
      )}

      {/* Suggested Competitors Banner (only when not empty) */}
      {suggestedCompetitors.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Suggested Competitors
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {suggestedCompetitors.map((sc) => (
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
            title="What's New"
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
              {topFeedItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/feed?item=${item.id}`}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <MISBadge score={item.mis} size="sm" showConfidence={false} />
                  <span className="flex-1 text-sm font-medium truncate group-hover:text-accent transition-colors">
                    {item.title}
                  </span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {item.competitor.initial}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-12 text-right">
                    {item.timestamp}
                  </span>
                </Link>
              ))}
            </div>
          </DashboardModule>
        </div>

        {/* SWEEP STATUS - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Sweep Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-positive animate-pulse" />
                  <span className="text-sm text-muted-foreground">Last sweep</span>
                </div>
                <span className="text-sm font-medium">14 minutes ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next scheduled</span>
                <span className="text-sm font-medium">in 46 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Items found</span>
                <span className="text-sm font-medium font-mono">23</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                disabled={sweepRunning}
                onClick={() => {
                  setSweepRunning(true)
                  setTimeout(() => setSweepRunning(false), 3000)
                }}
              >
                {sweepRunning ? (
                  <>
                    <RefreshCw className="size-3 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="size-3 mr-2" />
                    Run sweep now
                  </>
                )}
              </Button>
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
                  <span className="text-4xl font-semibold font-mono text-accent">64%</span>
                  <span className="text-sm text-muted-foreground ml-2">last 90 days</span>
                </div>
                {/* Simple sparkline placeholder */}
                <div className="flex items-end gap-0.5 h-8">
                  {[58, 62, 60, 65, 63, 64, 66, 64].map((v, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-accent/30 rounded-t"
                      style={{ height: `${(v - 55) * 3}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">vs FreightHero</span>
                  <span className="flex items-center gap-1 text-positive">
                    <ArrowUpRight className="size-3" />
                    +8%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">vs Acme Logistics</span>
                  <span className="flex items-center gap-1 text-negative">
                    <ArrowDownRight className="size-3" />
                    -4%
                  </span>
                </div>
              </div>
            </Link>
          </DashboardModule>
        </div>

        {/* COMPETITOR ACTIVITY HEATMAP - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Competitor Activity">
            <div className="space-y-2.5">
              {competitorActivity.map((item) => {
                const maxCount = Math.max(...competitorActivity.map((c) => c.count))
                const widthPercent = (item.count / maxCount) * 100

                return (
                  <div key={item.competitor.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 truncate">
                      {item.competitor.name}
                    </span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-6 text-right">{item.count}</span>
                  </div>
                )
              })}
              <p className="text-[10px] text-muted-foreground pt-1">Items in last 7 days</p>
            </div>
          </DashboardModule>
        </div>

        {/* BATTLE CARD FRESHNESS - 4 cols, 1 row */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <DashboardModule title="Battle Cards">
            {staleCards.length === 0 ? (
              <div className="flex items-center gap-2 text-positive">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">All {battleCards.length} battle cards current</span>
              </div>
            ) : (
              <div className="space-y-2">
                {staleCards.slice(0, 3).map((card) => (
                  <Link
                    key={card.id}
                    href={`/battle-cards/${card.id}`}
                    className="flex items-center justify-between py-1.5 hover:text-accent transition-colors"
                  >
                    <span className="text-sm">{card.competitor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {card.staleSections > 0 && `${card.staleSections} stale sections`}
                      {card.staleSections > 0 && card.newItems > 0 && ' · '}
                      {card.newItems > 0 && `${card.newItems} new items`}
                    </span>
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
              {topicActivity.map((topic) => (
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
