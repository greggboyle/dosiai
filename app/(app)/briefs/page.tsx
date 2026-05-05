'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, MoreHorizontal, Clock, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Brief } from '@/lib/types'

const audienceLabels: Record<Brief['audience'], string> = {
  leadership: 'Leadership',
  sales: 'Sales',
  product: 'Product',
  general: 'General',
}

const audienceColors: Record<Brief['audience'], string> = {
  leadership: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  sales: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  product: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  general: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
}

const priorityColors: Record<Brief['priority'], string> = {
  critical: 'text-mis-critical',
  high: 'text-mis-high',
  medium: 'text-mis-medium',
}

// Mock data with updated Brief structure (E1: type removed, audience is primary categorization)
const briefs: (Brief & { views: number })[] = [
  {
    id: '1',
    title: 'Acme Logistics is signaling enterprise expansion — three implications for our Q2 GTM',
    audience: 'leadership',
    priority: 'high',
    summary: 'Strategic analysis of Acme Logistics recent moves and implications for our go-to-market strategy.',
    body: '',
    createdAt: '2d ago',
    updatedAt: '2d ago',
    publishedAt: '2d ago',
    wordCount: 387,
    author: { id: '1', name: 'Maya Patel' },
    linkedItemIds: ['1', '2', '3', '4'],
    status: 'published',
    aiDrafted: false,
    humanReviewed: true,
    views: 128,
  },
  {
    id: '2',
    title: 'Weekly Intelligence Digest - Week 48',
    audience: 'general',
    priority: 'medium',
    cadence: 'weekly',
    summary: 'Key competitive movements including Acme Logistics funding and FreightHero pricing changes.',
    body: '',
    createdAt: '1h ago',
    updatedAt: '1h ago',
    publishedAt: '1h ago',
    wordCount: 542,
    author: { id: '2', name: 'Sarah Chen' },
    linkedItemIds: ['1', '5'],
    status: 'published',
    aiDrafted: true,
    humanReviewed: true,
    views: 45,
  },
  {
    id: '3',
    title: 'FreightHero SMB Strategy Analysis',
    audience: 'sales',
    priority: 'medium',
    summary: 'Deep dive into FreightHero\'s new free tier and implications for competitive positioning.',
    body: '',
    createdAt: '5d ago',
    updatedAt: '4d ago',
    wordCount: 623,
    author: { id: '3', name: 'Emily Rodriguez' },
    linkedItemIds: ['5'],
    status: 'published',
    aiDrafted: false,
    humanReviewed: true,
    views: 67,
  },
  {
    id: '4',
    title: 'Weekly Intelligence Digest - Week 47',
    audience: 'general',
    priority: 'medium',
    cadence: 'weekly',
    summary: 'Coverage of industry conference announcements and competitor hiring trends.',
    body: '',
    createdAt: '7d ago',
    updatedAt: '7d ago',
    publishedAt: '7d ago',
    wordCount: 489,
    author: { id: '2', name: 'Sarah Chen' },
    linkedItemIds: [],
    status: 'published',
    aiDrafted: true,
    humanReviewed: true,
    views: 89,
  },
  {
    id: '5',
    title: 'FMCSA Regulatory Impact Assessment',
    audience: 'product',
    priority: 'high',
    summary: 'Analysis of proposed FMCSA 2027 requirements and product roadmap implications.',
    body: '',
    createdAt: '10d ago',
    updatedAt: '8d ago',
    wordCount: 812,
    author: { id: '4', name: 'David Kim' },
    linkedItemIds: ['6'],
    status: 'draft',
    aiDrafted: false,
    humanReviewed: false,
    views: 12,
  },
]

export default function BriefsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'all' | Brief['audience']>('all')

  const filteredBriefs = briefs.filter((brief) => {
    const matchesSearch = brief.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || brief.audience === activeTab
    return matchesSearch && matchesTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Briefs</h1>
          <p className="text-sm text-muted-foreground">
            Create and share intelligence summaries with your team
          </p>
        </div>
        <Button asChild>
          <Link href="/briefs/new/edit">
            <Plus className="size-4 mr-2" />
            New Brief
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search briefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Briefs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBriefs.map((brief) => {
          return (
            <Card key={brief.id} className="group hover:border-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={cn('text-[10px]', audienceColors[brief.audience])}>
                      {audienceLabels[brief.audience]}
                    </Badge>
                    {brief.cadence === 'weekly' && (
                      <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                        <FileText className="size-3" />
                        Weekly
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/briefs/${brief.id}/edit`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/briefs/${brief.id}`}>
                  <CardTitle className="text-base font-medium line-clamp-2 hover:underline">
                    {brief.title}
                  </CardTitle>
                </Link>
                <CardDescription className="line-clamp-2 mt-1">
                  {brief.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage src={brief.author.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {brief.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{brief.author.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      {brief.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {brief.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {brief.status === 'draft' && (
                    <Badge variant="outline" className="text-warning border-warning/30">
                      Draft
                    </Badge>
                  )}
                  {brief.aiDrafted && !brief.humanReviewed && (
                    <Badge variant="outline" className="text-warning border-warning/30">
                      AI Draft
                    </Badge>
                  )}
                  {brief.priority === 'critical' && (
                    <Badge variant="outline" className={cn('text-[10px]', priorityColors[brief.priority])}>
                      Critical
                    </Badge>
                  )}
                  {brief.priority === 'high' && (
                    <Badge variant="outline" className={cn('text-[10px]', priorityColors[brief.priority])}>
                      High Priority
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredBriefs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">No briefs found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or create a new brief.
          </p>
        </div>
      )}
    </div>
  )
}
