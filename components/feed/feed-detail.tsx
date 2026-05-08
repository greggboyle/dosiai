'use client'

import * as React from 'react'
import { 
  Bookmark, 
  ExternalLink, 
  Share2, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Link2, 
  Users, 
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  AtSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { MISBadge } from '@/components/mis-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import ReactMarkdown from 'react-markdown'
import type { IntelligenceItem } from '@/lib/types'
import { getRelativeTime, getCategoryInfo } from '@/lib/types'

const commentaryRoleLabelMap: Record<string, string> = {
  chief_growth_officer: 'Strategy',
  product_marketing: 'Positioning',
  chief_risk_officer: 'Risk',
}

function getMarkdownNodeText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
        return getMarkdownNodeText(child.props.children)
      }
      return ''
    })
    .join('')
    .trim()
}

interface FeedDetailProps {
  item: IntelligenceItem | null
  onMarkReviewed?: () => void | Promise<void>
  onToggleWatching?: () => void | Promise<void>
  competitorOptions?: Array<{ id: string; name: string }>
  onAttachCompetitor?: (competitorId: string) => void | Promise<void>
  onDetachCompetitor?: (competitorId: string) => void | Promise<void>
}

export function FeedDetail({
  item,
  onMarkReviewed,
  onToggleWatching,
  competitorOptions = [],
  onAttachCompetitor,
  onDetachCompetitor,
}: FeedDetailProps) {
  const [scoreExpanded, setScoreExpanded] = React.useState(false)
  const [commentText, setCommentText] = React.useState('')
  const [tagDialogOpen, setTagDialogOpen] = React.useState(false)
  const [selectedCompetitorId, setSelectedCompetitorId] = React.useState<string>('')
  const [isSavingCompetitor, setIsSavingCompetitor] = React.useState(false)

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-[240px]">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg
              className="size-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium">Select an item</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose an intelligence item from the feed to view details.
          </p>
        </div>
      </div>
    )
  }

  const categoryInfo = getCategoryInfo(item.category)
  const availableOptions = competitorOptions.filter(
    (c) => !item.relatedCompetitors?.some((rc) => rc.id === c.id)
  )
  const hasAnyCompetitorOptions = competitorOptions.length > 0

  const handleSaveCompetitorTag = async () => {
    if (!selectedCompetitorId || !onAttachCompetitor) return
    setIsSavingCompetitor(true)
    try {
      await onAttachCompetitor(selectedCompetitorId)
      setTagDialogOpen(false)
      setSelectedCompetitorId('')
    } finally {
      setIsSavingCompetitor(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header with Actions */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              variant={item.isBookmarked ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs"
            >
              <Bookmark
                className={cn('size-3.5 mr-1', item.isBookmarked && 'fill-current')}
              />
              {item.isBookmarked ? 'Saved' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={!!item.reviewedAt}
              onClick={() => void onMarkReviewed?.()}
            >
              <XCircle className="size-3.5 mr-1" />
              {item.reviewedAt ? 'Reviewed' : 'Mark reviewed'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Share2 className="size-3.5 mr-1" />
              Share
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  void onToggleWatching?.()
                }}
              >
                <Eye className="size-3.5 mr-2" />
                {item.isWatching ? 'Stop Watching' : 'Add to Watching'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <CheckCircle className="size-3.5 mr-2" />
                Mark as Read
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                <Link2 className="size-3.5 mr-2" />
                Link to Brief
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setTagDialogOpen(true)
                }}
              >
                <Users className="size-3.5 mr-2" />
                Attribute to Competitor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                Override Score
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-destructive">
                Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attribute to competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Choose a competitor to tag this intel item with.</p>
            {availableOptions.length > 0 ? (
              <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select competitor" />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {hasAnyCompetitorOptions
                    ? 'No available competitors to add. This item is already tagged to all selectable competitors.'
                    : 'No competitors are currently available to tag. Add or re-activate competitors, then try again.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tagged: {item.relatedCompetitors?.length ?? 0} / Selectable: {competitorOptions.length}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTagDialogOpen(false)
                setSelectedCompetitorId('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveCompetitorTag()}
              disabled={!selectedCompetitorId || isSavingCompetitor || !onAttachCompetitor}
            >
              {isSavingCompetitor ? 'Saving…' : 'Save tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          {/* Title & Score */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold leading-snug text-balance">
              {item.title}
            </h2>

            {/* Score & Confidence Row */}
            <div className="flex items-center gap-4 flex-wrap">
              <MISBadge score={item.mis} size="lg" />
              <Badge variant="secondary" className="text-xs font-mono">
                Vendors {item.vendorConsensus.confirmed}/{item.vendorConsensus.total}
              </Badge>
              <Collapsible open={scoreExpanded} onOpenChange={setScoreExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    {scoreExpanded ? 'Hide' : 'Show'} score breakdown
                    {scoreExpanded ? (
                      <ChevronUp className="size-3 ml-1" />
                    ) : (
                      <ChevronDown className="size-3 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Scored {item.mis.value}/100:</span>
                      {' '}
                      {item.scoreBreakdown?.competitorProximity && `${item.scoreBreakdown.competitorProximity} competitor proximity`}
                      {item.scoreBreakdown?.recency && `, ${item.scoreBreakdown.recency}`}
                      {item.scoreBreakdown?.vendorConsensus && `, ${item.scoreBreakdown.vendorConsensus} vendor consensus`}
                      {item.scoreBreakdown?.magnitude && `, ${item.scoreBreakdown.magnitude}`}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Metadata (C1: updated for relatedCompetitors/relatedTopics arrays) */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge 
                variant="outline" 
                className={cn('text-xs font-medium border-0', categoryInfo.color)}
              >
                {categoryInfo.label}
              </Badge>
              {item.relatedCompetitors?.map((comp) => (
                <Badge key={comp.id} variant="secondary" className="text-xs font-medium">
                  <span>{comp.name}</span>
                  {onDetachCompetitor && (
                    <button
                      type="button"
                      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onDetachCompetitor(comp.id)
                      }}
                      aria-label={`Remove ${comp.name} from this item`}
                    >
                      <XCircle className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {item.relatedTopics?.map((topic) => (
                <Badge key={topic.id} variant="outline" className="text-xs">
                  {topic.name}
                </Badge>
              ))}
              {item.reviewMetadata && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                  Customer Voice
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Five W + H Grid */}
          {item.fiveWH && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Analysis</h3>
                <div className="grid grid-cols-2 gap-3">
                  {item.fiveWH.who && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Who</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.who}</p>
                    </div>
                  )}
                  {item.fiveWH.what && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">What</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.what}</p>
                    </div>
                  )}
                  {item.fiveWH.when && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">When</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.when}</p>
                    </div>
                  )}
                  {item.fiveWH.where && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Where</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.where}</p>
                    </div>
                  )}
                  {item.fiveWH.why && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Why</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.why}</p>
                    </div>
                  )}
                  {item.fiveWH.how && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">How</p>
                      <p className="text-xs leading-relaxed">{item.fiveWH.how}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Full Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Summary</h3>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {item.fullSummary || item.summary}
            </div>
          </div>

          <Separator />

          {item.content?.trim() && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Competitive Commentary</h3>
                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:my-3 [&_ol]:my-3 [&_a]:text-accent [&_a]:underline-offset-2">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h1>{children}</h1>
                      },
                      h2: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h2>{children}</h2>
                      },
                      h3: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h3>{children}</h3>
                      },
                      h4: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h4>{children}</h4>
                      },
                      h5: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h5>{children}</h5>
                      },
                      h6: ({ children }) => {
                        const key = getMarkdownNodeText(children).toLowerCase()
                        const label = commentaryRoleLabelMap[key]
                        if (label) {
                          return (
                            <div className="my-4">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {label}
                              </Badge>
                            </div>
                          )
                        }
                        return <h6>{children}</h6>
                      },
                    }}
                  >
                    {item.content}
                  </ReactMarkdown>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Sources (C1: now single sourceUrls array) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Sources</h3>
            <div className="space-y-2">
              {item.sourceUrls?.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{source.name}</p>
                    {idx === 0 && (
                      <Badge variant="outline" className="text-[10px] h-4">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{source.domain}</p>
                    <ExternalLink className="size-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Related Items */}
          {item.relatedItems && item.relatedItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  Also about {item.relatedCompetitors?.[0]?.name || 'this topic'} this week
                </h3>
                <div className="space-y-2">
                  {item.relatedItems.map((relatedId) => (
                    <div
                      key={relatedId}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-muted-foreground">Related item #{relatedId}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Comments</h3>
            
            {/* Existing Comments */}
            {item.comments && item.comments.length > 0 ? (
              <div className="space-y-3">
                {item.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="size-7 flex-shrink-0">
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{comment.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {getRelativeTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            )}

            {/* Add Comment */}
            <div className="flex gap-3">
              <Avatar className="size-7 flex-shrink-0">
                <AvatarFallback className="text-xs">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Add a comment... Use @ to mention teammates"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                />
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    <AtSign className="size-3 mr-1" />
                    Mention
                  </Button>
                  <Button size="sm" className="h-7 text-xs" disabled={!commentText.trim()}>
                    <Send className="size-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
