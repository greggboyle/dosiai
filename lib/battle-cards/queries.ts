import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
import { parseSectionContent } from '@/lib/battle-cards/section-json'
import type { BattleCardSectionType } from '@/lib/types'

export type BattleCardRow = Database['public']['Tables']['battle_card']['Row']
export type BattleCardSectionRow = Database['public']['Tables']['battle_card_section']['Row']
export type BattleCardRecommendationRow = Database['public']['Tables']['battle_card_section_recommendation']['Row']
export type BattleCardGenerationRunRow = Database['public']['Tables']['battle_card_generation_run']['Row']

export async function getBattleCardRow(id: string): Promise<BattleCardRow | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('battle_card').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function listBattleCardsWithCompetitor(workspaceId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: cards, error } = await supabase
    .from('battle_card')
    .select('id, competitor_id, status, version, freshness_score, updated_at, published_at, interview_state')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  if (!cards?.length) return []

  const compIds = [...new Set(cards.map((c) => c.competitor_id))]
  const { data: comps } = await supabase.from('competitor').select('id,name').in('id', compIds)

  const nameById = Object.fromEntries((comps ?? []).map((c) => [c.id, c.name]))

  return cards.map((c) => ({
    ...c,
    competitorName: nameById[c.competitor_id] ?? 'Competitor',
  }))
}

export async function listSections(battleCardId: string): Promise<BattleCardSectionRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('battle_card_section')
    .select('*')
    .eq('battle_card_id', battleCardId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Service-role fetch for public share routes (no user session). */
export async function listSectionsAdmin(battleCardId: string): Promise<BattleCardSectionRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_card_section')
    .select('*')
    .eq('battle_card_id', battleCardId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function sectionsByType(rows: BattleCardSectionRow[]): Map<BattleCardSectionType, BattleCardSectionRow> {
  const m = new Map<BattleCardSectionType, BattleCardSectionRow>()
  for (const r of rows) {
    m.set(r.section_type as BattleCardSectionType, r)
  }
  return m
}

/** Parsed content by section type for UI. */
export function parseAllSectionContents(rows: BattleCardSectionRow[]) {
  const out: Partial<Record<BattleCardSectionType, unknown>> = {}
  for (const r of rows) {
    const t = r.section_type as BattleCardSectionType
    out[t] = parseSectionContent(t, r.content)
  }
  return out
}

export function orderedSectionTypesPresent(rows: BattleCardSectionRow[]): BattleCardSectionType[] {
  const have = new Set(rows.map((r) => r.section_type as BattleCardSectionType))
  return BATTLE_SECTION_ORDER.filter((t) => have.has(t))
}

export async function listOpenRecommendations(battleCardId: string): Promise<BattleCardRecommendationRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('battle_card_section_recommendation')
    .select('*')
    .eq('battle_card_id', battleCardId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

export async function getLatestGenerationRun(battleCardId: string): Promise<BattleCardGenerationRunRow | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('battle_card_generation_run')
    .select('*')
    .eq('battle_card_id', battleCardId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
