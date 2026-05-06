'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Code,
  AlertTriangle,
  Archive,
  FlaskConical,
  Save,
  Rocket,
  Beaker,
  Variable,
  History,
  Loader2,
} from 'lucide-react'
import type { PromptTemplate, PromptVariable, AIVendor, AIPurpose } from '@/lib/admin-types'
import {
  activatePromptTemplate,
  clonePromptDraftFromActive,
  createPromptTemplate,
  rollbackPromptTemplate,
  updatePromptTemplate,
  validatePromptTemplate,
} from '@/app/admin/actions/platform'
import { toast } from 'sonner'

// Purpose labels
const purposeLabels: Record<AIPurpose, string> = {
  sweep_buy: 'Sweep: Buy-side',
  sweep_sell: 'Sweep: Sell-side',
  sweep_channel: 'Sweep: Channel',
  sweep_regulatory: 'Sweep: Regulatory',
  sweep_self: 'Sweep: Own Company',
  sweep_topic: 'Sweep: Topic',
  competitor_profile_refresh: 'Competitor Profile Refresh',
  scoring: 'MIS Scoring',
  embedding: 'Embedding',
  brief_drafting: 'Brief Drafting',
  battle_card_interview: 'Battle Card Interview',
}

const vendorLabels: Record<AIVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
}

const vendorColors: Record<AIVendor, string> = {
  openai: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
  xai: 'bg-blue-100 text-blue-700 border-blue-200',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
}


function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

interface PromptsClientProps {
  initialTemplates: PromptTemplate[]
}

export function PromptsClient({ initialTemplates }: PromptsClientProps) {
  const router = useRouter()
  const [templates, setTemplates] = React.useState<PromptTemplate[]>(initialTemplates)
  const [selectedTemplate, setSelectedTemplate] = React.useState<PromptTemplate | null>(initialTemplates[0] ?? null)
  const [filterPurpose, setFilterPurpose] = React.useState<string>('all')
  const [filterVendor, setFilterVendor] = React.useState<string>('all')
  const [filterStatus, setFilterStatus] = React.useState<string>('all')
  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null)
  const [showVariables, setShowVariables] = React.useState(true)
  const [showTestPanel, setShowTestPanel] = React.useState(false)
  const [showABPanel, setShowABPanel] = React.useState(false)
  const [editedContent, setEditedContent] = React.useState('')
  const [testInputs, setTestInputs] = React.useState<Record<string, string>>({})
  const [testResult, setTestResult] = React.useState<string | null>(null)
  const [isRunningTest, setIsRunningTest] = React.useState(false)
  const [deployOpen, setDeployOpen] = React.useState(false)
  const [rollbackOpen, setRollbackOpen] = React.useState(false)
  const [rollbackReason, setRollbackReason] = React.useState('')
  const [savingDraft, setSavingDraft] = React.useState(false)
  const [creatingTemplate, setCreatingTemplate] = React.useState(false)
  const [activating, setActivating] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newTemplateName, setNewTemplateName] = React.useState('')
  const [newTemplatePurpose, setNewTemplatePurpose] = React.useState<AIPurpose>('sweep_buy')
  const [newTemplateVendor, setNewTemplateVendor] = React.useState<AIVendor>('openai')
  const [newTemplateContent, setNewTemplateContent] = React.useState('')
  const [cloningDraft, setCloningDraft] = React.useState(false)
  const [rollingBack, setRollingBack] = React.useState(false)

  const persistDraft = async () => {
    if (!selectedTemplate) return
    setSavingDraft(true)
    try {
      await updatePromptTemplate({
        id: selectedTemplate.id,
        draft_content: editedContent,
        draft_note: 'Saved from operator console',
      })
      toast.success('Draft saved to database')
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, draftContent: editedContent, draftNote: 'Saved from operator console' }
            : t
        )
      )
      setSelectedTemplate((cur) =>
        cur && cur.id === selectedTemplate.id
          ? { ...cur, draftContent: editedContent, draftNote: 'Saved from operator console' }
          : cur
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingDraft(false)
    }
  }

  // Initialize edited content when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const version = selectedVersion ?? selectedTemplate.version
      if (version === selectedTemplate.draftVersion && selectedTemplate.draftContent) {
        setEditedContent(selectedTemplate.draftContent)
      } else {
        setEditedContent(selectedTemplate.content)
      }
    }
  }, [selectedTemplate, selectedVersion])

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (filterPurpose !== 'all' && t.purpose !== filterPurpose) return false
    if (filterVendor !== 'all' && t.vendor !== filterVendor) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  const handleRunTest = () => {
    if (!selectedTemplate) return
    setIsRunningTest(true)
    setTestResult(null)
    void validatePromptTemplate({
      id: selectedTemplate.id,
      variables: testInputs,
      contentOverride: editedContent,
    })
      .then((res) => {
        setTestResult(
          JSON.stringify(
            {
              vendor: res.vendor,
              model: res.model,
              latencyMs: res.latencyMs,
              usage: res.usage,
              preview: res.preview,
            },
            null,
            2
          )
        )
      })
      .catch((e) => {
        setTestResult(`Validation failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      })
      .finally(() => setIsRunningTest(false))
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return
    setCreatingTemplate(true)
    try {
      await createPromptTemplate({
        name: newTemplateName.trim(),
        purpose: newTemplatePurpose,
        vendor: newTemplateVendor,
        content: newTemplateContent,
      })
      toast.success('Template created')
      setCreateOpen(false)
      setNewTemplateName('')
      setNewTemplateContent('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreatingTemplate(false)
    }
  }

  const handleDeployTemplate = async () => {
    if (!selectedTemplate) return
    setActivating(true)
    try {
      await activatePromptTemplate({
        id: selectedTemplate.id,
        reason: `Activated from operator console (${selectedTemplate.name})`,
      })
      toast.success('Template activated and deployed to 100%')
      setDeployOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setActivating(false)
    }
  }

  const handleCloneDraft = async () => {
    if (!selectedTemplate) return
    setCloningDraft(true)
    try {
      await clonePromptDraftFromActive({
        id: selectedTemplate.id,
        note: `Draft cloned from active v${selectedTemplate.version}`,
      })
      toast.success('Draft cloned from active version')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Clone failed')
    } finally {
      setCloningDraft(false)
    }
  }

  const handleRollback = async () => {
    if (!selectedTemplate || !rollbackReason.trim()) return
    setRollingBack(true)
    try {
      await rollbackPromptTemplate({ id: selectedTemplate.id, reason: rollbackReason.trim() })
      toast.success('Rollback completed')
      setRollbackOpen(false)
      setRollbackReason('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rollback failed')
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0">
      {/* Left Pane - Template List */}
      <div className="w-[380px] shrink-0 border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">Prompt Templates</h1>
            <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 size-3" />
              New template
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterPurpose} onValueChange={setFilterPurpose}>
              <SelectTrigger className="h-8 text-[12px] flex-1">
                <SelectValue placeholder="Purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All purposes</SelectItem>
                {Object.entries(purposeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterVendor} onValueChange={setFilterVendor}>
              <SelectTrigger className="h-8 text-[12px] w-[100px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="xai">xAI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-[12px] w-[90px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Template List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template)
                  setSelectedVersion(null)
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg mb-1 transition-colors',
                  selectedTemplate?.id === template.id
                    ? 'bg-slate-100 border border-slate-300'
                    : 'hover:bg-slate-50 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'size-2 rounded-full shrink-0',
                    template.status === 'active' && 'bg-green-500',
                    template.status === 'draft' && 'bg-amber-500',
                    template.status === 'archived' && 'bg-slate-400'
                  )} />
                  <span className="text-[13px] font-medium text-slate-900 font-mono truncate">
                    {template.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>v{template.version}</span>
                  <span className="text-slate-300">•</span>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors[template.status])}>
                    {template.status}
                  </Badge>
                  <span className="text-slate-300">•</span>
                  <span>{formatRelativeTime(template.updatedAt)}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {template.updatedBy}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Pane - Template Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold font-mono text-slate-900">
                    {selectedTemplate.name}
                  </h2>
                  <Select 
                    value={String(selectedVersion ?? selectedTemplate.version)}
                    onValueChange={(v) => setSelectedVersion(Number(v))}
                  >
                    <SelectTrigger className="h-7 w-[100px] text-[12px] font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTemplate.draftVersion && (
                        <SelectItem value={String(selectedTemplate.draftVersion)}>
                          v{selectedTemplate.draftVersion} (draft)
                        </SelectItem>
                      )}
                      <SelectItem value={String(selectedTemplate.version)}>
                        v{selectedTemplate.version} (active)
                      </SelectItem>
                      {selectedTemplate.deploymentHistory.slice(1).map((d) => (
                        <SelectItem key={d.version} value={String(d.version)}>
                          v{d.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={cn('text-[11px]', statusColors[selectedTemplate.status])}>
                    {selectedTemplate.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    <Variable className="mr-1 size-3" />
                    Variables
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowTestPanel(!showTestPanel)}
                  >
                    <Beaker className="mr-1 size-3" />
                    Test
                  </Button>
                  {selectedTemplate.abTest && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('h-8', showABPanel && 'bg-purple-50 border-purple-200')}
                      onClick={() => setShowABPanel(!showABPanel)}
                    >
                      <FlaskConical className="mr-1 size-3" />
                      A/B Test
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Metadata row */}
              <div className="flex items-center gap-4 text-[12px] text-slate-500">
                <span>Deployed: {formatDateTime(selectedTemplate.deployedAt)} by {selectedTemplate.deployedBy}</span>
                <span className="text-slate-300">•</span>
                <span>{selectedTemplate.callsPerDay.toLocaleString()} calls/day</span>
                <span className="text-slate-300">•</span>
                <Badge variant="outline" className={cn('text-[10px]', vendorColors[selectedTemplate.vendor])}>
                  {vendorLabels[selectedTemplate.vendor]}
                </Badge>
              </div>

              {/* Draft note */}
              {selectedVersion === selectedTemplate.draftVersion && selectedTemplate.draftNote && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-800">
                  <strong>Draft note:</strong> {selectedTemplate.draftNote}
                </div>
              )}

              {/* A/B Test banner */}
              {selectedTemplate.abTest?.isActive && (
                <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded text-[12px] text-purple-800 flex items-center justify-between">
                  <div>
                    <FlaskConical className="inline size-3 mr-1" />
                    A/B testing v{selectedTemplate.abTest.testVersion} at {selectedTemplate.abTest.trafficPercent}% traffic
                  </div>
                  <div className="flex gap-4 text-[11px]">
                    <span>v{selectedTemplate.abTest.controlVersion}: {selectedTemplate.abTest.metrics.controlCitationRate}% citation</span>
                    <span>v{selectedTemplate.abTest.testVersion}: {selectedTemplate.abTest.metrics.testCitationRate}% citation (+{selectedTemplate.abTest.metrics.testLatencyMs - selectedTemplate.abTest.metrics.controlLatencyMs}ms)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Editor Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[400px] font-mono text-[13px] leading-relaxed bg-slate-900 text-slate-100 border-slate-700 resize-none"
                      style={{ height: 'calc(100vh - 400px)' }}
                    />
                  </div>
                </ScrollArea>

                {/* Action Bar */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={savingDraft} onClick={() => void persistDraft()}>
                      <Save className="mr-1 size-3" />
                      {savingDraft ? 'Saving…' : 'Save Draft'}
                    </Button>
                    <Button variant="outline" size="sm" disabled={cloningDraft} onClick={() => void handleCloneDraft()}>
                      <Plus className="mr-1 size-3" />
                      {cloningDraft ? 'Cloning…' : 'Clone active to draft'}
                    </Button>
                    <Button size="sm" onClick={() => setDeployOpen(true)}>
                      <Rocket className="mr-1 size-3" />
                      Deploy to 100%
                    </Button>
                    {selectedTemplate.deploymentHistory.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setRollbackOpen(true)}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Roll back
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-slate-500">
                      <Archive className="mr-1 size-3" />
                      Archive
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-500">
                    <History className="mr-1 size-3" />
                    View history
                  </Button>
                </div>

                {/* Deployment History */}
                <div className="border-t border-slate-200 p-4 shrink-0">
                  <h3 className="text-[12px] font-medium text-slate-700 mb-2">Deployment History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] py-1">Version</TableHead>
                        <TableHead className="text-[11px] py-1">Deployed</TableHead>
                        <TableHead className="text-[11px] py-1">By</TableHead>
                        <TableHead className="text-[11px] py-1">Traffic</TableHead>
                        <TableHead className="text-[11px] py-1">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTemplate.deploymentHistory.slice(0, 4).map((d) => (
                        <TableRow key={d.version} className="hover:bg-slate-50">
                          <TableCell className="py-1.5 text-[12px] font-mono">v{d.version}</TableCell>
                          <TableCell className="py-1.5 text-[12px]">{formatDateTime(d.deployedAt)}</TableCell>
                          <TableCell className="py-1.5 text-[12px]">{d.deployedBy}</TableCell>
                          <TableCell className="py-1.5 text-[12px]">{d.trafficPercent}%</TableCell>
                          <TableCell className="py-1.5 text-[12px]">
                            {d.rolledBackAt ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                                      Rolled back
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-[11px]">{d.rollbackReason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : d.version === selectedTemplate.version ? (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                                Active
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Variables Panel */}
              {showVariables && (
                <div className="w-[280px] border-l border-slate-200 overflow-y-auto shrink-0 bg-slate-50">
                  <div className="p-3 border-b border-slate-200 bg-white sticky top-0">
                    <h3 className="text-[12px] font-medium text-slate-700">Variables</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    {selectedTemplate.variables.map((v) => (
                      <div key={v.name} className="bg-white border border-slate-200 rounded p-2">
                        <div className="font-mono text-[12px] text-slate-900 mb-1">
                          {`{{${v.name}}}`}
                        </div>
                        <div className="text-[11px] text-slate-500 mb-1">{v.description}</div>
                        <Badge variant="outline" className="text-[10px] mr-1">{v.type}</Badge>
                        <div className="mt-1.5 p-1.5 bg-slate-50 rounded text-[10px] font-mono text-slate-600 break-all">
                          {v.example}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Panel */}
              {showTestPanel && (
                <div className="w-[320px] border-l border-slate-200 overflow-y-auto shrink-0 bg-slate-50">
                  <div className="p-3 border-b border-slate-200 bg-white sticky top-0">
                    <h3 className="text-[12px] font-medium text-slate-700">Test Panel</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    {selectedTemplate.variables.map((v) => (
                      <div key={v.name}>
                        <Label className="text-[11px] font-mono">{v.name}</Label>
                        <Textarea
                          value={testInputs[v.name] || ''}
                          onChange={(e) => setTestInputs({ ...testInputs, [v.name]: e.target.value })}
                          placeholder={v.example}
                          className="mt-1 text-[12px] font-mono h-20 resize-none"
                        />
                      </div>
                    ))}
                    <Button 
                      className="w-full" 
                      size="sm" 
                      onClick={handleRunTest}
                      disabled={isRunningTest}
                    >
                      {isRunningTest ? (
                        <>
                          <Loader2 className="mr-1 size-3 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 size-3" />
                          Run test
                        </>
                      )}
                    </Button>
                    {testResult && (
                      <div>
                        <Label className="text-[11px]">Response</Label>
                        <pre className="mt-1 p-2 bg-slate-900 text-green-400 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {testResult}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* A/B Testing Panel */}
              {showABPanel && selectedTemplate.abTest && (
                <div className="w-[300px] border-l border-slate-200 overflow-y-auto shrink-0 bg-purple-50/50">
                  <div className="p-3 border-b border-slate-200 bg-white sticky top-0">
                    <h3 className="text-[12px] font-medium text-slate-700">A/B Test Settings</h3>
                  </div>
                  <div className="p-3 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px]">A/B Testing</Label>
                      <Switch checked={selectedTemplate.abTest.isActive} />
                    </div>
                    
                    <div>
                      <Label className="text-[11px]">Traffic to v{selectedTemplate.abTest.testVersion}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Slider
                          value={[selectedTemplate.abTest.trafficPercent]}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-[12px] font-mono w-10">{selectedTemplate.abTest.trafficPercent}%</span>
                      </div>
                    </div>

                    <div className="bg-white border border-purple-200 rounded p-3">
                      <h4 className="text-[11px] font-medium text-slate-700 mb-2">Comparative Metrics</h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] py-1 px-1">Metric</TableHead>
                            <TableHead className="text-[10px] py-1 px-1">v{selectedTemplate.abTest.controlVersion}</TableHead>
                            <TableHead className="text-[10px] py-1 px-1">v{selectedTemplate.abTest.testVersion}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-[11px] py-1 px-1">Citation Rate</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono">{selectedTemplate.abTest.metrics.controlCitationRate}%</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono text-green-600">{selectedTemplate.abTest.metrics.testCitationRate}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-[11px] py-1 px-1">Latency</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono">{selectedTemplate.abTest.metrics.controlLatencyMs}ms</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono text-amber-600">{selectedTemplate.abTest.metrics.testLatencyMs}ms</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-[11px] py-1 px-1">Dedup Rate</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono">{selectedTemplate.abTest.metrics.controlDedupRate}%</TableCell>
                            <TableCell className="text-[11px] py-1 px-1 font-mono">{selectedTemplate.abTest.metrics.testDedupRate}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Started {formatRelativeTime(selectedTemplate.abTest.startedAt)}
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      Promote v{selectedTemplate.abTest.testVersion} to 100%
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a template to edit
          </div>
        )}
      </div>

      {/* Deploy Confirmation Dialog */}
      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy to production</DialogTitle>
            <DialogDescription>
              This will deploy v{selectedTemplate?.draftVersion ?? (selectedTemplate?.version ?? 0) + 1} to 100% traffic for all workspaces.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded mb-4">
              <AlertTriangle className="inline size-4 text-amber-600 mr-2" />
              <span className="text-[13px] text-amber-800">
                This action affects AI output for all customers. Ensure testing is complete.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleDeployTemplate()} disabled={activating}>
              <Rocket className="mr-2 size-4" />
              {activating ? 'Deploying…' : 'Deploy to 100%'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roll back to previous version</DialogTitle>
            <DialogDescription>
              This will revert to v{(selectedTemplate?.version ?? 1) - 1}. A reason is required for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-[12px]">Reason for rollback <span className="text-red-500">*</span></Label>
            <Textarea
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="e.g., regressed citation quality on regulatory items"
              className="mt-1 text-[13px]"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rollbackReason.trim() || rollingBack}
              onClick={() => void handleRollback()}
            >
              <RotateCcw className="mr-2 size-4" />
              {rollingBack ? 'Rolling back…' : 'Roll back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create prompt template</DialogTitle>
            <DialogDescription>
              Create a new template and save as draft. You can deploy it after reviewing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Purpose</Label>
                <Select value={newTemplatePurpose} onValueChange={(v) => setNewTemplatePurpose(v as AIPurpose)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(purposeLabels).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor</Label>
                <Select value={newTemplateVendor} onValueChange={(v) => setNewTemplateVendor(v as AIVendor)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="xai">xAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Template content</Label>
              <Textarea
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                className="mt-1 min-h-[180px] font-mono text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreateTemplate()} disabled={creatingTemplate || !newTemplateName.trim() || !newTemplateContent.trim()}>
              {creatingTemplate ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
