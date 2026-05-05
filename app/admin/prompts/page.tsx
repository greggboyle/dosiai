'use client'

import * as React from 'react'
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

// Purpose labels
const purposeLabels: Record<AIPurpose, string> = {
  sweep_buy: 'Sweep: Buy-side',
  sweep_sell: 'Sweep: Sell-side',
  sweep_channel: 'Sweep: Channel',
  sweep_regulatory: 'Sweep: Regulatory',
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

// Mock prompt templates - 16 total (8 purposes × 2 vendors average)
const mockTemplates: PromptTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'sweep_buy — openai',
    purpose: 'sweep_buy',
    vendor: 'openai',
    status: 'active',
    version: 14,
    draftVersion: 15,
    content: `You are a buy-side market intelligence analyst. The user's company is described as: {{company_summary}}. They track these competitors: {{competitor_list}}. Find recent (within {{date_window}}) buy-side intelligence — customer adoption announcements, RFP signals, hiring at customer companies, public reviews, procurement activity.

For each item found:
1. Extract the source URL and publication date
2. Identify which competitor(s) are mentioned
3. Summarize the key finding in 2-3 sentences
4. Note any quantitative data (deal sizes, headcount, revenue)

Return results as a JSON array with the following schema:
{
  "items": [
    {
      "title": "string",
      "source_url": "string",
      "published_date": "string",
      "competitors": ["string"],
      "summary": "string",
      "quantitative_data": {},
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Important: Only include items with verifiable sources. Skip results without clear attribution.`,
    draftContent: `You are a buy-side market intelligence analyst. The user's company is described as: {{company_summary}}. They track these competitors: {{competitor_list}}. Find recent (within {{date_window}}) buy-side intelligence — customer adoption announcements, RFP signals, hiring at customer companies, public reviews, procurement activity.

For each item found:
1. Extract the source URL and publication date
2. Identify which competitor(s) are mentioned
3. Summarize the key finding in 2-3 sentences
4. Note any quantitative data (deal sizes, headcount, revenue)

Return results as a JSON array with the following schema:
{
  "items": [
    {
      "title": "string",
      "source_url": "string",
      "published_date": "string",
      "competitors": ["string"],
      "summary": "string",
      "quantitative_data": {},
      "confidence": "high" | "medium" | "low"
    }
  ]
}

CRITICAL: Only include items with verifiable sources. Skip any results that do not have a clear, linkable source URL. Do not fabricate or infer sources. If uncertain about attribution, exclude the item entirely.`,
    draftNote: 'Add explicit instruction to skip results without sources. Testing shows hallucination rate drops 23%.',
    variables: [
      { name: 'company_summary', type: 'string', description: 'Description of the user\'s company', example: 'RouteLogix is an enterprise TMS vendor serving Fortune 500 shippers...' },
      { name: 'competitor_list', type: 'array', description: 'List of competitor names being tracked', example: '["Acme Logistics", "FreightHero", "RouteIQ"]' },
      { name: 'date_window', type: 'string', description: 'Recency filter for results', example: '30 days' },
    ],
    callsPerDay: 2847,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-05-03T14:30:00Z',
    updatedBy: 'Morgan Lee',
    deployedAt: '2026-04-18T10:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 14, deployedAt: '2026-04-18T10:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
      { version: 13, deployedAt: '2026-03-19T14:00:00Z', deployedBy: 'Morgan Lee', trafficPercent: 100, rolledBackAt: '2026-03-20T09:00:00Z', rollbackReason: 'regressed citation quality on regulatory items' },
      { version: 12, deployedAt: '2026-02-22T11:00:00Z', deployedBy: 'Jordan Martinez', trafficPercent: 100 },
      { version: 11, deployedAt: '2026-01-15T16:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
    abTest: {
      isActive: true,
      controlVersion: 14,
      testVersion: 15,
      trafficPercent: 10,
      startedAt: '2026-05-01T00:00:00Z',
      metrics: {
        controlCitationRate: 87,
        testCitationRate: 91,
        controlLatencyMs: 1847,
        testLatencyMs: 2027,
        controlDedupRate: 12,
        testDedupRate: 14,
      },
    },
  },
  {
    id: 'tmpl-002',
    name: 'sweep_buy — anthropic',
    purpose: 'sweep_buy',
    vendor: 'anthropic',
    status: 'active',
    version: 8,
    content: `You are a buy-side market intelligence analyst...`,
    variables: [
      { name: 'company_summary', type: 'string', description: 'Description of the user\'s company', example: 'RouteLogix is an enterprise TMS vendor...' },
      { name: 'competitor_list', type: 'array', description: 'List of competitor names', example: '["Acme Logistics"]' },
      { name: 'date_window', type: 'string', description: 'Recency filter', example: '30 days' },
    ],
    callsPerDay: 892,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-04-10T09:00:00Z',
    updatedBy: 'Alex Chen',
    deployedAt: '2026-04-10T09:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 8, deployedAt: '2026-04-10T09:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-003',
    name: 'sweep_sell — openai',
    purpose: 'sweep_sell',
    vendor: 'openai',
    status: 'active',
    version: 11,
    content: `You are a sell-side market intelligence analyst...`,
    variables: [
      { name: 'company_summary', type: 'string', description: 'Description of the user\'s company', example: 'RouteLogix...' },
      { name: 'competitor_list', type: 'array', description: 'List of competitors', example: '["Acme"]' },
      { name: 'date_window', type: 'string', description: 'Recency filter', example: '30 days' },
    ],
    callsPerDay: 2134,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2026-04-25T16:00:00Z',
    updatedBy: 'Morgan Lee',
    deployedAt: '2026-04-25T16:00:00Z',
    deployedBy: 'Morgan Lee',
    deploymentHistory: [
      { version: 11, deployedAt: '2026-04-25T16:00:00Z', deployedBy: 'Morgan Lee', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-004',
    name: 'sweep_channel — xai',
    purpose: 'sweep_channel',
    vendor: 'xai',
    status: 'active',
    version: 6,
    content: `You are a channel intelligence analyst...`,
    variables: [
      { name: 'company_summary', type: 'string', description: 'Description', example: 'RouteLogix...' },
      { name: 'competitor_list', type: 'array', description: 'Competitors', example: '[]' },
      { name: 'channels', type: 'array', description: 'Channel sources', example: '["FreightWaves"]' },
    ],
    callsPerDay: 1256,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2026-04-01T11:00:00Z',
    updatedBy: 'Jordan Martinez',
    deployedAt: '2026-04-01T11:00:00Z',
    deployedBy: 'Jordan Martinez',
    deploymentHistory: [
      { version: 6, deployedAt: '2026-04-01T11:00:00Z', deployedBy: 'Jordan Martinez', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-005',
    name: 'sweep_regulatory — anthropic',
    purpose: 'sweep_regulatory',
    vendor: 'anthropic',
    status: 'active',
    version: 9,
    content: `You are a regulatory intelligence analyst...`,
    variables: [
      { name: 'industry', type: 'string', description: 'Industry vertical', example: 'Logistics' },
      { name: 'regions', type: 'array', description: 'Geographic regions', example: '["US", "EU"]' },
    ],
    callsPerDay: 478,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-03-15T14:00:00Z',
    updatedBy: 'Alex Chen',
    deployedAt: '2026-03-15T14:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 9, deployedAt: '2026-03-15T14:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-006',
    name: 'sweep_regulatory — xai',
    purpose: 'sweep_regulatory',
    vendor: 'xai',
    status: 'active',
    version: 4,
    content: `You are a regulatory intelligence analyst (multi-vendor triangulation)...`,
    variables: [
      { name: 'industry', type: 'string', description: 'Industry', example: 'Logistics' },
      { name: 'regions', type: 'array', description: 'Regions', example: '["US"]' },
    ],
    callsPerDay: 478,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-03-15T14:00:00Z',
    updatedBy: 'Alex Chen',
    deployedAt: '2026-03-15T14:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 4, deployedAt: '2026-03-15T14:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-007',
    name: 'scoring — openai',
    purpose: 'scoring',
    vendor: 'openai',
    status: 'active',
    version: 16,
    content: `You are a competitive intelligence scoring expert...`,
    variables: [
      { name: 'item_content', type: 'string', description: 'The intelligence item', example: 'Acme announces...' },
      { name: 'competitor_context', type: 'object', description: 'Context about the competitor', example: '{}' },
    ],
    callsPerDay: 8934,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2026-05-01T08:00:00Z',
    updatedBy: 'Morgan Lee',
    deployedAt: '2026-05-01T08:00:00Z',
    deployedBy: 'Morgan Lee',
    deploymentHistory: [
      { version: 16, deployedAt: '2026-05-01T08:00:00Z', deployedBy: 'Morgan Lee', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-008',
    name: 'embedding — openai',
    purpose: 'embedding',
    vendor: 'openai',
    status: 'active',
    version: 3,
    content: `[Embedding model configuration - text-embedding-3-small]`,
    variables: [
      { name: 'text', type: 'string', description: 'Text to embed', example: 'Sample text...' },
    ],
    callsPerDay: 24567,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
    updatedBy: 'Alex Chen',
    deployedAt: '2026-01-10T00:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 3, deployedAt: '2026-01-10T00:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-009',
    name: 'brief_drafting — openai',
    purpose: 'brief_drafting',
    vendor: 'openai',
    status: 'active',
    version: 7,
    content: `You are a competitive intelligence brief writer...`,
    variables: [
      { name: 'items', type: 'array', description: 'Intelligence items to summarize', example: '[]' },
      { name: 'audience', type: 'string', description: 'Target audience', example: 'leadership' },
    ],
    callsPerDay: 156,
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
    updatedBy: 'Jordan Martinez',
    deployedAt: '2026-04-20T10:00:00Z',
    deployedBy: 'Jordan Martinez',
    deploymentHistory: [
      { version: 7, deployedAt: '2026-04-20T10:00:00Z', deployedBy: 'Jordan Martinez', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-010',
    name: 'brief_drafting — anthropic',
    purpose: 'brief_drafting',
    vendor: 'anthropic',
    status: 'draft',
    version: 1,
    draftVersion: 2,
    content: `You are a competitive intelligence brief writer (Anthropic version)...`,
    draftContent: `You are a competitive intelligence brief writer. Use Claude's strengths for nuanced analysis...`,
    draftNote: 'Testing Anthropic for brief drafting - may have better tone for exec summaries',
    variables: [
      { name: 'items', type: 'array', description: 'Intelligence items', example: '[]' },
      { name: 'audience', type: 'string', description: 'Audience', example: 'leadership' },
    ],
    callsPerDay: 0,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-03T16:00:00Z',
    updatedBy: 'Morgan Lee',
    deployedAt: null,
    deployedBy: null,
    deploymentHistory: [],
  },
  {
    id: 'tmpl-011',
    name: 'battle_card_interview — openai',
    purpose: 'battle_card_interview',
    vendor: 'openai',
    status: 'active',
    version: 5,
    content: `You are helping a product marketer fill out a competitive battle card...`,
    variables: [
      { name: 'competitor', type: 'string', description: 'Competitor name', example: 'Acme Logistics' },
      { name: 'section', type: 'string', description: 'Battle card section', example: 'why_we_win' },
      { name: 'context', type: 'object', description: 'Recent intel context', example: '{}' },
    ],
    callsPerDay: 89,
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2026-04-05T14:00:00Z',
    updatedBy: 'Alex Chen',
    deployedAt: '2026-04-05T14:00:00Z',
    deployedBy: 'Alex Chen',
    deploymentHistory: [
      { version: 5, deployedAt: '2026-04-05T14:00:00Z', deployedBy: 'Alex Chen', trafficPercent: 100 },
    ],
  },
  {
    id: 'tmpl-012',
    name: 'sweep_sell — anthropic',
    purpose: 'sweep_sell',
    vendor: 'anthropic',
    status: 'archived',
    version: 3,
    content: `[Archived] You are a sell-side analyst...`,
    variables: [],
    callsPerDay: 0,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    updatedBy: 'Morgan Lee',
    deployedAt: '2025-06-01T00:00:00Z',
    deployedBy: 'Morgan Lee',
    deploymentHistory: [],
  },
]

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

export default function PromptsPage() {
  const [selectedTemplate, setSelectedTemplate] = React.useState<PromptTemplate | null>(mockTemplates[0])
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
  const filteredTemplates = mockTemplates.filter(t => {
    if (filterPurpose !== 'all' && t.purpose !== filterPurpose) return false
    if (filterVendor !== 'all' && t.vendor !== filterVendor) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  const handleRunTest = () => {
    setIsRunningTest(true)
    // Simulate API call
    setTimeout(() => {
      setTestResult(JSON.stringify({
        items: [
          {
            title: "Acme Logistics announces partnership with Walmart",
            source_url: "https://freightwaves.com/news/acme-walmart",
            published_date: "2026-05-02",
            competitors: ["Acme Logistics"],
            summary: "Acme Logistics has signed a 3-year preferred carrier agreement with Walmart...",
            confidence: "high"
          }
        ]
      }, null, 2))
      setIsRunningTest(false)
    }, 2000)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0">
      {/* Left Pane - Template List */}
      <div className="w-[380px] shrink-0 border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">Prompt Templates</h1>
            <Button size="sm" className="h-8">
              <Plus className="mr-1 size-3" />
              New version
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
                    <Button variant="outline" size="sm">
                      <Save className="mr-1 size-3" />
                      Save Draft
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
            <Button onClick={() => setDeployOpen(false)}>
              <Rocket className="mr-2 size-4" />
              Deploy to 100%
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
              disabled={!rollbackReason.trim()}
              onClick={() => {
                setRollbackOpen(false)
                setRollbackReason('')
              }}
            >
              <RotateCcw className="mr-2 size-4" />
              Roll back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
