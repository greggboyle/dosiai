import type { Database } from '@/lib/supabase/types'
import { renderPromptTemplate } from '@/lib/ai/prompt-template'
import type { BriefKind } from '@/lib/types'

type Audience = Database['public']['Tables']['brief']['Row']['audience']

export const BRIEF_DRAFT_PROMPT_TEMPLATE = `You are a competitive intelligence analyst for a B2B SaaS company. Produce an executive intelligence brief.

Primary audience for tone and framing: {{audience}}.{{audience_hint_line}}

Structured evidence is provided as JSON below. Parse it as a single object:
- \`authorLinkedIntelligenceItems\`: feed items the author explicitly linked to this brief (always present).
- \`competitorDossier\`: when non-null (competitor briefs with a resolved competitor id), full dossier — company profile, win/loss, hiring, battle cards, and feed intel mentioning that competitor.
- \`resolvedCompetitorId\` / \`competitorResolution\`: how the competitor was chosen.

Ground every factual claim in that JSON (and in \`items_block\` when non-empty for backward-compatible templates). If sources conflict, say so briefly.

{{brief_evidence_json}}

{{items_block}}

Return ONLY valid JSON with this exact shape (no markdown code fences):
{"title":"string","summary":"string — 2-4 sentences","body":"string — markdown body with ## headings where helpful"}

The body must be valid markdown suitable for publishing after human review.`

const BRIEF_KIND_GUIDANCE: Record<BriefKind, string> = {
  manual: 'This is a manually-authored team brief. Preserve the editor intent and keep claims tightly grounded.',
  sweep_summary:
    'This is a sweep summary brief. Prioritize the highest-signal developments and group by strategic implications.',
  daily_summary:
    'This is a daily summary brief. Focus on what changed today and what needs action in the next 24-48 hours.',
  weekly_intelligence:
    'This is a weekly intelligence brief. Synthesize patterns across the week, not just isolated events.',
  regulatory_summary:
    'This is a regulatory summary brief. Emphasize compliance, policy, legal risk, and practical business impact.',
  competitor:
    'This is a competitor brief. Center on competitor moves, implications for deals, and recommended responses.',
}

export function getBriefDraftPromptTemplateForKind(kind: BriefKind): string {
  return `${BRIEF_DRAFT_PROMPT_TEMPLATE}\n\nBrief-kind guidance:\n${BRIEF_KIND_GUIDANCE[kind]}`
}

export function buildBriefDraftPromptVariables(opts: {
  briefKind: BriefKind
  audience: Audience
  items: { title: string; summary: string; content: string }[]
  audienceHint?: string
  /** Pretty-printed JSON string (see `BriefEvidenceJsonV1`). */
  briefEvidenceJson: string
}): Record<string, string> {
  const blocks = opts.items.map((it, i) => {
    const body = (it.content || '').slice(0, 14_000)
    return `### Item ${i + 1}: ${it.title}\nSummary: ${it.summary || ''}\n\n${body}`
  })

  const itemsBlock =
    opts.briefKind === 'competitor'
      ? ''
      : blocks.join('\n\n---\n\n')

  const hint = opts.audienceHint?.trim()
  return {
    audience: String(opts.audience),
    audience_hint: hint ?? '',
    audience_hint_line: hint ? `\nAdditional guidance from the author: ${hint}` : '',
    brief_evidence_json: opts.briefEvidenceJson,
    items_block: itemsBlock,
  }
}

export function buildBriefDraftPrompt(opts: Parameters<typeof buildBriefDraftPromptVariables>[0]): string {
  const vars = buildBriefDraftPromptVariables(opts)
  return renderPromptTemplate(BRIEF_DRAFT_PROMPT_TEMPLATE, vars)
}
