import type { SupabaseClient } from '@supabase/supabase-js'
import { formatVectorLiteral } from '@/lib/intelligence/map-row'
import { embedText } from '@/lib/mis/score'
import type { WorkspacePlan } from '@/lib/types/dosi'

/** Fields required to build embedding inputs (company profile + onboarding). */
export type WorkspaceProfileEmbeddingSource = {
  legalName: string
  primaryUrl: string
  companySummary: string | null
  icpDescription: string | null
  industry: string | null
  productNames: string[]
  brandAliases: string[]
  valueProps: string[]
  differentiators: string[]
}

export function buildCompanyEmbeddingInput(src: WorkspaceProfileEmbeddingSource): string {
  const lines: string[] = []
  const ln = src.legalName.trim()
  const url = src.primaryUrl.trim()
  if (ln) lines.push(`Legal name: ${ln}`)
  if (url) lines.push(`Primary URL: ${url}`)
  const summary = src.companySummary?.trim()
  if (summary) lines.push(`Company summary: ${summary}`)
  const icp = src.icpDescription?.trim()
  if (icp) lines.push(`ICP: ${icp}`)
  const ind = src.industry?.trim()
  if (ind) lines.push(`Industry: ${ind}`)
  if (src.productNames.length) lines.push(`Products: ${src.productNames.join(', ')}`)
  if (src.brandAliases.length) lines.push(`Brand aliases: ${src.brandAliases.join(', ')}`)
  return lines.join('\n').trim().slice(0, 8000)
}

export function buildDifferentiatorsEmbeddingInput(
  valueProps: string[],
  differentiators: string[]
): string {
  if (valueProps.length === 0 && differentiators.length === 0) return ''
  const chunks: string[] = []
  if (valueProps.length) {
    chunks.push(`Value propositions:\n${valueProps.map((l) => `- ${l}`).join('\n')}`)
  }
  if (differentiators.length) {
    chunks.push(`Differentiators:\n${differentiators.map((l) => `- ${l}`).join('\n')}`)
  }
  return chunks.join('\n\n').trim().slice(0, 8000)
}

/**
 * Updates workspace_profile.embedding and differentiators_embedding after profile text changes.
 * Uses the same embedding route as feed items. Failures are logged; partial updates apply when one side succeeds.
 * Empty positioning text clears the corresponding column (MIS falls back to neutral defaults).
 */
export async function persistWorkspaceProfileEmbeddings(
  supabase: SupabaseClient,
  workspaceId: string,
  plan: WorkspacePlan,
  source: WorkspaceProfileEmbeddingSource
): Promise<void> {
  const companyText = buildCompanyEmbeddingInput(source)
  const diffText = buildDifferentiatorsEmbeddingInput(source.valueProps, source.differentiators)

  const updates: Record<string, string | null> = {}

  if (companyText.length === 0) {
    updates.embedding = null
  } else {
    try {
      const vec = await embedText(workspaceId, plan, companyText)
      if (vec?.length) updates.embedding = formatVectorLiteral(vec)
    } catch (e) {
      console.error('[workspace_profile] company embedding failed', {
        workspaceId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (diffText.length === 0) {
    updates.differentiators_embedding = null
  } else {
    try {
      const vec = await embedText(workspaceId, plan, diffText)
      if (vec?.length) updates.differentiators_embedding = formatVectorLiteral(vec)
    } catch (e) {
      console.error('[workspace_profile] differentiators embedding failed', {
        workspaceId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (Object.keys(updates).length === 0) return

  const { error } = await supabase
    .from('workspace_profile')
    .update(updates)
    .eq('workspace_id', workspaceId)

  if (error) {
    const msg = (error.message ?? '').toLowerCase()
    const missingColumn =
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      msg.includes('embedding') ||
      msg.includes('differentiators_embedding')
    if (missingColumn) {
      console.warn('[workspace_profile] embedding columns missing or not writable; skipped persist', error.message)
      return
    }
    console.error('[workspace_profile] failed to persist embeddings', error.message)
  }
}
