'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowRight,
  Eye,
  Archive,
  Save,
  Play,
  Search,
  Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MISBadge } from '@/components/mis-badge'
import { getMISBand } from '@/lib/types'

// Types for the author view
interface SectionMeta {
  id: string
  name: string
  status: 'fresh' | 'stale'
  lastReviewedAt: string
  lastContributor: {
    name: string
    avatar?: string
  }
  feedbackCount: number
  gapCount: number
  aiDrafted: boolean
}

interface TLDRSection {
  position: string
  counter: string
  remember: string
}

interface BulletItem {
  id: string
  text: string
  evidenceId?: string
  evidenceTitle?: string
}

interface ObjectionItem {
  id: string
  objection: string
  response: string
}

interface ProofPointItem {
  id: string
  customer: string
  switchedFrom: string
  quote: string
  outcome?: string
  linkedItemId?: string
}

interface PricingSection {
  theirs: string
  ours: string
}

interface TalkTrackSection {
  greenfield: string
  lateStage: string
  technical: string
  business: string
}

interface FeedItem {
  id: string
  title: string
  score: number
  time: string
}

interface InterviewQuestion {
  sectionId: string
  sectionName: string
  question: string
  feedContext: FeedItem[]
}

// Mock section data
const sections: SectionMeta[] = [
  {
    id: 'tldr',
    name: 'TL;DR',
    status: 'fresh',
    lastReviewedAt: '2 days ago',
    lastContributor: { name: 'Sarah Chen', avatar: undefined },
    feedbackCount: 0,
    gapCount: 0,
    aiDrafted: false,
  },
  {
    id: 'why-we-win',
    name: 'Why We Win',
    status: 'fresh',
    lastReviewedAt: '3 days ago',
    lastContributor: { name: 'Mike Torres', avatar: undefined },
    feedbackCount: 2,
    gapCount: 0,
    aiDrafted: false,
  },
  {
    id: 'why-they-win',
    name: 'Why They Win',
    status: 'fresh',
    lastReviewedAt: '5 days ago',
    lastContributor: { name: 'Sarah Chen', avatar: undefined },
    feedbackCount: 1,
    gapCount: 1,
    aiDrafted: true,
  },
  {
    id: 'objections',
    name: 'Top Objections',
    status: 'stale',
    lastReviewedAt: '14 days ago',
    lastContributor: { name: 'Emily Zhao', avatar: undefined },
    feedbackCount: 3,
    gapCount: 2,
    aiDrafted: false,
  },
  {
    id: 'trap-questions',
    name: 'Trap-Setting Questions',
    status: 'fresh',
    lastReviewedAt: '4 days ago',
    lastContributor: { name: 'Mike Torres', avatar: undefined },
    feedbackCount: 0,
    gapCount: 0,
    aiDrafted: false,
  },
  {
    id: 'proof-points',
    name: 'Proof Points',
    status: 'stale',
    lastReviewedAt: '21 days ago',
    lastContributor: { name: 'Sarah Chen', avatar: undefined },
    feedbackCount: 1,
    gapCount: 1,
    aiDrafted: false,
  },
  {
    id: 'pricing',
    name: 'Pricing',
    status: 'stale',
    lastReviewedAt: '18 days ago',
    lastContributor: { name: 'Emily Zhao', avatar: undefined },
    feedbackCount: 0,
    gapCount: 3,
    aiDrafted: false,
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    status: 'fresh',
    lastReviewedAt: 'Auto-updated',
    lastContributor: { name: 'System', avatar: undefined },
    feedbackCount: 0,
    gapCount: 0,
    aiDrafted: false,
  },
  {
    id: 'talk-tracks',
    name: 'Talk Tracks',
    status: 'fresh',
    lastReviewedAt: '6 days ago',
    lastContributor: { name: 'Mike Torres', avatar: undefined },
    feedbackCount: 0,
    gapCount: 0,
    aiDrafted: true,
  },
]

// Mock content for each section
const initialTLDR: TLDRSection = {
  position: "They position as 'the AI-native TMS for mid-market'",
  counter: 'We counter: AI is table stakes; what wins is integration depth and implementation speed',
  remember: 'Their G2 reviews show implementation complaints up 14% — surface this naturally',
}

const initialWhyWeWin: BulletItem[] = [
  { id: '1', text: '**27% faster** average implementation (8 weeks vs 11)', evidenceId: 'ev-1', evidenceTitle: 'Implementation benchmark report' },
  { id: '2', text: 'Native integrations with **14 legacy WMS platforms** — they have 4', evidenceId: 'ev-2', evidenceTitle: 'Integration comparison doc' },
  { id: '3', text: '**Transparent pricing** — published online, no surprise tiers', evidenceId: 'ev-3', evidenceTitle: 'Pricing page screenshot' },
  { id: '4', text: '**24/7 support included** in standard plan; theirs is upsell only', evidenceId: 'ev-4', evidenceTitle: 'Support tier comparison' },
  { id: '5', text: 'Customer-led **product roadmap** with public voting', evidenceId: 'ev-5', evidenceTitle: 'Product board link' },
]

const initialWhyTheyWin: BulletItem[] = [
  { id: '1', text: "Strong AI/ML brand and marketing — felt as more 'modern'" },
  { id: '2', text: 'Better dispatcher UX in side-by-side demos' },
  { id: '3', text: 'Larger sales team and more enterprise references' },
]

const initialObjections: ObjectionItem[] = [
  {
    id: '1',
    objection: "They have native AI; you don't",
    response: "We have AI in routing optimization and exception detection — both production-ready. Their AI is positioned more aggressively in marketing than in product. Ask the prospect what specific AI capability they need; we'll show them ours.",
  },
  {
    id: '2',
    objection: 'Their UI is more modern',
    response: "Acknowledge it openly — their dispatcher UI is well-designed. Then pivot: 'When you're managing 200 trucks, the question isn't UI polish, it's integration depth and reliability.'",
  },
  {
    id: '3',
    objection: "They just raised $120M; you're smaller",
    response: "We've grown 67% YoY profitably. Their burn rate at this round suggests aggressive expansion that may pressure pricing and support quality.",
  },
  {
    id: '4',
    objection: 'They have more enterprise references',
    response: 'True in Fortune 500 logos, but dig deeper: their mid-market churn rate is 18% vs our 6%. Enterprise references don\'t translate to mid-market success.',
  },
  {
    id: '5',
    objection: 'Their pricing is more flexible',
    response: 'Flexible often means opaque. We publish pricing online — prospects know what they\'re getting. Ask them to get a written quote with 3-year pricing guarantees.',
  },
]

const initialTrapQuestions: string[] = [
  'How important is sub-30-day implementation to your timeline?',
  'Have you talked with any of their customers about support response times in the last 6 months?',
  "What's your fallback if pricing changes mid-contract?",
  'Do you need integration with any WMS that was built before 2015?',
  'How do you feel about paying extra for 24/7 support?',
]

const initialProofPoints: ProofPointItem[] = [
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
    quote: 'The WMS integration just worked. No custom middleware, no consultants.',
    outcome: 'Live in 4 weeks',
  },
  {
    id: '3',
    customer: 'Northeast Carriers',
    switchedFrom: 'Acme Logistics',
    quote: 'When our main dispatch center went down at 2 AM, I had a senior engineer on the phone in 8 minutes.',
    outcome: '99.97% uptime in Year 1',
  },
]

const initialPricing: PricingSection = {
  theirs: 'Tiered by truck count, mid-market $40K+ ARR. Support packages are upsells ($8K-15K/year for 24/7). Pricing not published; requires sales call.',
  ours: 'Flat per-user pricing, $32K-$48K typical mid-market ARR. All support tiers included. Pricing published on website with calculator.',
}

const initialTalkTracks: TalkTrackSection = {
  greenfield: "Start with their pain points around implementation timelines. Most mid-market shippers have been burned by long, expensive rollouts. Lead with our 8-week average and the MidWest Freight case study. Don't mention Acme unless they do.",
  lateStage: "At this stage, they've likely already seen Acme's demo. Acknowledge their UI is polished. Then pivot to total cost of ownership: 'Have you gotten a written 3-year pricing commitment from them?'",
  technical: 'Lead with integrations. Acme has 4 native WMS connectors; we have 14. Ask about their current stack — chances are we have a direct integration and they don\'t.',
  business: "CFOs and VPs of Ops care about TCO and risk. Lead with profitability story: 'We're growing 67% YoY without burning cash.' Then hit pricing transparency and included support.",
}

// Mock feed items for context
const recentFeedItems: FeedItem[] = [
  { id: '1', title: '$120M Series D announcement', score: 87, time: '2 days ago' },
  { id: '2', title: 'New VP Sales hire from FedEx', score: 72, time: '5 days ago' },
  { id: '3', title: 'G2 Winter report: implementation complaints up', score: 65, time: '1 week ago' },
]

// Interview questions per section
const interviewQuestions: Record<string, string> = {
  'tldr': "In one sentence each: How does Acme Logistics position themselves to prospects? What's our most effective counter-positioning? What's one thing reps should remember going into every call?",
  'why-we-win': "When you've won deals against Acme Logistics in the last 6 months, what was the deciding factor in two or three of those wins? Be specific — 'better integrations' isn't useful unless you can name which integration mattered.",
  'why-they-win': "When we've lost to Acme, what did prospects say was the deciding factor? Be honest — we need to know where we're genuinely weak.",
  'objections': "What are the top 5 objections reps hear when competing against Acme? For each, what's the response that works?",
  'trap-questions': "What questions can reps ask that expose Acme's weaknesses without directly attacking them?",
  'proof-points': "Which 3 customer stories are most effective against Acme? Include: who they are, who they switched from, and the key quote or outcome.",
  'pricing': "How does Acme's pricing work vs ours? What should reps emphasize?",
  'talk-tracks': "Walk me through the talk track for each buyer scenario: greenfield discovery, late-stage objection handling, technical buyer, and business buyer.",
}

// Win/loss suggestions mock
const winLossSuggestions = [
  { id: '1', type: 'win', quote: 'Won because of faster implementation timeline', deal: 'Acme Corp', date: '2 weeks ago' },
  { id: '2', type: 'win', quote: 'Integration with AS/400 was the deciding factor', deal: 'Beta Freight', date: '3 weeks ago' },
  { id: '3', type: 'loss', quote: 'Lost on UI polish during demo', deal: 'Gamma Logistics', date: '1 week ago' },
]

// Section Editor Components
function TLDREditor({ value, onChange }: { value: TLDRSection; onChange: (v: TLDRSection) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          They Position
        </label>
        <Textarea
          value={value.position}
          onChange={(e) => onChange({ ...value, position: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          We Counter
        </label>
        <Textarea
          value={value.counter}
          onChange={(e) => onChange({ ...value, counter: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Remember
        </label>
        <Textarea
          value={value.remember}
          onChange={(e) => onChange({ ...value, remember: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  )
}

function BulletListEditor({
  items,
  onChange,
  showEvidence = true,
}: {
  items: BulletItem[]
  onChange: (items: BulletItem[]) => void
  showEvidence?: boolean
}) {
  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), text: '' }])
  }

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, updates: Partial<BulletItem>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...updates } : i)))
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex((i) => i.id === id)
    if (direction === 'up' && index > 0) {
      const newItems = [...items]
      ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
      onChange(newItems)
    } else if (direction === 'down' && index < items.length - 1) {
      const newItems = [...items]
      ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      onChange(newItems)
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="group flex gap-2 items-start">
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => moveItem(item.id, 'up')}
              disabled={index === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              onClick={() => moveItem(item.id, 'down')}
              disabled={index === items.length - 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronDown className="size-3" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              placeholder="Use **bold** for key phrases"
              rows={2}
              className="resize-none text-sm"
            />
            {showEvidence && (
              <div className="flex items-center gap-2">
                {item.evidenceId ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <LinkIcon className="size-3" />
                    {item.evidenceTitle || 'Evidence linked'}
                    <button
                      onClick={() => updateItem(item.id, { evidenceId: undefined, evidenceTitle: undefined })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <LinkIcon className="size-3 mr-1" />
                    Link evidence
                  </Button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="size-4 mr-2" />
        Add item
      </Button>
    </div>
  )
}

function ObjectionsEditor({
  items,
  onChange,
}: {
  items: ObjectionItem[]
  onChange: (items: ObjectionItem[]) => void
}) {
  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), objection: '', response: '' }])
  }

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, updates: Partial<ObjectionItem>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...updates } : i)))
  }

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex((i) => i.id === id)
    if (direction === 'up' && index > 0) {
      const newItems = [...items]
      ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
      onChange(newItems)
    } else if (direction === 'down' && index < items.length - 1) {
      const newItems = [...items]
      ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      onChange(newItems)
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="group p-4 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Objection {index + 1}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => moveItem(item.id, 'up')}
                disabled={index === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                onClick={() => moveItem(item.id, 'down')}
                disabled={index === items.length - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
              >
                <ChevronDown className="size-3" />
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
          <Textarea
            value={item.objection}
            onChange={(e) => updateItem(item.id, { objection: e.target.value })}
            placeholder='"They say..."'
            rows={2}
            className="resize-none"
          />
          <Textarea
            value={item.response}
            onChange={(e) => updateItem(item.id, { response: e.target.value })}
            placeholder="Our response..."
            rows={3}
            className="resize-none"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="size-4 mr-2" />
        Add objection
      </Button>
    </div>
  )
}

function SimpleListEditor({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const addItem = () => {
    onChange([...items, ''])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)))
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="group flex gap-2 items-start">
          <span className="text-sm text-muted-foreground font-mono w-6 pt-2.5">{index + 1}.</span>
          <Textarea
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            rows={2}
            className="flex-1 resize-none"
          />
          <button
            onClick={() => removeItem(index)}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="size-4 mr-2" />
        Add question
      </Button>
    </div>
  )
}

function ProofPointsEditor({
  items,
  onChange,
}: {
  items: ProofPointItem[]
  onChange: (items: ProofPointItem[]) => void
}) {
  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), customer: '', switchedFrom: '', quote: '' }])
  }

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const updateItem = (id: string, updates: Partial<ProofPointItem>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...updates } : i)))
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="group">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Input
                value={item.customer}
                onChange={(e) => updateItem(item.id, { customer: e.target.value })}
                placeholder="Customer name"
                className="max-w-xs"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <Input
              value={item.switchedFrom}
              onChange={(e) => updateItem(item.id, { switchedFrom: e.target.value })}
              placeholder="Switched from..."
            />
            <Textarea
              value={item.quote}
              onChange={(e) => updateItem(item.id, { quote: e.target.value })}
              placeholder="Key quote..."
              rows={2}
              className="resize-none"
            />
            <Input
              value={item.outcome || ''}
              onChange={(e) => updateItem(item.id, { outcome: e.target.value })}
              placeholder="Outcome (e.g., 32% cost reduction)"
            />
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="size-4 mr-2" />
        Add proof point
      </Button>
    </div>
  )
}

function PricingEditor({
  value,
  onChange,
}: {
  value: PricingSection
  onChange: (value: PricingSection) => void
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-negative">
          Their Model
        </label>
        <Textarea
          value={value.theirs}
          onChange={(e) => onChange({ ...value, theirs: e.target.value })}
          rows={5}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-positive">
          Our Model
        </label>
        <Textarea
          value={value.ours}
          onChange={(e) => onChange({ ...value, ours: e.target.value })}
          rows={5}
          className="resize-none"
        />
      </div>
    </div>
  )
}

function TalkTracksEditor({
  value,
  onChange,
}: {
  value: TalkTrackSection
  onChange: (value: TalkTrackSection) => void
}) {
  return (
    <Tabs defaultValue="greenfield" className="w-full">
      <TabsList className="w-full justify-start mb-4">
        <TabsTrigger value="greenfield">Greenfield</TabsTrigger>
        <TabsTrigger value="lateStage">Late-stage</TabsTrigger>
        <TabsTrigger value="technical">Technical</TabsTrigger>
        <TabsTrigger value="business">Business</TabsTrigger>
      </TabsList>
      <TabsContent value="greenfield">
        <Textarea
          value={value.greenfield}
          onChange={(e) => onChange({ ...value, greenfield: e.target.value })}
          rows={6}
          className="resize-none"
          placeholder="Talk track for greenfield discovery calls..."
        />
      </TabsContent>
      <TabsContent value="lateStage">
        <Textarea
          value={value.lateStage}
          onChange={(e) => onChange({ ...value, lateStage: e.target.value })}
          rows={6}
          className="resize-none"
          placeholder="Talk track for late-stage objection handling..."
        />
      </TabsContent>
      <TabsContent value="technical">
        <Textarea
          value={value.technical}
          onChange={(e) => onChange({ ...value, technical: e.target.value })}
          rows={6}
          className="resize-none"
          placeholder="Talk track for technical buyers..."
        />
      </TabsContent>
      <TabsContent value="business">
        <Textarea
          value={value.business}
          onChange={(e) => onChange({ ...value, business: e.target.value })}
          rows={6}
          className="resize-none"
          placeholder="Talk track for business buyers..."
        />
      </TabsContent>
    </Tabs>
  )
}

function RecentActivitySection() {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4" />
          <span>This section is auto-populated from the intelligence feed.</span>
        </div>
      </div>
      <div className="space-y-2">
        {recentFeedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <MISBadge score={{ value: item.score, band: getMISBand(item.score), confidence: 'high' }} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Interview Mode Components
function InterviewPanel({
  section,
  sectionIndex,
  totalSections,
  onSave,
  onSkip,
  onAssign,
  onClose,
}: {
  section: SectionMeta
  sectionIndex: number
  totalSections: number
  onSave: (answer: string) => void
  onSkip: () => void
  onAssign: () => void
  onClose: () => void
}) {
  const [answer, setAnswer] = React.useState('')
  const [showDraft, setShowDraft] = React.useState(false)
  const [draftContent, setDraftContent] = React.useState('')

  const question = interviewQuestions[section.id] || 'Please provide content for this section.'

  const handleSave = () => {
    // In production, this would call an API to generate the draft
    setDraftContent(
      `Based on your response, here's a draft for ${section.name}:\n\n[AI-generated draft based on the answer would appear here. The AI would structure the response according to the section type - bullets for Why We Win, Q&A pairs for Objections, etc.]`
    )
    setShowDraft(true)
  }

  const handleConfirm = () => {
    onSave(answer)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{section.name}</h2>
          <Badge variant="outline" className="text-xs">
            Section {sectionIndex + 1} of {totalSections}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4">
          {/* Feed Context */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              I&apos;ve seen this in the feed about Acme Logistics in the last 30 days:
            </p>
            <div className="space-y-2">
              {recentFeedItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded bg-background/50">
                  <MISBadge
                    score={{ value: item.score, band: getMISBand(item.score), confidence: 'high' }}
                    size="sm"
                  />
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question */}
          <div>
            <p className="text-lg leading-relaxed">{question}</p>
          </div>

          {/* Answer or Draft */}
          {showDraft ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-accent/10 text-accent border-accent/20">
                  <Sparkles className="size-3 mr-1" />
                  AI-drafted
                </Badge>
                <span className="text-xs text-muted-foreground">Edit before confirming</span>
              </div>
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={10}
                className="resize-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={8}
                className="resize-none"
              />

              {/* Win/Loss Suggestions */}
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="size-4 mr-2" />
                  Suggest from win/loss data
                </Button>
                <div className="grid gap-2">
                  {winLossSuggestions.slice(0, 2).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => setAnswer((prev) => prev + (prev ? '\n\n' : '') + suggestion.quote)}
                      className="text-left p-3 rounded-lg border border-border hover:border-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            suggestion.type === 'win' ? 'text-positive border-positive/30' : 'text-negative border-negative/30'
                          )}
                        >
                          {suggestion.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{suggestion.deal}</span>
                        <span className="text-xs text-muted-foreground">{suggestion.date}</span>
                      </div>
                      <p className="text-sm">&ldquo;{suggestion.quote}&rdquo;</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border mt-6 flex items-center gap-3">
        {showDraft ? (
          <>
            <Button variant="outline" onClick={() => setShowDraft(false)}>
              Back to answer
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <Check className="size-4 mr-2" />
              Confirm & continue
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onSkip}>
              Skip this question
            </Button>
            <Button variant="outline" onClick={onAssign}>
              <Users className="size-4 mr-2" />
              Assign to teammate
            </Button>
            <Button onClick={handleSave} disabled={!answer.trim()} className="flex-1">
              Save & continue
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// Main Page Component
export default function BattleCardAuthorPage() {
  const params = useParams()
  const cardId = params.id as string

  // State
  const [mode, setMode] = React.useState<'edit' | 'interview'>('edit')
  const [activeSection, setActiveSection] = React.useState<string>('tldr')
  const [interviewSection, setInterviewSection] = React.useState(0)
  const [showPreview, setShowPreview] = React.useState(false)

  // Content state
  const [tldr, setTldr] = React.useState<TLDRSection>(initialTLDR)
  const [whyWeWin, setWhyWeWin] = React.useState<BulletItem[]>(initialWhyWeWin)
  const [whyTheyWin, setWhyTheyWin] = React.useState<BulletItem[]>(initialWhyTheyWin)
  const [objections, setObjections] = React.useState<ObjectionItem[]>(initialObjections)
  const [trapQuestions, setTrapQuestions] = React.useState<string[]>(initialTrapQuestions)
  const [proofPoints, setProofPoints] = React.useState<ProofPointItem[]>(initialProofPoints)
  const [pricing, setPricing] = React.useState<PricingSection>(initialPricing)
  const [talkTracks, setTalkTracks] = React.useState<TalkTrackSection>(initialTalkTracks)

  const activeSectionMeta = sections.find((s) => s.id === activeSection)
  const staleSections = sections.filter((s) => s.status === 'stale' || s.gapCount > 0)
  const completedInterviewSections = 6

  // Freshness score based on stale sections
  const freshnessScore = Math.round((1 - staleSections.length / sections.length) * 100)

  const renderEditor = () => {
    switch (activeSection) {
      case 'tldr':
        return <TLDREditor value={tldr} onChange={setTldr} />
      case 'why-we-win':
        return <BulletListEditor items={whyWeWin} onChange={setWhyWeWin} />
      case 'why-they-win':
        return <BulletListEditor items={whyTheyWin} onChange={setWhyTheyWin} />
      case 'objections':
        return <ObjectionsEditor items={objections} onChange={setObjections} />
      case 'trap-questions':
        return <SimpleListEditor items={trapQuestions} onChange={setTrapQuestions} />
      case 'proof-points':
        return <ProofPointsEditor items={proofPoints} onChange={setProofPoints} />
      case 'pricing':
        return <PricingEditor value={pricing} onChange={setPricing} />
      case 'recent-activity':
        return <RecentActivitySection />
      case 'talk-tracks':
        return <TalkTracksEditor value={talkTracks} onChange={setTalkTracks} />
      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/battle-cards" className="hover:text-foreground transition-colors">
              Battle Cards
            </Link>
            <ChevronRight className="size-4" />
            <span className="text-foreground">Acme Logistics</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold">Acme Logistics</h1>
              <Select defaultValue="enterprise">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="mid-market">Mid-Market</SelectItem>
                  <SelectItem value="all">All Segments</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-positive border-positive/30">
                Published
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Freshness Score */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Freshness:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{freshnessScore}/100</span>
                  <Progress value={freshnessScore} className="w-20 h-2" />
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <Eye className="size-4 mr-2" />
                Preview rep view
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="size-4 mr-2" />
                Archive
              </Button>
              <Button size="sm">
                <Save className="size-4 mr-2" />
                Save changes
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6 h-[calc(100vh-14rem)]">
          {/* Left Column - Section List */}
          <div className="w-80 flex-shrink-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-4">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      if (mode === 'interview') setMode('edit')
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                      activeSection === section.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{section.name}</span>
                        {section.status === 'stale' ? (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                            Stale
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-positive/10 text-positive border-positive/30">
                            Fresh
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{section.lastReviewedAt}</span>
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[8px]">
                            {section.lastContributor.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.feedbackCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-[10px]">
                              <MessageSquare className="size-3 mr-0.5" />
                              {section.feedbackCount}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {section.feedbackCount} feedback item{section.feedbackCount > 1 ? 's' : ''} from win/loss
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {section.gapCount > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning">
                              <AlertTriangle className="size-3 mr-0.5" />
                              {section.gapCount}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {section.gapCount} gap{section.gapCount > 1 ? 's' : ''} identified in win/loss outcomes
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMode('interview')
                setInterviewSection(0)
              }}
            >
              <Play className="size-4 mr-2" />
              Start mini-interview
              {staleSections.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {staleSections.length} sections need attention
                </Badge>
              )}
            </Button>
          </div>

          {/* Right Column - Editor or Interview */}
          <Card className="flex-1 overflow-hidden">
            {mode === 'interview' ? (
              <CardContent className="p-6 h-full">
                <InterviewPanel
                  section={staleSections[interviewSection] || sections[0]}
                  sectionIndex={interviewSection}
                  totalSections={staleSections.length || sections.length}
                  onSave={() => {
                    if (interviewSection < staleSections.length - 1) {
                      setInterviewSection((prev) => prev + 1)
                    } else {
                      setMode('edit')
                    }
                  }}
                  onSkip={() => {
                    if (interviewSection < staleSections.length - 1) {
                      setInterviewSection((prev) => prev + 1)
                    } else {
                      setMode('edit')
                    }
                  }}
                  onAssign={() => {
                    // Would open team member picker
                  }}
                  onClose={() => setMode('edit')}
                />
              </CardContent>
            ) : (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{activeSectionMeta?.name}</CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-1">
                        <span>Last reviewed: {activeSectionMeta?.lastReviewedAt}</span>
                        {activeSectionMeta?.aiDrafted && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                            <Sparkles className="size-3 mr-1" />
                            AI-drafted
                          </Badge>
                        )}
                        {activeSectionMeta && activeSectionMeta.feedbackCount > 0 && (
                          <span className="text-muted-foreground">
                            {activeSectionMeta.feedbackCount} feedback from win/loss
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-8rem)]">
                  <CardContent className="p-6">{renderEditor()}</CardContent>
                </ScrollArea>
                <div className="border-t p-4 flex items-center justify-end gap-3">
                  <Button variant="outline" size="sm">
                    <Check className="size-4 mr-2" />
                    Mark section reviewed
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Rep View Preview</DialogTitle>
              <DialogDescription>
                This is how the battle card appears to sales reps on mobile devices.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center text-muted-foreground">
                  <p>Mobile preview would render here</p>
                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href={`/rep/1`} target="_blank">
                      <ExternalLink className="size-4 mr-2" />
                      Open full rep view
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
