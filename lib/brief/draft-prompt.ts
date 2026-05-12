import type { Database } from '@/lib/supabase/types'
import { renderPromptTemplate } from '@/lib/ai/prompt-template'
import type { BriefKind } from '@/lib/types'

type Audience = Database['public']['Tables']['brief']['Row']['audience']

export const BRIEF_DRAFT_PROMPT_TEMPLATE = `You are a competitive intelligence analyst for a B2B SaaS company. Produce an executive intelligence brief.

Primary audience for tone and framing: {{audience}}.{{audience_hint_line}}

Below are intelligence items from our workspace feed. Ground every factual claim in these sources. If the sources conflict, say so briefly.
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
  audience: Audience
  items: { title: string; summary: string; content: string }[]
  audienceHint?: string
  /** Prepended before feed excerpts (e.g. full competitor dossier for competitor briefs). */
  competitorContextPrefix?: string
}): Record<string, string> {
  const blocks = opts.items.map((it, i) => {
    const body = (it.content || '').slice(0, 14_000)
    return `### Item ${i + 1}: ${it.title}\nSummary: ${it.summary || ''}\n\n${body}`
  })

  const prefix = opts.competitorContextPrefix?.trim()
  let itemsBlock = blocks.join('\n\n---\n\n')
  if (prefix) {
    itemsBlock = `${prefix}\n\n---\n\n## Selected intelligence excerpts (author-linked items)\n\n${itemsBlock}`
  }

  const hint = opts.audienceHint?.trim()
  return {
    audience: String(opts.audience),
    audience_hint: hint ?? '',
    audience_hint_line: hint ? `\nAdditional guidance from the author: ${hint}` : '',
    items_block: itemsBlock,
  }
}

export function buildBriefDraftPrompt(opts: {
  audience: Audience
  items: { title: string; summary: string; content: string }[]
  audienceHint?: string
}): string {
  const vars = buildBriefDraftPromptVariables(opts)
  return renderPromptTemplate(BRIEF_DRAFT_PROMPT_TEMPLATE, vars)
}
