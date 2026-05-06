import type { Database } from '@/lib/supabase/types'
import { renderPromptTemplate } from '@/lib/ai/prompt-template'

type Audience = Database['public']['Tables']['brief']['Row']['audience']

export const BRIEF_DRAFT_PROMPT_TEMPLATE = `You are a competitive intelligence analyst for a B2B SaaS company. Produce an executive intelligence brief.

Primary audience for tone and framing: {{audience}}.{{audience_hint_line}}

Below are intelligence items from our workspace feed. Ground every factual claim in these sources. If the sources conflict, say so briefly.
{{items_block}}

Return ONLY valid JSON with this exact shape (no markdown code fences):
{"title":"string","summary":"string — 2-4 sentences","body":"string — markdown body with ## headings where helpful"}

The body must be valid markdown suitable for publishing after human review.`

export function buildBriefDraftPromptVariables(opts: {
  audience: Audience
  items: { title: string; summary: string; content: string }[]
  audienceHint?: string
}): Record<string, string> {
  const blocks = opts.items.map((it, i) => {
    const body = (it.content || '').slice(0, 14_000)
    return `### Item ${i + 1}: ${it.title}\nSummary: ${it.summary || ''}\n\n${body}`
  })

  const hint = opts.audienceHint?.trim()
  return {
    audience: String(opts.audience),
    audience_hint: hint ?? '',
    audience_hint_line: hint ? `\nAdditional guidance from the author: ${hint}` : '',
    items_block: blocks.join('\n\n---\n\n'),
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
