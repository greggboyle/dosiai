'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Hash, 
  MoreHorizontal, 
  Pencil, 
  Archive, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  ExternalLink,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MutationGuard } from '@/components/mutation-guard'
import { useWorkspaceContext } from '@/components/workspace-context'
import { canMutate, mutationBlockedReason } from '@/lib/auth/permissions'
import type { Topic, TopicImportance } from '@/lib/types'
import { createTopic, updateTopic, archiveTopic } from '@/lib/topics/actions'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts'

// E6: Sparkline data computed on demand, not stored
// This function simulates computing the sparkline from the database
function computeSparklineForTopic(topicId: string): { week: string; count: number }[] {
  // In production, this would be a database query
  const sparklineData: Record<string, { week: string; count: number }[]> = {
    '1': [
      { week: 'W1', count: 2 }, { week: 'W2', count: 1 }, { week: 'W3', count: 3 },
      { week: 'W4', count: 2 }, { week: 'W5', count: 4 }, { week: 'W6', count: 3 },
      { week: 'W7', count: 2 }, { week: 'W8', count: 5 }, { week: 'W9', count: 3 },
      { week: 'W10', count: 4 }, { week: 'W11', count: 6 }, { week: 'W12', count: 5 },
    ],
    '2': [
      { week: 'W1', count: 1 }, { week: 'W2', count: 2 }, { week: 'W3', count: 1 },
      { week: 'W4', count: 3 }, { week: 'W5', count: 2 }, { week: 'W6', count: 1 },
      { week: 'W7', count: 2 }, { week: 'W8', count: 1 }, { week: 'W9', count: 2 },
      { week: 'W10', count: 1 }, { week: 'W11', count: 2 }, { week: 'W12', count: 1 },
    ],
    '3': [
      { week: 'W1', count: 1 }, { week: 'W2', count: 2 }, { week: 'W3', count: 1 },
      { week: 'W4', count: 1 }, { week: 'W5', count: 2 }, { week: 'W6', count: 1 },
      { week: 'W7', count: 3 }, { week: 'W8', count: 2 }, { week: 'W9', count: 1 },
      { week: 'W10', count: 2 }, { week: 'W11', count: 1 }, { week: 'W12', count: 2 },
    ],
  }
  return sparklineData[topicId] || Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, count: 0 }))
}


const importanceColors: Record<TopicImportance, string> = {
  critical: 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  high: 'bg-mis-high/15 text-mis-high border-mis-high/30',
  medium: 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
  low: 'bg-mis-low/15 text-mis-low border-mis-low/30',
}

const importanceLabels: Record<TopicImportance, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

// E6: Component now receives computed data, not stored data
function TopicSparkline({ data }: { data: { week: string; count: number }[] }) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--accent))"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-positive text-xs">
        <ArrowUp className="size-3 mr-0.5" />
        {value}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center text-negative text-xs">
        <ArrowDown className="size-3 mr-0.5" />
        {Math.abs(value)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-muted-foreground text-xs">
      <Minus className="size-3 mr-0.5" />
      0
    </span>
  )
}

interface TopicFormData {
  name: string
  description: string
  importance: TopicImportance
  searchSeeds: string[]
}

function TopicFormModal({
  open,
  onOpenChange,
  topic,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic?: Topic
  onSave: (data: TopicFormData) => Promise<void>
}) {
  const isEdit = !!topic
  const [name, setName] = React.useState(topic?.name || '')
  const [description, setDescription] = React.useState(topic?.description || '')
  const [importance, setImportance] = React.useState<TopicImportance>(topic?.importance || 'medium')
  const [seeds, setSeeds] = React.useState<string[]>(topic?.searchSeeds || [])
  const [seedInput, setSeedInput] = React.useState('')
  const [isSuggesting, setIsSuggesting] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (topic) {
      setName(topic.name)
      setDescription(topic.description)
      setImportance(topic.importance)
      setSeeds(topic.searchSeeds)
    } else {
      setName('')
      setDescription('')
      setImportance('medium')
      setSeeds([])
    }
    setSeedInput('')
  }, [topic, open])

  const handleAddSeed = () => {
    const trimmed = seedInput.trim()
    if (trimmed && !seeds.includes(trimmed)) {
      setSeeds([...seeds, trimmed])
      setSeedInput('')
    }
  }

  const handleRemoveSeed = (seed: string) => {
    setSeeds(seeds.filter(s => s !== seed))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSeed()
    }
  }

  const handleSuggestSeeds = async () => {
    setIsSuggesting(true)
    // Simulate AI suggestion
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Generate suggestions based on topic name/description
    const baseSuggestions: Record<string, string[]> = {
      default: [
        `${name.toLowerCase()}`,
        `${name.toLowerCase()} news`,
        `${name.toLowerCase()} update`,
        `${name.toLowerCase()} announcement`,
        `${name.toLowerCase()} market`,
        `${name.toLowerCase()} industry`,
        `${name.toLowerCase()} trends`,
        `${name.toLowerCase()} analysis`,
      ],
    }

    const suggestions = baseSuggestions.default.filter(s => !seeds.includes(s))
    setSeeds([...seeds, ...suggestions.slice(0, 8)])
    setIsSuggesting(false)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onSave({ name, description, importance, searchSeeds: seeds })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the topic details and search seeds.' 
              : 'Define a new topic to track across your competitive landscape.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Topic name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., FMCSA compliance"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this topic covers..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="importance">Importance</Label>
            <Select value={importance} onValueChange={(v) => setImportance(v as TopicImportance)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Search seeds</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSuggestSeeds}
                disabled={isSuggesting || !name.trim()}
                className="h-7 text-xs"
              >
                {isSuggesting ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Suggesting...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 mr-1.5" />
                    Suggest seeds with AI
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add keyword or phrase..."
                className="flex-1"
              />
              <Button type="button" onClick={handleAddSeed} size="sm">
                Add
              </Button>
            </div>
            {seeds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {seeds.map((seed) => (
                  <Badge
                    key={seed}
                    variant="secondary"
                    className="pl-2 pr-1 py-0.5 text-xs"
                  >
                    {seed}
                    <button
                      type="button"
                      onClick={() => handleRemoveSeed(seed)}
                      className="ml-1 hover:bg-foreground/10 rounded p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {seeds.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add keywords and phrases to help identify relevant intelligence items.
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TopicCard({
  topic,
  onEdit,
  onArchive,
}: {
  topic: Topic
  onEdit: () => void
  onArchive: () => void
}) {
  return (
    <Card className="relative">
      <CardHeader id={`topic-${topic.id}`} className="pb-3 scroll-mt-24">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Hash className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{topic.name}</h3>
              <Badge 
                variant="outline" 
                className={cn('mt-1 text-[10px]', importanceColors[topic.importance])}
              >
                {importanceLabels[topic.importance]}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4 mr-2" />
                Edit topic
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} className="text-negative">
                <Archive className="size-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {topic.description}
        </p>
        
        {/* Activity Sparkline */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Activity (last 12 weeks)</p>
          <TopicSparkline data={computeSparklineForTopic(topic.id)} />
        </div>
        
        {/* Item Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Last 7 days</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold font-mono">{topic.itemCountLast7Days}</span>
              <ChangeIndicator value={topic.itemCountLast7DaysChange} />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold font-mono">{topic.itemCountLast30Days}</span>
              <ChangeIndicator value={topic.itemCountLast30DaysChange} />
            </div>
          </div>
        </div>
        
        {/* Linked Competitors */}
        {topic.linkedCompetitorNames.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Linked competitors</p>
            <div className="flex flex-wrap gap-1">
              {topic.linkedCompetitorNames.map((name) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(topic.relatedTopicNames?.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Related topics</p>
            <div className="flex flex-wrap gap-1">
              {(topic.relatedTopicIds ?? []).map((rid, idx) => (
                <Link key={rid} href={`/topics#topic-${rid}`}>
                  <Badge variant="outline" className="text-xs">
                    {topic.relatedTopicNames?.[idx] ?? 'Topic'}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* View Feed Button */}
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/intel?topic=${encodeURIComponent(topic.name)}`}>
            <ExternalLink className="size-4 mr-2" />
            View topic feed
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function TopicsPageClient({ initialTopics }: { initialTopics: Topic[] }) {
  const [topics, setTopics] = React.useState(initialTopics)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingTopic, setEditingTopic] = React.useState<Topic | undefined>()
  const [archivingTopicId, setArchivingTopicId] = React.useState<string | null>(null)
  const router = useRouter()
  const { workspace } = useWorkspaceContext()
  const canAddTopic = canMutate({ status: workspace.status }, 'add_topic')

  React.useEffect(() => {
    setTopics(initialTopics)
  }, [initialTopics])

  const handleCreate = () => {
    setEditingTopic(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic)
    setIsModalOpen(true)
  }

  const handleArchive = async (topicId: string) => {
    try {
      setArchivingTopicId(topicId)
      await archiveTopic({ workspaceId: workspace.id, topicId })
      setTopics((prev) => prev.filter((t) => t.id !== topicId))
      toast.success('Topic archived')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to archive topic')
    } finally {
      setArchivingTopicId(null)
    }
  }

  const handleSave = async (data: TopicFormData) => {
    try {
      if (editingTopic) {
        await updateTopic({
          workspaceId: workspace.id,
          topicId: editingTopic.id,
          name: data.name,
          description: data.description,
          importance: data.importance,
          searchSeeds: data.searchSeeds,
        })
        setTopics((prev) =>
          prev.map((t) =>
            t.id === editingTopic.id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
          )
        )
        toast.success('Topic saved')
      } else {
        await createTopic({
          workspaceId: workspace.id,
          name: data.name,
          description: data.description,
          importance: data.importance,
          searchSeeds: data.searchSeeds,
        })
        toast.success('Topic created')
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save topic')
      throw e
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
          <p className="text-sm text-muted-foreground">
            Track specific themes and trends across your competitive landscape
          </p>
        </div>
        <MutationGuard canMutate={canAddTopic} reason={mutationBlockedReason({ status: workspace.status })}>
          <Button onClick={handleCreate}>
            <Plus className="size-4 mr-2" />
            Create Topic
          </Button>
        </MutationGuard>
      </div>

      {topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Hash className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">No topics configured</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
            Create topics to track specific themes, technologies, or trends across all competitor activity.
          </p>
          <MutationGuard canMutate={canAddTopic} reason={mutationBlockedReason({ status: workspace.status })}>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="size-4 mr-2" />
              Create your first topic
            </Button>
          </MutationGuard>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onEdit={() => handleEdit(topic)}
              onArchive={() => {
                if (archivingTopicId) return
                void handleArchive(topic.id)
              }}
            />
          ))}
        </div>
      )}

      <TopicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        topic={editingTopic}
        onSave={handleSave}
      />
    </div>
  )
}
