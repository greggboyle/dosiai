'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import {
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  History,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import type { AIPurposeConfig, AIRoutingRule, AIVendor, AIPurpose } from '@/lib/admin-types'
import type { AiRoutingDbRow } from '@/lib/admin/map-ai-routing-db'
import { mergeDbIntoConfigs, serializeRulesForDb } from '@/lib/admin/map-ai-routing-db'
import { updateAiRoutingConfig } from '@/app/admin/actions/platform'
import { toast } from 'sonner'

// Vendor display info
const vendorInfo: Record<AIVendor, { name: string; color: string; logo: string }> = {
  openai: { name: 'OpenAI', color: 'bg-green-100 text-green-800 border-green-200', logo: 'O' },
  anthropic: { name: 'Anthropic', color: 'bg-orange-100 text-orange-800 border-orange-200', logo: 'A' },
  xai: { name: 'xAI', color: 'bg-blue-100 text-blue-800 border-blue-200', logo: 'X' },
}

// Model options per vendor
const modelOptions: Record<AIVendor, string[]> = {
  openai: ['gpt-4o', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4-turbo', 'text-embedding-3-small', 'text-embedding-3-large'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-5', 'claude-haiku-3-5'],
  xai: ['grok-4', 'grok-3-mini'],
}

/** `prompt_template.purpose` values for per-kind brief copy — not used for `ai_routing_config` (see `brief_drafting_all`). */
const BRIEF_PROMPT_ONLY_PURPOSES: readonly AIPurpose[] = [
  'brief_drafting_manual',
  'brief_drafting_sweep_summary',
  'brief_drafting_daily_summary',
  'brief_drafting_weekly_intelligence',
  'brief_drafting_regulatory_summary',
  'brief_drafting_competitor',
]

// Full labels for every `AIPurpose`; AI Routing table seed excludes `BRIEF_PROMPT_ONLY_PURPOSES` below.
const purposeInfo: Record<AIPurpose, { name: string; description: string }> = {
  sweep_buy: { name: 'sweep_buy', description: 'Buy-side intelligence sweeps' },
  sweep_sell: { name: 'sweep_sell', description: 'Sell-side intelligence sweeps' },
  sweep_channel: { name: 'sweep_channel', description: 'Channel intelligence sweeps' },
  sweep_regulatory: { name: 'sweep_regulatory', description: 'Regulatory intelligence sweeps' },
  sweep_umbrella: {
    name: 'sweep_umbrella',
    description: 'Umbrella market sweep (buy/sell/channel/regulatory in one pass — default for scheduled & manual runs)',
  },
  sweep_self: { name: 'sweep_self', description: 'Own-company intelligence sweeps' },
  sweep_topic: { name: 'sweep_topic', description: 'Topic-focused sweep pass' },
  competitor_profile_refresh: {
    name: 'competitor_profile_refresh',
    description: 'Competitor profile refresh (summary, products, leadership)',
  },
  scoring: { name: 'scoring', description: 'MIS scoring (LLM-assisted explanation generation)' },
  embedding: { name: 'embedding', description: 'Embedding model (proximity, dedup, competitor matching)' },
  brief_drafting_all: {
    name: 'brief_drafting_all',
    description:
      'Vendor/model for all brief kinds. Per-kind briefing copy is configured under Prompts (`brief_drafting_*` templates).',
  },
  brief_drafting_manual: { name: 'brief_drafting_manual', description: 'Prompt for manual team brief drafting' },
  brief_drafting_sweep_summary: {
    name: 'brief_drafting_sweep_summary',
    description: 'Prompt for sweep summary brief drafting',
  },
  brief_drafting_daily_summary: {
    name: 'brief_drafting_daily_summary',
    description: 'Prompt for daily summary brief drafting',
  },
  brief_drafting_weekly_intelligence: {
    name: 'brief_drafting_weekly_intelligence',
    description: 'Prompt for weekly intelligence brief drafting',
  },
  brief_drafting_regulatory_summary: {
    name: 'brief_drafting_regulatory_summary',
    description: 'Prompt for regulatory summary brief drafting',
  },
  brief_drafting_competitor: {
    name: 'brief_drafting_competitor',
    description: 'Prompt for competitor brief drafting',
  },
  battle_card_interview: { name: 'battle_card_interview', description: 'Battle card interview-driven build' },
  battle_card_draft: { name: 'battle_card_draft', description: 'AI draft generation for full battle cards' },
}

const basePurposeConfigs: AIPurposeConfig[] = (Object.entries(purposeInfo) as Array<
  [AIPurpose, { name: string; description: string }]
>)
  .filter(([purpose]) => !BRIEF_PROMPT_ONLY_PURPOSES.includes(purpose))
  .map(([purpose, info]) => ({
    purpose,
    name: info.name,
    description: info.description,
    mode: 'single-vendor',
    rules: [],
  }))

function formatDaysAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

interface AiRoutingClientProps {
  initialConfigs: AiRoutingDbRow[]
  initialAuditRows: Array<{
    timestamp: string
    operator_role: string
    action: string
    reason: string | null
    target_name: string
  }>
}

export function AiRoutingClient({ initialConfigs, initialAuditRows }: AiRoutingClientProps) {
  const [purposeConfigs, setPurposeConfigs] = React.useState<AIPurposeConfig[]>(() =>
    mergeDbIntoConfigs(basePurposeConfigs, initialConfigs)
  )
  const [savingDb, setSavingDb] = React.useState(false)

  const persistAllToDatabase = async () => {
    setSavingDb(true)
    try {
      for (const cfg of purposeConfigs) {
        await updateAiRoutingConfig({
          purpose: cfg.purpose,
          mode: cfg.mode,
          rules: serializeRulesForDb(cfg.rules),
        })
      }
      toast.success('AI routing saved to database')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      toast.error(msg)
    } finally {
      setSavingDb(false)
    }
  }
  const [expandedPurposes, setExpandedPurposes] = React.useState<Set<AIPurpose>>(new Set(basePurposeConfigs.map(c => c.purpose)))
  const [editingRule, setEditingRule] = React.useState<{ purpose: AIPurpose; rule: AIRoutingRule } | null>(null)
  const [editDraft, setEditDraft] = React.useState<{
    costPer1MTokens: string
    avgLatencyMs: string
    citationRate: string
    factualGroundingScore: string
    notes: string
  }>({
    costPer1MTokens: '',
    avgLatencyMs: '',
    citationRate: '',
    factualGroundingScore: '',
    notes: '',
  })
  const [changeReason, setChangeReason] = React.useState('')
  const [addVendorOpen, setAddVendorOpen] = React.useState<AIPurpose | null>(null)
  const [newVendor, setNewVendor] = React.useState<AIVendor>('openai')
  const [newModel, setNewModel] = React.useState('')
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => {
    if (!editingRule) return
    setEditDraft({
      costPer1MTokens: String(editingRule.rule.costPer1MTokens),
      avgLatencyMs: String(editingRule.rule.avgLatencyMs),
      citationRate: String(editingRule.rule.citationRate),
      factualGroundingScore: String(editingRule.rule.factualGroundingScore),
      notes: editingRule.rule.notes,
    })
  }, [editingRule])

  const togglePurpose = (purpose: AIPurpose) => {
    setExpandedPurposes(prev => {
      const next = new Set(prev)
      if (next.has(purpose)) {
        next.delete(purpose)
      } else {
        next.add(purpose)
      }
      return next
    })
  }

  const handleRefreshHealth = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  const handleModeToggle = (purpose: AIPurpose, mode: 'single-vendor' | 'multi-vendor') => {
    setPurposeConfigs(prev => prev.map(c => 
      c.purpose === purpose ? { ...c, mode } : c
    ))
  }

  const handlePrimaryChange = (purpose: AIPurpose, ruleId: string) => {
    setPurposeConfigs(prev => prev.map(c => {
      if (c.purpose !== purpose) return c
      return {
        ...c,
        rules: c.rules.map(r => ({ ...r, isPrimary: r.id === ruleId }))
      }
    }))
  }

  const handleEnabledToggle = (purpose: AIPurpose, ruleId: string) => {
    setPurposeConfigs(prev => prev.map(c => {
      if (c.purpose !== purpose) return c
      return {
        ...c,
        rules: c.rules.map(r => r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r)
      }
    }))
  }

  const handleAddVendor = () => {
    if (!addVendorOpen || !newModel || !changeReason.trim()) return

    setPurposeConfigs((prev) =>
      prev.map((c) => {
        if (c.purpose !== addVendorOpen) return c

        const exists = c.rules.some((r) => r.vendor === newVendor && r.model === newModel)
        if (exists) return c

        const nowIso = new Date().toISOString()
        const newRule: AIRoutingRule = {
          id: `${addVendorOpen}-${newVendor}-${newModel}-${crypto.randomUUID().slice(0, 8)}`,
          vendor: newVendor,
          model: newModel,
          purpose: addVendorOpen,
          isPrimary: c.rules.length === 0,
          isEnabled: true,
          costPer1MTokens: 0,
          avgLatencyMs: 0,
          citationRate: 0,
          factualGroundingScore: 0,
          notes: changeReason.trim(),
          lastChangedAt: nowIso,
          lastChangedBy: 'operator',
        }

        return {
          ...c,
          mode: c.rules.length > 0 ? 'multi-vendor' : c.mode,
          rules: [...c.rules, newRule],
        }
      })
    )

    toast.success('Vendor added. Click "Save to database" to persist this change.')
    setAddVendorOpen(null)
    setChangeReason('')
    setNewModel('')
  }

  const handleDeleteVendor = (purpose: AIPurpose, ruleId: string) => {
    setPurposeConfigs((prev) =>
      prev.map((cfg) => {
        if (cfg.purpose !== purpose) return cfg
        if (cfg.rules.length <= 1) {
          toast.error('At least one vendor must remain for each purpose.')
          return cfg
        }

        const target = cfg.rules.find((r) => r.id === ruleId)
        if (!target) return cfg

        const remaining = cfg.rules.filter((r) => r.id !== ruleId)
        if (target.isPrimary && remaining.length > 0 && !remaining.some((r) => r.isPrimary)) {
          remaining[0] = { ...remaining[0], isPrimary: true }
        }

        return {
          ...cfg,
          rules: remaining,
        }
      })
    )
    toast.success('Vendor removed. Click "Save to database" to persist this change.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">AI Vendor Routing</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
            Configure which AI vendor and model is used for each purpose. Changes take effect on the next sweep, except embedding model changes (trigger re-embed migration).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => void persistAllToDatabase()} disabled={savingDb}>
            <RefreshCw className={cn('mr-2 size-4', savingDb && 'animate-spin')} />
            {savingDb ? 'Saving…' : 'Save to database'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshHealth} disabled={refreshing}>
            <RefreshCw className={cn('mr-2 size-4', refreshing && 'animate-spin')} />
            Refresh vendor health
          </Button>
        </div>
      </div>

      {/* Routing rules by purpose */}
      <div className="space-y-4">
        {purposeConfigs.map((config) => (
          <div key={config.purpose} className="rounded-lg border border-border bg-card">
            {/* Purpose header */}
            <Collapsible open={expandedPurposes.has(config.purpose)} onOpenChange={() => togglePurpose(config.purpose)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {expandedPurposes.has(config.purpose) ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-medium text-foreground">{config.name}</span>
                        {config.mode === 'multi-vendor' && (
                          <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                            Multi-vendor
                          </Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span>{config.rules.length} vendor{config.rules.length > 1 ? 's' : ''}</span>
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border">
                  {/* Embedding warning */}
                  {config.purpose === 'embedding' && (
                    <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[12px] text-amber-800">
                        <strong>Warning:</strong> Changing the embedding model triggers a corpus-wide re-embed migration. 
                        Sweeps continue during migration; affected workspaces see a &quot;recalibrating&quot; banner. 
                        Estimated migration time at current data volume: <strong>4-6 hours</strong>.
                      </div>
                    </div>
                  )}

                  {/* Mode toggle */}
                  <div className="px-4 py-3 flex items-center gap-4 border-b border-border">
                    <span className="text-[12px] font-medium text-muted-foreground">Mode:</span>
                    <RadioGroup 
                      value={config.mode} 
                      onValueChange={(v) => handleModeToggle(config.purpose, v as 'single-vendor' | 'multi-vendor')}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="single-vendor" id={`${config.purpose}-single`} className="size-3.5" />
                        <Label htmlFor={`${config.purpose}-single`} className="text-[12px] text-foreground cursor-pointer">
                          Single-vendor
                        </Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="multi-vendor" id={`${config.purpose}-multi`} className="size-3.5" />
                        <Label htmlFor={`${config.purpose}-multi`} className="text-[12px] text-foreground cursor-pointer">
                          Multi-vendor (triangulation)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Rules table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] w-[100px]">Vendor</TableHead>
                        <TableHead className="text-[11px] w-[180px]">Model</TableHead>
                        <TableHead className="text-[11px] w-[70px] text-center">Primary</TableHead>
                        <TableHead className="text-[11px] w-[70px] text-center">Enabled</TableHead>
                        <TableHead className="text-[11px] w-[90px] text-right">Cost/1M</TableHead>
                        <TableHead className="text-[11px] w-[90px] text-right">Latency</TableHead>
                        {config.purpose !== 'embedding' && (
                          <>
                            <TableHead className="text-[11px] w-[80px] text-right">Citation</TableHead>
                            <TableHead className="text-[11px] w-[80px] text-right">Grounding</TableHead>
                          </>
                        )}
                        <TableHead className="text-[11px]">Notes</TableHead>
                        <TableHead className="text-[11px] w-[120px]">Last Changed</TableHead>
                        <TableHead className="text-[11px] w-[80px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.rules.map((rule) => (
                        <TableRow 
                          key={rule.id} 
                          className={cn(
                            'cursor-pointer hover:bg-muted/50',
                            !rule.isEnabled && 'opacity-50'
                          )}
                          onClick={() => setEditingRule({ purpose: config.purpose, rule })}
                        >
                          <TableCell className="py-2">
                            <Badge variant="outline" className={cn('text-[10px] font-medium', vendorInfo[rule.vendor].color)}>
                              <span className="mr-1 font-bold">{vendorInfo[rule.vendor].logo}</span>
                              {vendorInfo[rule.vendor].name}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Select 
                              value={rule.model} 
                              onValueChange={(v) => {
                                // Prevent row click from triggering
                                setPurposeConfigs(prev => prev.map(c => {
                                  if (c.purpose !== config.purpose) return c
                                  return {
                                    ...c,
                                    rules: c.rules.map(r => r.id === rule.id ? { ...r, model: v } : r)
                                  }
                                }))
                              }}
                            >
                              <SelectTrigger 
                                className="h-7 text-[11px] font-mono w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {modelOptions[rule.vendor].map((m) => (
                                  <SelectItem key={m} value={m} className="text-[11px] font-mono">{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="radio"
                              name={`primary-${config.purpose}`}
                              checked={rule.isPrimary}
                              onChange={() => handlePrimaryChange(config.purpose, rule.id)}
                              className="size-3.5 text-primary"
                              disabled={config.mode === 'single-vendor' && config.rules.length === 1}
                            />
                          </TableCell>
                          <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <Switch 
                              checked={rule.isEnabled} 
                              onCheckedChange={() => handleEnabledToggle(config.purpose, rule.id)}
                              className="scale-75"
                            />
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-[11px] text-muted-foreground">
                            ${rule.costPer1MTokens.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-[11px] text-muted-foreground">
                            {rule.avgLatencyMs.toLocaleString()}ms
                          </TableCell>
                          {config.purpose !== 'embedding' && (
                            <>
                              <TableCell className="py-2 text-right font-mono text-[11px] text-muted-foreground">
                                {rule.citationRate}%
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono text-[11px] text-muted-foreground">
                                {rule.factualGroundingScore}%
                              </TableCell>
                            </>
                          )}
                          <TableCell className="py-2 text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {rule.notes || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="py-2 text-[11px] text-muted-foreground">
                            <div>{formatDaysAgo(rule.lastChangedAt)}</div>
                            <div className="text-[10px]">by {rule.lastChangedBy}</div>
                          </TableCell>
                          <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] text-destructive hover:text-destructive"
                              onClick={() => {
                                const okay = window.confirm(
                                  `Remove ${vendorInfo[rule.vendor].name} (${rule.model}) from ${config.name}?`
                                )
                                if (!okay) return
                                handleDeleteVendor(config.purpose, rule.id)
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Actions row */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[11px]"
                      onClick={() => setAddVendorOpen(config.purpose)}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add vendor to this purpose
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" asChild>
                      <Link href="/admin/audit-log?category=ai_routing">
                      <History className="mr-1.5 size-3.5" />
                      View audit log
                      </Link>
                    </Button>
                  </div>

                  {/* Recent changes preview */}
                  <div className="px-4 py-3 bg-muted/30 border-t border-border">
                    <div className="text-[11px] font-medium text-muted-foreground mb-2">Recent changes</div>
                    <div className="space-y-1">
                      {initialAuditRows
                        .filter((e) => (e.target_name ?? '').toLowerCase().includes(config.purpose))
                        .slice(0, 3)
                        .map((entry, i) => (
                          <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground/70">{new Date(entry.timestamp).toLocaleString()}</span>
                            <span>{entry.operator_role}</span>
                            <span className="text-muted-foreground/50">—</span>
                            <span className="truncate">{entry.reason || entry.action}</span>
                          </div>
                        ))}
                      {initialAuditRows.filter((e) => (e.target_name ?? '').toLowerCase().includes(config.purpose)).length === 0 && (
                        <div className="text-[11px] text-muted-foreground/50">No recent changes</div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>

      {/* Global audit log preview */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-foreground">Recent Routing Changes</h2>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" asChild>
            <Link href="/admin/audit-log?category=ai_routing">
            <ExternalLink className="mr-1.5 size-3.5" />
            Full audit log
            </Link>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] w-[140px]">Timestamp</TableHead>
              <TableHead className="text-[11px] w-[100px]">Operator</TableHead>
              <TableHead className="text-[11px] w-[120px]">Action</TableHead>
              <TableHead className="text-[11px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialAuditRows.map((entry, i) => (
              <TableRow key={i}>
                <TableCell className="py-2 text-[11px] font-mono text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</TableCell>
                <TableCell className="py-2 text-[11px] text-foreground">{entry.operator_role}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-[10px] font-mono">{entry.action}</Badge>
                </TableCell>
                <TableCell className="py-2 text-[11px] text-muted-foreground">{entry.reason || entry.target_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit rule dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Edit Routing Rule</DialogTitle>
            <DialogDescription className="text-[12px]">
              Modify the configuration for this vendor. Changes require a reason for audit.
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn('text-[11px]', vendorInfo[editingRule.rule.vendor].color)}>
                  {vendorInfo[editingRule.rule.vendor].name}
                </Badge>
                <span className="font-mono text-[13px]">{editingRule.rule.model}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[11px]">Cost per 1M tokens</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={editDraft.costPer1MTokens}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, costPer1MTokens: e.target.value }))}
                    className="mt-1 h-8 text-[12px] font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Avg latency (ms)</Label>
                  <Input 
                    type="number" 
                    value={editDraft.avgLatencyMs}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, avgLatencyMs: e.target.value }))}
                    className="mt-1 h-8 text-[12px] font-mono"
                  />
                </div>
              </div>

              {editingRule.purpose !== 'embedding' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[11px]">Citation rate (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={editDraft.citationRate}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, citationRate: e.target.value }))}
                      className="mt-1 h-8 text-[12px] font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Factual grounding (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={editDraft.factualGroundingScore}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, factualGroundingScore: e.target.value }))}
                      className="mt-1 h-8 text-[12px] font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-[11px]">Notes</Label>
                <Input 
                  value={editDraft.notes}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., switched from gpt-4-turbo on 2026-04-15 — better citations"
                  className="mt-1 h-8 text-[12px]"
                />
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-[11px]">
                  Reason for change <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Explain why you're making this change..."
                  className="mt-1 text-[12px]"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingRule(null)
                setChangeReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!changeReason.trim()}
              onClick={() => {
                if (!editingRule) return
                setPurposeConfigs((prev) =>
                  prev.map((cfg) => {
                    if (cfg.purpose !== editingRule.purpose) return cfg
                    return {
                      ...cfg,
                      rules: cfg.rules.map((r) =>
                        r.id === editingRule.rule.id
                          ? {
                              ...r,
                              costPer1MTokens: Number(editDraft.costPer1MTokens || 0),
                              avgLatencyMs: Number(editDraft.avgLatencyMs || 0),
                              citationRate: Number(editDraft.citationRate || 0),
                              factualGroundingScore: Number(editDraft.factualGroundingScore || 0),
                              notes: editDraft.notes,
                              lastChangedAt: new Date().toISOString(),
                              lastChangedBy: 'operator',
                            }
                          : r
                      ),
                    }
                  })
                )
                toast.success('Rule updated in-memory. Click "Save to database" to persist.')
                setEditingRule(null)
                setChangeReason('')
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add vendor sheet */}
      <Sheet open={!!addVendorOpen} onOpenChange={(open) => !open && setAddVendorOpen(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-[15px]">Add Vendor</SheetTitle>
            <SheetDescription className="text-[12px]">
              Enable a new vendor for <span className="font-mono">{addVendorOpen}</span>. This will switch the purpose to multi-vendor mode.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div>
              <Label className="text-[11px]">Vendor</Label>
              <Select value={newVendor} onValueChange={(v) => setNewVendor(v as AIVendor)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['openai', 'anthropic', 'xai'] as AIVendor[]).map((v) => (
                    <SelectItem key={v} value={v}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-[10px]', vendorInfo[v].color)}>
                          {vendorInfo[v].logo}
                        </Badge>
                        {vendorInfo[v].name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px]">Model</Label>
              <Select value={newModel} onValueChange={setNewModel}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions[newVendor].map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-[12px]">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-[11px]">
                Reason for change <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Explain why you're adding this vendor..."
                className="mt-1 text-[12px]"
                rows={2}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddVendorOpen(null)}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={!newModel || !changeReason.trim()}>Add vendor</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
