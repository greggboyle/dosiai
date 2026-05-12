import type { CompetitorDossierJson } from '@/lib/brief/competitor-brief-context'
import type { Database } from '@/lib/supabase/types'
import type { BriefKind } from '@/lib/types'

const MAX_JSON_CHARS = 125_000
const AUTHOR_ITEM_CONTENT = 14_000

type BriefRow = Database['public']['Tables']['brief']['Row']
export type IntelEvidenceRow = {
  id: string
  title: string
  summary: string | null
  content: string | null
  related_competitors?: string[] | null
}

export type BriefEvidenceJsonV1 = {
  schemaVersion: 1
  briefKind: BriefKind
  resolvedCompetitorId: string | null
  competitorResolution: 'linked_first' | 'inferred_dominant' | 'none'
  dataNotes: {
    analystProfileNotesPersistedInDb: false
  }
  competitorDossier: CompetitorDossierJson | null
  authorLinkedIntelligenceItems: Array<{
    id: string
    title: string
    summary: string
    content: string
    relatedCompetitors: string[]
  }>
}

function shrinkEvidenceForTokens(p: BriefEvidenceJsonV1, pass: number): BriefEvidenceJsonV1 {
  const maxAuthor = Math.max(800, Math.floor(14_000 / (pass + 1)))
  const maxFeed = Math.max(400, Math.floor(2_800 / (pass + 1)))
  const maxSum = Math.max(120, Math.floor(600 / (pass + 1)))
  return {
    ...p,
    authorLinkedIntelligenceItems: p.authorLinkedIntelligenceItems.map((it) => ({
      ...it,
      summary: it.summary.slice(0, maxSum),
      content: it.content.slice(0, maxAuthor),
    })),
    competitorDossier: p.competitorDossier
      ? {
          ...p.competitorDossier,
          feedIntel: {
            windowDays: p.competitorDossier.feedIntel.windowDays,
            customerVoice: p.competitorDossier.feedIntel.customerVoice.map((x) => ({
              ...x,
              summary: x.summary.slice(0, maxSum),
              content: x.content.slice(0, maxFeed),
            })),
            other: p.competitorDossier.feedIntel.other.map((x) => ({
              ...x,
              summary: x.summary.slice(0, maxSum),
              content: x.content.slice(0, maxFeed),
            })),
          },
        }
      : null,
  }
}

function clipJson(s: string): string {
  if (s.length <= MAX_JSON_CHARS) return s
  return `${s.slice(0, MAX_JSON_CHARS)}\n/* evidence JSON truncated (invalid JSON past this point) */`
}

export function stringifyBriefEvidenceJson(payload: BriefEvidenceJsonV1): string {
  let p: BriefEvidenceJsonV1 = payload
  for (let pass = 0; pass < 6; pass++) {
    const spaced = pass === 0 ? 2 : 0
    const s = JSON.stringify(p, null, spaced)
    if (s.length <= MAX_JSON_CHARS) return s
    p = shrinkEvidenceForTokens(p, pass + 1)
  }
  return clipJson(JSON.stringify(p))
}

export function buildAuthorLinkedItemsJson(
  rows: IntelEvidenceRow[],
  opts?: { includeRelatedCompetitors?: boolean }
): BriefEvidenceJsonV1['authorLinkedIntelligenceItems'] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary ?? '',
    content: (r.content ?? '').slice(0, AUTHOR_ITEM_CONTENT),
    relatedCompetitors: opts?.includeRelatedCompetitors ? (r.related_competitors ?? []) : [],
  }))
}

export function buildBriefEvidencePayloadBase(
  brief: Pick<BriefRow, 'brief_kind' | 'linked_competitor_ids'>,
  resolution: BriefEvidenceJsonV1['competitorResolution'],
  resolvedCompetitorId: string | null,
  competitorDossier: CompetitorDossierJson | null,
  itemRows: IntelEvidenceRow[]
): BriefEvidenceJsonV1 {
  return {
    schemaVersion: 1,
    briefKind: brief.brief_kind as BriefKind,
    resolvedCompetitorId,
    competitorResolution: resolution,
    dataNotes: { analystProfileNotesPersistedInDb: false },
    competitorDossier,
    authorLinkedIntelligenceItems: buildAuthorLinkedItemsJson(itemRows, {
      includeRelatedCompetitors: brief.brief_kind === 'competitor',
    }),
  }
}
