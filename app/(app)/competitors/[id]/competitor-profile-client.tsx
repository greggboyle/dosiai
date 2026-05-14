'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ExternalLink,
  RefreshCw,
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ChevronRight,
  Plus,
  Edit2,
  Linkedin,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Building2,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Briefcase,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { MISBadge } from '@/components/mis-badge'
import type { Competitor, IntelligenceItem, Category } from '@/lib/types'
import { formatIntelEventDate, getCategoryInfo, getRelativeTime } from '@/lib/types'
import type { CompetitorBattleCardRow, CompetitorBriefRow } from '@/lib/competitors/load-profile'
import type { CompetitorHiringRollup, CompetitorJobPosting } from '@/lib/competitors/job-posting-types'
import type { WinLossRow } from '@/lib/win-loss/queries'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { getCompetitorProfileRefreshPolicy } from '@/lib/competitors/profile-refresh'
import {
  requestCompetitorProfileRefresh,
  updateCompetitorCompanySummary,
  updateCompetitorIdentity,
  updateCompetitorLeadership,
  updateCompetitorProducts,
  updateCompetitorSegments,
  updateCompetitorStrengthsWeaknesses,
} from '@/lib/competitors/actions'
import { requestCompetitorDossierBrief, getBriefDraftGenerationStatus } from '@/lib/brief/actions'
import { toast } from 'sonner'

const tierLabels: Record<string, string> = {
  primary_direct: 'Primary Direct',
  secondary_indirect: 'Secondary Indirect',
  emerging: 'Emerging',
  adjacent: 'Adjacent',
  watching: 'Watching',
}

const tierColors: Record<string, string> = {
  primary_direct: 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  secondary_indirect: 'bg-mis-high/15 text-mis-high border-mis-high/30',
  emerging: 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
  adjacent: 'bg-mis-low/15 text-mis-low border-mis-low/30',
  watching: 'bg-mis-low/15 text-mis-low border-mis-low/30',
}

export interface CompetitorProfileClientProps {
  workspacePlan: WorkspacePlan
  workspaceId: string
  competitor: Competitor
  activityItems: IntelligenceItem[]
  voiceItems: IntelligenceItem[]
  jobPostings: CompetitorJobPosting[]
  hiringRollup: CompetitorHiringRollup
  battleCards: CompetitorBattleCardRow[]
  linkedBriefs: CompetitorBriefRow[]
  winLossRows: WinLossRow[]
}

// AI-drafted indicator component
function AIDraftedIndicator({ confirmed, onConfirm }: { confirmed: boolean; onConfirm?: () => void }) {
  if (confirmed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-[10px] text-positive">
            <Check className="size-3" />
            Confirmed
          </span>
        </TooltipTrigger>
        <TooltipContent>Human-confirmed information</TooltipContent>
      </Tooltip>
    )
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="size-3" />
          AI-drafted
        </button>
      </TooltipTrigger>
      <TooltipContent>Click to confirm this information</TooltipContent>
    </Tooltip>
  )
}

// Sentiment bar component
function SentimentBar({ positive, mixed, negative }: { positive: number; mixed: number; negative: number }) {
  const total = positive + mixed + negative
  if (total === 0) return null
  
  const posPercent = (positive / total) * 100
  const mixedPercent = (mixed / total) * 100
  const negPercent = (negative / total) * 100
  
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="bg-positive" style={{ width: `${posPercent}%` }} />
      <div className="bg-amber-500" style={{ width: `${mixedPercent}%` }} />
      <div className="bg-negative" style={{ width: `${negPercent}%` }} />
    </div>
  )
}

/** `payload.date_posted` from listings (ISO date); hiring sweep may omit. */
function formatJobPostedDate(datePosted: string | null | undefined): string {
  const raw = datePosted?.trim()
  if (!raw) return '—'
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return raw
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function CompetitorProfileClient({
  workspacePlan,
  workspaceId,
  competitor,
  activityItems,
  voiceItems,
  jobPostings,
  hiringRollup,
  battleCards,
  linkedBriefs,
  winLossRows,
}: CompetitorProfileClientProps) {
  const [activeTab, setActiveTab] = React.useState('overview')
  const [refreshingProfile, setRefreshingProfile] = React.useState(false)
  const [confirmedFields, setConfirmedFields] = React.useState<Set<string>>(new Set())
  const [activityFilter, setActivityFilter] = React.useState<Category | 'all'>('all')
  const [voiceSentimentFilter, setVoiceSentimentFilter] = React.useState<'all' | 'positive' | 'mixed' | 'negative'>('all')
  const [jobStatusFilter, setJobStatusFilter] = React.useState<'all' | 'open' | 'closed' | 'unknown'>('all')
  const [jobWorkplaceFilter, setJobWorkplaceFilter] = React.useState<'all' | 'remote' | 'hybrid' | 'onsite'>('all')
  const [jobThreatFilter, setJobThreatFilter] = React.useState<'all' | 'high' | 'watchlist'>('all')
  const [notesContent, setNotesContent] = React.useState('## Analyst Notes\n\n- Key observation: Their Series D gives them significant runway\n- Watch for: European expansion announcement expected Q3\n- Action item: Update battle card with new pricing intelligence')

  // ---- Editable Overview (Name/URL, Summary, Strengths/Weaknesses, Products, Leadership, Segments) ----
  const [identityEditing, setIdentityEditing] = React.useState(false)
  const [identityDraftName, setIdentityDraftName] = React.useState(competitor.name)
  const [identityDraftWebsite, setIdentityDraftWebsite] = React.useState(competitor.website ?? '')

  const [summaryEditing, setSummaryEditing] = React.useState(false)
  const [draftPositioning, setDraftPositioning] = React.useState(competitor.positioning ?? '')
  const [draftIcp, setDraftIcp] = React.useState(competitor.icp ?? '')
  const [draftPricingModel, setDraftPricingModel] = React.useState(competitor.pricingModel ?? 'unknown')
  const [draftPricingNotes, setDraftPricingNotes] = React.useState(competitor.pricingNotes ?? '')
  const [draftFounded, setDraftFounded] = React.useState(competitor.founded ? String(competitor.founded) : '')
  const [draftHq, setDraftHq] = React.useState(competitor.hq ?? '')
  const [draftEmployeeEstimate, setDraftEmployeeEstimate] = React.useState(
    competitor.employeeEstimate ? String(competitor.employeeEstimate) : ''
  )
  const [draftFundingStatus, setDraftFundingStatus] = React.useState(competitor.fundingStatus ?? '')

  const [strengthsEditing, setStrengthsEditing] = React.useState(false)
  const [draftStrengthsText, setDraftStrengthsText] = React.useState((competitor.strengths ?? []).join('\n'))
  const [draftWeaknessesText, setDraftWeaknessesText] = React.useState((competitor.weaknesses ?? []).join('\n'))

  const [productsEditing, setProductsEditing] = React.useState(false)
  const [draftProducts, setDraftProducts] = React.useState(competitor.products ?? [])

  const [leadershipEditing, setLeadershipEditing] = React.useState(false)
  const [draftLeadership, setDraftLeadership] = React.useState(competitor.leadership ?? [])

  const [segmentsEditing, setSegmentsEditing] = React.useState(false)
  const [draftSegmentsText, setDraftSegmentsText] = React.useState((competitor.segments ?? []).join(', '))

  // Keep drafts in sync when the underlying competitor changes (e.g. after Save redirects).
  React.useEffect(() => {
    if (!identityEditing) {
      setIdentityDraftName(competitor.name)
      setIdentityDraftWebsite(competitor.website ?? '')
    }
    if (!summaryEditing) {
      setDraftPositioning(competitor.positioning ?? '')
      setDraftIcp(competitor.icp ?? '')
      setDraftPricingModel(competitor.pricingModel ?? 'unknown')
      setDraftPricingNotes(competitor.pricingNotes ?? '')
      setDraftFounded(competitor.founded ? String(competitor.founded) : '')
      setDraftHq(competitor.hq ?? '')
      setDraftEmployeeEstimate(competitor.employeeEstimate ? String(competitor.employeeEstimate) : '')
      setDraftFundingStatus(competitor.fundingStatus ?? '')
    }
    if (!strengthsEditing) {
      setDraftStrengthsText((competitor.strengths ?? []).join('\n'))
      setDraftWeaknessesText((competitor.weaknesses ?? []).join('\n'))
    }
    if (!productsEditing) setDraftProducts(competitor.products ?? [])
    if (!leadershipEditing) setDraftLeadership(competitor.leadership ?? [])
    if (!segmentsEditing) setDraftSegmentsText((competitor.segments ?? []).join(', '))
  }, [
    competitor,
    identityEditing,
    summaryEditing,
    strengthsEditing,
    productsEditing,
    leadershipEditing,
    segmentsEditing,
  ])

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [dossierRequesting, setDossierRequesting] = React.useState(false)
  const [dossierGen, setDossierGen] = React.useState<
    { phase: 'idle' } | { phase: 'polling'; briefId: string } | { phase: 'ready'; briefId: string } | { phase: 'stalled'; briefId: string }
  >({ phase: 'idle' })

  const handleRequestDossier = React.useCallback(async () => {
    setDossierRequesting(true)
    try {
      const res = await requestCompetitorDossierBrief(competitor.id)
      if (res.ok) {
        toast.success('Dossier draft started. You can keep browsing this page — we will show when it is ready.')
        setDossierGen({ phase: 'polling', briefId: res.briefId })
      } else {
        toast.error(res.message ?? 'Could not start dossier brief.')
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setDossierRequesting(false)
    }
  }, [competitor.id])

  const pollingBriefId = dossierGen.phase === 'polling' ? dossierGen.briefId : null

  React.useEffect(() => {
    if (!pollingBriefId) return
    const briefId = pollingBriefId
    let cancelled = false
    let attempts = 0
    const maxAttempts = 48

    const poll = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const s = await getBriefDraftGenerationStatus(briefId)
        if (cancelled) return
        if (s.ok && s.aiDrafted) {
          setDossierGen({ phase: 'ready', briefId })
          toast.success('Dossier brief is published. Check My Briefs or open it below.')
          return
        }
        if (!s.ok || attempts >= maxAttempts) {
          setDossierGen({ phase: 'stalled', briefId })
        }
      } catch {
        if (!cancelled) setDossierGen({ phase: 'stalled', briefId })
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), 2500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pollingBriefId])

  React.useEffect(() => {
    const saved = searchParams.get('saved')
    if (!saved) return

    const messages: Record<string, string> = {
      identity: 'Identity saved',
      summary: 'Company summary saved',
      strengths: 'Strengths & weaknesses saved',
      products: 'Products saved',
      leadership: 'Leadership saved',
      segments: 'Segments saved',
    }

    toast.success(messages[saved] ?? 'Saved')

    const next = new URLSearchParams(searchParams.toString())
    next.delete('saved')
    const nextUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [searchParams, pathname, router])

  const refreshPolicy = React.useMemo(
    () =>
      getCompetitorProfileRefreshPolicy({
        plan: workspacePlan,
        lastProfileRefreshAt: competitor.lastProfileRefreshAt ?? null,
      }),
    [workspacePlan, competitor.lastProfileRefreshAt]
  )
  const refreshStatusText = React.useMemo(() => {
    if (refreshPolicy.allowed) {
      if (workspacePlan === 'enterprise') return 'Refresh available anytime on Enterprise.'
      return 'Refresh available now.'
    }
    if (refreshPolicy.nextAllowedAt) {
      return `Refresh available again: ${new Date(refreshPolicy.nextAllowedAt).toLocaleString()}.`
    }
    return refreshPolicy.reason ?? 'Refresh unavailable.'
  }, [refreshPolicy, workspacePlan])
  
  const confirmField = (field: string) => {
    setConfirmedFields(prev => new Set([...prev, field]))
  }
  
  const filteredActivity = activityItems.filter(item => 
    activityFilter === 'all' || item.category === activityFilter
  )
  
  const filteredVoice = voiceItems.filter((item) => {
    if (voiceSentimentFilter === 'all') return true
    // Map item to sentiment based on MIS score
    if (voiceSentimentFilter === 'positive') return item.mis.value >= 60
    if (voiceSentimentFilter === 'negative') return item.mis.value < 40
    return item.mis.value >= 40 && item.mis.value < 60
  })

  const sentimentSummary = React.useMemo(() => {
    if (voiceItems.length === 0) return undefined
    let positive = 0
    let mixed = 0
    let negative = 0
    for (const i of voiceItems) {
      if (i.mis.value >= 62) positive++
      else if (i.mis.value >= 42) mixed++
      else negative++
    }
    return {
      positive,
      mixed,
      negative,
      netChange: 0,
      period: '30 days',
    }
  }, [voiceItems])

  const filteredJobPostings = React.useMemo(() => {
    return jobPostings.filter((p) => {
      if (jobStatusFilter !== 'all' && p.postingStatus !== jobStatusFilter) return false
      const wt = (p.payload.location?.workplace_type ?? 'unknown').toLowerCase()
      if (jobWorkplaceFilter !== 'all') {
        if (jobWorkplaceFilter === 'remote' && wt !== 'remote') return false
        if (jobWorkplaceFilter === 'hybrid' && wt !== 'hybrid') return false
        if (jobWorkplaceFilter === 'onsite' && wt !== 'onsite') return false
      }
      const ca = p.payload.competitive_analysis
      if (jobThreatFilter === 'high' && ca?.threat_level !== 'high') return false
      if (jobThreatFilter === 'watchlist' && !ca?.watchlist) return false
      return true
    })
  }, [jobPostings, jobStatusFilter, jobWorkplaceFilter, jobThreatFilter])

  const hiringThemeKeywords = React.useMemo(() => {
    const counts = new Map<string, number>()
    const add = (s: string) => {
      const k = s.trim()
      if (!k) return
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const p of jobPostings) {
      if (p.postingStatus !== 'open') continue
      const sm = p.payload.strategic_metadata as
        | {
            strategic_keywords?: string[]
            technologies_mentioned?: string[]
          }
        | undefined
      for (const x of sm?.strategic_keywords ?? []) add(x)
      for (const x of sm?.technologies_mentioned ?? []) add(x)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word]) => word)
  }, [jobPostings])

  const winLossSummary = React.useMemo(() => {
    if (winLossRows.length === 0) return undefined
    const won = winLossRows.filter((r) => r.outcome === 'won').length
    const lost = winLossRows.filter((r) => r.outcome === 'lost').length
    const dec = won + lost
    const winRate = dec ? Math.round((won / dec) * 100) : 0
    const winTags = new Map<string, number>()
    const lossTags = new Map<string, number>()
    for (const r of winLossRows) {
      const map = r.outcome === 'won' ? winTags : lossTags
      for (const t of r.reason_tags ?? []) {
        map.set(t, (map.get(t) ?? 0) + 1)
      }
    }
    const topFrom = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag)
    return {
      winRate,
      trend: 0,
      period: '90 days',
      topWinReasons: topFrom(winTags).length ? topFrom(winTags) : ['—'],
      topLossReasons: topFrom(lossTags).length ? topFrom(lossTags) : ['—'],
      totalOutcomes: winLossRows.length,
    }
  }, [winLossRows])

  const recentReviews = React.useMemo(() => {
    return voiceItems.slice(0, 3).map((v) => ({
      id: v.id,
      content: v.summary || v.content?.slice(0, 240) || '',
      rating: Math.min(5, Math.max(1, Math.round(v.mis.value / 20))),
      platform: v.sourceUrls?.[0]?.name ?? 'Source',
      sentiment: (v.mis.value >= 62 ? 'positive' : v.mis.value >= 42 ? 'mixed' : 'negative') as
        | 'positive'
        | 'mixed'
        | 'negative',
      date: v.eventDate ? formatIntelEventDate(v.eventDate) : getRelativeTime(v.timestamp),
    }))
  }, [voiceItems])

  const latestLinkedBrief = React.useMemo(() => linkedBriefs[0] ?? null, [linkedBriefs])

  const handleRefreshProfile = async () => {
    try {
      setRefreshingProfile(true)
      await requestCompetitorProfileRefresh(competitor.id)
      toast.success('Profile refresh queued. AI updates will appear shortly.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to queue profile refresh.'
      toast.error(msg)
    } finally {
      setRefreshingProfile(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-6 pb-0">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/competitors">Competitors</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>//</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{competitor.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Top row: Logo, name, website, actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Logo placeholder */}
              <div className="size-14 rounded-lg bg-secondary flex items-center justify-center text-2xl font-semibold text-secondary-foreground flex-shrink-0">
                {competitor.name.charAt(0)}
              </div>
              <div>
                {!identityEditing ? (
                  <>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-semibold tracking-tight">{competitor.name}</h1>
                      <MISBadge score={competitor.overallMIS} size="lg" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setIdentityEditing(true)}
                      >
                        <Edit2 className="size-3 mr-1" />
                        Edit
                      </Button>
                    </div>

                    {competitor.website ? (
                      <a
                        href={`https://${competitor.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                      >
                        {competitor.website}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </>
                ) : (
                  <form action={updateCompetitorIdentity} className="space-y-2">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="competitorId" value={competitor.id} />

                    <div className="flex items-center gap-3">
                      <Input
                        name="name"
                        value={identityDraftName}
                        onChange={(e) => setIdentityDraftName(e.target.value)}
                        className="h-9"
                      />
                      <MISBadge score={competitor.overallMIS} size="lg" />
                    </div>

                    <Input
                      name="website"
                      value={identityDraftWebsite}
                      onChange={(e) => setIdentityDraftWebsite(e.target.value)}
                      placeholder="example.com"
                    />

                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIdentityEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">
                  Last refresh: {competitor.lastProfileRefresh}
                </span>
                <span className="text-[11px] text-muted-foreground">{refreshStatusText}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefreshProfile()}
                disabled={!refreshPolicy.allowed || refreshingProfile}
                title={!refreshPolicy.allowed ? refreshPolicy.reason : undefined}
              >
                <RefreshCw className="size-4 mr-2" />
                {refreshingProfile ? 'Refreshing…' : 'Refresh Profile'}
              </Button>
            </div>
          </div>
          
          {/* Tags row */}
          <div className="flex items-center gap-2 mb-4">
            {competitor.tier && tierLabels[competitor.tier] && (
              <Badge variant="outline" className={cn('font-medium', tierColors[competitor.tier])}>
                {tierLabels[competitor.tier]}
              </Badge>
            )}
            {!segmentsEditing ? (
              <>
                {competitor.segments?.map((segment) => (
                  <Badge key={segment} variant="secondary" className="font-normal">
                    {segment}
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setSegmentsEditing(true)}
                >
                  <Edit2 className="size-3 mr-1" />
                  Edit segments
                </Button>
              </>
            ) : (
              <form action={updateCompetitorSegments} className="flex items-center gap-2">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="competitorId" value={competitor.id} />
                <Textarea
                  name="segmentsText"
                  value={draftSegmentsText}
                  onChange={(e) => setDraftSegmentsText(e.target.value)}
                  className="h-9 min-h-0 w-64 py-1 text-xs"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSegmentsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
          
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 w-full justify-start rounded-none border-b-0 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Activity
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {activityItems.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="hiring"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Hiring
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {jobPostings.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="customer-voice"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Customer Voice
              </TabsTrigger>
              <TabsTrigger
                value="battle-cards"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Battle Cards
              </TabsTrigger>
              <TabsTrigger
                value="win-loss"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Win/Loss
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {dossierGen.phase === 'polling' ? (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Loader2 className="animate-spin text-primary" aria-hidden />
            <AlertTitle>Dossier brief in progress</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              We are generating your competitor dossier brief in the background. This usually takes about a minute. You
              can stay on this page — the status updates automatically.
            </AlertDescription>
          </Alert>
        ) : null}
        {dossierGen.phase === 'ready' ? (
          <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <Check className="text-emerald-600 dark:text-emerald-400" aria-hidden />
            <AlertTitle>Dossier brief ready</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Your competitor dossier brief has been published. It appears in My Briefs for subscribers and is
                available to read here.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/briefs/${dossierGen.briefId}`}>Read brief</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/my-briefs">My Briefs</Link>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDossierGen({ phase: 'idle' })}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        {dossierGen.phase === 'stalled' ? (
          <Alert className="mb-6 border-amber-500/40 bg-amber-500/5">
            <AlertTitle>Dossier brief status unclear</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 text-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                We could not confirm the draft finished from this page. Open the brief to check progress or try
                generating again from the editor.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/briefs/${dossierGen.briefId}/edit`}>Open brief</Link>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDossierGen({ phase: 'idle' })}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Summary Card - 8 cols */}
            <Card className="col-span-12 md:col-span-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Company Summary</CardTitle>
                {!summaryEditing ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setSummaryEditing(true)}>
                    <Edit2 className="size-3 mr-1" />
                    Edit
                  </Button>
                ) : null}
              </CardHeader>

              {!summaryEditing ? (
                <CardContent className="space-y-4">
                  {/* Positioning */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Positioning</p>
                      <p className="text-sm">{competitor.positioning}</p>
                    </div>
                    <AIDraftedIndicator
                      confirmed={confirmedFields.has('positioning')}
                      onConfirm={() => confirmField('positioning')}
                    />
                  </div>
                  <Separator />

                  {/* ICP */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ideal Customer Profile</p>
                      <p className="text-sm">{competitor.icp}</p>
                    </div>
                    <AIDraftedIndicator confirmed={confirmedFields.has('icp')} onConfirm={() => confirmField('icp')} />
                  </div>
                  <Separator />

                  {/* Pricing */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                      <p className="text-sm">
                        <Badge variant="outline" className="mr-2 capitalize">
                          {competitor.pricingModel}
                        </Badge>
                        {competitor.pricingNotes}
                      </p>
                    </div>
                    <AIDraftedIndicator confirmed={confirmedFields.has('pricing')} onConfirm={() => confirmField('pricing')} />
                  </div>
                  <Separator />

                  {/* Company Info Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="size-3" /> Founded
                      </p>
                      <p className="text-sm font-medium">{competitor.founded}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin className="size-3" /> HQ
                      </p>
                      <p className="text-sm font-medium">{competitor.hq}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="size-3" /> Employees
                      </p>
                      <p className="text-sm font-medium">~{competitor.employeeEstimate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="size-3" /> Funding
                      </p>
                      <p className="text-sm font-medium">{competitor.fundingStatus}</p>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="space-y-4">
                  <form action={updateCompetitorCompanySummary} className="space-y-4">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="competitorId" value={competitor.id} />

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-1">Positioning</p>
                      <Textarea
                        name="positioning"
                        value={draftPositioning}
                        onChange={(e) => setDraftPositioning(e.target.value)}
                        className="min-h-24"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-1">Ideal Customer Profile</p>
                      <Textarea name="icp" value={draftIcp} onChange={(e) => setDraftIcp(e.target.value)} className="min-h-24" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-1">Pricing model</p>
                      <Select value={draftPricingModel} onValueChange={(v) => setDraftPricingModel(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="usage">Usage</SelectItem>
                          <SelectItem value="freemium">Freemium</SelectItem>
                          <SelectItem value="enterprise_contract">Enterprise contract</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="pricingModel" value={draftPricingModel} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-1">Pricing notes</p>
                      <Textarea
                        name="pricingNotes"
                        value={draftPricingNotes}
                        onChange={(e) => setDraftPricingNotes(e.target.value)}
                        className="min-h-20"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Calendar className="size-3" /> Founded
                        </p>
                        <Input name="founded" value={draftFounded} onChange={(e) => setDraftFounded(e.target.value)} type="number" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <MapPin className="size-3" /> HQ
                        </p>
                        <Input name="hq" value={draftHq} onChange={(e) => setDraftHq(e.target.value)} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Users className="size-3" /> Employees
                        </p>
                        <Input
                          name="employeeEstimate"
                          value={draftEmployeeEstimate}
                          onChange={(e) => setDraftEmployeeEstimate(e.target.value)}
                          type="number"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <DollarSign className="size-3" /> Funding
                        </p>
                        <Input
                          name="fundingStatus"
                          value={draftFundingStatus}
                          onChange={(e) => setDraftFundingStatus(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" size="sm">
                        Save summary
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setSummaryEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Dossier (linked brief) + Leadership: stacked sidebar beside Company Summary */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-3 min-w-0">
            {/* Competitor Dossier card (linked brief) */}
            <Card
              className={cn(
                'shrink-0',
                dossierGen.phase === 'polling' && 'border-primary/50 ring-2 ring-primary/10'
              )}
            >
              <CardHeader className="py-2.5 px-4 space-y-0">
                <CardTitle className="text-sm font-semibold">Competitor Dossier</CardTitle>
                <CardDescription className="text-[11px] leading-snug line-clamp-1">
                  {latestLinkedBrief ? 'Latest linked dossier brief' : 'No dossier brief linked yet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-3 pt-0">
                {latestLinkedBrief ? (
                  <div className="rounded-md border px-2.5 py-2">
                    <p className="text-xs font-medium line-clamp-1">{latestLinkedBrief.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{latestLinkedBrief.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{latestLinkedBrief.createdAtLabel}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    Generate an AI competitor dossier brief from this profile and the top feed items for this
                    competitor.
                  </p>
                )}
                {latestLinkedBrief ? (
                  <Button asChild size="sm" className="w-full h-8 text-xs">
                    <Link href={`/briefs/${latestLinkedBrief.id}`}>View dossier brief</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={dossierRequesting || dossierGen.phase === 'polling'}
                    onClick={handleRequestDossier}
                  >
                    {dossierRequesting ? 'Starting…' : dossierGen.phase === 'polling' ? 'Drafting dossier…' : 'Request Dossier'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Leadership Card */}
            <Card className="shrink-0 flex flex-col min-h-0">
              <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 space-y-0">
                <CardTitle className="text-sm font-semibold">Leadership</CardTitle>
                {!leadershipEditing ? (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setLeadershipEditing(true)}>
                    <Edit2 className="size-3 mr-1" />
                    Edit
                  </Button>
                ) : null}
              </CardHeader>

              {!leadershipEditing ? (
                <CardContent className="space-y-2 px-4 pb-3 pt-0 max-h-[140px] overflow-y-auto">
                  {competitor.leadership?.map((leader, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{leader.name}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {leader.role}
                          {leader.since ? ` · ${leader.since}` : ''}
                        </p>
                      </div>
                      {leader.linkedIn && (
                        <a
                          href={leader.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Linkedin className="size-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              ) : (
                <CardContent>
                  <form action={updateCompetitorLeadership} className="space-y-3">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="competitorId" value={competitor.id} />

                    <input
                      type="hidden"
                      name="leadershipJson"
                      value={JSON.stringify(
                        (draftLeadership ?? [])
                          .filter((l) => Boolean(l.name?.trim()) && Boolean(l.role?.trim()))
                          .map((l) => ({
                            name: l.name.trim(),
                            role: l.role.trim(),
                            since: l.since?.trim() ? l.since.trim() : null,
                            linkedIn: l.linkedIn?.trim() ? l.linkedIn.trim() : null,
                          }))
                      )}
                    />

                    {(draftLeadership ?? []).length ? (
                      <div className="space-y-2">
                        {draftLeadership.map((leader, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-2">
                            <Input
                              value={leader.name ?? ''}
                              onChange={(e) => {
                                const next = [...draftLeadership]
                                next[idx] = { ...next[idx], name: e.target.value }
                                setDraftLeadership(next)
                              }}
                              placeholder="Name"
                            />
                            <Input
                              value={leader.role ?? ''}
                              onChange={(e) => {
                                const next = [...draftLeadership]
                                next[idx] = { ...next[idx], role: e.target.value }
                                setDraftLeadership(next)
                              }}
                              placeholder="Role"
                            />
                            <Input
                              value={leader.since ?? ''}
                              onChange={(e) => {
                                const next = [...draftLeadership]
                                next[idx] = { ...next[idx], since: e.target.value }
                                setDraftLeadership(next)
                              }}
                              placeholder="Since (optional)"
                            />
                            <Input
                              value={leader.linkedIn ?? ''}
                              onChange={(e) => {
                                const next = [...draftLeadership]
                                next[idx] = { ...next[idx], linkedIn: e.target.value }
                                setDraftLeadership(next)
                              }}
                              placeholder="LinkedIn URL (optional)"
                            />
                            <div className="col-span-2 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDraftLeadership((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Minus className="size-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No leadership entries yet.</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDraftLeadership((prev) => [...prev, { name: '', role: '', since: '', linkedIn: '' }])}
                      >
                        Add leader
                      </Button>
                      <Button type="submit" size="sm">
                        Save leadership
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setLeadershipEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>
            </div>

            {/* Products Card - 4 cols */}
            <Card className="col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Products</CardTitle>
                {!productsEditing ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setProductsEditing(true)}>
                    <Edit2 className="size-3 mr-1" />
                    Edit
                  </Button>
                ) : null}
              </CardHeader>

              {!productsEditing ? (
                <CardContent>
                  <ul className="space-y-2">
                    {competitor.products?.map((product, idx) => (
                      <li key={idx}>
                        <p className="text-sm font-medium">{product.name}</p>
                        {product.description && <p className="text-xs text-muted-foreground">{product.description}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              ) : (
                <CardContent>
                  <form action={updateCompetitorProducts} className="space-y-3">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="competitorId" value={competitor.id} />

                    <input
                      type="hidden"
                      name="productsJson"
                      value={JSON.stringify(
                        (draftProducts ?? [])
                          .filter((p) => Boolean(p.name?.trim()))
                          .map((p) => ({
                            name: p.name.trim(),
                            description: p.description?.trim() ? p.description.trim() : null,
                          }))
                      )}
                    />

                    {(draftProducts ?? []).length ? (
                      <div className="space-y-2">
                        {draftProducts.map((product, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-2">
                            <Input
                              value={product.name ?? ''}
                              onChange={(e) => {
                                const next = [...draftProducts]
                                next[idx] = { ...next[idx], name: e.target.value }
                                setDraftProducts(next)
                              }}
                              placeholder="Product name"
                            />
                            <div className="col-span-2">
                              <Textarea
                                value={product.description ?? ''}
                                onChange={(e) => {
                                  const next = [...draftProducts]
                                  next[idx] = { ...next[idx], description: e.target.value }
                                  setDraftProducts(next)
                                }}
                                placeholder="Description (optional)"
                                className="min-h-[72px]"
                              />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDraftProducts((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Minus className="size-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No products yet.</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDraftProducts((prev) => [...prev, { name: '', description: '' }])}
                      >
                        Add product
                      </Button>
                      <Button type="submit" size="sm">
                        Save products
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setProductsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Strengths & Weaknesses - 8 cols */}
            <Card className="col-span-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Strengths & Weaknesses</CardTitle>
                {!strengthsEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setStrengthsEditing(true)}>
                  <Edit2 className="size-3 mr-1" />
                  Edit
                  </Button>
                ) : null}
              </CardHeader>
              {!strengthsEditing ? (
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div>
                      <h4 className="text-sm font-medium text-positive mb-2">Strengths</h4>
                      {competitor.strengths && competitor.strengths.length > 0 ? (
                        <ul className="space-y-1.5">
                          {competitor.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-positive mt-1">+</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No strengths added yet. <button className="text-accent hover:underline">Add first item</button>
                        </p>
                      )}
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <h4 className="text-sm font-medium text-negative mb-2">Weaknesses</h4>
                      {competitor.weaknesses && competitor.weaknesses.length > 0 ? (
                        <ul className="space-y-1.5">
                          {competitor.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-negative mt-1">-</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No weaknesses added yet.{' '}
                          <button className="text-accent hover:underline">Add first item</button>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <form action={updateCompetitorStrengthsWeaknesses} className="space-y-4">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="competitorId" value={competitor.id} />
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-positive mb-2">Strengths</h4>
                        <Textarea
                          name="strengthsText"
                          value={draftStrengthsText}
                          onChange={(e) => setDraftStrengthsText(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-negative mb-2">Weaknesses</h4>
                        <Textarea
                          name="weaknessesText"
                          value={draftWeaknessesText}
                          onChange={(e) => setDraftWeaknessesText(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" size="sm">
                        Save strengths
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setStrengthsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Customer Voice Panel (Compact) - 6 cols */}
            <Card className="col-span-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Customer Voice</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('customer-voice')}>
                  View All <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sentimentSummary && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">30-day sentiment</span>
                        <span className={cn(
                          'flex items-center gap-1 font-medium',
                          sentimentSummary.netChange >= 0 ? 'text-positive' : 'text-negative'
                        )}>
                          {sentimentSummary.netChange >= 0 ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          {sentimentSummary.netChange > 0 ? '+' : ''}
                          {sentimentSummary.netChange} pts
                        </span>
                      </div>
                      <SentimentBar 
                        positive={sentimentSummary.positive}
                        mixed={sentimentSummary.mixed}
                        negative={sentimentSummary.negative}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{sentimentSummary.positive} positive</span>
                        <span>{sentimentSummary.mixed} mixed</span>
                        <span>{sentimentSummary.negative} negative</span>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                
                {/* Recent reviews */}
                <div className="space-y-3">
                  {recentReviews.slice(0, 2).map((review) => (
                    <div key={review.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'size-3',
                                i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'
                              )}
                            />
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {review.platform}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{review.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Win-Rate Panel (Compact) - 6 cols */}
            <Card className="col-span-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Win Rate vs {competitor.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('win-loss')}>
                  View All <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {winLossSummary && (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-semibold font-mono">
                        {winLossSummary.winRate}%
                      </span>
                      <span className={cn(
                        'flex items-center gap-1 text-sm',
                        winLossSummary.trend >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {winLossSummary.trend >= 0 ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                        {winLossSummary.trend > 0 ? '+' : ''}
                        {winLossSummary.trend}% vs prior 90d
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {winLossSummary.totalOutcomes} outcomes logged
                    </p>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top win reasons</p>
                        <ul className="space-y-1">
                          {winLossSummary.topWinReasons.map((reason, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-positive" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Top loss reasons</p>
                        <ul className="space-y-1">
                          {winLossSummary.topLossReasons.map((reason, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-negative" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Hiring snapshot */}
            <Card className="col-span-12 md:col-span-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="size-4" />
                  Hiring signals
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('hiring')}>
                  View All <ChevronRight className="size-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {jobPostings.length === 0 ? (
                  <p className="text-muted-foreground">
                    No job postings ingested for this competitor yet. Postings appear here only (not in the main
                    intelligence feed).
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Open roles</p>
                        <p className="text-2xl font-semibold font-mono">{hiringRollup.openCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">New opens (30d)</p>
                        <p className="text-2xl font-semibold font-mono flex items-center gap-2">
                          {hiringRollup.newOpensLast30d}
                          <span
                            className={cn(
                              'text-xs font-normal inline-flex items-center gap-0.5',
                              hiringRollup.newOpensLast30d > hiringRollup.newOpensPrior30d
                                ? 'text-positive'
                                : hiringRollup.newOpensLast30d < hiringRollup.newOpensPrior30d
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {hiringRollup.newOpensLast30d > hiringRollup.newOpensPrior30d ? (
                              <TrendingUp className="size-3" />
                            ) : hiringRollup.newOpensLast30d < hiringRollup.newOpensPrior30d ? (
                              <TrendingDown className="size-3" />
                            ) : (
                              <Minus className="size-3" />
                            )}
                            vs prior 30d ({hiringRollup.newOpensPrior30d})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Senior+ share (open)</p>
                        <p className="text-2xl font-semibold font-mono">{hiringRollup.seniorPlusOpenShare}%</p>
                      </div>
                    </div>
                    {(hiringRollup.watchlistOpenCount > 0 || hiringRollup.highThreatOpenCount > 0) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {hiringRollup.watchlistOpenCount > 0 ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600/40">
                            {hiringRollup.watchlistOpenCount} watchlist
                          </Badge>
                        ) : null}
                        {hiringRollup.highThreatOpenCount > 0 ? (
                          <Badge variant="outline" className="text-destructive border-destructive/40">
                            {hiringRollup.highThreatOpenCount} high threat
                          </Badge>
                        ) : null}
                      </div>
                    )}
                    {hiringThemeKeywords.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Top themes (open roles)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {hiringThemeKeywords.slice(0, 8).map((kw) => (
                            <Badge key={kw} variant="secondary" className="font-normal text-[10px]">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Linked Briefs - Full width */}
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle className="text-base">Linked Briefs</CardTitle>
                <CardDescription>Intelligence briefs that reference {competitor.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {linkedBriefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published briefs link to this competitor yet.</p>
                ) : (
                <div className="flex gap-4 flex-wrap">
                  {linkedBriefs.map(brief => (
                    <Link
                      key={brief.id}
                      href={`/briefs/${brief.id}`}
                      className="flex-1 p-4 rounded-lg border hover:border-accent/50 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {brief.audience}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{brief.createdAtLabel}</span>
                      </div>
                      <p className="font-medium text-sm mb-1">{brief.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{brief.summary}</p>
                    </Link>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as Category | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="buy-side">Customer Deployments</SelectItem>
                  <SelectItem value="sell-side">Vendor Updates</SelectItem>
                  <SelectItem value="channel">Sales Channels</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {filteredActivity.map(item => {
                const categoryInfo = getCategoryInfo(item.category)
                return (
                  <Card key={item.id} className="hover:border-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <MISBadge score={item.mis} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-[10px] h-4 px-1.5', categoryInfo.color)}>
                              {categoryInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.eventDate ? formatIntelEventDate(item.eventDate) : getRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <Link href={`/intel?item=${item.id}`} className="hover:underline">
                            <p className="font-medium text-sm mb-1">{item.title}</p>
                          </Link>
                          <p className="text-sm text-muted-foreground">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {item.sourceUrls?.[0]?.domain ?? 'Unknown'}
                            </span>
                            {item.relatedTopics?.map(topic => (
                              <Badge key={topic.id} variant="outline" className="text-[10px] h-4 px-1.5">
                                {topic.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Hiring Tab */}
        {activeTab === 'hiring' && (
          <div className="space-y-6">
            {jobPostings.length > 0 && (
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Open roles</p>
                    <p className="text-xl font-semibold font-mono">{hiringRollup.openCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New opens (30d)</p>
                    <p className="text-xl font-semibold font-mono">{hiringRollup.newOpensLast30d}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Senior+ (open)</p>
                    <p className="text-xl font-semibold font-mono">{hiringRollup.seniorPlusOpenShare}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Watchlist / high threat (open)</p>
                    <p className="text-xl font-semibold font-mono">
                      {hiringRollup.watchlistOpenCount} / {hiringRollup.highThreatOpenCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(hiringRollup.highThreatOpenCount > 0 || hiringRollup.watchlistOpenCount > 0) && (
              <div className="flex flex-wrap gap-2">
                {hiringRollup.highThreatOpenCount > 0 ? (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                    {hiringRollup.highThreatOpenCount} open role(s) flagged high threat
                  </Badge>
                ) : null}
                {hiringRollup.watchlistOpenCount > 0 ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    {hiringRollup.watchlistOpenCount} on watchlist
                  </Badge>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={jobStatusFilter}
                onValueChange={(v) => setJobStatusFilter(v as 'all' | 'open' | 'closed' | 'unknown')}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={jobWorkplaceFilter}
                onValueChange={(v) => setJobWorkplaceFilter(v as 'all' | 'remote' | 'hybrid' | 'onsite')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Workplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All workplace</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={jobThreatFilter}
                onValueChange={(v) => setJobThreatFilter(v as 'all' | 'high' | 'watchlist')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="high">High threat only</SelectItem>
                  <SelectItem value="watchlist">Watchlist only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hiringThemeKeywords.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top themes (open roles)</p>
                <div className="flex flex-wrap gap-1.5">
                  {hiringThemeKeywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="font-normal text-[10px]">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {jobPostings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No job postings yet. Ingestion writes to this competitor only; listings never appear in the workspace
                intelligence feed.
              </p>
            ) : filteredJobPostings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No postings match the current filters.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead>Seniority</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Threat</TableHead>
                      <TableHead className="w-[90px]">Flags</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredJobPostings]
                      .sort((a, b) => {
                        const ta = a.payload.date_posted ?? a.lastSeenAt
                        const tb = b.payload.date_posted ?? b.lastSeenAt
                        return tb.localeCompare(ta)
                      })
                      .map((p) => {
                        const ca = p.payload.competitive_analysis
                        const highThreat = ca?.threat_level === 'high'
                        const watch = Boolean(ca?.watchlist)
                        const locJoined = [
                          p.payload.location?.city,
                          p.payload.location?.state,
                          p.payload.location?.country,
                        ]
                          .filter(Boolean)
                          .join(', ')
                        const loc = p.payload.location?.raw ?? (locJoined || '—')
                        return (
                          <TableRow
                            key={p.id}
                            className={cn(
                              highThreat && 'border-l-4 border-l-destructive bg-destructive/5',
                              !highThreat && watch && 'border-l-4 border-l-amber-500 bg-amber-500/5'
                            )}
                          >
                            <TableCell className="font-medium max-w-[240px]">
                              <div className="truncate" title={p.title}>
                                {p.title}
                              </div>
                              {ca?.inferred_priority ? (
                                <p className="text-[10px] text-muted-foreground font-normal line-clamp-2 mt-0.5">
                                  {ca.inferred_priority}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              <span title={p.payload.date_posted ?? undefined}>
                                {formatJobPostedDate(p.payload.date_posted)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[120px] truncate">
                              {p.payload.function ?? '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs capitalize">
                              {(p.payload.seniority ?? '—').replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-[160px] truncate" title={loc}>
                              {loc}
                            </TableCell>
                            <TableCell>
                              {ca?.threat_level ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] capitalize',
                                    ca.threat_level === 'high' && 'text-destructive border-destructive/50',
                                    ca.threat_level === 'medium' && 'text-amber-600 border-amber-600/40'
                                  )}
                                >
                                  {ca.threat_level}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              {watch ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Watch
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                                <a href={p.jobUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="size-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Customer Voice Tab */}
        {activeTab === 'customer-voice' && (
          <div className="space-y-6">
            {/* Sentiment Summary at top */}
            {sentimentSummary && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">30-Day Sentiment Distribution</p>
                      <div className="w-64">
                        <SentimentBar 
                          positive={sentimentSummary.positive}
                          mixed={sentimentSummary.mixed}
                          negative={sentimentSummary.negative}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 w-64">
                        <span>{sentimentSummary.positive} positive</span>
                        <span>{sentimentSummary.mixed} mixed</span>
                        <span>{sentimentSummary.negative} negative</span>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Net Change</p>
                      <span className={cn(
                        'flex items-center gap-1 text-lg font-semibold',
                        sentimentSummary.netChange >= 0 ? 'text-positive' : 'text-negative'
                      )}>
                        {sentimentSummary.netChange >= 0 ? (
                          <TrendingUp className="size-5" />
                        ) : (
                          <TrendingDown className="size-5" />
                        )}
                        {sentimentSummary.netChange > 0 ? '+' : ''}
                        {sentimentSummary.netChange} pts
                      </span>
                      <p className="text-[10px] text-muted-foreground">vs prior 30 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
              <Select value={voiceSentimentFilter} onValueChange={(v) => setVoiceSentimentFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Review Items */}
            <div className="space-y-4">
              {filteredVoice.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <MISBadge score={item.mis} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {item.sourceUrls?.[0]?.name ?? 'Source'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.eventDate ? formatIntelEventDate(item.eventDate) : getRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="font-medium text-sm mb-2">{item.title}</p>
                        <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg italic">
                          &ldquo;{item.content}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {item.relatedTopics?.map(topic => (
                            <Badge key={topic.id} variant="outline" className="text-[10px] h-4 px-1.5">
                              {topic.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Battle Cards Tab */}
        {activeTab === 'battle-cards' && (
          <div className="space-y-4">
            {battleCards.length > 0 ? (
              battleCards.map(card => (
                <Card key={card.id} className="hover:border-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {card.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last updated: {card.lastUpdatedLabel}
                          </span>
                        </div>
                        <p className="font-medium mb-1">Battle Card: {card.competitorName}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/battle-cards/${card.id}`}>
                          Open Card <ChevronRight className="size-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No battle cards created for this competitor yet.</p>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Create Battle Card
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Win/Loss Tab */}
        {activeTab === 'win-loss' && (
          <div className="space-y-6">
            {/* Aggregate metrics */}
            {winLossSummary && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Win Rate (90d)</p>
                    <p className="text-2xl font-semibold font-mono">{winLossSummary.winRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Trend</p>
                    <p className={cn(
                      'text-2xl font-semibold font-mono flex items-center gap-1',
                      winLossSummary.trend >= 0 ? 'text-positive' : 'text-negative'
                    )}>
                      {winLossSummary.trend >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                      {winLossSummary.trend > 0 ? '+' : ''}{winLossSummary.trend}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Outcomes</p>
                    <p className="text-2xl font-semibold font-mono">{winLossSummary.totalOutcomes}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Period</p>
                    <p className="text-2xl font-semibold">{winLossSummary.period}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Records Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Reasons</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winLossRows.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.deal_name}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              record.outcome === 'won'
                                ? 'bg-positive/15 text-positive border-positive/30'
                                : record.outcome === 'lost'
                                  ? 'bg-negative/15 text-negative border-negative/30'
                                  : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {record.outcome.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.deal_size_cents != null
                            ? `$${(record.deal_size_cents / 100).toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.close_date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(record.reason_tags ?? []).map((reason, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[10px]">
                          {record.submitted_by.slice(0, 8)}…
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  Analyst Notes
                </CardTitle>
                <CardDescription>
                  Free-form notes with Markdown support. Revision history preserved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Add your notes here... Markdown supported."
                />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Last edited 2 hours ago by Sarah Kim
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View History</Button>
                    <Button size="sm">Save Notes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
