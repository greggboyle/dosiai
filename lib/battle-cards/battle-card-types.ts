export interface BattleCardListRow {
  id: string
  competitorId: string
  competitorName: string
  status: string
  version: number
  freshness_score: number | null
  updated_at: string
  aiDraftStatus: 'queued' | 'processing' | 'ready' | 'failed' | null
}
