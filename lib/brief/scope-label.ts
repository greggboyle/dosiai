import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getRelativeTime } from '@/lib/types'

type BriefRow = Database['public']['Tables']['brief']['Row']

/** Fallback when no linked items or before async recompute runs. */
export function scopeLabelFallback(row: Pick<BriefRow, 'brief_kind' | 'linked_item_ids' | 'linked_competitor_ids'>): string {
  const n = row.linked_item_ids?.length ?? 0
  const c = row.linked_competitor_ids?.length ?? 0
  switch (row.brief_kind) {
    case 'competitor':
      return n ? `${n} source item${n === 1 ? '' : 's'}` : 'No linked sources'
    case 'sweep_summary':
      return `${n} item${n === 1 ? '' : 's'} synthesized${c ? ` · ${c} competitor${c === 1 ? '' : 's'}` : ''}`
    case 'manual':
      return 'Team-authored brief'
    case 'regulatory_summary':
      return n ? `${n} intelligence source${n === 1 ? '' : 's'}` : 'Regulatory sweep context'
    case 'daily_summary':
    case 'weekly_intelligence':
      return n ? `${n} item${n === 1 ? '' : 's'} in window` : 'Summary window'
    default:
      return n ? `${n} linked item${n === 1 ? '' : 's'}` : ''
  }
}

export function scopeLabelForManualRow(updatedAt: string): string {
  return `Last edited ${getRelativeTime(updatedAt)}`
}

/**
 * Recompute scope label from linked intelligence items (MIS bands, date span, competitor spread).
 * Persists to `brief.cached_scope_label`.
 */
export async function recomputeBriefCachedScopeLabel(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  reviewThreshold: number,
  row: BriefRow
): Promise<string | null> {
  const ids = row.linked_item_ids ?? []
  if (ids.length === 0) {
    const fallback =
      row.brief_kind === 'manual'
        ? scopeLabelForManualRow(row.updated_at)
        : scopeLabelFallback(row)
    await supabase.from('brief').update({ cached_scope_label: fallback }).eq('id', row.id)
    return fallback
  }

  const { data: items, error } = await supabase
    .from('intelligence_item')
    .select('ingested_at, mi_score, mi_score_band, related_competitors')
    .eq('workspace_id', workspaceId)
    .in('id', ids)

  if (error || !items?.length) {
    const fallback = scopeLabelFallback(row)
    await supabase.from('brief').update({ cached_scope_label: fallback }).eq('id', row.id)
    return fallback
  }

  const ms = items.map((i) => new Date(i.ingested_at).getTime()).filter(Number.isFinite)
  const oldest = ms.length ? Math.min(...ms) : null
  const newest = ms.length ? Math.max(...ms) : null
  const daySpan =
    oldest !== null && newest !== null
      ? Math.max(1, Math.ceil((newest - oldest) / (24 * 60 * 60 * 1000)))
      : null

  const highMisCount = items.filter(
    (i) =>
      i.mi_score_band === 'high' ||
      i.mi_score_band === 'critical' ||
      (typeof i.mi_score === 'number' && i.mi_score >= reviewThreshold)
  ).length

  const unionCompetitors = new Set<string>()
  for (const it of items) {
    for (const rc of it.related_competitors ?? []) {
      if (rc) unionCompetitors.add(rc)
    }
  }
  const compCount = Math.max(unionCompetitors.size, row.linked_competitor_ids?.length ?? 0)

  const n = items.length
  let label = ''

  switch (row.brief_kind) {
    case 'competitor':
      label =
        daySpan !== null
          ? `${n} source item${n === 1 ? '' : 's'} · ${daySpan} day${daySpan === 1 ? '' : 's'} of activity`
          : `${n} source item${n === 1 ? '' : 's'}`
      break
    case 'sweep_summary':
      label = `${n} item${n === 1 ? '' : 's'} synthesized · ${compCount} competitor${compCount === 1 ? '' : 's'} · ${highMisCount} high-MIS`
      break
    case 'regulatory_summary':
      label = `${n} source${n === 1 ? '' : 's'} · last updated ${getRelativeTime(row.updated_at)}`
      break
    case 'daily_summary':
    case 'weekly_intelligence':
      label = `${n} item${n === 1 ? '' : 's'} in window`
      break
    case 'manual':
      label = scopeLabelForManualRow(row.updated_at)
      break
    default:
      label = scopeLabelFallback(row)
  }

  await supabase.from('brief').update({ cached_scope_label: label }).eq('id', row.id)
  return label
}

export function displayScopeLabel(row: BriefRow): string {
  if (row.cached_scope_label?.trim()) return row.cached_scope_label.trim()
  if (row.brief_kind === 'manual') return scopeLabelForManualRow(row.updated_at)
  return scopeLabelFallback(row)
}
