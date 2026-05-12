import { BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
import { parseSectionContent } from '@/lib/battle-cards/section-json'
import { intelligenceItemFromDb } from '@/lib/intelligence/map-row'
import type { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'
import type { BattleCardSectionType } from '@/lib/types'
import type { IntelligenceItem } from '@/lib/types'
import { computeHiringRollup, jobPostingFromRow } from '@/lib/competitors/job-postings-queries'
import type { CompetitorHiringRollup, CompetitorJobPosting } from '@/lib/competitors/job-posting-types'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type CompRow = Database['public']['Tables']['competitor']['Row']
type WinRow = Database['public']['Tables']['win_loss_outcome']['Row']
type BattleSectionRow = Database['public']['Tables']['battle_card_section']['Row']

const INTEL_DAYS = 120
const MAX_INTEL_QUERY = 80
const MAX_VOICE_IN_SECTION = 18
const MAX_OTHER_INTEL = 28
const MAX_WIN_ROWS = 60
const MAX_BATTLE_CARDS = 5
const MAX_JOB_POSTINGS_STORED = 80
const FEED_INTEL_CONTENT = 2_800
const FEED_INTEL_SUMMARY = 600

export type CompetitorLeadershipJson = { name: string; role: string; since: string; linkedIn?: string }
export type CompetitorProductJson = { name: string; description?: string }

export type IntelSnippetJson = {
  id: string
  title: string
  summary: string
  content: string
  category: string
  misValue: number
}

export type BattleCardSectionJson = {
  sectionType: BattleCardSectionType
  content: unknown
}

export type BattleCardEvidenceJson = {
  id: string
  status: string
  segmentTag: string | null
  sections: BattleCardSectionJson[]
}

export type CompetitorDossierJson = {
  competitor: {
    id: string
    name: string
    website: string | null
    tier: string
    status: string
    positioning: string | null
    icpDescription: string | null
    segments: string[]
    pricingModel: string | null
    pricingNotes: string | null
    foundedYear: number | null
    hqLocation: string | null
    employeeCountEstimate: number | null
    fundingStatus: string | null
    strengths: string[]
    weaknesses: string[]
    leadership: CompetitorLeadershipJson[]
    products: CompetitorProductJson[]
  }
  winLossOutcomes: Array<{
    id: string
    closeDate: string
    outcome: WinRow['outcome']
    dealName: string
    segment: string | null
    reasonSummary: string
    reasonTags: string[]
    notes: string | null
  }>
  hiring: {
    rollup: CompetitorHiringRollup
    openPostings: Array<{
      id: string
      title: string
      jobUrl: string
      postingStatus: string
      department: string | null
      location: string | null
      firstSeenAt: string
      lastSeenAt: string
    }>
  }
  battleCards: BattleCardEvidenceJson[]
  feedIntel: {
    windowDays: number
    customerVoice: IntelSnippetJson[]
    other: IntelSnippetJson[]
  }
}

/** Resolve competitor for dossier: explicit link wins; else single inferred id from item related_competitors. */
export function inferCompetitorIdForBrief(
  linkedCompetitorIds: string[],
  items: { related_competitors: string[] | null }[]
): string | null {
  if (linkedCompetitorIds.length >= 1) return linkedCompetitorIds[0]!
  const counts = new Map<string, number>()
  for (const row of items) {
    for (const cid of row.related_competitors ?? []) {
      if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1)
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (ranked.length === 0) return null
  if (ranked.length === 1) return ranked[0]![0]
  if (ranked[0]![1] > ranked[1]![1]) return ranked[0]![0]
  return null
}

function isVoiceItem(it: IntelligenceItem): boolean {
  return it.category === 'buy-side' || it.reviewMetadata != null
}

function intelToSnippet(it: IntelligenceItem): IntelSnippetJson {
  return {
    id: it.id,
    title: it.title,
    summary: (it.summary ?? '').slice(0, FEED_INTEL_SUMMARY),
    content: (it.content ?? '').slice(0, FEED_INTEL_CONTENT),
    category: it.category,
    misValue: it.mis.value,
  }
}

function parseLeadershipJson(raw: CompRow['leadership']): CompetitorLeadershipJson[] {
  if (!raw || !Array.isArray(raw)) return []
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

function parseProductsJson(raw: CompRow['products']): CompetitorProductJson[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      name: String(x.name),
      description: typeof x.description === 'string' ? x.description : undefined,
    }))
}

function battleCardSectionsJson(sections: BattleSectionRow[]): BattleCardSectionJson[] {
  const byType = new Map(sections.map((s) => [s.section_type as BattleCardSectionType, s]))
  const out: BattleCardSectionJson[] = []
  for (const t of BATTLE_SECTION_ORDER) {
    const row = byType.get(t)
    if (!row) continue
    out.push({
      sectionType: t,
      content: parseSectionContent(t, row.content),
    })
  }
  return out
}

function openPostingEvidenceRows(postings: CompetitorJobPosting[]) {
  return postings
    .filter((p) => p.postingStatus === 'open')
    .slice(0, MAX_JOB_POSTINGS_STORED)
    .map((p) => ({
      id: p.id,
      title: p.title,
      jobUrl: p.jobUrl,
      postingStatus: p.postingStatus,
      department: p.payload.department ?? p.payload.function ?? null,
      location: p.payload.location?.raw ?? p.payload.location?.country ?? null,
      firstSeenAt: p.firstSeenAt,
      lastSeenAt: p.lastSeenAt,
    }))
}

/**
 * Loads structured competitor dossier data for brief drafting (JSON in prompt).
 * Analyst “Notes” tab on the profile is not persisted yet — `dataNotes` is set on the outer evidence payload.
 */
export async function buildCompetitorDossierJson(
  supabase: AdminClient,
  workspaceId: string,
  competitorId: string
): Promise<CompetitorDossierJson | null> {
  const since = new Date(Date.now() - INTEL_DAYS * 86400000).toISOString()

  const { data: compRow, error: cErr } = await supabase
    .from('competitor')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', competitorId)
    .maybeSingle()
  if (cErr) throw cErr
  if (!compRow) return null

  const [intelRes, jobRes, battleCardsRes, winRes] = await Promise.all([
    supabase
      .from('intelligence_item')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('visibility', 'feed')
      .gte('ingested_at', since)
      .contains('related_competitors', [competitorId])
      .order('mi_score', { ascending: false })
      .limit(MAX_INTEL_QUERY),
    supabase
      .from('competitor_job_posting')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('competitor_id', competitorId)
      .gte('last_seen_at', new Date(Date.now() - 365 * 86400000).toISOString())
      .order('last_seen_at', { ascending: false })
      .limit(500),
    supabase
      .from('battle_card')
      .select('id,status,updated_at,segment_tag')
      .eq('workspace_id', workspaceId)
      .eq('competitor_id', competitorId)
      .order('updated_at', { ascending: false })
      .limit(MAX_BATTLE_CARDS),
    supabase.from('win_loss_outcome').select('*').eq('workspace_id', workspaceId).order('close_date', { ascending: false }).limit(400),
  ])

  if (intelRes.error) throw intelRes.error
  if (jobRes.error) throw jobRes.error
  if (battleCardsRes.error) throw battleCardsRes.error
  if (winRes.error) throw winRes.error

  const intelItems = (intelRes.data ?? []).map((row) => intelligenceItemFromDb(row as never))
  const voiceItems = intelItems.filter(isVoiceItem).slice(0, MAX_VOICE_IN_SECTION)
  const otherIntel = intelItems.filter((it) => !isVoiceItem(it)).slice(0, MAX_OTHER_INTEL)

  const jobPostings = (jobRes.data ?? []).map((r) => jobPostingFromRow(r))
  const hiringRollup = computeHiringRollup(jobPostings)

  const winRows = (winRes.data ?? []).filter(
    (r) => r.competitor_id === competitorId || (r.additional_competitor_ids ?? []).includes(competitorId)
  )
  const winLimited = winRows.slice(0, MAX_WIN_ROWS)

  const cards = battleCardsRes.data ?? []
  const sectionLists = await Promise.all(
    cards.map(async (c) => {
      const { data: secs, error } = await supabase
        .from('battle_card_section')
        .select('*')
        .eq('battle_card_id', c.id)
        .order('display_order', { ascending: true })
      if (error) throw error
      return { card: c, sections: secs ?? [] }
    })
  )

  const battleCards: BattleCardEvidenceJson[] = sectionLists.map(({ card, sections }) => ({
    id: card.id,
    status: card.status,
    segmentTag: card.segment_tag,
    sections: battleCardSectionsJson(sections as BattleSectionRow[]),
  }))

  return {
    competitor: {
      id: compRow.id,
      name: compRow.name,
      website: compRow.website,
      tier: compRow.tier,
      status: compRow.status,
      positioning: compRow.positioning,
      icpDescription: compRow.icp_description,
      segments: compRow.segment_relevance ?? [],
      pricingModel: compRow.pricing_model,
      pricingNotes: compRow.pricing_notes,
      foundedYear: compRow.founded_year,
      hqLocation: compRow.hq_location,
      employeeCountEstimate: compRow.employee_count_estimate,
      fundingStatus: compRow.funding_status,
      strengths: compRow.strengths ?? [],
      weaknesses: compRow.weaknesses ?? [],
      leadership: parseLeadershipJson(compRow.leadership),
      products: parseProductsJson(compRow.products),
    },
    winLossOutcomes: winLimited.map((r) => ({
      id: r.id,
      closeDate: r.close_date,
      outcome: r.outcome,
      dealName: r.deal_name,
      segment: r.segment,
      reasonSummary: r.reason_summary,
      reasonTags: r.reason_tags ?? [],
      notes: r.notes,
    })),
    hiring: {
      rollup: hiringRollup,
      openPostings: openPostingEvidenceRows(jobPostings),
    },
    battleCards,
    feedIntel: {
      windowDays: INTEL_DAYS,
      customerVoice: voiceItems.map(intelToSnippet),
      other: otherIntel.map(intelToSnippet),
    },
  }
}
