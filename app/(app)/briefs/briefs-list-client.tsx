'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { archiveBrief } from '@/lib/brief/actions'
import { toast } from 'sonner'

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

export interface BriefsListClientProps {
  briefs: Brief[]
  canAuthor: boolean
  currentUserId: string
}

export function BriefsListClient({ briefs, canAuthor, currentUserId }: BriefsListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'all' | Brief['audience']>('all')
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filteredBriefs = briefs.filter((brief) => {
    const matchesSearch =
      brief.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brief.summary.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || brief.audience === activeTab
    return matchesSearch && matchesTab
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Briefs</h1>
          <p className="text-sm text-muted-foreground">
            Create and share intelligence summaries with your team
          </p>
        </div>
        {canAuthor ? (
          <Button asChild>
            <Link href="/briefs/new">
              <Plus className="size-4 mr-2" />
              New brief
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBriefs.map((brief) => {
          const isSelf = brief.author.id === currentUserId
          return (
            <Card key={brief.id} className="group hover:border-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px]', audienceColors[brief.audience])}>
                      {audienceLabels[brief.audience]}
                    </Badge>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={deletingId === brief.id}
                        onClick={() => {
                          const ok = window.confirm(
                            'Delete this brief? This will archive it and hide it from all views.'
                          )
                          if (!ok) return
                          setDeletingId(brief.id)
                          void archiveBrief(brief.id)
                            .then(() => {
                              toast.success('Brief deleted')
                              router.refresh()
                            })
                            .catch((e) => {
                              toast.error(e instanceof Error ? e.message : 'Delete failed')
                            })
                            .finally(() => setDeletingId(null))
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/briefs/${brief.id}`}>
                  <CardTitle className="text-base font-medium line-clamp-2 hover:underline">{brief.title}</CardTitle>
                </Link>
                <CardDescription className="line-clamp-2 mt-1">{brief.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage src={brief.author.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {brief.author.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{isSelf ? 'You' : brief.author.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 opacity-40">
                      <Eye className="size-3" />
                      —
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {brief.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {brief.status === 'draft' && (
                    <Badge variant="outline" className="text-warning border-warning/30">
                      Draft
                    </Badge>
                  )}
                  {brief.aiDrafted && !brief.humanReviewed && (
                    <Badge variant="outline" className="text-warning border-warning/30">
                      AI draft
                    </Badge>
                  )}
                  {brief.priority === 'critical' && (
                    <Badge variant="outline" className={cn('text-[10px]', priorityColors[brief.priority])}>
                      Critical
                    </Badge>
                  )}
                  {brief.priority === 'high' && (
                    <Badge variant="outline" className={cn('text-[10px]', priorityColors[brief.priority])}>
                      High priority
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
            {canAuthor ? 'Create a brief from the feed or start fresh.' : 'Nothing matches your filters.'}
          </p>
        </div>
      )}
    </div>
  )
}
