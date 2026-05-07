import type { AIPurpose, AIVendor, PromptVariable } from '@/lib/admin-types'
import { SWEEP_SELF_PROMPT_TEMPLATE } from '@/lib/sweep/self-prompt-template'

export type EmbeddedPromptDefault = {
  purpose: AIPurpose
  content: string
  variables: PromptVariable[]
}

const SWEEP_SHARED_PROMPT = `You are an intelligence analyst. Return STRICT JSON matching {"items":[...]} with fields defined by the schema.
Purpose: {{purpose}}.
Company context:
{{company_summary}}

Tracked competitors:
{{competitor_lines}}

Active topics:
{{topic_lines}}

Each item must include: title, summary, confidence (low|medium|high), confidenceReason, category as exactly one of the strings "buy-side", "sell-side", "channel", or "regulatory" (no other labels), sourceUrls (array of {name,url,domain}), optional fiveWH as an object {"who","what","when","where","why","how"} strings or omit entirely (never a bare string), optional eventAt ISO string, optional sourceType, optional relatedCompetitorNames (string[]), optional entitiesMentioned ([{name}]).

Grounding rules (mandatory):
- Do not fabricate events, quotes, funding, releases, partnerships, or URLs. Every concrete factual claim in title or summary must be traceable to real public information; include at least one credible sourceUrls entry with a real https URL that would plausibly support the claim.
- If you cannot cite verifiable sources for an item, omit that item. If nothing qualifies for this purpose, return {"items":[]}.
- Prefer fewer, well-sourced items over padding the list. Use confidence "low" and explain gaps or weak evidence in confidenceReason when appropriate.
- Never use placeholder, example, or obviously fake domains.`

export { SWEEP_SHARED_PROMPT as SWEEP_SHARED_PROMPT_TEMPLATE }

const SWEEP_VARIABLES: PromptVariable[] = [
  { name: 'purpose', type: 'string', description: 'Sweep purpose key.', example: 'sweep_buy' },
  {
    name: 'company_summary',
    type: 'string',
    description: 'Workspace profile summary + ICP/industry context.',
    example: 'Company: B2B logistics SaaS\nICP: Mid-market shippers',
  },
  {
    name: 'competitor_lines',
    type: 'string',
    description: 'Tracked competitors list.',
    example: '- Acme Logistics (tier_1)\n- FleetOps (tier_2)',
  },
  {
    name: 'topic_lines',
    type: 'string',
    description: 'Active topic lines for current workspace.',
    example: '- Pricing trends: quarterly packaging shifts',
  },
]

const SWEEP_SELF_VARIABLES: PromptVariable[] = [
  { name: 'legal_name', type: 'string', description: 'Workspace legal company name.', example: 'Dosimetry Insights Inc.' },
  { name: 'primary_url', type: 'string', description: 'Official company website URL.', example: 'https://example.com' },
  {
    name: 'product_names',
    type: 'string',
    description: 'Comma-separated product names from workspace profile.',
    example: 'Product A, Product B',
  },
  {
    name: 'brand_aliases',
    type: 'string',
    description: 'Comma-separated alternate brand names.',
    example: 'ExampleCo, Example',
  },
  {
    name: 'social_handles_json',
    type: 'string',
    description: 'JSON object of known social handles (stringified).',
    example: '{"twitter":"exampleco"}',
  },
]

const EMBEDDED_PROMPTS: EmbeddedPromptDefault[] = [
  { purpose: 'sweep_buy', content: SWEEP_SHARED_PROMPT, variables: SWEEP_VARIABLES },
  { purpose: 'sweep_sell', content: SWEEP_SHARED_PROMPT, variables: SWEEP_VARIABLES },
  { purpose: 'sweep_channel', content: SWEEP_SHARED_PROMPT, variables: SWEEP_VARIABLES },
  { purpose: 'sweep_regulatory', content: SWEEP_SHARED_PROMPT, variables: SWEEP_VARIABLES },
  { purpose: 'sweep_self', content: SWEEP_SELF_PROMPT_TEMPLATE, variables: SWEEP_SELF_VARIABLES },
  { purpose: 'sweep_topic', content: SWEEP_SHARED_PROMPT, variables: SWEEP_VARIABLES },
  {
    purpose: 'scoring',
    content: `You are scoring competitive intelligence. In one short paragraph, explain why this item has MIS {{mis_value}}/100 for our user.
Reference the main component drivers: {{components_json}}.
Item title: {{item_title}}.`,
    variables: [
      { name: 'mis_value', type: 'number', description: 'Final MIS score value.', example: '78' },
      {
        name: 'components_json',
        type: 'string',
        description: 'JSON object of weighted component scores.',
        example: '{"recency":81,"source_quality":66,"consensus":74}',
      },
      { name: 'item_title', type: 'string', description: 'Intelligence item title.', example: 'Acme launches partner API' },
    ],
  },
  {
    purpose: 'brief_drafting',
    content: `You are a competitive intelligence analyst for a B2B SaaS company. Produce an executive intelligence brief.

Primary audience for tone and framing: {{audience}}.{{audience_hint_line}}

Below are intelligence items from our workspace feed. Ground every factual claim in these sources. If the sources conflict, say so briefly.
{{items_block}}

Return ONLY valid JSON with this exact shape (no markdown code fences):
{"title":"string","summary":"string — 2-4 sentences","body":"string — markdown body with ## headings where helpful"}

The body must be valid markdown suitable for publishing after human review.`,
    variables: [
      { name: 'audience', type: 'string', description: 'Brief audience enum.', example: 'exec' },
      {
        name: 'audience_hint_line',
        type: 'string',
        description: 'Optional guidance line including newline prefix when provided.',
        example: '\nAdditional guidance from the author: Focus on renewal risk in EMEA.',
      },
      {
        name: 'items_block',
        type: 'string',
        description: 'Formatted intelligence items block from linked feed items.',
        example: '### Item 1: ...',
      },
    ],
  },
  {
    purpose: 'battle_card_interview',
    content: `You are helping build a sales battle card section about competitor "{{competitor_name}}".

Section: {{section_label}}

Recent intelligence context from our workspace feed (last ~30 days when available):
{{feed_context}}

Author / interview answer (verbatim from our AE or analyst — preserve specifics):
"""
{{user_answer}}
"""

Produce structured JSON for this section ONLY. {{json_shape}}

Rules:
- Ground claims in the author answer and feed context; avoid inventing funding rounds or named customers not mentioned.
- Be concise; bullets should be scannable in the field.
- Return ONLY valid JSON, no markdown fences.`,
    variables: [
      { name: 'competitor_name', type: 'string', description: 'Competitor display name.', example: 'Acme Logistics' },
      { name: 'section_label', type: 'string', description: 'Battle card section name.', example: 'Why We Win' },
      { name: 'feed_context', type: 'string', description: 'Recent feed context block.', example: '### Signal 1 ...' },
      { name: 'user_answer', type: 'string', description: 'Interview answer text.', example: 'Their onboarding is slower...' },
      { name: 'json_shape', type: 'string', description: 'Expected output schema snippet.', example: 'Shape: {"bullets":[...]}' },
    ],
  },
  {
    purpose: 'battle_card_draft',
    content: `You are generating a full sales battle card for competitor "{{competitor_name}}".

Use only the provided context. If evidence is insufficient, return null for the fill and explain why in rationale.

Resource context:
{{resource_context}}

Recent intelligence context:
{{intel_context}}

Current section content:
{{existing_sections}}

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "results": [
    {
      "sectionType": "tldr|why_we_win|why_they_win|objections|trap_setters|proof_points|pricing|recent_activity|talk_tracks",
      "fill": object|null,
      "improvementSuggestion": string|null,
      "rationale": "string",
      "confidence": number,
      "citations": [{"source":"string","quote":"string"}]
    }
  ]
}

Rules:
- fill is used only when section is empty; it must match the exact section JSON schema.
- If section is not empty, provide improvementSuggestion instead of overwriting.
- Ground everything in provided context. No fabricated logos, pricing, funding, customer names, or timelines.`,
    variables: [
      { name: 'competitor_name', type: 'string', description: 'Competitor display name.', example: 'Acme Logistics' },
      { name: 'resource_context', type: 'string', description: 'Selected resource excerpts.', example: '## Resource 1 ...' },
      { name: 'intel_context', type: 'string', description: 'Recent intelligence excerpts.', example: '## Intel 1 ...' },
      { name: 'existing_sections', type: 'string', description: 'Current card section JSON content.', example: '{"tldr":{"theyPosition":""}}' },
    ],
  },
]

export function getEmbeddedPromptDefault(purpose: AIPurpose): EmbeddedPromptDefault | null {
  return EMBEDDED_PROMPTS.find((p) => p.purpose === purpose) ?? null
}

export function buildPromptTemplateName(purpose: AIPurpose, vendor: AIVendor): string {
  return `${purpose} — ${vendor}`
}
