'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ChevronDown, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MISBadge } from '@/components/mis-badge'

// Types
interface ProofPoint {
  id: string
  customer: string
  switchedFrom: string
  quote: string
  outcome?: string
}

interface Objection {
  objection: string
  response: string
}

interface RecentActivityItem {
  id: string
  title: string
  time: string
  score: number
}

interface TalkTrack {
  scenario: string
  content: string
}

interface RepBattleCard {
  competitorName: string
  tier: string
  lastReviewed: string
  isStale: boolean
  segments?: string[]
  tldr: {
    theyPosition: string
    weCounter: string
    remember: string
  }
  whyWeWin: {
    point: string
    evidenceId?: string
  }[]
  objections: Objection[]
  trapQuestions: string[]
  whyTheyWin: {
    point: string
    evidenceId?: string
  }[]
  proofPoints: ProofPoint[]
  pricing: {
    theirs: string
    ours: string
  }
  recentActivity: RecentActivityItem[]
  talkTracks: TalkTrack[]
}

// Mock data - Acme Logistics
const battleCard: RepBattleCard = {
  competitorName: 'Acme Logistics',
  tier: 'Primary Direct',
  lastReviewed: '6 days ago',
  isStale: false,
  segments: ['Enterprise', 'Mid-Market'],
  tldr: {
    theyPosition: "They position as 'the AI-native TMS for mid-market'",
    weCounter: 'We counter: AI is table stakes; what wins is integration depth and implementation speed',
    remember: 'Their G2 reviews show implementation complaints up 14% — surface this naturally',
  },
  whyWeWin: [
    { point: '**27% faster** average implementation (8 weeks vs 11)', evidenceId: '1' },
    { point: 'Native integrations with **14 legacy WMS platforms** — they have 4', evidenceId: '2' },
    { point: '**Transparent pricing** — published online, no surprise tiers', evidenceId: '3' },
    { point: '**24/7 support included** in standard plan; theirs is upsell only', evidenceId: '4' },
    { point: 'Customer-led **product roadmap** with public voting', evidenceId: '5' },
  ],
  objections: [
    {
      objection: "They have native AI; you don't",
      response: "We have AI in routing optimization and exception detection — both production-ready. Their AI is positioned more aggressively in marketing than in product. Ask the prospect what specific AI capability they need; we'll show them ours.",
    },
    {
      objection: 'Their UI is more modern',
      response: "Acknowledge it openly — their dispatcher UI is well-designed. Then pivot: 'When you're managing 200 trucks, the question isn't UI polish, it's integration depth and reliability. Their G2 reviews flag both as recent issues.'",
    },
    {
      objection: "They just raised $120M; you're smaller",
      response: "We've grown 67% YoY profitably. Their burn rate at this round suggests aggressive expansion that may pressure pricing and support quality — both of which are recent G2 themes. Ask the prospect: 'Would you rather buy from a profitable company or a fundraising one?'",
    },
    {
      objection: 'They have more enterprise references',
      response: "True in Fortune 500 logos, but dig deeper: their mid-market churn rate is 18% vs our 6%. Enterprise references don't translate to mid-market success. Ask for references in their size band.",
    },
    {
      objection: 'Their pricing is more flexible',
      response: "Flexible often means opaque. We publish pricing online — prospects know what they're getting. Ask them to get a written quote from Acme with 3-year pricing guarantees. They won't.",
    },
  ],
  trapQuestions: [
    'How important is sub-30-day implementation to your timeline?',
    'Have you talked with any of their customers about support response times in the last 6 months?',
    "What's your fallback if pricing changes mid-contract?",
    'Do you need integration with any WMS that was built before 2015?',
    'How do you feel about paying extra for 24/7 support?',
  ],
  whyTheyWin: [
    { point: "Strong AI/ML brand and marketing — felt as more 'modern'", evidenceId: '6' },
    { point: 'Better dispatcher UX in side-by-side demos', evidenceId: '7' },
    { point: 'Larger sales team and more enterprise references', evidenceId: '8' },
  ],
  proofPoints: [
    {
      id: '1',
      customer: 'MidWest Freight Co.',
      switchedFrom: 'Acme Logistics',
      quote: "Implementation took 6 weeks instead of the 14 we were quoted by Acme. That's 2 months of value we didn't leave on the table.",
      outcome: '32% reduction in detention fees',
    },
    {
      id: '2',
      customer: 'Pacific Supply Chain',
      switchedFrom: 'Legacy TMS',
      quote: 'The WMS integration just worked. No custom middleware, no consultants. It was the fastest go-live in our history.',
      outcome: 'Live in 4 weeks',
    },
    {
      id: '3',
      customer: 'Northeast Carriers',
      switchedFrom: 'Acme Logistics',
      quote: "When our main dispatch center went down at 2 AM, I had a senior engineer on the phone in 8 minutes. That doesn't happen with Acme unless you're paying extra.",
      outcome: '99.97% uptime in Year 1',
    },
  ],
  pricing: {
    theirs: 'Tiered by truck count, mid-market $40K+ ARR. Support packages are upsells ($8K-15K/year for 24/7). Pricing not published; requires sales call.',
    ours: 'Flat per-user pricing, $32K-$48K typical mid-market ARR. All support tiers included. Pricing published on website with calculator.',
  },
  recentActivity: [
    { id: '1', title: '$120M Series D announcement', time: '2 days ago', score: 87 },
    { id: '2', title: 'New VP Sales hire from FedEx', time: '5 days ago', score: 72 },
    { id: '3', title: 'G2 Winter report positioning', time: '1 week ago', score: 65 },
    { id: '4', title: 'Partnership with SAP announced', time: '2 weeks ago', score: 58 },
  ],
  talkTracks: [
    {
      scenario: 'Greenfield discovery',
      content: "Start with their pain points around implementation timelines. Most mid-market shippers have been burned by long, expensive rollouts. Lead with our 8-week average and the MidWest Freight case study. Don't mention Acme unless they do — let them bring up the competition.",
    },
    {
      scenario: 'Late-stage objection',
      content: "At this stage, they've likely already seen Acme's demo. Acknowledge their UI is polished. Then pivot to total cost of ownership: 'Have you gotten a written 3-year pricing commitment from them? Have you talked to a customer their size about support response times?' Plant seeds of doubt on the things that matter.",
    },
    {
      scenario: 'Technical buyer',
      content: "Lead with integrations. Acme has 4 native WMS connectors; we have 14. Ask about their current stack — chances are we have a direct integration and they don't. For API discussions, highlight our sub-100ms response times and 99.99% API uptime.",
    },
    {
      scenario: 'Business buyer',
      content: "CFOs and VPs of Ops care about TCO and risk. Lead with profitability story: 'We're growing 67% YoY without burning cash. Companies raising $120M rounds have pressure to grow at all costs.' Then hit pricing transparency and included support.",
    },
  ],
}

// Evidence Sheet component
function EvidenceSheet({ evidenceId, children }: { evidenceId: string; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-1 text-accent hover:underline">
          {children}
          <ExternalLink className="size-3" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Supporting Evidence</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Evidence item #{evidenceId} — linked from intelligence feed
          </p>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm">
              This would show the full intelligence item or proof point that supports this claim.
              In production, this pulls from the feed database.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Proof Point Sheet
function ProofPointSheet({ proofPoint }: { proofPoint: ProofPoint }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="w-full text-left p-4 rounded-lg bg-card border border-border hover:border-accent/50 transition-colors active:bg-muted">
          <p className="font-medium text-sm">{proofPoint.customer}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switched from {proofPoint.switchedFrom}
          </p>
          <p className="text-sm mt-2 line-clamp-2">&ldquo;{proofPoint.quote}&rdquo;</p>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>{proofPoint.customer}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            Switched from {proofPoint.switchedFrom}
          </div>
          <blockquote className="border-l-2 border-accent pl-4 italic">
            &ldquo;{proofPoint.quote}&rdquo;
          </blockquote>
          {proofPoint.outcome && (
            <div className="p-3 rounded-lg bg-positive/10 border border-positive/20">
              <p className="text-xs uppercase tracking-wider text-positive font-medium">Key Outcome</p>
              <p className="text-sm mt-1">{proofPoint.outcome}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Parse markdown bold (**text**)
function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => 
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

export default function RepBattleCardPage() {
  const [selectedSegment, setSelectedSegment] = React.useState<string>(
    battleCard.segments?.[0] || 'All'
  )
  const [talkTracksOpen, setTalkTracksOpen] = React.useState(false)

  const segments = battleCard.segments?.length 
    ? [...battleCard.segments, 'All'] 
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link 
              href="/battle-cards" 
              className="p-2 -ml-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{battleCard.competitorName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge 
                  variant="outline" 
                  className="text-[10px] bg-mis-critical/15 text-mis-critical border-mis-critical/30"
                >
                  {battleCard.tier}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Reviewed {battleCard.lastReviewed}
                </span>
              </div>
            </div>
          </div>
          
          {/* Staleness Warning */}
          {battleCard.isStale && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="size-4 text-warning flex-shrink-0" />
              <p className="text-xs text-warning">This card may be out of date</p>
            </div>
          )}

          {/* Segment Pills */}
          {segments && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
              {segments.map((segment) => (
                <button
                  key={segment}
                  onClick={() => setSelectedSegment(segment)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    selectedSegment === segment
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {segment}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-8 pb-safe">
        {/* TL;DR Section - Above the fold on 390px */}
        <section>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                THEY POSITION
              </p>
              <p className="text-sm leading-relaxed">{battleCard.tldr.theyPosition}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                WE COUNTER
              </p>
              <p className="text-sm leading-relaxed">{battleCard.tldr.weCounter}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                REMEMBER
              </p>
              <p className="text-sm leading-relaxed">{battleCard.tldr.remember}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Why We Win */}
        <section>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <div className="size-2 rounded-full bg-positive" />
            Why We Win
          </h2>
          <ul className="space-y-3">
            {battleCard.whyWeWin.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-positive mt-0.5 flex-shrink-0">+</span>
                <span className="flex-1">
                  {item.evidenceId ? (
                    <EvidenceSheet evidenceId={item.evidenceId}>
                      {parseBold(item.point)}
                    </EvidenceSheet>
                  ) : (
                    parseBold(item.point)
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Top Objections */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Top Objections</h2>
          <div className="space-y-2">
            {battleCard.objections.map((obj, i) => (
              <Collapsible key={i}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-accent/30 transition-colors text-left active:bg-muted group">
                    <ChevronDown className="size-4 mt-0.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 flex-shrink-0" />
                    <span className="text-sm flex-1">&ldquo;{obj.objection}&rdquo;</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0">
                    <div className="ml-7 p-3 rounded-lg bg-muted/50 text-sm leading-relaxed">
                      {obj.response}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </section>

        <Separator />

        {/* Trap-Setting Questions */}
        <section>
          <h2 className="text-sm font-semibold mb-1">Trap-Setting Questions</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Ask these to expose their weaknesses.
          </p>
          <ol className="space-y-3">
            {battleCard.trapQuestions.map((question, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-accent font-mono text-xs mt-0.5 w-5 flex-shrink-0">
                  {i + 1}.
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        {/* Why They Win */}
        <section>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <div className="size-2 rounded-full bg-negative" />
            Why They Win
          </h2>
          <ul className="space-y-3">
            {battleCard.whyTheyWin.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-negative mt-0.5 flex-shrink-0">-</span>
                <span className="flex-1">
                  {item.evidenceId ? (
                    <EvidenceSheet evidenceId={item.evidenceId}>
                      {item.point}
                    </EvidenceSheet>
                  ) : (
                    item.point
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Proof Points / Customer Stories */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Customer Stories</h2>
          <div className="space-y-3">
            {battleCard.proofPoints.map((pp) => (
              <ProofPointSheet key={pp.id} proofPoint={pp} />
            ))}
          </div>
        </section>

        <Separator />

        {/* Pricing Differentiation */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Pricing Comparison</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-negative/5 border border-negative/10">
              <p className="text-[10px] uppercase tracking-widest text-negative font-medium mb-1">
                {battleCard.competitorName}
              </p>
              <p className="text-sm leading-relaxed">{battleCard.pricing.theirs}</p>
            </div>
            <div className="p-3 rounded-lg bg-positive/5 border border-positive/10">
              <p className="text-[10px] uppercase tracking-widest text-positive font-medium mb-1">
                US
              </p>
              <p className="text-sm leading-relaxed">{battleCard.pricing.ours}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Recent Activity */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Badge variant="outline" className="text-[10px]">
              <Zap className="size-3 mr-1" />
              Auto-updated
            </Badge>
          </div>
          <div className="space-y-2">
            {battleCard.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
                <MISBadge 
                  score={{ 
                    value: item.score, 
                    band: item.score > 80 ? 'critical' : item.score > 60 ? 'high' : 'medium',
                    confidence: 'high'
                  }} 
                  size="sm" 
                  showConfidence={false}
                />
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Talk Tracks by Scenario */}
        <section>
          <Collapsible open={talkTracksOpen} onOpenChange={setTalkTracksOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between py-2 text-left">
                <h2 className="text-sm font-semibold">Talk Tracks by Scenario</h2>
                <ChevronDown className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  talkTracksOpen && 'rotate-180'
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 pt-4">
                {battleCard.talkTracks.map((track, i) => (
                  <div key={i}>
                    <h3 className="text-xs font-medium text-accent mb-2">
                      {track.scenario}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {track.content}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* Bottom padding for safe area */}
        <div className="h-8" />
      </main>
    </div>
  )
}
