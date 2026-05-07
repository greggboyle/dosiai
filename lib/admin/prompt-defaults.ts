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
    content: `You are the competitive intelligence authoring assistant for {{competitor_name}}.

## Objective
Produce seller-ready battle card content grounded ONLY in the blocks below: internal resources, recent intel, win/loss history, and existing section JSON. Your audience is account executives and solution consultants preparing live conversations—not marketing fluff.

## Inputs (trust hierarchy)
1. **Resource context** — approved internal documents (highest authority for positioning and messaging nuance).
2. **Recent intelligence** — external/market signals; use for “recent_activity”, proof, and timely facts. Each intel excerpt includes a UUID **id** line—preserve those ids exactly when populating recent_activity.
3. **Win/loss context** — closed deals and reason tags; use for realistic objections, why-we-win / why-they-win, and talk tracks. Do not invent outcomes not reflected here.
4. **Existing sections** — JSON snapshot per section. Respect user-entered text.

If a section would require facts not present in any block: set \`fill\` to null for empty sections (and briefly explain in \`rationale\`) OR supply \`improvementSuggestion\` that asks for missing data instead of inventing numbers.

## Voice and quality bar
- Short clauses; bullets over paragraphs where the schema asks for lists.
- Prefer “we / they” framing that reps can read aloud.
- Name {{competitor_name}} consistently (same spelling as inputs).
- Never invent: funding rounds, logos, named customers, dollar amounts, dates, SLAs, certifications, awards, headcount, regions served, or competitor product names unless they appear in the provided context.
- If you infer something weaker than a fact, lower \`confidence\` and say what was inferred in \`rationale\`.

## fill vs improvementSuggestion (critical)
Inspect **existing_sections** for each section type:
- If that section is **empty** (no substantive content): provide **fill** with a complete JSON object matching the section schema below. Set **improvementSuggestion** to null.
- If that section **already has content**: set **fill** to null; provide **improvementSuggestion** with concise edits or additive bullets the author could paste—do not repeat the entire section unless necessary.

## citations
Populate \`citations\` when a claim draws on a specific intel title, resource filename, or win/loss outcome. Use \`source\` like \`Intel: <title>\` or \`Resource: <file>\` or \`Win/loss\`; optional \`quote\` = short excerpt.

---

## Section schemas (\`fill\` must match exactly)

**tldr** — \`sectionType\`: \`tldr\`
\`\`\`json
{"theyPosition":"","weCounter":"","remember":""}
\`\`\`
- theyPosition: how {{competitor_name}} positions / shows up in deals (from context).
- weCounter: our differentiated response in plain language.
- remember: 2–4 memorable bullets reps should internalize.

**why_we_win** — \`why_we_win\`
\`\`\`json
{"bullets":[{"text":"","evidenceItemId":""}]}
\`\`\`
- Up to 6 bullets; \`evidenceItemId\` optional—when tied to intel, use that intel’s \`id\` UUID from Recent intelligence.

**why_they_win** — \`why_they_win\`
Same shape as why_we_win. Be fair and specific; ground in win/loss or intel.

**objections** — \`objections\`
\`\`\`json
{"pairs":[{"objection":"","response":""}]}
\`\`\`
- Real objections buyers raise about us vs {{competitor_name}}; responses grounded in resources/intel/win-loss.

**trap_setters** — \`trap_setters\`
\`\`\`json
{"questions":["",""]}
\`\`\`
- Neutral discovery questions that surface gaps in {{competitor_name}}’s story (no “gotcha” insults).

**proof_points** — \`proof_points\`
\`\`\`json
{"points":[{"headline":"","detail":"","customer":"","quote":""}]}
\`\`\`
- \`customer\` / \`quote\` only if present in context; otherwise omit or leave empty strings.

**pricing** — \`pricing\`
\`\`\`json
{"theirs":"","ours":""}
\`\`\`
- Describe positioning bands or packaging qualitatively unless exact figures appear in context.

**recent_activity** — \`recent_activity\`
\`\`\`json
{"items":[{"itemId":"","title":""}]}
\`\`\`
- Optional per item when known from intel: \`ingestedAt\` (ISO), \`miScore\` (number).
- **itemId** MUST equal an intel \`id\` from Recent intelligence (same UUID string).
- **title** should match or tightly summarize that intel item’s title.
- Omit \`ingestedAt\` and \`miScore\` unless those values appear in context (do not default them to zero).

**talk_tracks** — \`talk_tracks\`
\`\`\`json
{"tracks":[{"scenario":"","content":""}]}
\`\`\`
- Scenarios like “Executive briefing”, “Technical deep-dive”, “Procurement / ROI”; content = short script bullets.

---

Include **at most one \`results\` entry per section type** (nine types exist). Omit sections that need no updates; prioritize filling **empty** sections first.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "results": [
    {
      "sectionType": "tldr|why_we_win|why_they_win|objections|trap_setters|proof_points|pricing|recent_activity|talk_tracks",
      "fill": {},
      "improvementSuggestion": null,
      "rationale": "",
      "confidence": 0.85,
      "citations": [{"source":"","quote":""}]
    }
  ]
}

---

Resource context:
{{resource_context}}

Recent intelligence context:
{{intel_context}}

Win/loss context:
{{win_loss_context}}

Current section content (JSON snapshot):
{{existing_sections}}`,
    variables: [
      { name: 'competitor_name', type: 'string', description: 'Competitor display name.', example: 'Acme Logistics' },
      { name: 'resource_context', type: 'string', description: 'Selected resource excerpts.', example: '## Resource 1 ...' },
      { name: 'intel_context', type: 'string', description: 'Recent intelligence excerpts with ids.', example: '### Intel 1\nid: uuid…' },
      { name: 'win_loss_context', type: 'string', description: 'Win/loss outcomes and reason trends.', example: '## Outcomes ...' },
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
