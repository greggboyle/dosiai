'use client'

import * as React from 'react'
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  Calendar,
  ArrowDownUp,
  MessageSquare,
  Users,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedList } from '@/components/feed/feed-list'
import { FeedDetail } from '@/components/feed/feed-detail'
import type { IntelligenceItem, Category } from '@/lib/types'
import { useMediaQuery } from '@/hooks/use-media-query'

// Helper to create mock dates relative to "now" - using fixed offsets in hours
function createMockDate(hoursAgo: number): string {
  // Use a stable base for SSR/client consistency
  const now = new Date()
  now.setMinutes(0, 0, 0) // Normalize to avoid hydration issues
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
}

// The 8 realistic feed items per spec
const mockFeedItems: IntelligenceItem[] = [
  {
    id: '1',
    title: 'Acme Logistics announces $120M Series D led by Andreessen Horowitz',
    summary: 'Major funding round signals aggressive expansion plans. The company plans to use the capital for product development and international expansion into European markets.',
    fullSummary: `Acme Logistics has announced a $120M Series D funding round led by Andreessen Horowitz, with participation from existing investors Sequoia Capital and Index Ventures. This brings their total funding to $245M.

The company stated the funds will be used primarily for product development, with a focus on their AI-powered route optimization engine, and expansion into European markets, starting with the UK and Germany in Q3 2026.

CEO Sarah Chen noted in the press release: "This funding validates our approach to modernizing freight logistics. We're seeing 3x year-over-year growth and plan to accelerate our hiring to 500 employees by year end."

Industry analysts suggest this positions Acme Logistics as the clear leader in the mid-market logistics software space, potentially threatening your enterprise positioning.`,
    content: 'Full article content here...',
    mis: { 
      value: 87, 
      band: 'critical', 
      confidence: 'high', 
      confidenceReason: 'Verified via official press release and SEC filing' 
    },
    scoreBreakdown: {
      competitorProximity: 'high',
      recency: 'recent',
      vendorConsensus: '3/3',
      magnitude: 'large funding magnitude ($120M)',
    },
    fiveWH: {
      who: 'Acme Logistics, led by CEO Sarah Chen, with investment from Andreessen Horowitz, Sequoia Capital and Index Ventures',
      what: '$120M Series D funding round, bringing total funding to $245M',
      when: '2 days ago, with expansion planned for Q3 2026',
      where: 'San Francisco headquarters, with planned expansion to UK and Germany',
      why: 'To fund AI-powered route optimization development and European market entry',
      how: 'Traditional venture capital round with 3x revenue multiple valuation',
    },
    category: 'sell-side',
    sourceUrls: [{ name: 'TechCrunch', url: 'https://techcrunch.com', domain: 'techcrunch.com', isPrimary: true }],
    additionalSources: [
      { name: 'Bloomberg', url: 'https://bloomberg.com', domain: 'bloomberg.com' },
      { name: 'SEC Filing', url: 'https://sec.gov', domain: 'sec.gov' },
    ],
    vendorConsensus: { confirmed: 3, total: 3 },
    relatedCompetitors: [{ id: '1', name: 'Acme Logistics' }],
    relatedTopics: [{ id: 't1', name: 'Funding' }, { id: 't2', name: 'Expansion' }],
    timestamp: createMockDate(48), // 2 days ago
    eventDate: '2 days ago',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    relatedItems: ['3', '6'],
  },
  {
    id: '2',
    title: 'FreightHero hires former Convoy VP of Engineering as new CTO',
    summary: 'Strategic leadership addition with deep expertise in scaling logistics platforms. Marcus Williams previously led Convoy engineering team through their Series D.',
    fullSummary: `FreightHero has appointed Marcus Williams as their new Chief Technology Officer. Williams previously served as VP of Engineering at Convoy, where he led the engineering organization through rapid scaling from 50 to 400 engineers.

At Convoy, Williams was instrumental in developing their dynamic pricing algorithm and real-time tracking infrastructure. He holds patents in predictive freight matching and has published papers on logistics optimization at scale.

This hire signals FreightHero's intent to significantly upgrade their technical capabilities. Sources close to the company suggest they are planning a major platform overhaul in the coming year.

The appointment follows FreightHero's recent $80M Series C and suggests they are positioning for enterprise customer acquisition, potentially moving upmarket into your core segment.`,
    content: 'Full article content here...',
    mis: { 
      value: 78, 
      band: 'high', 
      confidence: 'medium', 
      confidenceReason: 'LinkedIn profile update confirmed, pending official announcement' 
    },
    scoreBreakdown: {
      competitorProximity: 'high',
      recency: 'recent',
      vendorConsensus: '2/3',
    },
    fiveWH: {
      who: 'Marcus Williams (former Convoy VP of Engineering) joining FreightHero as CTO',
      what: 'CTO appointment following Series C funding',
      when: 'Yesterday, effective immediately',
      where: 'FreightHero Seattle headquarters',
      why: 'To lead technical transformation and enterprise platform development',
      how: 'Executive recruitment following Series C funding',
    },
    category: 'sell-side',
    sourceUrls: [{ name: 'LinkedIn', url: 'https://linkedin.com', domain: 'linkedin.com', isPrimary: true }],
    vendorConsensus: { confirmed: 2, total: 3 },
    relatedCompetitors: [{ id: '2', name: 'FreightHero' }],
    relatedTopics: [{ id: 't3', name: 'Leadership Signals' }, { id: 't4', name: 'Hiring' }],
    timestamp: createMockDate(24), // 1 day ago
    eventDate: 'yesterday',
    isRead: false,
    isBookmarked: true,
    isWatching: true,
  },
  {
    id: '3',
    title: 'G2 review pattern shift: Acme Logistics implementation complaints up 14% over 30 days',
    summary: 'Emerging negative sentiment around implementation experience. Multiple reviews cite onboarding delays and integration difficulties with legacy TMS systems.',
    fullSummary: `Analysis of G2 reviews over the past 30 days reveals a significant uptick in implementation-related complaints for Acme Logistics. Negative mentions of "onboarding," "implementation," and "integration" have increased 14% compared to the previous period.

Key complaint themes include:
- Extended implementation timelines (avg complaint mentions 3-4 months vs promised 6 weeks)
- Integration difficulties with SAP and Oracle TMS systems
- Insufficient dedicated support during rollout phase
- Hidden professional services costs not disclosed during sales

This represents a potential competitive opportunity. Sales teams should be prepared to address implementation concerns proactively and highlight our 45-day average implementation timeline and dedicated CSM model.

Recommend monitoring this trend weekly and updating battle cards with relevant counter-positioning.`,
    content: 'Full article content here...',
    mis: { 
      value: 71, 
      band: 'high', 
      confidence: 'high', 
      confidenceReason: 'Aggregated from 23 verified G2 reviews' 
    },
    scoreBreakdown: {
      competitorProximity: 'high',
      recency: 'recent',
      vendorConsensus: '3/3',
    },
    fiveWH: {
      who: 'Acme Logistics customers, primarily mid-market logistics companies',
      what: '14% increase in negative implementation reviews on G2',
      when: 'Trend observed over past 30 days, accelerating in last week',
      where: 'G2 review platform, enterprise and mid-market segments',
      why: 'Apparent scaling issues with implementation team, integration complexity',
      how: 'Natural language analysis of 23 recent G2 reviews identifying negative sentiment patterns',
    },
    category: 'buy-side',
    sourceUrls: [{ name: 'G2', url: 'https://g2.com', domain: 'g2.com', isPrimary: true }],
    vendorConsensus: { confirmed: 3, total: 3 },
    relatedCompetitors: [{ id: '1', name: 'Acme Logistics' }],
    relatedTopics: [{ id: 't5', name: 'Customer Voice' }, { id: 't6', name: 'Product Gaps' }],
    timestamp: createMockDate(3), // 3 hours ago (today)
    eventDate: 'today',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    // reviewMetadata would be populated for customer voice items
    relatedItems: ['1', '6'],
  },
  {
    id: '4',
    title: 'FreightHero CEO confirmed as keynote speaker at Manifest Vegas 2026',
    summary: 'High-profile speaking slot signals increased market presence. CEO Jake Morrison to present on "The Future of AI in Freight Matching" at the industry largest event.',
    fullSummary: `FreightHero CEO Jake Morrison has been confirmed as a keynote speaker at Manifest Vegas 2026, the supply chain industry's largest annual conference. He will deliver a 45-minute presentation titled "The Future of AI in Freight Matching: From Prediction to Prescription."

Manifest Vegas typically draws 8,000+ attendees from the logistics industry, including major shippers, carriers, and technology buyers. Keynote speakers historically include executives from Flexport, Convoy, and major 3PLs.

This speaking slot indicates FreightHero's growing brand recognition and thought leadership positioning. It also provides them significant visibility among enterprise prospects.

Consider whether a presence at Manifest (booth, speaking slot, or sponsored event) should be part of the 2026 marketing plan to maintain visibility parity.`,
    content: 'Full article content here...',
    mis: { 
      value: 64, 
      band: 'high', 
      confidence: 'medium', 
      confidenceReason: 'Conference website listing, pending official PR' 
    },
    scoreBreakdown: {
      competitorProximity: 'medium',
      recency: 'recent',
      vendorConsensus: '2/3',
    },
    fiveWH: {
      who: 'Jake Morrison, CEO of FreightHero',
      what: 'Keynote speaking slot at Manifest Vegas 2026',
      when: 'Conference in March 2026, announced 3 days ago',
      where: 'Las Vegas Convention Center',
      why: 'Thought leadership positioning on AI in freight matching',
      how: 'Invited speaker based on industry recognition',
    },
    category: 'channel',
    sourceUrls: [{ name: 'Manifest Vegas', url: 'https://manifestvegas.com', domain: 'manifestvegas.com', isPrimary: true }],
    vendorConsensus: { confirmed: 2, total: 3 },
    relatedCompetitors: [{ id: '2', name: 'FreightHero' }],
    relatedTopics: [{ id: 't7', name: 'Events' }, { id: 't8', name: 'Brand' }],
    timestamp: createMockDate(72), // 3 days ago
    eventDate: '3 days ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '5',
    title: 'FMCSA proposes new ELD data-retention rule, 60-day comment period opens',
    summary: 'Regulatory change could impact all TMS platforms. Proposed rule would require 3-year retention of ELD data with new audit trail requirements.',
    fullSummary: `The Federal Motor Carrier Safety Administration (FMCSA) has published a Notice of Proposed Rulemaking (NPRM) that would significantly expand ELD data retention requirements for motor carriers and their technology providers.

Key provisions of the proposed rule:
- Extension of required ELD data retention from 6 months to 3 years
- New requirements for immutable audit trails on data modifications
- Enhanced API standards for regulatory data sharing
- Penalties of up to $16,000 per violation for non-compliance

The 60-day public comment period begins today and closes on July 3, 2026. FMCSA estimates the rule would affect approximately 500,000 motor carriers and all ELD/TMS providers.

This regulatory change will require product development investment across the industry. Early compliance positioning could be a competitive differentiator. Recommend engaging legal and product teams to assess impact and timeline.`,
    content: 'Full article content here...',
    mis: { 
      value: 58, 
      band: 'medium', 
      confidence: 'high', 
      confidenceReason: 'Official Federal Register publication' 
    },
    scoreBreakdown: {
      competitorProximity: 'low',
      recency: 'recent',
      vendorConsensus: '3/3',
    },
    fiveWH: {
      who: 'FMCSA (Federal Motor Carrier Safety Administration), affecting all carriers and TMS providers',
      what: 'Proposed rulemaking on ELD data retention (6 months to 3 years)',
      when: 'Comment period opens today, closes July 3, 2026; implementation expected 2027',
      where: 'United States, all interstate commercial motor carriers',
      why: 'Enhanced safety oversight and compliance enforcement',
      how: 'Notice of Proposed Rulemaking in Federal Register, standard regulatory process',
    },
    category: 'regulatory',
    sourceUrls: [{ name: 'Federal Register', url: 'https://federalregister.gov', domain: 'federalregister.gov', isPrimary: true }],
    vendorConsensus: { confirmed: 3, total: 3 },
    relatedTopics: [{ id: 't9', name: 'FMCSA Compliance' }, { id: 't10', name: 'ELD' }, { id: 't11', name: 'Regulatory' }],
    timestamp: createMockDate(5), // 5 hours ago (today)
    eventDate: 'today',
    isRead: false,
    isBookmarked: true,
    isWatching: true,
  },
  {
    id: '6',
    title: 'Acme Logistics posts 14 new engineering job listings, 9 in Austin',
    summary: 'Hiring surge suggests product expansion. Roles focus on real-time tracking, API platform, and mobile development.',
    fullSummary: `Acme Logistics has posted 14 new engineering positions on their careers page and Greenhouse, with 9 positions located in their Austin office. This represents a 40% increase in their open engineering roles compared to last month.

Breakdown of roles:
- 4 Senior Backend Engineers (API Platform)
- 3 Mobile Engineers (iOS/Android)
- 2 Real-time Systems Engineers
- 2 Data Engineers
- 2 Frontend Engineers
- 1 Engineering Manager

The concentration of API Platform and Real-time Systems roles suggests investment in their integration capabilities and tracking infrastructure. Mobile focus may indicate a new driver or customer-facing app initiative.

Austin is emerging as their secondary engineering hub behind SF, potentially to access Texas talent at lower cost while maintaining proximity to major shipping corridors.`,
    content: 'Full article content here...',
    mis: { 
      value: 52, 
      band: 'medium', 
      confidence: 'high', 
      confidenceReason: 'Direct job posting analysis' 
    },
    scoreBreakdown: {
      competitorProximity: 'medium',
      recency: 'moderate',
      vendorConsensus: '2/3',
    },
    fiveWH: {
      who: 'Acme Logistics engineering organization',
      what: '14 new engineering job postings, concentrated in API, mobile, and real-time systems',
      when: 'Posted 4 days ago, ongoing recruitment',
      where: '9 roles in Austin, 5 in San Francisco',
      why: 'Apparent product expansion in integration and mobile capabilities',
      how: 'Greenhouse job postings and LinkedIn recruitment activity',
    },
    category: 'sell-side',
    sourceUrls: [{ name: 'Greenhouse', url: 'https://greenhouse.io', domain: 'greenhouse.io', isPrimary: true }],
    additionalSources: [
      { name: 'LinkedIn Jobs', url: 'https://linkedin.com/jobs', domain: 'linkedin.com' },
    ],
    vendorConsensus: { confirmed: 2, total: 3 },
    relatedCompetitors: [{ id: '1', name: 'Acme Logistics' }],
    relatedTopics: [{ id: 't4', name: 'Hiring' }, { id: 't12', name: 'Product Signals' }],
    timestamp: createMockDate(96), // 4 days ago
    eventDate: '4 days ago',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    relatedItems: ['1', '3'],
  },
  {
    id: '7',
    title: 'FreightHero featured in Supply Chain Brain podcast episode 287',
    summary: 'CEO interview covers AI strategy and enterprise roadmap. Notable quotes about "democratizing freight intelligence" and displacing legacy TMS platforms.',
    fullSummary: `FreightHero CEO Jake Morrison appeared on Supply Chain Brain podcast episode 287, titled "AI-First Logistics: The Next Generation of Freight Tech." The 45-minute interview covered their product strategy, AI capabilities, and go-to-market approach.

Key quotes from the interview:
- "We're democratizing freight intelligence that was previously only available to the largest carriers"
- "Legacy TMS platforms are built on 20-year-old architecture. The market is ready for a modern, AI-native approach"
- "Our average customer sees ROI within 6 weeks of implementation"
- "We're seeing increasing interest from enterprise shippers who are frustrated with incumbent complexity"

The enterprise positioning language is notable - this aligns with the recent CTO hire and suggests an intentional move upmarket. Supply Chain Brain has ~50,000 monthly listeners, primarily operations leaders and supply chain executives.`,
    content: 'Full article content here...',
    mis: { 
      value: 47, 
      band: 'medium', 
      confidence: 'medium', 
      confidenceReason: 'Podcast transcript analysis' 
    },
    scoreBreakdown: {
      competitorProximity: 'medium',
      recency: 'moderate',
      vendorConsensus: '2/3',
    },
    fiveWH: {
      who: 'Jake Morrison, CEO of FreightHero, interviewed by Supply Chain Brain',
      what: '45-minute podcast interview covering AI strategy and enterprise roadmap',
      when: 'Published 5 days ago',
      where: 'Supply Chain Brain podcast, ~50,000 monthly listeners',
      why: 'Thought leadership and brand building, enterprise market positioning',
      how: 'Industry podcast appearance',
    },
    category: 'channel',
    sourceUrls: [{ name: 'Supply Chain Brain', url: 'https://supplychainbrain.com', domain: 'supplychainbrain.com', isPrimary: true }],
    vendorConsensus: { confirmed: 2, total: 3 },
    relatedCompetitors: [{ id: '2', name: 'FreightHero' }],
    relatedTopics: [{ id: 't13', name: 'Thought Leadership' }, { id: 't14', name: 'Positioning' }],
    timestamp: createMockDate(120), // 5 days ago
    eventDate: '5 days ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '8',
    title: 'Reddit r/logistics thread mentions Acme Logistics outage during peak hours',
    summary: 'Community discussion of reported system downtime. Multiple users report tracking and dispatch issues lasting approximately 4 hours yesterday.',
    fullSummary: `A Reddit thread in r/logistics titled "Anyone else having Acme issues today?" has accumulated 47 comments discussing what appears to be a significant system outage yesterday during peak dispatch hours (10 AM - 2 PM Eastern).

User reports include:
- Complete loss of tracking visibility for 4+ hours
- Dispatch system returning errors
- API integrations failing with 503 errors
- Customer service wait times exceeding 1 hour

Acme has not publicly acknowledged the outage. Their status page showed "degraded performance" but was updated to "operational" by 3 PM Eastern.

Note: Reddit reports are unverified and may not represent the full scope of the issue. However, the volume of independent reports suggests a genuine service disruption. This information may be useful in competitive situations where reliability is a concern, but should be used carefully as the details are not officially confirmed.`,
    content: 'Full article content here...',
    mis: { 
      value: 38, 
      band: 'low', 
      confidence: 'low', 
      confidenceReason: 'Unverified community reports, single source' 
    },
    scoreBreakdown: {
      competitorProximity: 'medium',
      recency: 'moderate',
      vendorConsensus: '1/3',
    },
    fiveWH: {
      who: 'Acme Logistics customers, reported by Reddit r/logistics community',
      what: 'Reported 4-hour system outage affecting tracking and dispatch',
      when: '6 days ago, 10 AM - 2 PM Eastern',
      where: 'Acme Logistics platform, unclear geographic scope',
      why: 'Cause unknown, not publicly acknowledged by Acme',
      how: 'Community reports on Reddit, 47 comments in thread',
    },
    category: 'buy-side',
    sourceUrls: [{ name: 'Reddit', url: 'https://reddit.com/r/logistics', domain: 'reddit.com', isPrimary: true }],
    vendorConsensus: { confirmed: 1, total: 3 },
    relatedCompetitors: [{ id: '1', name: 'Acme Logistics' }],
    relatedTopics: [{ id: 't15', name: 'Reliability' }, { id: 't5', name: 'Customer Voice' }],
    timestamp: createMockDate(144), // 6 days ago
    eventDate: '6 days ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
    // reviewMetadata would be populated for customer voice items
  },
]

// Get unique values for filters
const allCompetitors = [...new Set(mockFeedItems.filter(i => i.competitor).map(i => i.competitor!.name))]
const allTopics = [...new Set(mockFeedItems.flatMap(i => i.topics))]

type ViewTab = 'today' | 'week' | 'watching' | 'all' | 'review'
type SortOption = 'score' | 'recent' | 'competitor'

const categoryFilters: { value: Category; label: string }[] = [
  { value: 'buy-side', label: 'Buy-side' },
  { value: 'sell-side', label: 'Sell-side' },
  { value: 'channel', label: 'Channel' },
  { value: 'regulatory', label: 'Regulatory' },
]

export default function FeedPage() {
  const [selectedItem, setSelectedItem] = React.useState<IntelligenceItem | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  
  // View tabs
  const [activeTab, setActiveTab] = React.useState<ViewTab>('all')
  
  // Filters
  const [selectedCategories, setSelectedCategories] = React.useState<Category[]>([])
  const [selectedCompetitors, setSelectedCompetitors] = React.useState<string[]>([])
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([])
  const [minScore, setMinScore] = React.useState<number>(0)
  const [showCustomerVoiceOnly, setShowCustomerVoiceOnly] = React.useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false)
  
  // Sort
  const [sortBy, setSortBy] = React.useState<SortOption>('score')
  
  // Use client-only state to avoid hydration mismatches with date calculations
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  // Compute counts for tabs (only after mount to avoid hydration issues)
  const todayCount = React.useMemo(() => {
    if (!mounted) return 0
    const today = new Date()
    return mockFeedItems.filter(i => {
      const itemDate = new Date(i.timestamp)
      return itemDate.toDateString() === today.toDateString()
    }).length
  }, [mounted])
  
  const weekCount = React.useMemo(() => {
    if (!mounted) return mockFeedItems.length // Default to all for SSR
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return mockFeedItems.filter(i => new Date(i.timestamp) >= weekAgo).length
  }, [mounted])
  
  const watchingCount = mockFeedItems.filter(i => i.isWatching).length
  const reviewCount = mockFeedItems.filter(i => i.mis.value >= 70 && !i.isRead).length

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let items = [...mockFeedItems]

    // Tab filters (only apply date-based filters after mount)
    switch (activeTab) {
      case 'today': {
        if (mounted) {
          const today = new Date()
          items = items.filter(i => new Date(i.timestamp).toDateString() === today.toDateString())
        }
        break
      }
      case 'week': {
        if (mounted) {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          items = items.filter(i => new Date(i.timestamp) >= weekAgo)
        }
        break
      }
      case 'watching':
        items = items.filter(i => i.isWatching)
        break
      case 'review':
        items = items.filter(i => i.mis.value >= 70 && !i.isRead)
        break
    }

    // Category filter
    if (selectedCategories.length > 0) {
      items = items.filter(i => selectedCategories.includes(i.category))
    }

    // Competitor filter (C1: updated to use relatedCompetitors array)
    if (selectedCompetitors.length > 0) {
      items = items.filter(i => i.relatedCompetitors?.some(c => selectedCompetitors.includes(c.name)))
    }

    // Topic filter (C1: updated to use relatedTopics array)
    if (selectedTopics.length > 0) {
      items = items.filter(i => i.relatedTopics?.some(t => selectedTopics.includes(t.name)))
    }

    // Min score filter
    if (minScore > 0) {
      items = items.filter(i => i.mis.value >= minScore)
    }

    // Customer voice filter (C1: updated to use reviewMetadata)
    if (showCustomerVoiceOnly) {
      items = items.filter(i => i.reviewMetadata)
    }

    // Unread filter
    if (showUnreadOnly) {
      items = items.filter(i => !i.isRead)
    }

    // Sort (C1: updated to use relatedCompetitors)
    items.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.mis.value - a.mis.value
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        case 'competitor':
          const nameA = a.relatedCompetitors?.[0]?.name || 'ZZZ'
          const nameB = b.relatedCompetitors?.[0]?.name || 'ZZZ'
          return nameA.localeCompare(nameB)
        default:
          return 0
      }
    })

    return items
  }, [activeTab, selectedCategories, selectedCompetitors, selectedTopics, minScore, showCustomerVoiceOnly, showUnreadOnly, sortBy, mounted])

  const hasActiveFilters = 
    selectedCategories.length > 0 || 
    selectedCompetitors.length > 0 || 
    selectedTopics.length > 0 || 
    minScore > 0 || 
    showCustomerVoiceOnly || 
    showUnreadOnly

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedCompetitors([])
    setSelectedTopics([])
    setMinScore(0)
    setShowCustomerVoiceOnly(false)
    setShowUnreadOnly(false)
  }

  const handleSelectItem = (item: IntelligenceItem) => {
    setSelectedItem(item)
    if (!isDesktop) {
      setDetailOpen(true)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Feed List Panel */}
      <div className="flex-1 flex flex-col min-w-0 xl:max-w-[60%] border-r border-border">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Dossier Feed</h1>
              <p className="text-sm text-muted-foreground">
                {filteredItems.length} intelligence item{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* View Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)} className="mb-4">
            <TabsList className="h-9">
              <TabsTrigger value="today" className="text-xs">
                Today
                {mounted && todayCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{todayCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs">
                This Week
                {mounted && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{weekCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="watching" className="text-xs">
                <Eye className="size-3 mr-1" />
                Watching
                {watchingCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{watchingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="review" className="text-xs">
                Review Queue
                {reviewCount > 0 && <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-mis-critical">{reviewCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Filter className="size-3" />
                  Category
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel className="text-xs">Categories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categoryFilters.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.value}
                    checked={selectedCategories.includes(cat.value)}
                    onCheckedChange={(checked) => {
                      setSelectedCategories(
                        checked
                          ? [...selectedCategories, cat.value]
                          : selectedCategories.filter((c) => c !== cat.value)
                      )
                    }}
                    className="text-xs"
                  >
                    {cat.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Competitor Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Users className="size-3" />
                  Competitor
                  {selectedCompetitors.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedCompetitors.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel className="text-xs">Competitors</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allCompetitors.map((comp) => (
                  <DropdownMenuCheckboxItem
                    key={comp}
                    checked={selectedCompetitors.includes(comp)}
                    onCheckedChange={(checked) => {
                      setSelectedCompetitors(
                        checked
                          ? [...selectedCompetitors, comp]
                          : selectedCompetitors.filter((c) => c !== comp)
                      )
                    }}
                    className="text-xs"
                  >
                    {comp}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Topic Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  Topic
                  {selectedTopics.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedTopics.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 max-h-64 overflow-auto">
                <DropdownMenuLabel className="text-xs">Topics</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTopics.map((topic) => (
                  <DropdownMenuCheckboxItem
                    key={topic}
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={(checked) => {
                      setSelectedTopics(
                        checked
                          ? [...selectedTopics, topic]
                          : selectedTopics.filter((t) => t !== topic)
                      )
                    }}
                    className="text-xs"
                  >
                    {topic}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* MIS Score Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <SlidersHorizontal className="size-3" />
                  MIS {minScore > 0 ? `≥${minScore}` : 'Score'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Minimum MIS Score</Label>
                    <span className="font-mono text-xs text-muted-foreground">{minScore}</span>
                  </div>
                  <Slider
                    value={[minScore]}
                    onValueChange={([v]) => setMinScore(v)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0 (All)</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Customer Voice Toggle */}
            <Button
              variant={showCustomerVoiceOnly ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowCustomerVoiceOnly(!showCustomerVoiceOnly)}
            >
              <MessageSquare className="size-3" />
              Customer Voice
            </Button>

            {/* Read/Unread Toggle */}
            <Button
              variant={showUnreadOnly ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              Unread Only
            </Button>

            <div className="flex-1" />

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <ArrowDownUp className="size-3" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <DropdownMenuRadioItem value="score" className="text-xs">MIS Score</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="recent" className="text-xs">Recency</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="competitor" className="text-xs">Competitor</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear
                <X className="ml-1 size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Feed List */}
        <FeedList
          items={filteredItems}
          selectedId={selectedItem?.id}
          onSelect={handleSelectItem}
        />
      </div>

      {/* Detail Panel - Desktop */}
      {isDesktop && (
        <div className="hidden xl:flex w-[40%] flex-col bg-card">
          <FeedDetail item={selectedItem} />
        </div>
      )}

      {/* Detail Panel - Mobile/Tablet Sheet */}
      {!isDesktop && (
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0">
            <FeedDetail item={selectedItem} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
