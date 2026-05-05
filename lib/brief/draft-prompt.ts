import type { Database } from '@/lib/supabase/types'

type Audience = Database['public']['Tables']['brief']['Row']['audience']

export function buildBriefDraftPrompt(opts: {
  audience: Audience
  items: { title: string; summary: string; content: string }[]
  audienceHint?: string
}): string {
  const blocks = opts.items.map((it, i) => {
    const body = (it.content || '').slice(0, 14_000)
    return `### Item ${i + 1}: ${it.title}\nSummary: ${it.summary || ''}\n\n${body}`
  })

  const hint = opts.audienceHint?.trim()

  return `You are a competitive intelligence analyst for a B2B SaaS company. Produce an executive intelligence brief.

Primary audience for tone and framing: ${opts.audience}.${hint ? `\nAdditional guidance from the author: ${hint}` : ''}

Below are intelligence items from our workspace feed. Ground every factual claim in these sources. If the sources conflict, say so briefly.

${blocks.join('\n\n---\n\n')}

Return ONLY valid JSON with this exact shape (no markdown code fences):
{"title":"string","summary":"string — 2-4 sentences","body":"string — markdown body with ## headings where helpful"}

The body must be valid markdown suitable for publishing after human review.`
}
