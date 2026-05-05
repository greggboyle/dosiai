import type { Database } from '@/lib/supabase/types'
import type { Category, FiveWH, IntelligenceItem, MISScore, MIScoreComponents, SourceRef } from '@/lib/types'
type IntelRow = Database['public']['Tables']['intelligence_item']['Row']

export function intelligenceItemFromDb(row: IntelRow): IntelligenceItem {
  const consensus = row.vendor_consensus as { confirmed?: number; total?: number }
  const comp = row.mi_score_components as Record<string, number>
  const five = row.five_wh as FiveWH | null | undefined
  const sources = row.source_urls as SourceRef[] | null

  const components: MIScoreComponents = {
    competitorProximity: comp?.proximity ?? comp?.competitorProximity ?? 50,
    recency: comp?.recency ?? 50,
    vendorConsensus: comp?.vendorConsensus ?? 50,
    sourceAuthority: comp?.sourceAuthority ?? comp?.source_credibility ?? 50,
    contentMagnitude: comp?.contentMagnitude ?? comp?.magnitude ?? 50,
    actionability: comp?.actionability ?? 50,
    novelty: comp?.novelty ?? 50,
    corroboration: comp?.corroboration ?? 50,
    relevanceToICP: comp?.relevanceToICP ?? comp?.strategic_alignment ?? 50,
  }

  const mis: MISScore = {
    value: Math.round(row.mi_score),
    band: row.mi_score_band as MISScore['band'],
    confidence: row.confidence,
    confidenceReason: row.confidence_reason ?? undefined,
  }

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    fullSummary: row.full_summary ?? undefined,
    mis,
    miScoreComponents: components,
    miScoreExplanation: row.mi_score_explanation ?? undefined,
    fiveWH: five ?? undefined,
    category: row.category as Category,
    subcategory: (row.subcategory as IntelligenceItem['subcategory']) ?? undefined,
    sourceUrls: Array.isArray(sources) ? sources : [],
    vendorConsensus: {
      confirmed: consensus?.confirmed ?? 1,
      total: consensus?.total ?? 1,
    },
    relatedCompetitors: [],
    relatedTopics: [],
    timestamp: row.ingested_at,
    eventDate: row.event_at,
    reviewMetadata: (row.review_metadata as IntelligenceItem['reviewMetadata']) ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    userNotes: row.user_notes ?? undefined,
  }
}

export function formatVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => Number(n).toFixed(8)).join(',')}]`
}
