'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Copy,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { MISBadge } from '@/components/mis-badge'
import type { Brief, IntelligenceItem, Comment } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'

// Linked feed items (mock data matching the feed)
const linkedItems: IntelligenceItem[] = [
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
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '2',
    title: 'Acme Logistics posts 14 new engineering roles in Austin',
    summary: 'Aggressive hiring signals major development push.',
    content: '',
    mis: { value: 72, band: 'high', confidence: 'high' },
    category: 'sell-side',
    source: { name: 'LinkedIn', url: 'https://linkedin.com', domain: 'linkedin.com' },
    vendorConsensus: { confirmed: 2, total: 2 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Hiring', 'Engineering'],
    timestamp: '1 day ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '3',
    title: 'G2 sentiment for Acme Logistics drops 12% MoM',
    summary: 'Rising complaints about implementation times and support responsiveness.',
    content: '',
    mis: { value: 65, band: 'high', confidence: 'medium' },
    category: 'buy-side',
    source: { name: 'G2', url: 'https://g2.com', domain: 'g2.com' },
    vendorConsensus: { confirmed: 1, total: 1 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Sentiment', 'Customer Voice'],
    timestamp: '3 hours ago',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
    isCustomerVoice: true,
  },
  {
    id: '4',
    title: 'Acme Logistics appoints new CTO from Uber Freight',
    summary: 'Marcus Chen brings enterprise scaling experience.',
    content: '',
    mis: { value: 68, band: 'high', confidence: 'high' },
    category: 'sell-side',
    source: { name: 'PR Newswire', url: 'https://prnewswire.com', domain: 'prnewswire.com' },
    vendorConsensus: { confirmed: 2, total: 2 },
    competitor: { id: '1', name: 'Acme Logistics' },
    topics: ['Leadership', 'Executive'],
    timestamp: '3 days ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
]

// Mock brief data
const mockBrief: Brief = {
  id: '1',
  title: 'Acme Logistics is signaling enterprise expansion — three implications for our Q2 GTM',
  type: 'leadership',
  audience: 'leadership',
  priority: 'high',
  summary: 'Strategic analysis of Acme Logistics recent moves and implications for our go-to-market strategy.',
  body: `## Executive Summary

Acme Logistics has made three significant moves in the past week that signal a pivot toward enterprise buyers. Our competitive intelligence team has synthesized the key developments and their implications for our Q2 go-to-market strategy.

## 1. Series D Funding and Enterprise Expansion

The $120M Series D led by Andreessen Horowitz represents a 3x valuation increase from their Series C eighteen months ago. In the announcement, CEO Sarah Chen explicitly stated their intent to "move upmarket" and target Fortune 500 logistics operations.

Combined with the 14 new engineering positions posted in Austin—predominantly senior roles focused on enterprise features like SSO, audit logging, and multi-tenant architecture—the direction is clear: Acme is building an enterprise-grade product.

**Key takeaway:** Expect Acme to begin appearing in enterprise RFPs within the next 6-9 months.

## 2. Customer Sentiment Shift

Despite the funding news, our monitoring of G2 and Gartner Peer Insights reveals a concerning trend for Acme: customer satisfaction scores have dropped 12% month-over-month. The primary complaints center on:

- Implementation timelines exceeding promised SLAs
- Support ticket response times averaging 48+ hours
- Feature gaps in reporting and analytics

This suggests that while Acme is investing in enterprise capabilities, their existing mid-market customers are feeling the strain of stretched resources.

**Key takeaway:** In competitive deals against Acme, emphasize our implementation track record and 24/7 support SLAs.

## 3. Implications for Our Q2 GTM

Based on this intelligence, we recommend three adjustments to our Q2 strategy:

1. **Accelerate implementation-speed messaging** — Develop case studies highlighting our average 6-week implementation vs. industry standard of 12+ weeks.

2. **Target Acme's existing customers** — The sentiment data suggests an opportunity for displacement campaigns focused on implementation support.

3. **Prepare enterprise battle cards** — As Acme enters enterprise deals, our sales team needs updated competitive positioning that addresses their new funding and roadmap claims.

---

*This brief synthesizes 4 intelligence items from the past 7 days. Contact Maya Patel for questions or to schedule a competitive strategy session.*`,
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  wordCount: 387,
  author: {
    id: '1',
    name: 'Maya Patel',
    avatar: undefined,
  },
  linkedItemIds: ['1', '2', '3', '4'],
  status: 'published',
  aiDrafted: false,
  humanReviewed: true,
  comments: [
    {
      id: '1',
      author: { id: '2', name: 'James Wilson' },
      content: 'Great synthesis. Can we get the implementation case studies started this week?',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      author: { id: '1', name: 'Maya Patel' },
      content: '@James Wilson Already briefed the content team. Draft should be ready by Friday.',
      timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      mentions: ['James Wilson'],
    },
  ],
}

const audienceLabels: Record<Brief['audience'], string> = {
  leadership: 'Leadership',
  sales: 'Sales',
  product: 'Product',
  general: 'General',
}

const audienceColors: Record<Brief['audience'], string> = {
  leadership: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  sales: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  product: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  general: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
}

const priorityLabels: Record<Brief['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
}

const priorityColors: Record<Brief['priority'], string> = {
  critical: 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  high: 'bg-mis-high/15 text-mis-high border-mis-high/30',
  medium: 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
}

export default function BriefReaderPage() {
  const params = useParams()
  const [newComment, setNewComment] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  // In production, fetch brief by params.id
  const brief = mockBrief

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(brief.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    // Generate signed link
    navigator.clipboard.writeText(`${window.location.origin}/briefs/${brief.id}?token=xxx`)
  }

  return (
    <div className="min-h-screen">
      {/* Back navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/briefs">
            <ArrowLeft className="size-4 mr-2" />
            Back to Briefs
          </Link>
        </Button>
      </div>

      {/* Centered content column */}
      <article className="max-w-[720px] mx-auto">
        {/* Metadata strip */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="outline" className={cn('text-xs', audienceColors[brief.audience])}>
            {audienceLabels[brief.audience]}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', priorityColors[brief.priority])}>
            {priorityLabels[brief.priority]}
          </Badge>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={brief.author.avatar} />
              <AvatarFallback className="text-[10px]">
                {brief.author.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{brief.author.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Published {getRelativeTime(brief.publishedAt || brief.createdAt)}
          </span>
          <span className="text-sm text-muted-foreground">
            {brief.wordCount} words
          </span>
        </div>

        {/* AI-drafted banner */}
        {brief.aiDrafted && !brief.humanReviewed && (
          <div className="flex items-center gap-2 px-4 py-2 mb-6 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="size-4 text-warning" />
            <span className="text-sm text-warning">
              AI-drafted, not human-reviewed
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight mb-8">
          {brief.title}
        </h1>

        {/* Body - Markdown rendered */}
        <div className="prose prose-zinc dark:prose-invert max-w-none mb-12 [&_p]:leading-[1.7] [&_p]:text-base [&_li]:leading-[1.7] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_strong]:font-semibold [&_hr]:my-8 [&_ul]:my-4 [&_ol]:my-4">
          <ReactMarkdown>{brief.body}</ReactMarkdown>
        </div>

        <Separator className="my-8" />

        {/* Linked Items */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Linked Intelligence Items</h2>
          <div className="grid gap-3">
            {linkedItems.map((item) => (
              <Card key={item.id} className="hover:border-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <MISBadge score={item.mis} size="sm" />
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/feed?item=${item.id}`}
                        className="font-medium text-sm hover:underline line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{item.timestamp}</span>
                        <span className="flex items-center gap-1">
                          {item.source.domain}
                          <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Action Row */}
        <div className="flex items-center gap-2 mb-12">
          <Button variant="outline" size="sm">
            <Bookmark className="size-4 mr-2" />
            Bookmark
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="size-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
            <Copy className="size-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Markdown'}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/briefs/${brief.id}/edit`}>
              Edit Brief
            </Link>
          </Button>
        </div>

        <Separator className="my-8" />

        {/* Comments Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="size-5" />
            Comments ({brief.comments?.length || 0})
          </h2>
          
          {/* Comment list */}
          <div className="space-y-4 mb-6">
            {brief.comments?.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={comment.author.avatar} />
                  <AvatarFallback className="text-xs">
                    {comment.author.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comment.content.split(/(@\w+\s\w+)/g).map((part, i) => 
                      part.startsWith('@') ? (
                        <span key={i} className="text-accent font-medium">{part}</span>
                      ) : (
                        part
                      )
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* New comment */}
          <div className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">YO</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add a comment... Use @ to mention teammates"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <Button size="icon" className="shrink-0 self-end">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </article>
    </div>
  )
}
