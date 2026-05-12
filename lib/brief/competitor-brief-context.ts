import { BATTLE_SECTION_LABEL, BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
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

const MAX_DOSSIER_CHARS = 65_000
const INTEL_DAYS = 120
const MAX_INTEL_QUERY = 80
const MAX_VOICE_IN_SECTION = 18
const MAX_OTHER_INTEL = 28
const MAX_WIN_ROWS = 60
const MAX_BATTLE_CARDS = 5
const MAX_JOB_LINES = 36
const CONTENT_SLICE = 2_800
const SUMMARY_SLICE = 600

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

function clip(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…(truncated)`
}

function isVoiceItem(it: IntelligenceItem): boolean {
  return it.category === 'buy-side' || it.reviewMetadata != null
}

function formatIntelItem(it: IntelligenceItem, index: number): string {
  const body = (it.content || '').slice(0, CONTENT_SLICE)
  const sum = (it.summary || '').slice(0, SUMMARY_SLICE)
  return [
    `#### ${index + 1}. ${it.title}`,
    `- id: \`${it.id}\` · category: ${it.category} · MIS: ${it.mis.value}`,
    sum ? `Summary: ${sum}` : '',
    body ? `\n${body}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function formatIntelBlock(title: string, items: IntelligenceItem[]): string {
  if (!items.length) return `### ${title}\n_(none in window)_\n`
  const lines = items.map((it, i) => formatIntelItem(it, i)).join('\n\n')
  return `### ${title}\n\n${lines}\n`
}

function formatLeadershipMd(raw: CompRow['leadership']): string {
  if (!raw || !Array.isArray(raw)) return '_(none)_'
  const rows = raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => {
      const name = String(x.name)
      const role = String(x.role ?? '')
      const since = String(x.since ?? '')
      const li = typeof x.linkedIn === 'string' ? x.linkedIn : ''
      const parts = [role && `${role}`, since && `since ${since}`, li && `LinkedIn: ${li}`].filter(Boolean)
      return parts.length ? `- **${name}** — ${parts.join(' · ')}` : `- **${name}**`
    })
  return rows.length ? rows.join('\n') : '_(none)_'
}

function formatProductsMd(raw: CompRow['products']): string {
  if (!raw || !Array.isArray(raw)) return '_(none)_'
  const rows = raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => {
      const name = String(x.name)
      const desc = typeof x.description === 'string' ? x.description : ''
      return desc ? `- **${name}** — ${desc}` : `- **${name}**`
    })
  return rows.length ? rows.join('\n') : '_(none)_'
}

function formatSectionForPrompt(t: BattleCardSectionType, raw: unknown): string {
  const parsed = parseSectionContent(t, raw)
  switch (t) {
    case 'tldr': {
      const o = parsed as { theyPosition?: string; weCounter?: string; remember?: string }
      return ['- **They position:**', `  ${o.theyPosition || '—'}`, '- **We counter:**', `  ${o.weCounter || '—'}`, '- **Remember:**', `  ${o.remember || '—'}`].join('\n')
    }
    case 'why_we_win':
    case 'why_they_win': {
      const o = parsed as { bullets?: { text?: string }[] }
      const bs = o.bullets ?? []
      if (!bs.length) return '_(empty)_'
      return bs.map((b) => `- ${(b.text ?? '').trim() || '—'}`).join('\n')
    }
    case 'objections': {
      const o = parsed as { pairs?: { objection?: string; response?: string }[] }
      const ps = o.pairs ?? []
      if (!ps.length) return '_(empty)_'
      return ps
        .map((p, i) => {
          const ob = (p.objection ?? '').trim() || '—'
          const re = (p.response ?? '').trim() || '—'
          return `${i + 1}. **Objection:** ${ob}\n   **Response:** ${re}`
        })
        .join('\n\n')
    }
    case 'trap_setters': {
      const o = parsed as { questions?: string[] }
      const qs = o.questions ?? []
      if (!qs.length) return '_(empty)_'
      return qs.map((q) => `- ${q}`).join('\n')
    }
    case 'proof_points': {
      const o = parsed as { points?: { headline?: string; detail?: string; customer?: string; quote?: string }[] }
      const pts = o.points ?? []
      if (!pts.length) return '_(empty)_'
      return pts
        .map((p) => {
          const bits = [p.headline && `**${p.headline}**`, p.detail, p.customer && `Customer: ${p.customer}`, p.quote && `> ${p.quote}`]
            .filter(Boolean)
            .join('\n')
          return bits || '—'
        })
        .join('\n\n')
    }
    case 'pricing': {
      const o = parsed as { theirs?: string; ours?: string }
      return [`- **Theirs:** ${o.theirs || '—'}`, `- **Ours:** ${o.ours || '—'}`].join('\n')
    }
    case 'recent_activity': {
      const o = parsed as { items?: { title?: string; miScore?: number }[] }
      const it = o.items ?? []
      if (!it.length) return '_(empty)_'
      return it.map((x) => `- ${x.title ?? '—'}${x.miScore != null ? ` (MIS ${x.miScore})` : ''}`).join('\n')
    }
    case 'talk_tracks': {
      const o = parsed as { tracks?: { scenario?: string; content?: string }[] }
      const tr = o.tracks ?? []
      if (!tr.length) return '_(empty)_'
      return tr
        .map((x, i) => {
          const sc = (x.scenario ?? '').trim() || `Track ${i + 1}`
          const body = (x.content ?? '').trim() || '—'
          return `**${sc}**\n${body}`
        })
        .join('\n\n')
    }
    default:
      return '_(unknown section)_'
  }
}

function formatBattleCardBlock(cardId: string, segment: string | null, status: string, sections: BattleSectionRow[]): string {
  const byType = new Map(sections.map((s) => [s.section_type as BattleCardSectionType, s]))
  const parts: string[] = [`#### Battle card \`${cardId}\`${segment ? ` · segment: ${segment}` : ''} · status: ${status}`]
  for (const t of BATTLE_SECTION_ORDER) {
    const row = byType.get(t)
    if (!row) continue
    const label = BATTLE_SECTION_LABEL[t]
    parts.push(`##### ${label}`, formatSectionForPrompt(t, row.content))
  }
  return parts.join('\n\n')
}

function formatHiringMd(postings: CompetitorJobPosting[], rollup: CompetitorHiringRollup): string {
  const lines: string[] = [
    `Open roles (posting_status=open): **${rollup.openCount}** · new opens last 30d: **${rollup.newOpensLast30d}** · senior+ share of open roles: **${rollup.seniorPlusOpenShare}%** · high-threat open: **${rollup.highThreatOpenCount}** · watchlist open: **${rollup.watchlistOpenCount}**`,
  ]
  const open = postings.filter((p) => p.postingStatus === 'open').slice(0, MAX_JOB_LINES)
  if (!open.length) {
    lines.push('_(no open postings in the loaded window)_')
    return lines.join('\n\n')
  }
  lines.push(
    ...open.map((p) => {
      const dept = p.payload.department ?? p.payload.function ?? ''
      const loc = p.payload.location?.raw ?? p.payload.location?.country ?? ''
      const bits = [p.title, dept && `(${dept})`, loc && `· ${loc}`].filter(Boolean).join(' ')
      return `- ${bits}`
    })
  )
  return lines.join('\n\n')
}

function formatWinLossRows(rows: WinRow[]): string {
  if (!rows.length) return '_(no logged outcomes referencing this competitor)_\n'
  return rows
    .map((r, i) => {
      const tags = (r.reason_tags ?? []).join(', ')
      const notes = r.notes?.trim() ? ` · notes: ${r.notes.trim()}` : ''
      return `${i + 1}. **${r.close_date}** · ${r.outcome.toUpperCase()} · ${r.deal_name}${r.segment ? ` · segment: ${r.segment}` : ''}\n   Reasons: ${r.reason_summary}${tags ? ` · tags: [${tags}]` : ''}${notes}`
    })
    .join('\n')
}

/**
 * Builds a markdown dossier for competitor-scoped brief drafting (Inngest / service role).
 * Analyst “Notes” tab on the profile is not persisted yet — only structured competitor fields (e.g. pricing notes) appear here.
 */
export async function buildCompetitorBriefContextMarkdown(
  supabase: AdminClient,
  workspaceId: string,
  competitorId: string
): Promise<string> {
  const since = new Date(Date.now() - INTEL_DAYS * 86400000).toISOString()

  const { data: compRow, error: cErr } = await supabase
    .from('competitor')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', competitorId)
    .maybeSingle()
  if (cErr) throw cErr
  if (!compRow) return '_(Competitor record not found.)_'

  const [
    intelRes,
    jobRes,
    battleCardsRes,
    winRes,
  ] = await Promise.all([
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

  const strengths = (compRow.strengths ?? []).map((s) => `- ${s}`).join('\n') || '_(none)_'
  const weaknesses = (compRow.weaknesses ?? []).map((s) => `- ${s}`).join('\n') || '_(none)_'
  const segments = (compRow.segment_relevance ?? []).join(', ') || '—'

  const parts: string[] = [
    `# Competitor: ${compRow.name}`,
    `id: \`${compRow.id}\` · tier: **${compRow.tier}** · status: **${compRow.status}**`,
    compRow.website ? `Website: ${compRow.website}` : '',
    '',
    '## Company summary',
    compRow.positioning?.trim() ? `**Positioning:** ${compRow.positioning.trim()}` : '',
    compRow.icp_description?.trim() ? `**ICP:** ${compRow.icp_description.trim()}` : '',
    `**Segments:** ${segments}`,
    compRow.pricing_model ? `**Pricing model:** ${compRow.pricing_model}` : '',
    compRow.pricing_notes?.trim() ? `**Pricing notes:** ${compRow.pricing_notes.trim()}` : '',
    compRow.founded_year != null ? `**Founded:** ${compRow.founded_year}` : '',
    compRow.hq_location?.trim() ? `**HQ:** ${compRow.hq_location.trim()}` : '',
    compRow.employee_count_estimate != null ? `**Employee estimate:** ${compRow.employee_count_estimate}` : '',
    compRow.funding_status?.trim() ? `**Funding:** ${compRow.funding_status.trim()}` : '',
    '',
    '## Products',
    formatProductsMd(compRow.products),
    '',
    '## Strengths',
    strengths,
    '',
    '## Weaknesses',
    weaknesses,
    '',
    '## Leadership',
    formatLeadershipMd(compRow.leadership),
    '',
    '## Notes',
    '_Free-form analyst notes from the profile UI are not stored in the database yet. Use **Pricing notes** under Company summary when present._',
    '',
    '## Win / loss history (deals referencing this competitor)',
    formatWinLossRows(winLimited),
    '',
    '## Hiring',
    formatHiringMd(jobPostings, hiringRollup),
    '',
    '## Customer voice (buy-side & reviews)',
    formatIntelBlock('Buy-side and review-tagged intelligence', voiceItems),
    '',
    '## Other recent intelligence (mentioning this competitor)',
    formatIntelBlock('Sell-side, channel, regulatory, and other categories', otherIntel),
    '',
    '## Battle cards',
  ]

  if (!sectionLists.length) {
    parts.push('_(No battle cards for this competitor.)', '')
  } else {
    for (const { card, sections } of sectionLists) {
      parts.push(formatBattleCardBlock(card.id, card.segment_tag, card.status, sections as BattleSectionRow[]), '')
    }
  }

  let md = parts.filter(Boolean).join('\n')
  md = clip(md, MAX_DOSSIER_CHARS)
  return md
}
