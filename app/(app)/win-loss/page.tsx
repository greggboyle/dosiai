'use client'

import * as React from 'react'
import { 
  Plus, Search, TrendingUp, TrendingDown, Download, ChevronRight,
  Trophy, XCircle, MinusCircle, Ban, Calendar as CalendarIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList 
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import type { WinLossOutcome, WinLossOutcomeValue, DealSizeBand } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'
import { format } from 'date-fns'

// C2: Tracked competitors with updated tier enum
const trackedCompetitors = [
  { id: '1', name: 'Acme Logistics', tier: 'primary_direct', segments: ['Enterprise', 'Mid-Market'] },
  { id: '2', name: 'FreightHero', tier: 'primary_direct', segments: ['Enterprise', 'Mid-Market', 'SMB'] },
  { id: '3', name: 'RouteIQ', tier: 'secondary_indirect', segments: ['Mid-Market', 'SMB'] },
  { id: '4', name: 'ChainShield', tier: 'adjacent', segments: ['Enterprise'] },
  { id: '5', name: 'LogiFlow', tier: 'secondary_indirect', segments: ['Enterprise', 'Mid-Market'] },
  { id: '6', name: 'TransitPro', tier: 'emerging', segments: ['SMB'] },
]

// Battle cards available for competitors
const battleCards = [
  { id: 'bc-1', competitorId: '1', name: 'Acme Logistics - Enterprise' },
  { id: 'bc-2', competitorId: '1', name: 'Acme Logistics - Mid-Market' },
  { id: 'bc-3', competitorId: '2', name: 'FreightHero - All Segments' },
  { id: 'bc-4', competitorId: '3', name: 'RouteIQ - Technical Buyer' },
]

const battleCardSections = [
  'TL;DR',
  'Why We Win',
  'Why They Win',
  'Top Objections',
  'Trap-Setting Questions',
  'Proof Points',
  'Pricing',
  'Talk Tracks',
]

// Suggested reason tags (C4: no-decision uses underscore in type)
const suggestedTags: Record<WinLossOutcomeValue, string[]> = {
  won: ['pricing flexibility', 'integration breadth', 'implementation speed', 'customer references', 'product demo', 'ROI analysis', 'executive sponsorship', 'support quality'],
  lost: ['feature gap (AI)', 'brand recognition', 'incumbent advantage', 'pricing', 'integration limitations', 'implementation concerns', 'risk aversion'],
  no_decision: ['budget freeze', 'project deprioritized', 'stakeholder change', 'evaluation paused'],
  disqualified: ['bad fit', 'budget mismatch', 'timeline mismatch', 'wrong segment'],
}

// Helper to create stable dates
function createDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

// C4: 47 realistic outcomes over 12 months - showing key subset (renamed to WinLossOutcome)
const mockRecords: WinLossOutcome[] = [
  // Recent outcomes
  {
    id: '1',
    dealName: 'Megacorp - Platform Migration',
    outcome: 'lost',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 240000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(3),
    reasonSummary: 'Lost on AI capabilities. Their new route optimization engine impressed the technical buyer and we couldn\'t match the demo.',
    reasonTags: ['feature gap (AI)', 'product demo'],
    notes: 'They specifically called out the AI copilot feature we lack.',
    createdBy: { id: 'u1', name: 'James Wilson' },
    createdAt: createDate(3),
  },
  {
    id: '2',
    dealName: 'Streamline Inc - New Business',
    outcome: 'won',
    primaryCompetitorId: '2',
    primaryCompetitorName: 'FreightHero',
    dealSize: 85000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Mid-Market',
    closeDate: createDate(7),
    reasonSummary: 'Won on pricing flexibility and faster implementation timeline. Customer valued our 6-week go-live vs their 12-week estimate.',
    reasonTags: ['pricing flexibility', 'implementation speed'],
    battleCardConsulted: {
      battleCardId: 'bc-3',
      battleCardName: 'FreightHero - All Segments',
      mostHelpfulSection: 'Pricing',
      whatWasMissing: 'More recent customer references in their segment',
    },
    createdBy: { id: 'u2', name: 'Sarah Chen' },
    createdAt: createDate(7),
  },
  {
    id: '3',
    dealName: 'Globex - Renewal',
    outcome: 'lost',
    primaryCompetitorId: '3',
    primaryCompetitorName: 'RouteIQ',
    dealSize: 120000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Mid-Market',
    closeDate: createDate(14),
    reasonSummary: 'Incumbent advantage. They were already using RouteIQ for 3 years and didn\'t want to risk migration.',
    reasonTags: ['incumbent advantage', 'risk aversion'],
    createdBy: { id: 'u3', name: 'Michael Park' },
    createdAt: createDate(14),
  },
  {
    id: '4',
    dealName: 'FastShip Co - Expansion',
    outcome: 'won',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 175000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(21),
    reasonSummary: 'Integration breadth was the deciding factor. Our SAP connector sealed the deal.',
    reasonTags: ['integration breadth', 'customer references'],
    battleCardConsulted: {
      battleCardId: 'bc-1',
      battleCardName: 'Acme Logistics - Enterprise',
      mostHelpfulSection: 'Why We Win',
    },
    createdBy: { id: 'u1', name: 'James Wilson' },
    createdAt: createDate(21),
  },
  {
    id: '5',
    dealName: 'Apex Industries - New Logo',
    outcome: 'won',
    primaryCompetitorId: '2',
    primaryCompetitorName: 'FreightHero',
    dealSize: 92000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Mid-Market',
    closeDate: createDate(28),
    reasonSummary: 'Executive sponsorship from their COO who knew our CEO. Pricing was comparable but relationship won.',
    reasonTags: ['executive sponsorship', 'pricing flexibility'],
    createdBy: { id: 'u2', name: 'Sarah Chen' },
    createdAt: createDate(28),
  },
  {
    id: '6',
    dealName: 'TechLogistics - SMB Deal',
    outcome: 'won',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 45000,
    dealSizeBand: '10k-50k',
    source: 'manual',
    segment: 'SMB',
    closeDate: createDate(35),
    reasonSummary: 'Won on implementation speed and support quality. 4-week deployment was key.',
    reasonTags: ['implementation speed', 'support quality'],
    createdBy: { id: 'u4', name: 'Emily Rodriguez' },
    createdAt: createDate(35),
  },
  {
    id: '7',
    dealName: 'GlobalFreight Corp',
    outcome: 'lost',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 320000,
    dealSizeBand: '250k-1m',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(42),
    reasonSummary: 'Brand recognition was the blocker. Board wanted a "known name" in logistics tech.',
    reasonTags: ['brand recognition', 'risk aversion'],
    createdBy: { id: 'u1', name: 'James Wilson' },
    createdAt: createDate(42),
  },
  {
    id: '8',
    dealName: 'QuickMove - Startup',
    outcome: 'won',
    primaryCompetitorId: '2',
    primaryCompetitorName: 'FreightHero',
    dealSizeBand: '10k-50k',
    source: 'manual',
    segment: 'SMB',
    closeDate: createDate(49),
    reasonSummary: 'Startup pricing program was decisive. They couldn\'t match our 50% discount.',
    reasonTags: ['pricing flexibility', 'ROI analysis'],
    createdBy: { id: 'u4', name: 'Emily Rodriguez' },
    createdAt: createDate(49),
  },
  {
    id: '9',
    dealName: 'Enterprise Movers Inc',
    outcome: 'won',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 210000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(56),
    reasonSummary: 'Customer references closed this. The reference call with similar company was the turning point.',
    reasonTags: ['customer references', 'product demo'],
    battleCardConsulted: {
      battleCardId: 'bc-1',
      battleCardName: 'Acme Logistics - Enterprise',
      mostHelpfulSection: 'Proof Points',
    },
    createdBy: { id: 'u3', name: 'Michael Park' },
    createdAt: createDate(56),
  },
  {
    id: '10',
    dealName: 'Regional Logistics LLC',
    outcome: 'no_decision',
    source: 'manual',
    primaryCompetitorId: '3',
    primaryCompetitorName: 'RouteIQ',
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Mid-Market',
    closeDate: createDate(63),
    reasonSummary: 'Budget freeze at the end of quarter. Project pushed to next fiscal year.',
    reasonTags: ['budget freeze', 'project deprioritized'],
    createdBy: { id: 'u2', name: 'Sarah Chen' },
    createdAt: createDate(63),
  },
  {
    id: '11',
    dealName: 'Harbor Transport',
    outcome: 'won',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 156000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(70),
    reasonSummary: 'Won on integration breadth and implementation speed.',
    reasonTags: ['integration breadth', 'implementation speed'],
    createdBy: { id: 'u1', name: 'James Wilson' },
    createdAt: createDate(70),
  },
  {
    id: '12',
    dealName: 'Swift Carriers',
    outcome: 'lost',
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 280000,
    dealSizeBand: '250k-1m',
    source: 'manual',
    segment: 'Enterprise',
    closeDate: createDate(77),
    reasonSummary: 'Feature gap on AI route optimization. They did a bake-off and Acme\'s AI won.',
    reasonTags: ['feature gap (AI)', 'product demo'],
    createdBy: { id: 'u3', name: 'Michael Park' },
    createdAt: createDate(77),
  },
  // More wins for Acme to get to 16/28 total
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `acme-win-${i}`,
    dealName: `Enterprise Client ${i + 1}`,
    outcome: 'won' as WinLossOutcomeValue,
    source: 'manual' as const,
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 80000 + i * 20000,
    dealSizeBand: '50k-250k' as DealSizeBand,
    segment: 'Enterprise',
    closeDate: createDate(90 + i * 15),
    reasonSummary: 'Won on implementation speed and pricing flexibility.',
    reasonTags: ['implementation speed', 'pricing flexibility'],
    createdBy: { id: 'u1', name: 'James Wilson' },
    createdAt: createDate(90 + i * 15),
  })),
  // More losses for Acme
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `acme-loss-${i}`,
    dealName: `Lost Deal ${i + 1}`,
    outcome: 'lost' as WinLossOutcomeValue,
    source: 'manual' as const,
    primaryCompetitorId: '1',
    primaryCompetitorName: 'Acme Logistics',
    dealSize: 150000 + i * 30000,
    dealSizeBand: '50k-250k' as DealSizeBand,
    segment: 'Enterprise',
    closeDate: createDate(180 + i * 20),
    reasonSummary: 'Lost on feature gap or brand recognition.',
    reasonTags: i % 2 === 0 ? ['feature gap (AI)'] : ['brand recognition'],
    createdBy: { id: 'u2', name: 'Sarah Chen' },
    createdAt: createDate(180 + i * 20),
  })),
  // FreightHero outcomes (10/14 wins = 71%)
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `fh-win-${i}`,
    dealName: `FreightHero Win ${i + 1}`,
    outcome: 'won' as WinLossOutcomeValue,
    source: 'manual' as const,
    primaryCompetitorId: '2',
    primaryCompetitorName: 'FreightHero',
    dealSize: 60000 + i * 15000,
    dealSizeBand: '50k-250k' as DealSizeBand,
    segment: 'Mid-Market',
    closeDate: createDate(100 + i * 25),
    reasonSummary: 'Won on pricing flexibility.',
    reasonTags: ['pricing flexibility'],
    createdBy: { id: 'u4', name: 'Emily Rodriguez' },
    createdAt: createDate(100 + i * 25),
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `fh-loss-${i}`,
    dealName: `FreightHero Loss ${i + 1}`,
    outcome: 'lost' as WinLossOutcomeValue,
    source: 'manual' as const,
    primaryCompetitorId: '2',
    primaryCompetitorName: 'FreightHero',
    dealSize: 70000 + i * 20000,
    dealSizeBand: '50k-250k' as DealSizeBand,
    segment: 'Mid-Market',
    closeDate: createDate(150 + i * 30),
    reasonSummary: 'Lost on incumbent advantage.',
    reasonTags: ['incumbent advantage'],
    createdBy: { id: 'u3', name: 'Michael Park' },
    createdAt: createDate(150 + i * 30),
  })),
  // RouteIQ outcomes (2/5 wins = 40%)
  {
    id: 'riq-loss-1',
    dealName: 'RouteIQ Loss 1',
    outcome: 'lost',
    primaryCompetitorId: '3',
    primaryCompetitorName: 'RouteIQ',
    dealSize: 95000,
    dealSizeBand: '50k-250k',
    source: 'manual',
    segment: 'Mid-Market',
    closeDate: createDate(200),
    reasonSummary: 'Incumbent advantage was too strong.',
    reasonTags: ['incumbent advantage'],
    createdBy: { id: 'u2', name: 'Sarah Chen' },
    createdAt: createDate(200),
  },
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// C4: Updated outcome config to use underscore in no_decision
const outcomeConfig: Record<WinLossOutcomeValue, { label: string; icon: typeof Trophy; color: string }> = {
  won: { label: 'Won', icon: Trophy, color: 'bg-positive/10 text-positive border-positive/20' },
  lost: { label: 'Lost', icon: XCircle, color: 'bg-negative/10 text-negative border-negative/20' },
  no_decision: { label: 'No Decision', icon: MinusCircle, color: 'bg-muted text-muted-foreground border-border' },
  disqualified: { label: 'Disqualified', icon: Ban, color: 'bg-muted text-muted-foreground border-border' },
}

// C4: Updated deal size bands to match spec enum
const dealSizeBands: DealSizeBand[] = ['<10k', '10k-50k', '50k-250k', '250k-1m', '>1m']
const segments = ['Enterprise', 'Mid-Market', 'SMB']

// ============================================================================
// Logging Form Component
// ============================================================================
function LogOutcomeForm({ onClose }: { onClose: () => void }) {
  const [outcome, setOutcome] = React.useState<WinLossOutcomeValue | null>(null)
  const [primaryCompetitor, setPrimaryCompetitor] = React.useState<string>('')
  const [additionalCompetitors, setAdditionalCompetitors] = React.useState<string[]>([])
  const [closeDate, setCloseDate] = React.useState<Date>(new Date())
  const [dealSize, setDealSize] = React.useState<string>('') // C4: Renamed from acv
  const [dealSizeBand, setDealSizeBand] = React.useState<DealSizeBand | ''>('')
  const [segment, setSegment] = React.useState<string>('')
  const [reasonSummary, setReasonSummary] = React.useState('')
  const [reasonTags, setReasonTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState('')
  const [battleCard, setBattleCard] = React.useState<string>('')
  const [helpfulSection, setHelpfulSection] = React.useState<string>('')
  const [whatWasMissing, setWhatWasMissing] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [competitorOpen, setCompetitorOpen] = React.useState(false)

  // Get segments for selected competitor
  const selectedCompetitorData = trackedCompetitors.find(c => c.id === primaryCompetitor)
  const competitorSegments = selectedCompetitorData?.segments || segments

  // Get available battle cards for selected competitor
  const availableBattleCards = battleCards.filter(bc => bc.competitorId === primaryCompetitor)

  // Get suggested tags based on outcome
  const currentSuggestedTags = outcome ? suggestedTags[outcome] : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In real app, would submit to API
    console.log('[v0] Submitting outcome:', {
      outcome,
      primaryCompetitor,
      additionalCompetitors,
      closeDate,
      dealSize,
      dealSizeBand,
      segment,
      reasonSummary,
      reasonTags,
      battleCard,
      helpfulSection,
      whatWasMissing,
      notes,
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  const toggleReasonTag = (tag: string) => {
    setReasonTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const addCustomTag = () => {
    if (customTag.trim() && !reasonTags.includes(customTag.trim())) {
      setReasonTags(prev => [...prev, customTag.trim()])
      setCustomTag('')
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      {/* Outcome Selector */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Outcome</Label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(outcomeConfig) as WinLossOutcome[]).map((key) => {
            const config = outcomeConfig[key]
            const Icon = config.icon
            const isSelected = outcome === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOutcome(key)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                  isSelected 
                    ? config.color + ' border-current' 
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <Icon className="size-5" />
                <span className="text-xs font-medium">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Primary Competitor */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Primary Competitor</Label>
        <Popover open={competitorOpen} onOpenChange={setCompetitorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={competitorOpen}
              className="w-full justify-between"
            >
              {primaryCompetitor 
                ? trackedCompetitors.find(c => c.id === primaryCompetitor)?.name 
                : 'Select competitor...'}
              <ChevronRight className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search competitors..." />
              <CommandList>
                <CommandEmpty>No competitor found.</CommandEmpty>
                <CommandGroup>
                  {trackedCompetitors.map((competitor) => (
                    <CommandItem
                      key={competitor.id}
                      value={competitor.name}
                      onSelect={() => {
                        setPrimaryCompetitor(competitor.id)
                        setCompetitorOpen(false)
                        setBattleCard('') // Reset battle card when competitor changes
                      }}
                    >
                      <span>{competitor.name}</span>
<Badge variant="outline" className="ml-auto text-[10px]">
                                        {competitor.tier === 'primary_direct' ? 'Primary' : 
                                         competitor.tier === 'secondary_indirect' ? 'Secondary' :
                         competitor.tier === 'emerging' ? 'Emerging' : 'Indirect'}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Additional Competitors */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Additional Competitors (Optional)</Label>
        <div className="flex flex-wrap gap-2">
          {trackedCompetitors
            .filter(c => c.id !== primaryCompetitor)
            .map((competitor) => (
              <label
                key={competitor.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors',
                  additionalCompetitors.includes(competitor.id) 
                    ? 'border-accent bg-accent/10' 
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <Checkbox
                  checked={additionalCompetitors.includes(competitor.id)}
                  onCheckedChange={(checked) => {
                    setAdditionalCompetitors(prev => 
                      checked 
                        ? [...prev, competitor.id]
                        : prev.filter(id => id !== competitor.id)
                    )
                  }}
                  className="size-3"
                />
                <span className="text-sm">{competitor.name}</span>
              </label>
            ))}
        </div>
      </div>

      {/* Close Date */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Close Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 size-4" />
              {format(closeDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={closeDate}
              onSelect={(date) => date && setCloseDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Deal Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">ACV (Optional)</Label>
          <Input
            type="number"
            placeholder="e.g. 150000"
            value={acv}
            onChange={(e) => setAcv(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Or Deal Size Band</Label>
          <Select value={dealSizeBand} onValueChange={(v) => setDealSizeBand(v as DealSizeBand)}>
            <SelectTrigger>
              <SelectValue placeholder="Select band..." />
            </SelectTrigger>
            <SelectContent>
              {dealSizeBands.map((band) => (
                <SelectItem key={band} value={band}>{band}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segment */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Segment</Label>
        <div className="flex flex-wrap gap-2">
          {competitorSegments.map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => setSegment(seg)}
              className={cn(
                'px-3 py-1.5 rounded-md border text-sm transition-colors',
                segment === seg 
                  ? 'border-accent bg-accent/10 text-accent' 
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* Reason Summary */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Reason Summary <span className="text-negative">*</span>
        </Label>
        <Textarea
          placeholder="1-2 sentences explaining the primary reason for this outcome..."
          value={reasonSummary}
          onChange={(e) => setReasonSummary(e.target.value)}
          rows={2}
          required
        />
      </div>

      {/* Reason Tags */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reason Tags</Label>
        <div className="flex flex-wrap gap-2">
          {currentSuggestedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleReasonTag(tag)}
              className={cn(
                'px-2.5 py-1 rounded-md border text-xs transition-colors',
                reasonTags.includes(tag)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add custom tag..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomTag()
              }
            }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
            Add
          </Button>
        </div>
        {reasonTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {reasonTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => toggleReasonTag(tag)}
                  className="ml-1 hover:text-negative"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Battle Card Consulted */}
      {primaryCompetitor && availableBattleCards.length > 0 && (
        <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Battle Card Consulted (Optional)</Label>
            <Select value={battleCard} onValueChange={setBattleCard}>
              <SelectTrigger>
                <SelectValue placeholder="Did you use a battle card?" />
              </SelectTrigger>
              <SelectContent>
                {availableBattleCards.map((bc) => (
                  <SelectItem key={bc.id} value={bc.id}>{bc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {battleCard && (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Most Helpful Section</Label>
                <Select value={helpfulSection} onValueChange={setHelpfulSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {battleCardSections.map((section) => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">What Was Missing?</Label>
                <Input
                  placeholder="Any gaps or improvements needed?"
                  value={whatWasMissing}
                  onChange={(e) => setWhatWasMissing(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes (Optional)</Label>
        <Textarea
          placeholder="Any additional context or details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!outcome || !primaryCompetitor || !reasonSummary || !segment}>
          Log Outcome
          <span className="ml-2 text-xs opacity-60">⌘↵</span>
        </Button>
      </div>
    </form>
  )
}

// ============================================================================
// Outcome List Tab
// ============================================================================
function OutcomeListTab({ records }: { records: WinLossRecord[] }) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [competitorFilter, setCompetitorFilter] = React.useState<string>('all')
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>('all')
  const [segmentFilter, setSegmentFilter] = React.useState<string>('all')

  const filteredRecords = records.filter((r) => {
    const matchesSearch = r.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.reasonSummary.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCompetitor = competitorFilter === 'all' || r.primaryCompetitorId === competitorFilter
    const matchesOutcome = outcomeFilter === 'all' || r.outcome === outcomeFilter
    const matchesSegment = segmentFilter === 'all' || r.segment === segmentFilter
    return matchesSearch && matchesCompetitor && matchesOutcome && matchesSegment
  })

  const handleExportCSV = () => {
    const headers = ['Deal Name', 'Outcome', 'Competitor', 'Close Date', 'ACV', 'Segment', 'Reason Summary', 'Reason Tags']
    const rows = filteredRecords.map(r => [
      r.dealName,
      r.outcome,
      r.primaryCompetitorName,
      format(new Date(r.closeDate), 'yyyy-MM-dd'),
      r.acv?.toString() || r.dealSizeBand || '',
      r.segment,
      `"${r.reasonSummary.replace(/"/g, '""')}"`,
      r.reasonTags.join('; ')
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'win-loss-outcomes.csv'
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Competitor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitors</SelectItem>
            {trackedCompetitors.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="no-decision">No Decision</SelectItem>
            <SelectItem value="disqualified">Disqualified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Competitor</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Deal Size</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="w-[300px]">Reason Summary</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const config = outcomeConfig[record.outcome]
                const Icon = config.icon
                return (
                  <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className={cn('p-1.5 rounded', config.color)}>
                        <Icon className="size-4" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{record.primaryCompetitorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(record.closeDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.acv ? formatCurrency(record.acv) : record.dealSizeBand || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{record.segment}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2">{record.reasonSummary}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {record.reasonTags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                        {record.reasonTags.length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">+{record.reasonTags.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// By Competitor Tab
// ============================================================================
function ByCompetitorTab({ records }: { records: WinLossRecord[] }) {
  const [sortBy, setSortBy] = React.useState<'winRate' | 'volume' | 'recency'>('winRate')

  // Calculate stats per competitor
  const competitorStats = React.useMemo(() => {
    const stats = trackedCompetitors.map((competitor) => {
      const competitorRecords = records.filter(r => r.primaryCompetitorId === competitor.id)
      const wins = competitorRecords.filter(r => r.outcome === 'won')
      const losses = competitorRecords.filter(r => r.outcome === 'lost')
      const total = wins.length + losses.length
      const winRate = total > 0 ? (wins.length / total) * 100 : 0

      // Calculate 90-day stats
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const recentRecords = competitorRecords.filter(r => new Date(r.closeDate) >= ninetyDaysAgo)
      const recentWins = recentRecords.filter(r => r.outcome === 'won')
      const recentTotal = recentWins.length + recentRecords.filter(r => r.outcome === 'lost').length
      const recentWinRate = recentTotal > 0 ? (recentWins.length / recentTotal) * 100 : null

      // Calculate 12-month stats
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const yearRecords = competitorRecords.filter(r => new Date(r.closeDate) >= oneYearAgo)
      const yearWins = yearRecords.filter(r => r.outcome === 'won')
      const yearTotal = yearWins.length + yearRecords.filter(r => r.outcome === 'lost').length
      const yearWinRate = yearTotal > 0 ? (yearWins.length / yearTotal) * 100 : null

      // Top reasons
      const winReasons = wins.flatMap(w => w.reasonTags)
      const lossReasons = losses.flatMap(l => l.reasonTags)
      const topWinReasons = [...new Set(winReasons)]
        .map(r => ({ reason: r, count: winReasons.filter(wr => wr === r).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(r => r.reason)
      const topLossReasons = [...new Set(lossReasons)]
        .map(r => ({ reason: r, count: lossReasons.filter(lr => lr === r).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(r => r.reason)

      // Average deal size
      const avgWinSize = wins.filter(w => w.acv).length > 0 
        ? wins.filter(w => w.acv).reduce((sum, w) => sum + (w.acv || 0), 0) / wins.filter(w => w.acv).length
        : null
      const avgLossSize = losses.filter(l => l.acv).length > 0
        ? losses.filter(l => l.acv).reduce((sum, l) => sum + (l.acv || 0), 0) / losses.filter(l => l.acv).length
        : null

      // Sparkline data (last 6 months by month)
      const sparklineData: { month: string; rate: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date()
        monthStart.setMonth(monthStart.getMonth() - i, 1)
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthEnd.getMonth() + 1)
        const monthRecords = competitorRecords.filter(r => {
          const d = new Date(r.closeDate)
          return d >= monthStart && d < monthEnd
        })
        const monthWins = monthRecords.filter(r => r.outcome === 'won').length
        const monthTotal = monthWins + monthRecords.filter(r => r.outcome === 'lost').length
        sparklineData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          rate: monthTotal > 0 ? (monthWins / monthTotal) * 100 : 0
        })
      }

      // Most recent outcome date
      const mostRecent = competitorRecords.length > 0 
        ? Math.max(...competitorRecords.map(r => new Date(r.closeDate).getTime()))
        : 0

      return {
        ...competitor,
        totalOutcomes: total,
        winRate,
        recentWinRate,
        yearWinRate,
        topWinReasons,
        topLossReasons,
        avgWinSize,
        avgLossSize,
        sparklineData,
        mostRecent,
      }
    }).filter(c => c.totalOutcomes > 0)

    // Sort
    switch (sortBy) {
      case 'winRate':
        return stats.sort((a, b) => b.winRate - a.winRate)
      case 'volume':
        return stats.sort((a, b) => b.totalOutcomes - a.totalOutcomes)
      case 'recency':
        return stats.sort((a, b) => b.mostRecent - a.mostRecent)
      default:
        return stats
    }
  }, [records, sortBy])

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="winRate">Sort by Win Rate</SelectItem>
            <SelectItem value="volume">Sort by Volume</SelectItem>
            <SelectItem value="recency">Sort by Recency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Competitor Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitorStats.map((competitor) => (
          <Card key={competitor.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{competitor.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {competitor.tier === 'primary-direct' ? 'Primary' : 
                     competitor.tier === 'secondary-direct' ? 'Secondary' :
                     competitor.tier === 'emerging' ? 'Emerging' : 'Indirect'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {competitor.totalOutcomes} deals
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Win Rate */}
              <div className="flex items-baseline gap-3">
                <span className={cn(
                  'text-3xl font-mono font-semibold',
                  competitor.winRate >= 60 ? 'text-positive' : 
                  competitor.winRate >= 40 ? 'text-foreground' : 'text-negative'
                )}>
                  {competitor.winRate.toFixed(0)}%
                </span>
                {competitor.recentWinRate !== null && competitor.recentWinRate !== competitor.winRate && (
                  <span className={cn(
                    'text-sm flex items-center gap-0.5',
                    competitor.recentWinRate > competitor.winRate ? 'text-positive' : 'text-negative'
                  )}>
                    {competitor.recentWinRate > competitor.winRate ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {Math.abs(competitor.recentWinRate - competitor.winRate).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {competitor.yearWinRate !== null && (
                  <span>12mo: {competitor.yearWinRate.toFixed(0)}%</span>
                )}
                <span>All time: {competitor.winRate.toFixed(0)}%</span>
              </div>

              {/* Sparkline */}
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={competitor.sparklineData}>
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top Reasons */}
              <div className="space-y-2">
                {competitor.topWinReasons.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Win reasons</p>
                    <div className="flex flex-wrap gap-1">
                      {competitor.topWinReasons.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px] bg-positive/10 text-positive border-positive/20">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {competitor.topLossReasons.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Loss reasons</p>
                    <div className="flex flex-wrap gap-1">
                      {competitor.topLossReasons.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px] bg-negative/10 text-negative border-negative/20">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Avg Deal Size */}
              {(competitor.avgWinSize || competitor.avgLossSize) && (
                <div className="flex gap-4 text-xs pt-2 border-t">
                  {competitor.avgWinSize && (
                    <span>Avg win: <span className="font-mono">{formatCurrency(competitor.avgWinSize)}</span></span>
                  )}
                  {competitor.avgLossSize && (
                    <span>Avg loss: <span className="font-mono">{formatCurrency(competitor.avgLossSize)}</span></span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// By Reason Tab
// ============================================================================
function ByReasonTab({ records }: { records: WinLossRecord[] }) {
  // Aggregate reason tags
  const reasonStats = React.useMemo(() => {
    const allTags = new Map<string, { wins: number; losses: number }>()
    
    records.forEach((record) => {
      record.reasonTags.forEach((tag) => {
        const current = allTags.get(tag) || { wins: 0, losses: 0 }
        if (record.outcome === 'won') {
          current.wins++
        } else if (record.outcome === 'lost') {
          current.losses++
        }
        allTags.set(tag, current)
      })
    })

    return [...allTags.entries()]
      .map(([tag, counts]) => ({
        tag,
        wins: counts.wins,
        losses: counts.losses,
        total: counts.wins + counts.losses,
      }))
      .sort((a, b) => b.total - a.total)
  }, [records])

  // Data for bar chart
  const chartData = reasonStats.slice(0, 10).map((r) => ({
    name: r.tag,
    wins: r.wins,
    losses: r.losses,
  }))

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcomes by Reason Tag</CardTitle>
          <CardDescription>Top 10 most common reason tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="wins" fill="hsl(var(--positive))" name="Wins" stackId="a" />
                <Bar dataKey="losses" fill="hsl(var(--negative))" name="Losses" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reason List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Reason Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {reasonStats.map((reason) => (
              <div key={reason.tag} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{reason.tag}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-positive">
                    <TrendingUp className="size-3" />
                    {reason.wins} wins
                  </span>
                  <span className="flex items-center gap-1 text-negative">
                    <TrendingDown className="size-3" />
                    {reason.losses} losses
                  </span>
                  <span className="text-muted-foreground">{reason.total} total</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================
export default function WinLossPage() {
  const [isLogDialogOpen, setIsLogDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('outcomes')

  // Summary stats
  const stats = React.useMemo(() => {
    const wins = mockRecords.filter(r => r.outcome === 'won')
    const losses = mockRecords.filter(r => r.outcome === 'lost')
    const total = wins.length + losses.length
    const winRate = total > 0 ? (wins.length / total) * 100 : 0
    const totalWinValue = wins.filter(w => w.acv).reduce((sum, w) => sum + (w.acv || 0), 0)
    const totalLossValue = losses.filter(l => l.acv).reduce((sum, l) => sum + (l.acv || 0), 0)

    return {
      total: mockRecords.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalWinValue,
      totalLossValue,
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Win/Loss Analysis</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} outcomes logged across all competitors
          </p>
        </div>
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Log Outcome
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Competitive Outcome</DialogTitle>
              <DialogDescription>
                Record a win, loss, or other deal outcome. Takes under 60 seconds.
              </DialogDescription>
            </DialogHeader>
            <LogOutcomeForm onClose={() => setIsLogDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Win Rate</CardDescription>
            <CardTitle className="text-2xl font-mono">{stats.winRate.toFixed(0)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.wins} wins / {stats.wins + stats.losses} competitive deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wins (12 mo)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="size-5 text-positive" />
              <span className="font-mono">{stats.wins}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalWinValue)} total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Losses (12 mo)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingDown className="size-5 text-negative" />
              <span className="font-mono">{stats.losses}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalLossValue)} total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>vs Acme Logistics</CardDescription>
            <CardTitle className="text-2xl font-mono">58%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              16 of 28 competitive deals won
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="outcomes">Outcome List</TabsTrigger>
          <TabsTrigger value="competitor">By Competitor</TabsTrigger>
          <TabsTrigger value="reason">By Reason</TabsTrigger>
        </TabsList>
        <TabsContent value="outcomes" className="mt-6">
          <OutcomeListTab records={mockRecords} />
        </TabsContent>
        <TabsContent value="competitor" className="mt-6">
          <ByCompetitorTab records={mockRecords} />
        </TabsContent>
        <TabsContent value="reason" className="mt-6">
          <ByReasonTab records={mockRecords} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
