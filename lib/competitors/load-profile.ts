import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listIntelItemsForCompetitor } from '@/lib/feed/queries'
import { listWinLossOutcomes } from '@/lib/win-loss/queries'
import type { Competitor, CompetitorLeader, CompetitorProduct, IntelligenceItem, MISScore } from '@/lib/types'
import { getMISBand } from '@/lib/types'
import type { Database } from '@/lib/supabase/types'
import type { WinLossRow } from '@/lib/win-loss/queries'
import type { WorkspacePlan } from '@/lib/types/dosi'

type CompRow = Database['public']['Tables']['competitor']['Row']

export type CompetitorBattleCardRow = {
  id: string
  competitorName: string
  lastUpdatedLabel: string
  status: string
}

export type CompetitorBriefRow = {
  id: string
  title: string
  audience: string
  priority: string
  summary: string
  createdAtLabel: string
}

function formatRelativeLabel(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 14) return `${days}d ago`
  return d.toLocaleDateString()
}

function parseLeadership(raw: CompRow['leadership']): CompetitorLeader[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined
  return raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      role: String(x.role ?? ''),
      name: String(x.name),
      since: String(x.since ?? ''),
      linkedIn: typeof x.linkedIn === 'string' ? x.linkedIn : undefined,
    }))
}

function parseProducts(raw: CompRow['products']): CompetitorProduct[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined
  return raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      name: String(x.name),
      description: typeof x.description === 'string' ? x.description : undefined,
    }))
}

function mapPricingModel(s: string | null): Competitor['pricingModel'] {
  const v = (s ?? '').toLowerCase()
  if (v.includes('subscription')) return 'subscription'
  if (v.includes('usage')) return 'usage'
  if (v.includes('freemium')) return 'freemium'
  if (v.includes('enterprise')) return 'enterprise_contract'
  if (v.includes('hybrid')) return 'hybrid'
  return 'unknown'
}

export type CompetitorProfilePayload = {
  workspacePlan: WorkspacePlan
  competitor: Competitor
  activityItems: IntelligenceItem[]
  voiceItems: IntelligenceItem[]
  battleCards: CompetitorBattleCardRow[]
  linkedBriefs: CompetitorBriefRow[]
  winLossRows: WinLossRow[]
}

export async function loadCompetitorProfile(
  workspaceId: string,
  competitorId: string
): Promise<CompetitorProfilePayload | null> {
  const supabase = await createSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('competitor')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', competitorId)
    .maybeSingle()

  if (error) throw error
  if (!row) return null

  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()

  const [intelItems, battleRes, briefRes, allWin] = await Promise.all([
    listIntelItemsForCompetitor(workspaceId, competitorId, { limit: 40, days: 90 }),
    supabase
      .from('battle_card')
      .select('id,updated_at,status')
      .eq('workspace_id', workspaceId)
      .eq('competitor_id', competitorId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('brief')
      .select('id,title,summary,audience,priority,created_at')
      .eq('workspace_id', workspaceId)
      .contains('linked_competitor_ids', [competitorId])
      .order('created_at', { ascending: false })
      .limit(12),
    listWinLossOutcomes(workspaceId),
  ])
  const { data: ws } = await supabase.from('workspace').select('plan').eq('id', workspaceId).maybeSingle()

  const activityItems = intelItems
  const voiceCandidates = intelItems.filter((i) => i.category === 'buy-side')

  const recentActivity = activityItems.filter((i) => i.timestamp >= since7).length

  let overallMIS: MISScore = { value: 45, band: 'medium', confidence: 'medium' }
  if (activityItems.length > 0) {
    const maxScore = Math.max(...activityItems.map((i) => i.mis.value))
    const ref = activityItems[0]!.mis
    overallMIS = {
      value: maxScore,
      band: getMISBand(maxScore),
      confidence: ref.confidence,
    }
  }

  const competitor: Competitor = {
    id: row.id,
    name: row.name,
    website: row.website ?? '',
    description: row.positioning ?? row.icp_description ?? '',
    overallMIS,
    recentActivity,
    status: row.status,
    tier: row.tier,
    segments: row.segment_relevance ?? undefined,
    positioning: row.positioning ?? undefined,
    icp: row.icp_description ?? undefined,
    pricingModel: mapPricingModel(row.pricing_model),
    pricingNotes: row.pricing_notes ?? undefined,
    founded: row.founded_year ?? undefined,
    hq: row.hq_location ?? undefined,
    employeeEstimate: row.employee_count_estimate ?? undefined,
    fundingStatus: row.funding_status ?? undefined,
    leadership: parseLeadership(row.leadership),
    products: parseProducts(row.products),
    strengths: row.strengths ?? undefined,
    weaknesses: row.weaknesses ?? undefined,
    lastProfileRefresh: formatRelativeLabel(row.last_profile_refresh),
    lastProfileRefreshAt: row.last_profile_refresh ?? undefined,
    discoveryConfidence: row.discovery_confidence ?? undefined,
    aiDraftedFields: row.ai_drafted_fields ?? undefined,
    lastSignificantChangeAt: row.last_significant_change_at ?? undefined,
  }

  const battleCards: CompetitorBattleCardRow[] = (battleRes.data ?? []).map((b) => ({
    id: b.id,
    competitorName: row.name,
    lastUpdatedLabel: formatRelativeLabel(b.updated_at),
    status: b.status,
  }))

  const linkedBriefs: CompetitorBriefRow[] = (briefRes.data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    audience: b.audience,
    priority: b.priority,
    summary: b.summary,
    createdAtLabel: formatRelativeLabel(b.created_at),
  }))

  const winLossRows = allWin.filter((w) => w.competitor_id === competitorId)

  return {
    workspacePlan: (ws?.plan ?? 'starter') as WorkspacePlan,
    competitor,
    activityItems,
    voiceItems: voiceCandidates,
    battleCards,
    linkedBriefs,
    winLossRows,
  }
}
