'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { MISBadge } from '@/components/mis-badge'
import type { Channel, ChannelItem, ChannelType, MISScore } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'
import {
  Search,
  Calendar as CalendarIcon,
  Newspaper,
  Users,
  Mic2,
  Video,
  MessageSquare,
  Building2,
  ExternalLink,
  ChevronRight,
  X,
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

export default function ChannelsPage() {
  // Filters
  const [typeFilter, setTypeFilter] = React.useState<ChannelType | 'all'>('all')
  const [competitorFilter, setCompetitorFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
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
    
    // Sort by authority score descending
    return channels.sort((a, b) => b.authorityScore - a.authorityScore)
  }, [typeFilter, competitorFilter, searchQuery, dateRange])

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel)
    setSheetOpen(true)
  }

  const channelItems = selectedChannel ? (mockChannelItems[selectedChannel.id] || []) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
        <p className="text-sm text-muted-foreground">
          Track where competitors appear across publications, conferences, podcasts, and communities
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Channel Type Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {channelTypes.map(type => (
                <Button
                  key={type.value}
                  variant={typeFilter === type.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    typeFilter === type.value && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => setTypeFilter(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Competitor Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={competitorFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 text-xs',
                  competitorFilter === 'all' && 'bg-accent text-accent-foreground'
                )}
                onClick={() => setCompetitorFilter('all')}
              >
                All Competitors
              </Button>
              {competitors.map(comp => (
                <Button
                  key={comp.id}
                  variant={competitorFilter === comp.id ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    competitorFilter === comp.id && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => setCompetitorFilter(comp.id)}
                >
                  {comp.name}
                </Button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <CalendarIcon className="size-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-xs">
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <span className="text-xs">{format(dateRange.from, 'MMM d, yyyy')}</span>
                    )
                  ) : (
                    <span className="text-xs">Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 w-48 pl-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels Table */}
      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Most Recent</TableHead>
              <TableHead>Competitors</TableHead>
              <TableHead className="text-center">Authority</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChannels.map(channel => {
              const config = channelTypeConfig[channel.type]
              const Icon = config.icon
              
              return (
                <TableRow
                  key={channel.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleChannelClick(channel)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn('size-8 rounded-md flex items-center justify-center', config.color)}>
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{channel.name}</div>
                        {channel.url && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {new URL(channel.url).hostname}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-[10px]', config.color)}>
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{channel.itemCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getRelativeTime(channel.mostRecentDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {channel.appearances.slice(0, 3).map(appearance => (
                        <Badge 
                          key={appearance.competitorId} 
                          variant="outline" 
                          className="text-[10px] gap-1"
                        >
                          {appearance.competitorName}
                          <span className="text-muted-foreground">({appearance.count})</span>
                        </Badge>
                      ))}
                      {channel.appearances.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{channel.appearances.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full',
                            channel.authorityScore >= 8 ? 'bg-mis-critical' :
                            channel.authorityScore >= 6 ? 'bg-mis-high' :
                            channel.authorityScore >= 4 ? 'bg-mis-medium' :
                            'bg-mis-low'
                          )}
                          style={{ width: `${channel.authorityScore * 10}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground w-4">
                        {channel.authorityScore}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        
        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Newspaper className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No channels match your filters</p>
          </div>
        )}
      </Card>

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
                    {channelItems.map(item => (
                      <Card key={item.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <Badge variant="outline" className="text-[10px]">
                              {item.competitorName}
                            </Badge>
                            <MISBadge score={item.mis} size="sm" />
                          </div>
                          <h4 className="text-sm font-medium mb-1 line-clamp-2">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {item.summary}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {getRelativeTime(item.timestamp)}
                            </span>
                            {item.sourceUrl && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                                  View source
                                  <ExternalLink className="size-3 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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
    </div>
  )
}
