'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { toast } from 'sonner'
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
import { getRelativeTime } from '@/lib/types'
import { enqueueBriefDraft, publishBrief, saveBrief } from '@/lib/brief/actions'

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
  { value: 'archived', label: 'Archived' },
]

export interface BriefEditorClientProps {
  initialBrief: Brief
  feedItems: IntelligenceItem[]
  readOnly: boolean
}

export function BriefEditorClient({ initialBrief, feedItems, readOnly }: BriefEditorClientProps) {
  const router = useRouter()

  const [title, setTitle] = React.useState(initialBrief.title)
  const [summary, setSummary] = React.useState(initialBrief.summary)
  const [body, setBody] = React.useState(initialBrief.body)
  const [audience, setAudience] = React.useState<Brief['audience']>(initialBrief.audience)
  const [priority, setPriority] = React.useState<Brief['priority']>(initialBrief.priority)
  const [status, setStatus] = React.useState<Brief['status']>(initialBrief.status)
  const [linkedItemIds, setLinkedItemIds] = React.useState<string[]>(initialBrief.linkedItemIds ?? [])

  const [showPreview, setShowPreview] = React.useState(false)
  const [showAIPanel, setShowAIPanel] = React.useState(false)
  const [itemSearchQuery, setItemSearchQuery] = React.useState('')
  const [aiSelectedItems, setAiSelectedItems] = React.useState<string[]>([])
  const [aiPrompt, setAiPrompt] = React.useState('')
  const [aiDrafting, setAiDrafting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setTitle(initialBrief.title)
    setSummary(initialBrief.summary)
    setBody(initialBrief.body)
    setAudience(initialBrief.audience)
    setPriority(initialBrief.priority)
    setStatus(initialBrief.status)
    setLinkedItemIds(initialBrief.linkedItemIds ?? [])
  }, [initialBrief.updatedAt, initialBrief.id])

  const linkedItems = feedItems.filter((item) => linkedItemIds.includes(item.id))
  const unlinkedItems = feedItems.filter((item) => !linkedItemIds.includes(item.id))

  const filteredUnlinkedItems = unlinkedItems.filter(
    (item) =>
      item.title.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.relatedCompetitors?.some((c) => c.name.toLowerCase().includes(itemSearchQuery.toLowerCase())) ||
      item.relatedTopics?.some((t) => t.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  )

  const handleAddItem = (itemId: string) => {
    setLinkedItemIds((prev) => [...prev, itemId])
  }

  const handleRemoveItem = (itemId: string) => {
    setLinkedItemIds((prev) => prev.filter((id) => id !== itemId))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveBrief({
        briefId: initialBrief.id,
        title,
        summary,
        body,
        audience,
        priority,
        linkedItemIds,
        status,
      })
      if (status === 'archived') {
        toast.success('Brief archived')
        router.replace('/briefs')
        return
      }
      router.refresh()
      toast.success('Saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      await saveBrief({
        briefId: initialBrief.id,
        title,
        summary,
        body,
        audience,
        priority,
        linkedItemIds,
      })
      await publishBrief(initialBrief.id)
      setStatus('published')
      router.refresh()
      toast.success('Published')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAIDraft = async () => {
    if (aiSelectedItems.length === 0) return
    setAiDrafting(true)
    try {
      await enqueueBriefDraft({
        briefId: initialBrief.id,
        itemIds: aiSelectedItems,
        audienceHint: aiPrompt || undefined,
      })
      toast.success('AI draft queued — refreshing every few seconds until complete.')
      setShowAIPanel(false)
      setAiSelectedItems([])
      setAiPrompt('')
      let n = 0
      const interval = window.setInterval(() => {
        router.refresh()
        n += 1
        if (n >= 20) window.clearInterval(interval)
      }, 3000)
      window.setTimeout(() => window.clearInterval(interval), 60_000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start AI draft')
    } finally {
      setAiDrafting(false)
    }
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length

  const disabled = readOnly || saving

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 -mx-6 px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/briefs">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as Brief['status'])}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={audience} onValueChange={(v) => setAudience(v as Brief['audience'])} disabled={disabled}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {audienceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={(v) => setPriority(v as Brief['priority'])} disabled={disabled}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Dialog open={showAIPanel} onOpenChange={setShowAIPanel}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                <Sparkles className="size-4 mr-2" />
                Draft from items
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>AI-assisted drafting</DialogTitle>
                <DialogDescription>
                  Pick feed items (minimum 1). An Inngest job calls the brief drafting model and fills this brief when
                  complete.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Items ({aiSelectedItems.length} selected)
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-auto border rounded-lg p-2">
                    {feedItems.map((item) => (
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
                            if (checked) setAiSelectedItems((prev) => [...prev, item.id])
                            else setAiSelectedItems((prev) => prev.filter((id) => id !== item.id))
                          }}
                          className="mt-0.5"
                          disabled={disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MISBadge score={item.mis} size="sm" />
                            <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.relatedCompetitors?.[0]?.name ? (
                              <span className="mr-2">{item.relatedCompetitors[0].name}</span>
                            ) : null}
                            <span>{getRelativeTime(item.timestamp)}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Audience / focus hint (optional)</label>
                  <Textarea
                    placeholder="e.g. Leadership — emphasize enterprise motion."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="resize-none"
                    rows={3}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAIPanel(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAIDraft} disabled={aiSelectedItems.length === 0 || aiDrafting || disabled}>
                  {aiDrafting ? <>Queueing…</> : <>Generate draft</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={showPreview ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={disabled}
          >
            {showPreview ? <Edit3 className="size-4 mr-2" /> : <Eye className="size-4 mr-2" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>

          <Button variant="outline" size="sm" onClick={() => void handleSave()} disabled={disabled}>
            <Save className="size-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={() => void handlePublish()} disabled={disabled || !title || !body}>
            <Send className="size-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto">
        {showPreview ? (
          <div className="max-w-[720px] mx-auto">
            <p className="text-sm text-muted-foreground mb-4">{summary}</p>
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight mb-8">{title || 'Untitled brief'}</h1>
            <div className="prose prose-zinc dark:prose-invert max-w-none [&_p]:leading-[1.7] [&_p]:text-base [&_li]:leading-[1.7] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-medium [&_strong]:font-semibold [&_hr]:my-8 [&_ul]:my-4 [&_ol]:my-4">
              <ReactMarkdown>{body || '*No content yet*'}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title..."
              className="text-2xl font-semibold h-auto py-3 px-0 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-accent"
              disabled={disabled}
            />

            <div>
              <label className="text-sm font-medium mb-2 block">Summary</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two sentences for listings and dashboards."
                rows={3}
                disabled={disabled}
              />
            </div>

            <div className="text-xs text-muted-foreground">{wordCount} words</div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Body (Markdown)</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your brief in markdown..."
                  className="min-h-[500px] font-mono text-sm resize-none"
                  disabled={disabled}
                />
              </div>
              <div className="hidden lg:block">
                <label className="text-sm font-medium mb-2 block">Live preview</label>
                <div className="border rounded-lg p-4 min-h-[500px] prose prose-sm prose-zinc dark:prose-invert max-w-none overflow-auto">
                  <ReactMarkdown>{body || '*Start typing to see preview*'}</ReactMarkdown>
                </div>
              </div>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked intelligence items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {linkedItems.map((item) => (
                      <Badge key={item.id} variant="secondary" className="flex items-center gap-1 pr-1">
                        <MISBadge score={item.mis} size="sm" />
                        <span className="max-w-[200px] truncate text-xs">{item.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4 ml-1 hover:bg-destructive/20"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={disabled}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items to link..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pl-9"
                    disabled={disabled}
                  />
                </div>

                {itemSearchQuery && filteredUnlinkedItems.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
                    {filteredUnlinkedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      >
                        <MISBadge score={item.mis} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{item.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            {item.relatedCompetitors?.[0]?.name ? (
                              <span>{item.relatedCompetitors[0].name}</span>
                            ) : null}
                            <span>{getRelativeTime(item.timestamp)}</span>
                            <a
                              href={item.sourceUrls[0]?.url ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              {item.sourceUrls[0]?.domain ?? 'Source'}
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
                          disabled={disabled}
                        >
                          <Plus className="size-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {itemSearchQuery && filteredUnlinkedItems.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">No matching items</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
