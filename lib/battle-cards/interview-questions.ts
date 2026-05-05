import type { BattleCardSectionType } from '@/lib/types'
import { BATTLE_SECTION_LABEL } from '@/lib/battle-cards/constants'

/** Feed-aware interview prompts (competitor name substituted by caller). */
export function interviewQuestionForSection(type: BattleCardSectionType, competitorName: string): string {
  const label = BATTLE_SECTION_LABEL[type]
  switch (type) {
    case 'tldr':
      return `TL;DR — In two or three sentences, how does ${competitorName} position in-market, how should we counter in discovery, and what should reps remember in every call?`
    case 'why_we_win':
      return `Why we win — When you've won deals against ${competitorName} in the last 6 months, what was the deciding factor in two or three of those wins? Be specific — avoid generic answers like "better integrations" unless you name which integration mattered.`
    case 'why_they_win':
      return `Why they win — When ${competitorName} wins head-to-head, what reasons do you hear most often from prospects or from loss reviews?`
    case 'objections':
      return `Top objections — What's the most common reason a prospect says they're "also evaluating ${competitorName}"? List the top three you actually hear from reps, with how you handle each.`
    case 'trap_setters':
      return `Trap-setting — Based on what you've seen in reviews and the feed, is there a wedge (e.g. slow implementation) reps should surface in discovery? If so, what's the question that exposes it without sounding like a hit job?`
    case 'proof_points':
      return `Proof points — Which customers, outcomes, or metrics do you want reps to cite against ${competitorName}?`
    case 'pricing':
      return `Pricing — How does ${competitorName} typically price vs. us (list vs. discounting, services, lock-in)? What should reps say when challenged on price?`
    case 'talk_tracks':
      return `Talk tracks — Give 2–3 short scenarios (e.g. "procurement asks for apples-to-apples") and what reps should say.`
    case 'recent_activity':
      return `Recent activity is maintained automatically from your intelligence feed. You can skip this step or add notes for the author view.`
    default:
      return `Complete the "${label}" section for ${competitorName}.`
  }
}
