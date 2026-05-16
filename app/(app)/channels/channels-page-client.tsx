'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ListViewLayout } from '@/components/list-view/list-view-layout'
import { ListControlBar } from '@/components/list-view/list-control-bar'
import { ListSearch } from '@/components/list-view/list-search'
import { ListSort } from '@/components/list-view/list-sort'
import { ListFilters } from '@/components/list-view/list-filters'
import { ListClearFilters } from '@/components/list-view/list-clear-filters'
import { ListEmptyState } from '@/components/list-view/list-empty-state'
import { ListCard } from '@/components/list-view/list-card'
import { channelToListCardData, channelItemToListCardData } from '@/lib/channels/channel-list-card-map'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Channel, ChannelItem, ChannelType } from '@/lib/types'
import {
  Calendar as CalendarIcon,
  Newspaper,
  Users,
  Mic2,
  Video,
  MessageSquare,
  Building2,
  ExternalLink,
} from 'lucide-react'
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'

// Channel type config
const channelTypeConfig: Record<ChannelType, { label: string; icon: React.ElementType; color: string }> = {
  publication: { label: 'Publication', icon: Newspaper, color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  conference: { label: 'Conference', icon: Users, color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  podcast: { label: 'Podcast', icon: Mic2, color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  webinar: { label: 'Webinar', icon: Video, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  community: { label: 'Community', icon: MessageSquare, color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  'analyst-firm': { label: 'Analyst Firm', icon: Building2, color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
}

// Competitors for filtering
const competitors = [
  { id: '1', name: 'Acme Logistics' },
  { id: '2', name: 'FreightHero' },
  { id: '3', name: 'RouteIQ' },
  { id: '4', name: 'ChainShield' },
]

// Helper to create mock dates
function createMockDate(hoursAgo: number): string {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
}

// Realistic seed data per spec
const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'Manifest Vegas 2026',
    type: 'conference',
    itemCount: 3,
    mostRecentDate: createMockDate(72), // 3 days ago
    appearances: [
      { competitorId: '2', competitorName: 'FreightHero', count: 2 },
      { competitorId: '1', competitorName: 'Acme Logistics', count: 1 },
    ],
    authorityScore: 8,
    url: 'https://manifestvegas.com',
  },
  {
    id: '2',
    name: 'Supply Chain Brain',
    type: 'publication',
    itemCount: 7,
    mostRecentDate: createMockDate(24), // yesterday
    appearances: [
      { competitorId: '1', competitorName: 'Acme Logistics', count: 5 },
      { competitorId: '2', competitorName: 'FreightHero', count: 2 },
    ],
    authorityScore: 7,
    url: 'https://supplychainbrain.com',
  },
  {
    id: '3',
    name: 'Supply Chain Brain Podcast',
    type: 'podcast',
    itemCount: 4,
    mostRecentDate: createMockDate(120), // 5 days ago
    appearances: [
      { competitorId: '2', competitorName: 'FreightHero', count: 2 },
      { competitorId: '3', competitorName: 'RouteIQ', count: 2 },
    ],
    authorityScore: 6,
    url: 'https://supplychainbrain.com/podcast',
  },
  {
    id: '4',
    name: 'FreightWaves',
    type: 'publication',
    itemCount: 9,
    mostRecentDate: createMockDate(48), // 2 days ago
    appearances: [
      { competitorId: '1', competitorName: 'Acme Logistics', count: 3 },
      { competitorId: '2', competitorName: 'FreightHero', count: 3 },
      { competitorId: '3', competitorName: 'RouteIQ', count: 2 },
      { competitorId: '4', competitorName: 'ChainShield', count: 1 },
    ],
    authorityScore: 9,
    url: 'https://freightwaves.com',
  },
  {
    id: '5',
    name: 'r/logistics',
    type: 'community',
    itemCount: 12,
    mostRecentDate: createMockDate(6), // 6 hours ago
    appearances: [
      { competitorId: '1', competitorName: 'Acme Logistics', count: 4 },
      { competitorId: '2', competitorName: 'FreightHero', count: 3 },
      { competitorId: '3', competitorName: 'RouteIQ', count: 3 },
      { competitorId: '4', competitorName: 'ChainShield', count: 2 },
    ],
    authorityScore: 4,
    url: 'https://reddit.com/r/logistics',
  },
  {
    id: '6',
    name: 'Gartner Logistics Hype Cycle 2026',
    type: 'analyst-firm',
    itemCount: 1,
    mostRecentDate: createMockDate(336), // 14 days ago
    appearances: [
      { competitorId: '1', competitorName: 'Acme Logistics', count: 1 },
      { competitorId: '2', competitorName: 'FreightHero', count: 1 },
    ],
    authorityScore: 10,
    url: 'https://gartner.com',
  },
  {
    id: '7',
    name: 'DCVelocity Webinar Series',
    type: 'webinar',
    itemCount: 2,
    mostRecentDate: createMockDate(264), // 11 days ago
    appearances: [
      { competitorId: '1', competitorName: 'Acme Logistics', count: 2 },
    ],
    authorityScore: 5,
    url: 'https://dcvelocity.com/webinars',
  },
]

// Mock items for detail pane
const mockChannelItems: Record<string, ChannelItem[]> = {
  '1': [
    {
      id: 'ci-1',
      channelId: '1',
      channelName: 'Manifest Vegas 2026',
      title: 'FreightHero CEO keynote on AI in last-mile delivery',
      summary: 'Sarah Martinez presented FreightHero\'s vision for autonomous last-mile delivery using their new AI routing engine.',
      competitorId: '2',
      competitorName: 'FreightHero',
      timestamp: createMockDate(72),
      mis: { value: 72, band: 'high', confidence: 'high' },
      sourceUrl: 'https://manifestvegas.com/sessions/freighthero-keynote',
    },
    {
      id: 'ci-2',
      channelId: '1',
      channelName: 'Manifest Vegas 2026',
      title: 'Acme Logistics announces partnership with major 3PL',
      summary: 'Acme Logistics revealed a strategic partnership with XPO Logistics at Manifest, expanding their enterprise reach.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(74),
      mis: { value: 81, band: 'critical', confidence: 'high' },
      sourceUrl: 'https://manifestvegas.com/news/acme-xpo-partnership',
    },
    {
      id: 'ci-3',
      channelId: '1',
      channelName: 'Manifest Vegas 2026',
      title: 'FreightHero demo booth showcases new real-time tracking',
      summary: 'FreightHero\'s booth attracted significant attention with live demos of their enhanced real-time package tracking system.',
      competitorId: '2',
      competitorName: 'FreightHero',
      timestamp: createMockDate(76),
      mis: { value: 58, band: 'medium', confidence: 'medium' },
    },
  ],
  '2': [
    {
      id: 'ci-4',
      channelId: '2',
      channelName: 'Supply Chain Brain',
      title: 'Acme Logistics featured in "Top 10 TMS Platforms" article',
      summary: 'Supply Chain Brain\'s annual TMS ranking placed Acme Logistics at #3, citing their AI-powered route optimization.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(24),
      mis: { value: 75, band: 'high', confidence: 'high' },
      sourceUrl: 'https://supplychainbrain.com/articles/top-10-tms-2026',
    },
    {
      id: 'ci-5',
      channelId: '2',
      channelName: 'Supply Chain Brain',
      title: 'Acme Logistics CTO interview on machine learning in logistics',
      summary: 'In-depth interview with James Liu discussing how Acme is applying ML to demand forecasting.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(48),
      mis: { value: 68, band: 'high', confidence: 'high' },
    },
    {
      id: 'ci-6',
      channelId: '2',
      channelName: 'Supply Chain Brain',
      title: 'FreightHero expands European operations',
      summary: 'Coverage of FreightHero\'s new European headquarters in Amsterdam and hiring plans.',
      competitorId: '2',
      competitorName: 'FreightHero',
      timestamp: createMockDate(72),
      mis: { value: 71, band: 'high', confidence: 'high' },
    },
  ],
  '4': [
    {
      id: 'ci-7',
      channelId: '4',
      channelName: 'FreightWaves',
      title: 'Acme Logistics Series D analysis: What $120M means for the market',
      summary: 'FreightWaves deep dive into Acme\'s funding round and competitive implications.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(48),
      mis: { value: 85, band: 'critical', confidence: 'high' },
      sourceUrl: 'https://freightwaves.com/news/acme-series-d-analysis',
    },
    {
      id: 'ci-8',
      channelId: '4',
      channelName: 'FreightWaves',
      title: 'RouteIQ launches carbon tracking module',
      summary: 'RouteIQ adds sustainability features to their route optimization platform.',
      competitorId: '3',
      competitorName: 'RouteIQ',
      timestamp: createMockDate(72),
      mis: { value: 62, band: 'high', confidence: 'medium' },
    },
  ],
  '5': [
    {
      id: 'ci-9',
      channelId: '5',
      channelName: 'r/logistics',
      title: 'Thread: "Anyone using Acme Logistics? Thoughts?"',
      summary: 'Reddit discussion with 47 comments comparing Acme to alternatives. Mixed sentiment with praise for UI, concerns about pricing.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(6),
      mis: { value: 54, band: 'medium', confidence: 'low' },
      sourceUrl: 'https://reddit.com/r/logistics/comments/xyz123',
    },
    {
      id: 'ci-10',
      channelId: '5',
      channelName: 'r/logistics',
      title: 'Thread: "FreightHero vs RouteIQ for mid-size fleet"',
      summary: 'Comparison thread with users sharing experiences. FreightHero praised for support, RouteIQ for flexibility.',
      competitorId: '2',
      competitorName: 'FreightHero',
      timestamp: createMockDate(24),
      mis: { value: 48, band: 'medium', confidence: 'low' },
    },
  ],
  '6': [
    {
      id: 'ci-11',
      channelId: '6',
      channelName: 'Gartner Logistics Hype Cycle 2026',
      title: 'Gartner positions Acme and FreightHero as "Leaders" in TMS Magic Quadrant',
      summary: 'Both competitors placed in the Leaders quadrant for ability to execute and completeness of vision.',
      competitorId: '1',
      competitorName: 'Acme Logistics',
      timestamp: createMockDate(336),
      mis: { value: 92, band: 'critical', confidence: 'high' },
      sourceUrl: 'https://gartner.com/doc/reprints?id=1-ABC123',
    },
  ],
}

// Type filters
const channelTypes: { value: ChannelType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'publication', label: 'Publications' },
  { value: 'conference', label: 'Conferences' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'webinar', label: 'Webinars' },
  { value: 'community', label: 'Communities' },
  { value: 'analyst-firm', label: 'Analyst Firms' },
]

type ChannelSort = 'authority' | 'recent' | 'name' | 'items'

export function ChannelsPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sortParam = (searchParams.get('sort') as ChannelSort | null) ?? 'authority'
  const qFromUrl = searchParams.get('q') ?? ''

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<ChannelType | 'all'>('all')
  const [competitorFilter, setCompetitorFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState(qFromUrl)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  
  // Detail pane state
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Apply filters
  const filteredChannels = React.useMemo(() => {
    let channels = [...mockChannels]
    
    // Type filter
    if (typeFilter !== 'all') {
      channels = channels.filter(c => c.type === typeFilter)
    }
    
    // Competitor filter
    if (competitorFilter !== 'all') {
      channels = channels.filter(c => 
        c.appearances.some(a => a.competitorId === competitorFilter)
      )
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      channels = channels.filter(c => 
        c.name.toLowerCase().includes(query)
      )
    }
    
    // Date range filter
    if (dateRange?.from) {
      channels = channels.filter(c => {
        const channelDate = new Date(c.mostRecentDate)
        const fromDate = startOfDay(dateRange.from!)
        const toDate = dateRange.to ? startOfDay(dateRange.to) : new Date()
        return isAfter(channelDate, fromDate) || isBefore(channelDate, toDate)
      })
    }
    
    switch (sortParam) {
      case 'recent':
        return channels.sort(
          (a, b) => new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime()
        )
      case 'name':
        return channels.sort((a, b) => a.name.localeCompare(b.name))
      case 'items':
        return channels.sort((a, b) => b.itemCount - a.itemCount)
      case 'authority':
      default:
        return channels.sort((a, b) => b.authorityScore - a.authorityScore)
    }
  }, [typeFilter, competitorFilter, searchQuery, dateRange, sortParam])

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (competitorFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)

  React.useEffect(() => {
    setSearchQuery(qFromUrl)
  }, [qFromUrl])

  const clearFilters = () => {
    setTypeFilter('all')
    setCompetitorFilter('all')
    setSearchQuery('')
    setDateRange({ from: subDays(new Date(), 30), to: new Date() })
    router.push(pathname)
  }

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel)
    setSheetOpen(true)
  }

  const channelItems = selectedChannel ? (mockChannelItems[selectedChannel.id] || []) : []

  return (
    <>
      <ListViewLayout
        className="mx-auto max-w-4xl px-4 py-6 md:px-6"
        title="Channels"
        subtitle="Track where competitors appear across publications, conferences, podcasts, and communities"
        controlBar={
          <ListControlBar className="flex-wrap">
            <ListSearch placeholder="Search channels…" initialValue={searchQuery} className="w-full max-w-xs" />
            <div className="flex flex-wrap items-center gap-2">
              <ListFilters activeCount={activeFilterCount} contentClassName="max-w-lg">
                <div className="space-y-3">
                  <p className="text-xs font-medium">Channel type</p>
                  <div className="flex flex-wrap gap-1">
                    {channelTypes.map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={typeFilter === type.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setTypeFilter(type.value)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Competitor</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant={competitorFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCompetitorFilter('all')}
                    >
                      All
                    </Button>
                    {competitors.map((comp) => (
                      <Button
                        key={comp.id}
                        type="button"
                        variant={competitorFilter === comp.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCompetitorFilter(comp.id)}
                      >
                        {comp.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Date range</p>
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </ListFilters>
              <ListSort
                defaultId="authority"
                options={[
                  { id: 'authority', label: 'Authority' },
                  { id: 'recent', label: 'Most recent' },
                  { id: 'name', label: 'Name' },
                  { id: 'items', label: 'Item count' },
                ]}
              />
              <ListClearFilters activeCount={activeFilterCount} clearHref={pathname} onClear={clearFilters} />
            </div>
          </ListControlBar>
        }
      >
        {filteredChannels.length === 0 ? (
          <ListEmptyState variant="filtered_empty" recordLabel="channels" />
        ) : (
          filteredChannels.map((channel) => {
            const config = channelTypeConfig[channel.type]
            const Icon = config.icon
            const data = channelToListCardData(channel)
            return (
              <ListCard
                key={channel.id}
                data={data}
                href="/channels"
                customLeft={
                  <div className={cn('size-9 rounded-md flex items-center justify-center shrink-0', config.color)}>
                    <Icon className="size-4" aria-hidden />
                  </div>
                }
                onNavigate={() => handleChannelClick(channel)}
              />
            )
          })
        )}
      </ListViewLayout>
      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedChannel && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = channelTypeConfig[selectedChannel.type]
                      const Icon = config.icon
                      return (
                        <div className={cn('size-10 rounded-md flex items-center justify-center', config.color)}>
                          <Icon className="size-5" />
                        </div>
                      )
                    })()}
                    <div>
                      <SheetTitle className="text-lg">{selectedChannel.name}</SheetTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={cn('text-[10px]', channelTypeConfig[selectedChannel.type].color)}>
                          {channelTypeConfig[selectedChannel.type].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Authority: {selectedChannel.authorityScore}/10
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedChannel.url && (
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <a href={selectedChannel.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">
                    Items from this channel
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({channelItems.length})
                    </span>
                  </h3>
                </div>

                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-3 pr-4">
                    {channelItems.map((item) => (
                      <ListCard
                        key={item.id}
                        data={channelItemToListCardData(item)}
                        href={item.sourceUrl ?? '/channels'}
                        misScore={item.mis}
                        density="compact"
                        customRight={
                          item.sourceUrl ? (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                                Source
                                <ExternalLink className="size-3 ml-1" />
                              </a>
                            </Button>
                          ) : null
                        }
                      />
                    ))}
                    
                    {channelItems.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No items from this channel in the selected time period
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
