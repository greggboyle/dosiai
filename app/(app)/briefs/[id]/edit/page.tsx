'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Edit3,
  Sparkles,
  X,
  Search,
  Plus,
  ExternalLink,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { Checkbox } from '@/components/ui/checkbox'
import { MISBadge } from '@/components/mis-badge'
import type { Brief, IntelligenceItem } from '@/lib/types'

// Available feed items to link
const availableFeedItems: IntelligenceItem[] = [
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
  {
    id: '5',
    title: 'FreightHero launches free tier targeting SMB logistics',
    summary: 'New pricing strategy aimed at capturing entry-level market.',
    content: '',
    mis: { value: 58, band: 'medium', confidence: 'high' },
    category: 'sell-side',
    source: { name: 'FreightWaves', url: 'https://freightwaves.com', domain: 'freightwaves.com' },
    vendorConsensus: { confirmed: 2, total: 2 },
    competitor: { id: '2', name: 'FreightHero' },
    topics: ['Pricing', 'Strategy'],
    timestamp: '5 hours ago',
    isRead: true,
    isBookmarked: false,
    isWatching: false,
  },
  {
    id: '6',
    title: 'FMCSA proposes new electronic logging requirements for 2027',
    summary: 'Stricter compliance standards could impact TMS feature requirements.',
    content: '',
    mis: { value: 52, band: 'medium', confidence: 'high' },
    category: 'regulatory',
    source: { name: 'FMCSA', url: 'https://fmcsa.dot.gov', domain: 'fmcsa.dot.gov' },
    vendorConsensus: { confirmed: 1, total: 1 },
    topics: ['Regulatory', 'Compliance'],
    timestamp: '4 days ago',
    isRead: false,
    isBookmarked: false,
    isWatching: false,
  },
]

// Mock brief data for editing
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
}

const audienceOptions: { value: Brief['audience']; label: string }[] = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'sales', label: 'Sales' },
  { value: 'product', label: 'Product' },
  { value: 'general', label: 'General' },
]

const priorityOptions: { value: Brief['priority']; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
]

const statusOptions: { value: Brief['status']; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
]

export default function BriefEditorPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'new'

  // Form state
  const [title, setTitle] = React.useState(isNew ? '' : mockBrief.title)
  const [body, setBody] = React.useState(isNew ? '' : mockBrief.body)
  const [audience, setAudience] = React.useState<Brief['audience']>(isNew ? 'general' : mockBrief.audience)
  const [priority, setPriority] = React.useState<Brief['priority']>(isNew ? 'medium' : mockBrief.priority)
  const [status, setStatus] = React.useState<Brief['status']>(isNew ? 'draft' : mockBrief.status)
  const [linkedItemIds, setLinkedItemIds] = React.useState<string[]>(isNew ? [] : mockBrief.linkedItemIds)

  // UI state
  const [showPreview, setShowPreview] = React.useState(false)
  const [showAIPanel, setShowAIPanel] = React.useState(false)
  const [itemSearchQuery, setItemSearchQuery] = React.useState('')
  const [aiSelectedItems, setAiSelectedItems] = React.useState<string[]>([])
  const [aiPrompt, setAiPrompt] = React.useState('')
  const [aiDrafting, setAiDrafting] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)

  // Track changes
  React.useEffect(() => {
    if (!isNew) {
      const hasChanges = 
        title !== mockBrief.title ||
        body !== mockBrief.body ||
        audience !== mockBrief.audience ||
        priority !== mockBrief.priority ||
        status !== mockBrief.status ||
        JSON.stringify(linkedItemIds) !== JSON.stringify(mockBrief.linkedItemIds)
      setIsDirty(hasChanges)
    } else {
      setIsDirty(title.length > 0 || body.length > 0)
    }
  }, [title, body, audience, priority, status, linkedItemIds, isNew])

  const linkedItems = availableFeedItems.filter(item => linkedItemIds.includes(item.id))
  const unlinkedItems = availableFeedItems.filter(item => !linkedItemIds.includes(item.id))

  const filteredUnlinkedItems = unlinkedItems.filter(item => 
    item.title.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.competitor?.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.topics.some(t => t.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  )

  const handleAddItem = (itemId: string) => {
    setLinkedItemIds(prev => [...prev, itemId])
  }

  const handleRemoveItem = (itemId: string) => {
    setLinkedItemIds(prev => prev.filter(id => id !== itemId))
  }

  const handleAIDraft = async () => {
    if (aiSelectedItems.length === 0) return
    
    setAiDrafting(true)
    // Simulate AI drafting
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const selectedItemData = availableFeedItems.filter(item => aiSelectedItems.includes(item.id))
    const itemTitles = selectedItemData.map(item => `- ${item.title}`).join('\n')
    
    const draftBody = `## AI-Generated Draft

Based on the following intelligence items:
${itemTitles}

---

${aiPrompt ? `**Focus area:** ${aiPrompt}\n\n` : ''}

[AI would generate a synthesizing brief here based on the selected items and optional prompt. This draft should be reviewed and edited before publishing.]

---

*This is an AI-generated draft. Please review and edit before publishing.*`

    setBody(draftBody)
    setLinkedItemIds(aiSelectedItems)
    setShowAIPanel(false)
    setAiDrafting(false)
    setAiSelectedItems([])
    setAiPrompt('')
  }

  const handleSave = () => {
    // Save draft logic
    console.log('Saving draft...', { title, body, audience, priority, status, linkedItemIds })
  }

  const handlePublish = () => {
    // Publish logic
    setStatus('published')
    console.log('Publishing...', { title, body, audience, priority, linkedItemIds })
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mx-6 px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/briefs">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Status */}
          <Select value={status} onValueChange={(v) => setStatus(v as Brief['status'])}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Audience */}
          <Select value={audience} onValueChange={(v) => setAudience(v as Brief['audience'])}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {audienceOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priority} onValueChange={(v) => setPriority(v as Brief['priority'])}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* AI Assist */}
          <Dialog open={showAIPanel} onOpenChange={setShowAIPanel}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="size-4 mr-2" />
                AI Assist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>AI-Assisted Drafting</DialogTitle>
                <DialogDescription>
                  Select intelligence items and optionally provide a focus prompt for the AI to draft a synthesizing brief.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto space-y-4 py-4">
                {/* Item selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select items to synthesize ({aiSelectedItems.length} selected)
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-auto border rounded-lg p-2">
                    {availableFeedItems.map(item => (
                      <label 
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                          aiSelectedItems.includes(item.id) 
                            ? 'bg-accent/10 border border-accent/30' 
                            : 'hover:bg-muted'
                        )}
                      >
                        <Checkbox
                          checked={aiSelectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAiSelectedItems(prev => [...prev, item.id])
                            } else {
                              setAiSelectedItems(prev => prev.filter(id => id !== item.id))
                            }
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MISBadge score={item.mis} size="sm" />
                            <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.competitor?.name && (
                              <span className="mr-2">{item.competitor.name}</span>
                            )}
                            <span>{item.timestamp}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Optional prompt */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Focus prompt (optional)
                  </label>
                  <Textarea
                    placeholder="e.g., Focus on implications for our enterprise sales motion..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAIPanel(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAIDraft}
                  disabled={aiSelectedItems.length === 0 || aiDrafting}
                >
                  {aiDrafting ? (
                    <>Drafting...</>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-2" />
                      Generate Draft
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Preview toggle */}
          <Button
            variant={showPreview ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <Edit3 className="size-4 mr-2" /> : <Eye className="size-4 mr-2" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>

          {/* Save/Publish */}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!isDirty}>
            <Save className="size-4 mr-2" />
            Save Draft
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={!title || !body}>
            <Send className="size-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-[900px] mx-auto">
        {showPreview ? (
          // Preview Mode
          <div className="max-w-[720px] mx-auto">
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight mb-8">
              {title || 'Untitled Brief'}
            </h1>
            <div className="prose prose-zinc dark:prose-invert max-w-none [&_p]:leading-[1.7] [&_p]:text-base [&_li]:leading-[1.7] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_strong]:font-semibold [&_hr]:my-8 [&_ul]:my-4 [&_ol]:my-4">
              <ReactMarkdown>{body || '*No content yet*'}</ReactMarkdown>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-6">
            {/* Title Input */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title..."
              className="text-2xl font-semibold h-auto py-3 px-0 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-accent"
            />

            {/* Word count */}
            <div className="text-xs text-muted-foreground">
              {wordCount} words
            </div>

            {/* Markdown Editor */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Content (Markdown)</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your brief in markdown..."
                  className="min-h-[500px] font-mono text-sm resize-none"
                />
              </div>
              <div className="hidden lg:block">
                <label className="text-sm font-medium mb-2 block">Live Preview</label>
                <div className="border rounded-lg p-4 min-h-[500px] prose prose-sm prose-zinc dark:prose-invert max-w-none overflow-auto">
                  <ReactMarkdown>{body || '*Start typing to see preview*'}</ReactMarkdown>
                </div>
              </div>
            </div>

            <Separator />

            {/* Linked Items Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Intelligence Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current linked items */}
                {linkedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {linkedItems.map(item => (
                      <Badge 
                        key={item.id} 
                        variant="secondary" 
                        className="flex items-center gap-1 pr-1"
                      >
                        <MISBadge score={item.mis} size="sm" showValue={false} />
                        <span className="max-w-[200px] truncate text-xs">{item.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4 ml-1 hover:bg-destructive/20"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search and add items */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items to link..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {itemSearchQuery && filteredUnlinkedItems.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
                    {filteredUnlinkedItems.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <MISBadge score={item.mis} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{item.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {item.competitor?.name && <span>{item.competitor.name}</span>}
                            <span>{item.timestamp}</span>
                            <a 
                              href={item.source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              {item.source.domain}
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            handleAddItem(item.id)
                            setItemSearchQuery('')
                          }}
                        >
                          <Plus className="size-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {itemSearchQuery && filteredUnlinkedItems.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No matching items found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
