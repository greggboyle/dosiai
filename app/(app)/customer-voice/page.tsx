'use client'

import * as React from 'react'
import { 
  Filter, 
  Calendar,
  ArrowDownUp,
  ExternalLink,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { MISBadge } from '@/components/mis-badge'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { IntelligenceItem, CustomerVoiceSummary, ReviewPlatform, Sentiment } from '@/lib/types'

// Platform display info
const platformInfo: Record<ReviewPlatform, { label: string; color: string; icon: string }> = {
  'g2': { label: 'G2', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400', icon: 'G2' },
  'capterra': { label: 'Capterra', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', icon: 'Ca' },
  'trustradius': { label: 'TrustRadius', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: 'TR' },
  'app-store': { label: 'App Store', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', icon: 'AS' },
  'reddit': { label: 'Reddit', color: 'bg-orange-600/15 text-orange-700 dark:text-orange-300', icon: 'Re' },
  'hacker-news': { label: 'Hacker News', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: 'HN' },
  'communities': { label: 'Communities', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', icon: 'Co' },
}

// Sentiment colors
const sentimentColors: Record<Sentiment, { dot: string; text: string; bg: string }> = {
  'positive': { dot: 'bg-positive', text: 'text-positive', bg: 'bg-positive/15' },
  'mixed': { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15' },
  'negative': { dot: 'bg-negative', text: 'text-negative', bg: 'bg-negative/15' },
  'neutral': { dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted' },
}

// Mock competitors
const subjects = [
  { id: 'our-company', name: 'Our Company' },
  { id: '1', name: 'Acme Logistics' },
  { id: '2', name: 'FreightHero' },
  { id: '3', name: 'RouteIQ' },
  { id: '4', name: 'ChainShield' },
]

const platforms: ReviewPlatform[] = ['g2', 'capterra', 'trustradius', 'app-store', 'reddit', 'hacker-news', 'communities']
const sentiments: Sentiment[] = ['positive', 'mixed', 'negative', 'neutral']

// Helper for dates
function createMockDate(daysAgo: number): string {
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
}

function formatRelativeDate(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to create IntelligenceItem with reviewMetadata from compact spec (E5)
interface CustomerVoiceSpec {
  id: string
  platform: ReviewPlatform
  sentiment: Sentiment
  rating?: number
  maxRating?: number
  excerpt: string
  fullText: string
  reviewerRole?: string
  reviewerCompany?: string
  subjectId: string
  subjectName: string
  themes?: string[]
  mis: { value: number; band: 'noise' | 'low' | 'medium' | 'high' | 'critical'; confidence: 'high' | 'medium' | 'low'; confidenceReason?: string }
  sourceUrl?: string
  daysAgo: number
}

// C1: Updated to use new IntelligenceItem field names (sourceUrls, relatedCompetitors, relatedTopics)
function createCustomerVoiceItems(specs: CustomerVoiceSpec[]): IntelligenceItem[] {
  return specs.map(spec => ({
    id: spec.id,
    title: `${platformInfo[spec.platform].label} Review: ${spec.excerpt.slice(0, 50)}...`,
    summary: spec.excerpt,
    content: '',
    category: 'buy-side' as const,
    sourceUrls: [{ name: platformInfo[spec.platform].label, url: spec.sourceUrl || '', domain: spec.platform === 'g2' ? 'g2.com' : spec.platform === 'capterra' ? 'capterra.com' : spec.platform, isPrimary: true }],
    vendorConsensus: { confirmed: 1, total: 1 },
    relatedCompetitors: [{ id: spec.subjectId, name: spec.subjectName }],
    relatedTopics: (spec.themes || []).map((t, i) => ({ id: `topic-${i}`, name: t })),
    mis: spec.mis,
    timestamp: createMockDate(spec.daysAgo),
    eventDate: `${spec.daysAgo} days ago`,
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    reviewMetadata: {
      platform: spec.platform,
      sentiment: spec.sentiment,
      rating: spec.rating,
      maxRating: spec.maxRating,
      excerpt: spec.excerpt,
      fullText: spec.fullText,
      reviewerRole: spec.reviewerRole,
      reviewerCompany: spec.reviewerCompany,
      subjectId: spec.subjectId,
      subjectName: spec.subjectName,
      themes: spec.themes,
    },
  }))
}

// Realistic seed data - 14 items for Acme Logistics (E5: unified IntelligenceItem with reviewMetadata)
const mockItems: IntelligenceItem[] = [
  // Positive items (7)
  {
    id: 'cv-1',
    title: 'G2 Review: Routing optimization is genuinely best-in-class',
    summary: 'Routing optimization is genuinely best-in-class. We saw 11% reduction in empty miles in the first quarter.',
    content: '',
    category: 'buy-side',
    sourceUrls: [{ name: 'G2', url: 'https://g2.com/products/acme-logistics/reviews', domain: 'g2.com', isPrimary: true }],
    vendorConsensus: { confirmed: 1, total: 1 },
    relatedCompetitors: [{ id: '1', name: 'Acme Logistics' }],
    relatedTopics: [{ id: 'topic-1', name: 'Route optimization' }, { id: 'topic-2', name: 'AI features' }],
    mis: { value: 72, band: 'high', confidence: 'high' },
    timestamp: createMockDate(3),
    eventDate: '3 days ago',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    reviewMetadata: {
      platform: 'g2',
      sentiment: 'positive',
      rating: 4,
      maxRating: 5,
      excerpt: 'Routing optimization is genuinely best-in-class. We saw 11% reduction in empty miles in the first quarter.',
      fullText: 'Routing optimization is genuinely best-in-class. We saw 11% reduction in empty miles in the first quarter. The AI-powered suggestions have been surprisingly accurate, and the implementation team was responsive throughout the process. The only downside is the mobile app could use some polish, but overall very satisfied with our decision.',
      reviewerRole: 'VP of Operations',
      reviewerCompany: '$200M shipper',
      subjectId: '1',
      subjectName: 'Acme Logistics',
      themes: ['Route optimization', 'AI features'],
    },
  },
  // Additional items converted to IntelligenceItem with reviewMetadata (E5)
  ...createCustomerVoiceItems([
    { id: 'cv-2', platform: 'g2', sentiment: 'positive', rating: 5, maxRating: 5, excerpt: 'Finally a TMS that understands mid-market needs. Setup was faster than expected and the team has been great.', fullText: 'Finally a TMS that understands mid-market needs. Setup was faster than expected and the team has been great. We were up and running in just 6 weeks, compared to 4+ months quoted by competitors. The pricing model is transparent and scales well with our business. Highly recommend for growing logistics operations.', reviewerRole: 'Director of Supply Chain', reviewerCompany: '$75M manufacturer', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Implementation speed', 'Pricing transparency'], mis: { value: 65, band: 'high', confidence: 'high' }, sourceUrl: 'https://g2.com/products/acme-logistics/reviews', daysAgo: 5 },
    { id: 'cv-3', platform: 'capterra', sentiment: 'positive', rating: 4, maxRating: 5, excerpt: 'The carrier network integration saved us countless hours. Real-time tracking has been a game-changer for customer service.', fullText: 'The carrier network integration saved us countless hours. Real-time tracking has been a game-changer for customer service. Our CSAT scores improved 15% since implementation. The API documentation is excellent for our dev team, though we wished there was more customization in the reporting module.', reviewerRole: 'IT Manager', reviewerCompany: 'Regional 3PL', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Carrier integration', 'Customer service'], mis: { value: 58, band: 'medium', confidence: 'high' }, sourceUrl: 'https://capterra.com/p/acme-logistics', daysAgo: 7 },
    { id: 'cv-4', platform: 'trustradius', sentiment: 'positive', rating: 4.5, maxRating: 5, excerpt: 'Switched from LogiFlow last year - night and day difference in user experience. Our dispatchers actually enjoy using it.', fullText: 'Switched from LogiFlow last year - night and day difference in user experience. Our dispatchers actually enjoy using it. Training time dropped from 2 weeks to 3 days for new hires. The mobile app is solid for drivers and the back-office integration with our ERP was smoother than expected.', reviewerRole: 'Operations Manager', reviewerCompany: 'Mid-size trucking company', subjectId: '1', subjectName: 'Acme Logistics', themes: ['User experience', 'Training'], mis: { value: 62, band: 'high', confidence: 'medium' }, sourceUrl: 'https://trustradius.com/products/acme-logistics', daysAgo: 10 },
    { id: 'cv-5', platform: 'g2', sentiment: 'positive', rating: 4, maxRating: 5, excerpt: 'Their AI load matching has reduced our deadhead by 8%. Worth the investment for that alone.', fullText: 'Their AI load matching has reduced our deadhead by 8%. Worth the investment for that alone. The machine learning improves over time based on our specific routes and patterns. Support has been responsive when we had questions. Looking forward to the new features they announced.', reviewerRole: 'Fleet Director', reviewerCompany: 'Enterprise shipper', subjectId: '1', subjectName: 'Acme Logistics', themes: ['AI features', 'Route optimization'], mis: { value: 68, band: 'high', confidence: 'high' }, sourceUrl: 'https://g2.com/products/acme-logistics/reviews', daysAgo: 12 },
    { id: 'cv-6', platform: 'communities', sentiment: 'positive', excerpt: 'Been using Acme for 8 months now. Best decision we made for our logistics stack. Their API is clean and well-documented.', fullText: 'Been using Acme for 8 months now. Best decision we made for our logistics stack. Their API is clean and well-documented. We integrated it with our custom warehouse system in under 2 weeks. The webhook system is reliable and we havent had any data sync issues.', reviewerRole: 'Tech Lead', subjectId: '1', subjectName: 'Acme Logistics', themes: ['API quality', 'Integration'], mis: { value: 55, band: 'medium', confidence: 'medium' }, daysAgo: 15 },
    { id: 'cv-7', platform: 'g2', sentiment: 'positive', rating: 5, maxRating: 5, excerpt: 'The visibility dashboard alone was worth switching. Finally know where all our shipments are in real-time.', fullText: 'The visibility dashboard alone was worth switching. Finally know where all our shipments are in real-time. The alerts system catches delays before they become problems. Our on-time delivery rate went from 89% to 96% in the first 6 months.', reviewerRole: 'Logistics Coordinator', reviewerCompany: 'E-commerce fulfillment', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Real-time visibility', 'Alerts'], mis: { value: 60, band: 'medium', confidence: 'high' }, sourceUrl: 'https://g2.com/products/acme-logistics/reviews', daysAgo: 18 },
    // Mixed items
    { id: 'cv-8', platform: 'capterra', sentiment: 'mixed', rating: 3, maxRating: 5, excerpt: 'Strong product but pricing changed materially at our renewal - got hit with a per-truck add-on we weren\'t told about.', fullText: 'Strong product but pricing changed materially at our renewal - got hit with a per-truck add-on we weren\'t told about. The core functionality is excellent and our team loves the interface, but the surprise pricing increase at renewal left a bad taste. Make sure you get everything in writing upfront.', reviewerRole: 'IT Director', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Pricing surprises', 'Transparency'], mis: { value: 74, band: 'high', confidence: 'high' }, sourceUrl: 'https://capterra.com/p/acme-logistics', daysAgo: 8 },
    { id: 'cv-9', platform: 'trustradius', sentiment: 'mixed', rating: 3.5, maxRating: 5, excerpt: 'Great features but the learning curve is steep. Took our team longer than expected to get fully productive.', fullText: 'Great features but the learning curve is steep. Took our team longer than expected to get fully productive. The power is there once you learn the system, but the UX could be more intuitive for common tasks. Support helped but response times varied. Overall positive but not without friction.', reviewerRole: 'Operations Analyst', reviewerCompany: 'Regional carrier', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Implementation complexity', 'Learning curve'], mis: { value: 52, band: 'medium', confidence: 'medium' }, sourceUrl: 'https://trustradius.com/products/acme-logistics', daysAgo: 14 },
    { id: 'cv-10', platform: 'g2', sentiment: 'mixed', rating: 3, maxRating: 5, excerpt: 'The core TMS is solid but the reporting module feels dated. We end up exporting to Excel for most analysis.', fullText: 'The core TMS is solid but the reporting module feels dated. We end up exporting to Excel for most analysis. They say a new analytics dashboard is coming soon, but its been "coming soon" for 6 months now. The operational side works great though.', reviewerRole: 'Supply Chain Manager', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Reporting', 'Feature gaps'], mis: { value: 48, band: 'medium', confidence: 'high' }, sourceUrl: 'https://g2.com/products/acme-logistics/reviews', daysAgo: 20 },
    // Negative items
    { id: 'cv-11', platform: 'g2', sentiment: 'negative', rating: 2, maxRating: 5, excerpt: 'Implementation took 14 weeks against the promised 8. Support escalations got slow once our project champion left their company.', fullText: 'Implementation took 14 weeks against the promised 8. Support escalations got slow once our project champion left their company. The product itself is fine once running, but the onboarding experience was frustrating. Multiple data migration issues that should have been caught earlier. Would think twice before recommending.', reviewerRole: 'Operations Director', reviewerCompany: '$80M shipper', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Implementation complexity', 'Support response time'], mis: { value: 78, band: 'high', confidence: 'high' }, sourceUrl: 'https://g2.com/products/acme-logistics/reviews', daysAgo: 6 },
    { id: 'cv-12', platform: 'reddit', sentiment: 'negative', excerpt: 'Anyone else seeing slow API responses from Acme this week? Third time this month for us.', fullText: 'Anyone else seeing slow API responses from Acme this week? Third time this month for us. Our integration times out regularly now. Status page always shows green but clearly something is wrong on their end. Getting frustrated.\n\nEDIT: Their support finally acknowledged the issue after I tagged them on Twitter. Not great.', subjectId: '1', subjectName: 'Acme Logistics', themes: ['API reliability', 'Support response time'], mis: { value: 65, band: 'high', confidence: 'low', confidenceReason: 'Anonymous source, unverified claim' }, daysAgo: 4 },
    { id: 'cv-13', platform: 'capterra', sentiment: 'negative', rating: 2, maxRating: 5, excerpt: 'Hidden costs everywhere. What started as a reasonable quote ballooned 40% by the time we went live.', fullText: 'Hidden costs everywhere. What started as a reasonable quote ballooned 40% by the time we went live. Additional user fees, API call limits, integration add-ons - all things that should have been included. The sales process felt misleading in hindsight. Product works but trust was damaged.', reviewerRole: 'CFO', reviewerCompany: 'Growing logistics startup', subjectId: '1', subjectName: 'Acme Logistics', themes: ['Pricing surprises', 'Transparency'], mis: { value: 70, band: 'high', confidence: 'high' }, sourceUrl: 'https://capterra.com/p/acme-logistics', daysAgo: 16 },
    { id: 'cv-14', platform: 'hacker-news', sentiment: 'negative', excerpt: 'Their "AI-powered" features are mostly just rule-based systems with fancy marketing. Disappointed after the hype.', fullText: 'Their "AI-powered" features are mostly just rule-based systems with fancy marketing. Disappointed after the hype. Evaluated them for 3 months and the route optimization didnt perform better than our existing solution. Maybe works for simpler use cases but not for complex multi-stop routes.', subjectId: '1', subjectName: 'Acme Logistics', themes: ['AI features', 'Marketing vs reality'], mis: { value: 55, band: 'medium', confidence: 'low', confidenceReason: 'Anonymous forum post' }, daysAgo: 22 },
  ]),
]

// Compute summary for filtered items (E5: uses reviewMetadata from IntelligenceItem)
function computeSummary(items: IntelligenceItem[], period: string = '30 days'): CustomerVoiceSummary {
  const positive = items.filter(i => i.reviewMetadata?.sentiment === 'positive').length
  const mixed = items.filter(i => i.reviewMetadata?.sentiment === 'mixed').length
  const negative = items.filter(i => i.reviewMetadata?.sentiment === 'negative').length
  const neutral = items.filter(i => i.reviewMetadata?.sentiment === 'neutral').length
  
  // Net sentiment: positive - negative
  const netSentiment = positive - negative
  
  // Compute themes from reviewMetadata
  const themeMap = new Map<string, number>()
  items.forEach(item => {
    item.reviewMetadata?.themes?.forEach(theme => {
      themeMap.set(theme, (themeMap.get(theme) || 0) + 1)
    })
  })
  const topThemes = Array.from(themeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme, count]) => ({ theme, count }))
  
  return {
    positive,
    mixed,
    negative,
    neutral,
    total: items.length,
    netSentiment,
    netChange: -6, // Hardcoded for demo: ↓6 vs prior period
    period,
    topThemes,
  }
}

type SortOption = 'recency' | 'severity' | 'rating'

export default function CustomerVoicePage() {
  // Filter state
  const [selectedSubject, setSelectedSubject] = React.useState<string>('1') // Default to Acme
  const [selectedSentiments, setSelectedSentiments] = React.useState<Sentiment[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<ReviewPlatform[]>([])
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})
  const [sortBy, setSortBy] = React.useState<SortOption>('recency')
  const [selectedTheme, setSelectedTheme] = React.useState<string | null>(null)
  
  // Selection state (E5: uses IntelligenceItem with reviewMetadata)
  const [selectedItem, setSelectedItem] = React.useState<IntelligenceItem | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  
  // Responsive
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  
  // Filter items
  const filteredItems = React.useMemo(() => {
    let items = [...mockItems]
    
    // Subject filter (E5: access reviewMetadata)
    if (selectedSubject !== 'all') {
      items = items.filter(i => i.reviewMetadata?.subjectId === selectedSubject)
    }
    
    // Sentiment filter (E5: access reviewMetadata)
    if (selectedSentiments.length > 0) {
      items = items.filter(i => i.reviewMetadata && selectedSentiments.includes(i.reviewMetadata.sentiment))
    }
    
    // Platform filter (E5: access reviewMetadata)
    if (selectedPlatforms.length > 0) {
      items = items.filter(i => i.reviewMetadata && selectedPlatforms.includes(i.reviewMetadata.platform))
    }
    
    // Theme filter (E5: access reviewMetadata)
    if (selectedTheme) {
      items = items.filter(i => i.reviewMetadata?.themes?.includes(selectedTheme))
    }
    
    // Date range filter
    if (dateRange.from) {
      items = items.filter(i => new Date(i.timestamp) >= dateRange.from!)
    }
    if (dateRange.to) {
      items = items.filter(i => new Date(i.timestamp) <= dateRange.to!)
    }
    
    // Sort (E5: access reviewMetadata for sentiment and rating)
    switch (sortBy) {
      case 'recency':
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        break
      case 'severity':
        const severityOrder: Record<Sentiment, number> = { negative: 0, mixed: 1, neutral: 2, positive: 3 }
        items.sort((a, b) => severityOrder[a.reviewMetadata?.sentiment || 'neutral'] - severityOrder[b.reviewMetadata?.sentiment || 'neutral'])
        break
      case 'rating':
        items.sort((a, b) => (a.reviewMetadata?.rating || 0) - (b.reviewMetadata?.rating || 0))
        break
    }
    
    return items
  }, [selectedSubject, selectedSentiments, selectedPlatforms, dateRange, sortBy, selectedTheme])
  
  // Compute summary for current filter
  const summary = React.useMemo(() => computeSummary(filteredItems), [filteredItems])
  
  // Select first item by default
  React.useEffect(() => {
    if (filteredItems.length > 0 && !selectedItem) {
      setSelectedItem(filteredItems[0])
    }
  }, [filteredItems, selectedItem])
  
  const handleSelectItem = (item: IntelligenceItem) => {
    setSelectedItem(item)
    if (!isDesktop) {
      setDetailOpen(true)
    }
  }
  
  const handleThemeClick = (theme: string) => {
    setSelectedTheme(selectedTheme === theme ? null : theme)
  }
  
  const toggleSentiment = (sentiment: Sentiment) => {
    setSelectedSentiments(prev => 
      prev.includes(sentiment) 
        ? prev.filter(s => s !== sentiment)
        : [...prev, sentiment]
    )
  }
  
  const togglePlatform = (platform: ReviewPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }
  
  const clearFilters = () => {
    setSelectedSentiments([])
    setSelectedPlatforms([])
    setDateRange({})
    setSelectedTheme(null)
  }
  
  const hasActiveFilters = selectedSentiments.length > 0 || selectedPlatforms.length > 0 || dateRange.from || dateRange.to || selectedTheme

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Customer Voice</h1>
            <p className="text-sm text-muted-foreground">
              Review and sentiment analysis across all tracked subjects
            </p>
          </div>
        </div>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-1">
            <Button
              variant={selectedSubject === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedSubject('all')}
              className="h-8"
            >
              All
            </Button>
            {subjects.map(subject => (
              <Button
                key={subject.id}
                variant={selectedSubject === subject.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSubject(subject.id)}
                className="h-8"
              >
                {subject.name}
              </Button>
            ))}
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Sentiment Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="size-3 mr-2" />
                Sentiment
                {selectedSentiments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                    {selectedSentiments.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Sentiment</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sentiments.map(sentiment => (
                <button
                  key={sentiment}
                  onClick={() => toggleSentiment(sentiment)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted cursor-pointer',
                    selectedSentiments.includes(sentiment) && 'bg-muted'
                  )}
                >
                  <div className={cn('size-2 rounded-full', sentimentColors[sentiment].dot)} />
                  <span className="capitalize">{sentiment}</span>
                  {selectedSentiments.includes(sentiment) && (
                    <span className="ml-auto text-xs text-muted-foreground">Selected</span>
                  )}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Platform Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Platform
                {selectedPlatforms.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                    {selectedPlatforms.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {platforms.map(platform => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted cursor-pointer',
                    selectedPlatforms.includes(platform) && 'bg-muted'
                  )}
                >
                  <Badge variant="outline" className={cn('text-[10px] font-medium', platformInfo[platform].color)}>
                    {platformInfo[platform].icon}
                  </Badge>
                  <span>{platformInfo[platform].label}</span>
                  {selectedPlatforms.includes(platform) && (
                    <span className="ml-auto text-xs text-muted-foreground">Selected</span>
                  )}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Calendar className="size-3 mr-2" />
                Date Range
                {(dateRange.from || dateRange.to) && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">1</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ArrowDownUp className="size-3 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <DropdownMenuRadioItem value="recency">Recency</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="severity">Sentiment Severity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating">Rating</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground">
              <X className="size-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Main Content - Two Pane */}
      <div className="flex-1 flex gap-0 min-h-0 pt-4">
        {/* Left Pane - List */}
        <div className={cn('flex flex-col min-h-0', isDesktop ? 'w-[60%] pr-4' : 'w-full')}>
          {/* Sentiment Summary Block (when filtered to single subject) */}
          {selectedSubject !== 'all' && (
            <Card className="mb-4 flex-shrink-0">
              <CardContent className="py-4">
                <div className="flex items-center gap-6">
                  {/* Sentiment Bar */}
                  <div className="flex-1">
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      {summary.positive > 0 && (
                        <div 
                          className="bg-positive" 
                          style={{ width: `${(summary.positive / summary.total) * 100}%` }}
                        />
                      )}
                      {summary.mixed > 0 && (
                        <div 
                          className="bg-amber-500" 
                          style={{ width: `${(summary.mixed / summary.total) * 100}%` }}
                        />
                      )}
                      {summary.negative > 0 && (
                        <div 
                          className="bg-negative" 
                          style={{ width: `${(summary.negative / summary.total) * 100}%` }}
                        />
                      )}
                      {summary.neutral > 0 && (
                        <div 
                          className="bg-muted-foreground/50" 
                          style={{ width: `${(summary.neutral / summary.total) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-positive" />
                        {summary.positive} positive
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-amber-500" />
                        {summary.mixed} mixed
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-negative" />
                        {summary.negative} negative
                      </span>
                    </div>
                  </div>
                  
                  {/* Net Sentiment */}
                  <div className="text-center px-4 border-l">
                    <div className={cn(
                      'text-3xl font-mono font-semibold',
                      summary.netSentiment >= 0 ? 'text-positive' : 'text-negative'
                    )}>
                      {summary.netSentiment >= 0 ? '+' : ''}{summary.netSentiment}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {summary.netChange < 0 ? (
                        <TrendingDown className="size-3 text-negative" />
                      ) : (
                        <TrendingUp className="size-3 text-positive" />
                      )}
                      <span>{Math.abs(summary.netChange)} vs prior {summary.period}</span>
                    </div>
                  </div>
                  
                  {/* Item Count */}
                  <div className="text-center px-4 border-l">
                    <div className="text-2xl font-semibold">{summary.total}</div>
                    <div className="text-xs text-muted-foreground">items</div>
                  </div>
                </div>
                
                {/* Top Themes */}
                {summary.topThemes.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Top themes</div>
                    <div className="flex flex-wrap gap-2">
                      {summary.topThemes.map(({ theme, count }) => (
                        <Button
                          key={theme}
                          variant={selectedTheme === theme ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleThemeClick(theme)}
                          className="h-7 text-xs"
                        >
                          {theme}
                          <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                            {count}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Item List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {filteredItems.map(item => (
                <Card 
                  key={item.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    selectedItem?.id === item.id && 'ring-1 ring-accent bg-muted/30'
                  )}
                  onClick={() => handleSelectItem(item)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      {/* Platform Badge (E5: access reviewMetadata) */}
                      {item.reviewMetadata && (
                        <Badge 
                          variant="outline" 
                          className={cn('text-[10px] font-semibold shrink-0', platformInfo[item.reviewMetadata.platform].color)}
                        >
                          {platformInfo[item.reviewMetadata.platform].icon}
                        </Badge>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {/* Top Row: Sentiment + Rating + MIS */}
                        <div className="flex items-center gap-2 mb-1">
                          {/* Sentiment Dot (E5) */}
                          {item.reviewMetadata && (
                            <div className={cn('size-2 rounded-full shrink-0', sentimentColors[item.reviewMetadata.sentiment].dot)} />
                          )}
                          
                          {/* Rating (E5) */}
                          {item.reviewMetadata?.rating && (
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{item.reviewMetadata.rating}</span>
                              <span>/ {item.reviewMetadata.maxRating || 5}</span>
                            </div>
                          )}
                          
                          <div className="flex-1" />
                          
                          {/* MIS Badge */}
                          <MISBadge score={item.mis} size="xs" />
                        </div>
                        
                        {/* Excerpt (E5) */}
                        <p className="text-sm line-clamp-2 mb-2">{item.reviewMetadata?.excerpt || item.summary}</p>
                        
                        {/* Bottom Row: Reviewer + Subject + Time (E5) */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.reviewMetadata?.reviewerRole && (
                            <>
                              <span className="truncate max-w-[200px]">
                                {item.reviewMetadata.reviewerRole}
                                {item.reviewMetadata.reviewerCompany && ` at ${item.reviewMetadata.reviewerCompany}`}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                            </>
                          )}
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            {item.reviewMetadata?.subjectName || item.relatedCompetitors?.[0]?.name || 'Unknown'}
                          </Badge>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{formatRelativeDate(item.timestamp)}</span>
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No items match your filters</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Right Pane - Detail (Desktop) */}
        {isDesktop && (
          <div className="w-[40%] border-l pl-4">
            {selectedItem ? (
              <ItemDetail item={selectedItem} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an item to view details
              </div>
            )}
          </div>
        )}
        
        {/* Detail Sheet (Mobile) */}
        {!isDesktop && (
          <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0">
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle>Review Details</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)]">
                <div className="p-6">
                  {selectedItem && <ItemDetail item={selectedItem} />}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  )
}

// Detail Component (E5: updated to use IntelligenceItem with reviewMetadata)
function ItemDetail({ item }: { item: IntelligenceItem }) {
  const review = item.reviewMetadata
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {review && (
          <div className="flex items-center gap-2 mb-3">
            <Badge 
              variant="outline" 
              className={cn('font-semibold', platformInfo[review.platform].color)}
            >
              {platformInfo[review.platform].label}
            </Badge>
            <div className={cn('size-2 rounded-full', sentimentColors[review.sentiment].dot)} />
            <span className={cn('text-sm font-medium capitalize', sentimentColors[review.sentiment].text)}>
              {review.sentiment}
            </span>
            {review.rating && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-0.5 text-sm">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{review.rating}</span>
                  <span className="text-muted-foreground">/ {review.maxRating || 5}</span>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* MIS Score */}
        <div className="flex items-center gap-3 mb-3">
          <MISBadge score={item.mis} size="md" showConfidence />
        </div>
        
        {/* Reviewer Info */}
        {review?.reviewerRole && (
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium text-foreground">{review.reviewerRole}</span>
            {review.reviewerCompany && <span> at {review.reviewerCompany}</span>}
          </div>
        )}
        
        {/* Subject & Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>About</span>
          <Badge variant="outline" className="font-medium">{review?.subjectName || item.relatedCompetitors?.[0]?.name || 'Unknown'}</Badge>
          <span className="text-muted-foreground/50">•</span>
          <span>{formatRelativeDate(item.timestamp)}</span>
        </div>
      </div>
      
      {/* Full Text */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Full Review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{review?.fullText || item.content}</p>
        </CardContent>
      </Card>
      
      {/* Themes */}
      {review?.themes && review.themes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Themes</h4>
          <div className="flex flex-wrap gap-2">
            {review.themes.map(theme => (
              <Badge key={theme} variant="secondary">{theme}</Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Source Link */}
      {item.sourceUrls?.[0]?.url && review && (
        <Button variant="outline" className="w-full" asChild>
          <a href={item.sourceUrls[0].url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4 mr-2" />
            View on {platformInfo[review.platform].label}
          </a>
        </Button>
      )}
      
      {/* Low Confidence Warning */}
      {item.mis.confidence === 'low' && item.mis.confidenceReason && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0">
                Low Confidence
              </Badge>
              <p className="text-sm text-muted-foreground">{item.mis.confidenceReason}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
