'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ExternalLink,
  RefreshCw,
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ChevronRight,
  Plus,
  Edit2,
  Linkedin,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Building2,
  Filter,
  ArrowUpDown,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MISBadge } from '@/components/mis-badge'
import type { 
  Competitor, 
  IntelligenceItem, 
  BattleCard, 
  WinLossOutcome,
  Brief,
  Category 
} from '@/lib/types'
import { getCategoryInfo } from '@/lib/types'

// Acme Logistics seed data per spec
const acmeLogistics: Competitor = {
  id: '1',
  name: 'Acme Logistics',
  logo: undefined,
  website: 'acmelogistics.com',
  description: 'AI-native TMS for mid-market shippers',
  overallMIS: { value: 87, band: 'critical', confidence: 'high' },
  recentActivity: 23,
  status: 'active',
  tier: 'primary_direct',
  segments: ['Enterprise', 'North America', 'Logistics'],
  positioning: 'Acme Logistics positions as the AI-native TMS for mid-market shippers',
  icp: '$50M-$500M revenue shippers, 50-500 trucks, multi-modal',
  pricingModel: 'subscription',
  pricingNotes: 'Tiered by truck count, mid-market plans starting around $40K ARR',
  founded: 2018,
  hq: 'Austin, TX',
  employeeEstimate: 340,
  fundingStatus: 'Series D, $120M, March 2026',
  leadership: [
    { role: 'CEO', name: 'Maya Chen', since: '2018', linkedIn: 'https://linkedin.com/in/mayachen' },
    { role: 'CTO', name: 'Eric Park', since: '2024', linkedIn: 'https://linkedin.com/in/ericpark' },
    { role: 'CRO', name: 'Rashida Williams', since: '2023', linkedIn: 'https://linkedin.com/in/rashidawilliams' },
  ],
  products: [
    { name: 'Acme TMS Core', description: 'Full-featured transportation management system' },
    { name: 'Acme Routing Engine', description: 'AI-powered route optimization' },
    { name: 'Acme Customer Portal', description: 'Self-service shipper portal' },
  ],
  strengths: [
    'Strong AI/ML team relative to peers',
    'Best-in-class user experience for dispatchers',
    'Faster implementation than legacy TMS competitors',
  ],
  weaknesses: [
    'Limited integration with legacy WMS systems',
    'Pricing transparency issues — recurring G2 complaint',
    'Customer support response times degrading per recent reviews',
  ],
  lastProfileRefresh: '2 hours ago',
  sentimentSummary: {
    positive: 7,
    mixed: 3,
    negative: 4,
    netChange: -6,
    period: '30 days',
  },
  winLossSummary: {
    winRate: 58,
    trend: -4,
    period: '90 days',
    topWinReasons: ['Pricing flexibility', 'Integration breadth'],
    topLossReasons: ['AI feature gap', 'Brand recognition'],
    totalOutcomes: 14,
  },
  recentReviews: [
    {
      id: '1',
      content: 'The routing engine is incredibly powerful. Saved us 15% on fuel costs in the first quarter.',
      rating: 5,
      platform: 'G2',
      sentiment: 'positive',
      date: '1 week ago',
    },
    {
      id: '2',
      content: 'Good product but support has gotten slower. Took 3 days to get a response on a critical issue.',
      rating: 3,
      platform: 'Capterra',
      sentiment: 'mixed',
      date: '2 weeks ago',
    },
  ],
  linkedBriefIds: ['1', '3'],
}

// Mock activity items for this competitor
const activityItems: IntelligenceItem[] = [
  {
    id: '1',
    title: 'Acme Logistics announces $120M Series D led by Andreessen Horowitz',
    summary: 'Major funding round signals aggressive expansion plans.',
    content: '',
    mis: { value: 87, band: 'critical', confidence: 'high' },
    category: 'sell-side',
    source: { name: 'TechCrunch', url: 'https://techcrunch.com', domain: 'techcrunch.com' },
    vendorConsensus: { confirmed: 3, total: 3 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Funding', 'Expansion'],
    timestamp: '2 days ago',
    eventDate: 'Mar 15, 2026',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '3',
    title: 'Acme Logistics hiring 50+ engineers, opens Austin R&D center',
    summary: 'Major headcount expansion focused on AI/ML capabilities.',
    content: '',
    mis: { value: 72, band: 'high', confidence: 'high' },
    category: 'sell-side',
    source: { name: 'LinkedIn Jobs', url: 'https://linkedin.com', domain: 'linkedin.com' },
    vendorConsensus: { confirmed: 2, total: 3 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Hiring', 'R&D'],
    timestamp: '3 hours ago',
    eventDate: 'Today',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '6',
    title: 'New Acme blog post: "Why AI-first beats AI-added in logistics"',
    summary: 'Positioning piece contrasting their approach vs legacy vendors.',
    content: '',
    mis: { value: 55, band: 'medium', confidence: 'medium' },
    category: 'sell-side',
    source: { name: 'Acme Blog', url: 'https://acmelogistics.com/blog', domain: 'acmelogistics.com' },
    vendorConsensus: { confirmed: 2, total: 3 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Content', 'Positioning'],
    timestamp: '4 days ago',
    eventDate: 'Mar 13, 2026',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
]

// Mock customer voice items
const customerVoiceItems: IntelligenceItem[] = [
  {
    id: 'cv1',
    title: 'G2 Review: "Game-changer for our dispatch team"',
    summary: 'Highly positive review praising UX and routing capabilities.',
    content: 'The routing engine is incredibly powerful. Saved us 15% on fuel costs in the first quarter. Implementation was smooth and their team was helpful throughout.',
    mis: { value: 65, band: 'high', confidence: 'high' },
    category: 'buy-side',
    source: { name: 'G2', url: 'https://g2.com', domain: 'g2.com' },
    vendorConsensus: { confirmed: 2, total: 2 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Reviews', 'UX'],
    timestamp: '1 week ago',
    eventDate: 'Mar 10, 2026',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
    isCustomerVoice: true,
  },
  {
    id: 'cv2',
    title: 'Capterra Review: "Good product, declining support"',
    summary: 'Mixed review highlighting support response time issues.',
    content: 'Good product but support has gotten slower. Took 3 days to get a response on a critical issue. The product itself works well once configured.',
    mis: { value: 58, band: 'medium', confidence: 'high' },
    category: 'buy-side',
    source: { name: 'Capterra', url: 'https://capterra.com', domain: 'capterra.com' },
    vendorConsensus: { confirmed: 2, total: 2 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Reviews', 'Support'],
    timestamp: '2 weeks ago',
    eventDate: 'Mar 3, 2026',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
    isCustomerVoice: true,
  },
  {
    id: 'cv3',
    title: 'Reddit: "Anyone else having issues with Acme integration?"',
    summary: 'Thread discussing WMS integration challenges.',
    content: 'We have been trying to integrate Acme with our Oracle WMS for 3 months. Their team keeps saying it is on the roadmap but no timeline.',
    mis: { value: 45, band: 'medium', confidence: 'medium' },
    category: 'channel',
    source: { name: 'Reddit r/logistics', url: 'https://reddit.com/r/logistics', domain: 'reddit.com' },
    vendorConsensus: { confirmed: 1, total: 2 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Reviews', 'Integration'],
    timestamp: '3 days ago',
    eventDate: 'Mar 14, 2026',
    isRead: false,
    isBookmarked: false,
    isWatching: true,
    isCustomerVoice: true,
  },
]

// Mock battle cards
const battleCards: BattleCard[] = [
  {
    id: 'bc1',
    competitorId: '1',
    competitorName: 'Acme Logistics',
    lastUpdated: '1 week ago',
    sections: {
      overview: 'AI-native TMS targeting mid-market',
      strengths: ['Strong AI/ML', 'Modern UX', 'Fast implementation'],
      weaknesses: ['Limited WMS integrations', 'Pricing opacity', 'Support issues'],
      positioning: 'AI-first vs AI-added',
      objectionHandling: [
        { objection: 'Their AI is better', response: 'Our AI has 3x the training data and proven ROI' },
      ],
      talkingPoints: ['Enterprise-grade security', '24/7 support SLA'],
    },
    author: { id: '1', name: 'Sarah Kim' },
  },
]

// Mock win/loss records
const winLossRecords: WinLossRecord[] = [
  {
    id: 'wl1',
    dealName: 'FastFreight Corp',
    outcome: 'win',
    competitorId: '1',
    competitorName: 'Acme Logistics',
    amount: 85000,
    closeDate: 'Mar 10, 2026',
    reasons: ['Pricing flexibility', 'Better enterprise features'],
    notes: 'Customer valued our 24/7 support SLA',
    createdBy: { id: '1', name: 'Mike Johnson' },
  },
  {
    id: 'wl2',
    dealName: 'Regional Carriers Inc',
    outcome: 'loss',
    competitorId: '1',
    competitorName: 'Acme Logistics',
    amount: 42000,
    closeDate: 'Mar 5, 2026',
    reasons: ['AI feature gap', 'Modern UX preference'],
    notes: 'Prospect was impressed by their routing demo',
    createdBy: { id: '1', name: 'Lisa Chen' },
  },
  {
    id: 'wl3',
    dealName: 'MidWest Logistics',
    outcome: 'win',
    competitorId: '1',
    competitorName: 'Acme Logistics',
    amount: 120000,
    closeDate: 'Feb 28, 2026',
    reasons: ['Integration breadth', 'Existing vendor relationship'],
    createdBy: { id: '1', name: 'Mike Johnson' },
  },
  {
    id: 'wl4',
    dealName: 'TruckCo Express',
    outcome: 'loss',
    competitorId: '1',
    competitorName: 'Acme Logistics',
    amount: 55000,
    closeDate: 'Feb 20, 2026',
    reasons: ['Brand recognition', 'VC-backed momentum'],
    createdBy: { id: '1', name: 'Sarah Kim' },
  },
]

// Mock linked briefs
const linkedBriefs: Brief[] = [
  {
    id: '1',
    title: 'Acme Logistics Series D Analysis',
    type: 'custom',
    summary: 'Deep dive on funding implications and market positioning',
    createdAt: '2 days ago',
    author: { id: '1', name: 'Sarah Kim' },
    items: ['1', '3'],
    isPublished: true,
  },
  {
    id: '3',
    title: 'Q1 Competitive Landscape',
    type: 'leadership',
    summary: 'Quarterly competitive intelligence summary for leadership',
    createdAt: '1 week ago',
    author: { id: '2', name: 'John Doe' },
    items: ['1', '6'],
    isPublished: true,
  },
]

const tierLabels = {
  'primary-direct': 'Primary Direct',
  'secondary-direct': 'Secondary Direct',
  'indirect': 'Indirect',
  'emerging': 'Emerging',
}

const tierColors = {
  'primary-direct': 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  'secondary-direct': 'bg-mis-high/15 text-mis-high border-mis-high/30',
  'indirect': 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
  'emerging': 'bg-mis-low/15 text-mis-low border-mis-low/30',
}

// AI-drafted indicator component
function AIDraftedIndicator({ confirmed, onConfirm }: { confirmed: boolean; onConfirm?: () => void }) {
  if (confirmed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-[10px] text-positive">
            <Check className="size-3" />
            Confirmed
          </span>
        </TooltipTrigger>
        <TooltipContent>Human-confirmed information</TooltipContent>
      </Tooltip>
    )
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="size-3" />
          AI-drafted
        </button>
      </TooltipTrigger>
      <TooltipContent>Click to confirm this information</TooltipContent>
    </Tooltip>
  )
}

// Sentiment bar component
function SentimentBar({ positive, mixed, negative }: { positive: number; mixed: number; negative: number }) {
  const total = positive + mixed + negative
  if (total === 0) return null
  
  const posPercent = (positive / total) * 100
  const mixedPercent = (mixed / total) * 100
  const negPercent = (negative / total) * 100
  
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="bg-positive" style={{ width: `${posPercent}%` }} />
      <div className="bg-amber-500" style={{ width: `${mixedPercent}%` }} />
      <div className="bg-negative" style={{ width: `${negPercent}%` }} />
    </div>
  )
}

export default function CompetitorProfilePage() {
  const params = useParams()
  const competitorId = params.id as string
  
  // In a real app, fetch competitor by ID
  const competitor = acmeLogistics
  
  const [activeTab, setActiveTab] = React.useState('overview')
  const [confirmedFields, setConfirmedFields] = React.useState<Set<string>>(new Set())
  const [activityFilter, setActivityFilter] = React.useState<Category | 'all'>('all')
  const [voiceSentimentFilter, setVoiceSentimentFilter] = React.useState<'all' | 'positive' | 'mixed' | 'negative'>('all')
  const [notesContent, setNotesContent] = React.useState('## Analyst Notes\n\n- Key observation: Their Series D gives them significant runway\n- Watch for: European expansion announcement expected Q3\n- Action item: Update battle card with new pricing intelligence')
  
  const confirmField = (field: string) => {
    setConfirmedFields(prev => new Set([...prev, field]))
  }
  
  const filteredActivity = activityItems.filter(item => 
    activityFilter === 'all' || item.category === activityFilter
  )
  
  const filteredVoice = customerVoiceItems.filter(item => {
    if (voiceSentimentFilter === 'all') return true
    // Map item to sentiment based on MIS score
    if (voiceSentimentFilter === 'positive') return item.mis.value >= 60
    if (voiceSentimentFilter === 'negative') return item.mis.value < 40
    return item.mis.value >= 40 && item.mis.value < 60
  })

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-6 pb-0">
          {/* Top row: Logo, name, website, actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Logo placeholder */}
              <div className="size-14 rounded-lg bg-secondary flex items-center justify-center text-2xl font-semibold text-secondary-foreground flex-shrink-0">
                {competitor.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{competitor.name}</h1>
                  <MISBadge score={competitor.overallMIS} size="lg" />
                </div>
                <a
                  href={`https://${competitor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                >
                  {competitor.website}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Last refresh: {competitor.lastProfileRefresh}
              </span>
              <Button variant="outline" size="sm">
                <RefreshCw className="size-4 mr-2" />
                Refresh Profile
              </Button>
            </div>
          </div>
          
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-4">
            {competitor.tier && (
              <Badge variant="outline" className={cn('font-medium', tierColors[competitor.tier])}>
                {tierLabels[competitor.tier]}
              </Badge>
            )}
            {competitor.segments?.map(segment => (
              <Badge key={segment} variant="secondary" className="font-normal">
                {segment}
              </Badge>
            ))}
          </div>
          
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 w-full justify-start rounded-none border-b-0 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Activity
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {activityItems.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="customer-voice"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Customer Voice
              </TabsTrigger>
              <TabsTrigger
                value="battle-cards"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Battle Cards
              </TabsTrigger>
              <TabsTrigger
                value="win-loss"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Win/Loss
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Summary Card - 8 cols */}
            <Card className="col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Company Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Positioning */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Positioning</p>
                    <p className="text-sm">{competitor.positioning}</p>
                  </div>
                  <AIDraftedIndicator 
                    confirmed={confirmedFields.has('positioning')} 
                    onConfirm={() => confirmField('positioning')} 
                  />
                </div>
                <Separator />
                
                {/* ICP */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ideal Customer Profile</p>
                    <p className="text-sm">{competitor.icp}</p>
                  </div>
                  <AIDraftedIndicator 
                    confirmed={confirmedFields.has('icp')} 
                    onConfirm={() => confirmField('icp')} 
                  />
                </div>
                <Separator />
                
                {/* Pricing */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                    <p className="text-sm">
                      <Badge variant="outline" className="mr-2 capitalize">{competitor.pricingModel}</Badge>
                      {competitor.pricingNotes}
                    </p>
                  </div>
                  <AIDraftedIndicator 
                    confirmed={confirmedFields.has('pricing')} 
                    onConfirm={() => confirmField('pricing')} 
                  />
                </div>
                <Separator />
                
                {/* Company Info Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="size-3" /> Founded
                    </p>
                    <p className="text-sm font-medium">{competitor.founded}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="size-3" /> HQ
                    </p>
                    <p className="text-sm font-medium">{competitor.hq}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="size-3" /> Employees
                    </p>
                    <p className="text-sm font-medium">~{competitor.employeeEstimate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="size-3" /> Funding
                    </p>
                    <p className="text-sm font-medium">{competitor.fundingStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leadership Card - 4 cols */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Leadership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitor.leadership?.map((leader, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{leader.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {leader.role} &middot; Since {leader.since}
                      </p>
                    </div>
                    {leader.linkedIn && (
                      <a
                        href={leader.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Linkedin className="size-4" />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Products Card - 4 cols */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Products</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {competitor.products?.map((product, idx) => (
                    <li key={idx}>
                      <p className="text-sm font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-muted-foreground">{product.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses - 8 cols */}
            <Card className="col-span-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Strengths & Weaknesses</CardTitle>
                <Button variant="ghost" size="sm">
                  <Edit2 className="size-3 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div>
                    <h4 className="text-sm font-medium text-positive mb-2">Strengths</h4>
                    {competitor.strengths && competitor.strengths.length > 0 ? (
                      <ul className="space-y-1.5">
                        {competitor.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-positive mt-1">+</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No strengths added yet.{' '}
                        <button className="text-accent hover:underline">Add first item</button>
                      </p>
                    )}
                  </div>
                  
                  {/* Weaknesses */}
                  <div>
                    <h4 className="text-sm font-medium text-negative mb-2">Weaknesses</h4>
                    {competitor.weaknesses && competitor.weaknesses.length > 0 ? (
                      <ul className="space-y-1.5">
                        {competitor.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-negative mt-1">-</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No weaknesses added yet.{' '}
                        <button className="text-accent hover:underline">Add first item</button>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Voice Panel (Compact) - 6 cols */}
            <Card className="col-span-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Customer Voice</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('customer-voice')}>
                  View All <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {competitor.sentimentSummary && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">30-day sentiment</span>
                        <span className={cn(
                          'flex items-center gap-1 font-medium',
                          competitor.sentimentSummary.netChange >= 0 ? 'text-positive' : 'text-negative'
                        )}>
                          {competitor.sentimentSummary.netChange >= 0 ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          {competitor.sentimentSummary.netChange > 0 ? '+' : ''}
                          {competitor.sentimentSummary.netChange} pts
                        </span>
                      </div>
                      <SentimentBar 
                        positive={competitor.sentimentSummary.positive}
                        mixed={competitor.sentimentSummary.mixed}
                        negative={competitor.sentimentSummary.negative}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{competitor.sentimentSummary.positive} positive</span>
                        <span>{competitor.sentimentSummary.mixed} mixed</span>
                        <span>{competitor.sentimentSummary.negative} negative</span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                
                {/* Recent reviews */}
                <div className="space-y-3">
                  {competitor.recentReviews?.slice(0, 2).map(review => (
                    <div key={review.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'size-3',
                                i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'
                              )}
                            />
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {review.platform}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{review.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Win-Rate Panel (Compact) - 6 cols */}
            <Card className="col-span-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Win Rate vs {competitor.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('win-loss')}>
                  View All <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {competitor.winLossSummary && (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-semibold font-mono">
                        {competitor.winLossSummary.winRate}%
                      </span>
                      <span className={cn(
                        'flex items-center gap-1 text-sm',
                        competitor.winLossSummary.trend >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {competitor.winLossSummary.trend >= 0 ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                        {competitor.winLossSummary.trend > 0 ? '+' : ''}
                        {competitor.winLossSummary.trend}% vs prior 90d
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {competitor.winLossSummary.totalOutcomes} outcomes logged
                    </p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top win reasons</p>
                        <ul className="space-y-1">
                          {competitor.winLossSummary.topWinReasons.map((reason, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-positive" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top loss reasons</p>
                        <ul className="space-y-1">
                          {competitor.winLossSummary.topLossReasons.map((reason, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-negative" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Linked Briefs - Full width */}
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle className="text-base">Linked Briefs</CardTitle>
                <CardDescription>Intelligence briefs that reference {competitor.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {linkedBriefs.map(brief => (
                    <Link
                      key={brief.id}
                      href={`/briefs/${brief.id}`}
                      className="flex-1 p-4 rounded-lg border hover:border-accent/50 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {brief.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{brief.createdAt}</span>
                      </div>
                      <p className="font-medium text-sm mb-1">{brief.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{brief.summary}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as Category | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="buy-side">Buy-side</SelectItem>
                  <SelectItem value="sell-side">Sell-side</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {filteredActivity.map(item => {
                const categoryInfo = getCategoryInfo(item.category)
                return (
                  <Card key={item.id} className="hover:border-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <MISBadge score={item.mis} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-[10px] h-4 px-1.5', categoryInfo.color)}>
                              {categoryInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{item.eventDate}</span>
                          </div>
                          <Link href={`/feed?item=${item.id}`} className="hover:underline">
                            <p className="font-medium text-sm mb-1">{item.title}</p>
                          </Link>
                          <p className="text-sm text-muted-foreground">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">{item.sourceUrls?.[0]?.domain || 'Unknown'}</span>
                            {item.relatedTopics?.map(topic => (
                              <Badge key={topic.id} variant="outline" className="text-[10px] h-4 px-1.5">
                                {topic.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Customer Voice Tab */}
        {activeTab === 'customer-voice' && (
          <div className="space-y-6">
            {/* Sentiment Summary at top */}
            {competitor.sentimentSummary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">30-Day Sentiment Distribution</p>
                      <div className="w-64">
                        <SentimentBar 
                          positive={competitor.sentimentSummary.positive}
                          mixed={competitor.sentimentSummary.mixed}
                          negative={competitor.sentimentSummary.negative}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 w-64">
                        <span>{competitor.sentimentSummary.positive} positive</span>
                        <span>{competitor.sentimentSummary.mixed} mixed</span>
                        <span>{competitor.sentimentSummary.negative} negative</span>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Net Change</p>
                      <span className={cn(
                        'flex items-center gap-1 text-lg font-semibold',
                        competitor.sentimentSummary.netChange >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {competitor.sentimentSummary.netChange >= 0 ? (
                          <TrendingUp className="size-5" />
                        ) : (
                          <TrendingDown className="size-5" />
                        )}
                        {competitor.sentimentSummary.netChange > 0 ? '+' : ''}
                        {competitor.sentimentSummary.netChange} pts
                      </span>
                      <p className="text-[10px] text-muted-foreground">vs prior 30 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
              <Select value={voiceSentimentFilter} onValueChange={(v) => setVoiceSentimentFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Review Items */}
            <div className="space-y-4">
              {filteredVoice.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <MISBadge score={item.mis} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {item.source.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.eventDate}</span>
                        </div>
                        <p className="font-medium text-sm mb-2">{item.title}</p>
                        <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg italic">
                          &ldquo;{item.content}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {item.relatedTopics?.map(topic => (
                            <Badge key={topic.id} variant="outline" className="text-[10px] h-4 px-1.5">
                              {topic.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Battle Cards Tab */}
        {activeTab === 'battle-cards' && (
          <div className="space-y-4">
            {battleCards.length > 0 ? (
              battleCards.map(card => (
                <Card key={card.id} className="hover:border-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Enterprise</Badge>
                          <span className="text-xs text-muted-foreground">
                            Last updated: {card.lastUpdated}
                          </span>
                        </div>
                        <p className="font-medium mb-1">Battle Card: {card.competitorName}</p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {card.author.name}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/battle-cards/${card.id}`}>
                          Open Card <ChevronRight className="size-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No battle cards created for this competitor yet.</p>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Create Battle Card
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Win/Loss Tab */}
        {activeTab === 'win-loss' && (
          <div className="space-y-6">
            {/* Aggregate metrics */}
            {competitor.winLossSummary && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Win Rate (90d)</p>
                    <p className="text-2xl font-semibold font-mono">{competitor.winLossSummary.winRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Trend</p>
                    <p className={cn(
                      'text-2xl font-semibold font-mono flex items-center gap-1',
                      competitor.winLossSummary.trend >= 0 ? 'text-positive' : 'text-negative'
                    )}>
                      {competitor.winLossSummary.trend >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                      {competitor.winLossSummary.trend > 0 ? '+' : ''}{competitor.winLossSummary.trend}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Outcomes</p>
                    <p className="text-2xl font-semibold font-mono">{competitor.winLossSummary.totalOutcomes}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Period</p>
                    <p className="text-2xl font-semibold">{competitor.winLossSummary.period}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Records Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Reasons</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winLossRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.dealName}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            record.outcome === 'win'
                              ? 'bg-positive/15 text-positive border-positive/30'
                              : 'bg-negative/15 text-negative border-negative/30'
                          )}>
                            {record.outcome.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.amount ? `$${record.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.closeDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {record.reasons.map((reason, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.createdBy.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  Analyst Notes
                </CardTitle>
                <CardDescription>
                  Free-form notes with Markdown support. Revision history preserved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Add your notes here... Markdown supported."
                />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Last edited 2 hours ago by Sarah Kim
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View History</Button>
                    <Button size="sm">Save Notes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
