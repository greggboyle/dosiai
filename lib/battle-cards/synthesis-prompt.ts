import type { BattleCardSectionType } from '@/lib/types'
import { BATTLE_SECTION_LABEL } from '@/lib/battle-cards/constants'

export function buildSynthesisPrompt(opts: {
  sectionType: BattleCardSectionType
  competitorName: string
  userAnswer: string
  feedContext: { title: string; summary: string }[]
}): string {
  const label = BATTLE_SECTION_LABEL[opts.sectionType]
  const ctx =
    opts.feedContext.length > 0
      ? opts.feedContext.map((x, i) => `### Signal ${i + 1}\n**${x.title}**\n${x.summary}`).join('\n\n')
      : '(No recent feed items matched — rely on the author answer.)'

  const jsonShape = jsonShapeForSection(opts.sectionType)

  return `You are helping build a sales battle card section about competitor "${opts.competitorName}".

Section: ${label}

Recent intelligence context from our workspace feed (last ~30 days when available):
${ctx}

Author / interview answer (verbatim from our AE or analyst — preserve specifics):
"""
${opts.userAnswer}
"""

Produce structured JSON for this section ONLY. ${jsonShape}

Rules:
- Ground claims in the author answer and feed context; avoid inventing funding rounds or named customers not mentioned.
- Be concise; bullets should be scannable in the field.
- Return ONLY valid JSON, no markdown fences.`
}

function jsonShapeForSection(type: BattleCardSectionType): string {
  switch (type) {
    case 'tldr':
      return `Shape: {"theyPosition":"string","weCounter":"string","remember":"string"}`
    case 'why_we_win':
    case 'why_they_win':
      return `Shape: {"bullets":[{"text":"string","evidenceItemId":"optional string"}]}`
    case 'objections':
      return `Shape: {"pairs":[{"objection":"string","response":"string"}]}`
    case 'trap_setters':
      return `Shape: {"questions":["string"]}`
    case 'proof_points':
      return `Shape: {"points":[{"headline":"string","detail":"optional string","customer":"optional","quote":"optional"}]}`
    case 'pricing':
      return `Shape: {"theirs":"string","ours":"string"}`
    case 'recent_activity':
      return `Shape: {"items":[{"itemId":"uuid","title":"string","ingestedAt":"iso optional","miScore":"number optional"}]}`
    case 'talk_tracks':
      return `Shape: {"tracks":[{"scenario":"string","content":"string"}]}`
    default:
      return `Shape: {}`
  }
}
