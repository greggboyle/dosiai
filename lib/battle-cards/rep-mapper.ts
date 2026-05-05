import { parseSectionContent } from '@/lib/battle-cards/section-json'
import type { BattleCardSectionRow } from '@/lib/battle-cards/queries'
import type { BattleCardSectionType } from '@/lib/types'

export interface RepBattleCardView {
  competitorName: string
  tierLabel?: string
  freshnessScore: number | null
  stale: boolean
  tldr: {
    theyPosition: string
    weCounter: string
    remember: string
  }
  whyWeWin: { text: string }[]
  whyTheyWin: { text: string }[]
  objections: { objection: string; response: string }[]
  trapQuestions: string[]
  proofPoints: { headline: string; detail?: string }[]
  pricing: { theirs: string; ours: string }
  recentActivity: { title: string; miScore?: number }[]
  talkTracks: { scenario: string; content: string }[]
}

export function buildRepBattleCardView(args: {
  competitorName: string
  competitorTier?: string
  freshnessScore: number | null
  sections: BattleCardSectionRow[]
}): RepBattleCardView {
  const { competitorName, competitorTier, freshnessScore, sections } = args
  const get = (t: BattleCardSectionType) =>
    sections.find((s) => (s.section_type as BattleCardSectionType) === t)

  const tldrRaw = parseSectionContent('tldr', get('tldr')?.content) as {
    theyPosition?: string
    weCounter?: string
    remember?: string
  }

  const ww = parseSectionContent('why_we_win', get('why_we_win')?.content) as { bullets?: { text: string }[] }
  const wt = parseSectionContent('why_they_win', get('why_they_win')?.content) as { bullets?: { text: string }[] }
  const obj = parseSectionContent('objections', get('objections')?.content) as {
    pairs?: { objection: string; response: string }[]
  }
  const traps = parseSectionContent('trap_setters', get('trap_setters')?.content) as { questions?: string[] }
  const proof = parseSectionContent('proof_points', get('proof_points')?.content) as {
    points?: { headline: string; detail?: string }[]
  }
  const price = parseSectionContent('pricing', get('pricing')?.content) as { theirs?: string; ours?: string }
  const recent = parseSectionContent('recent_activity', get('recent_activity')?.content) as {
    items?: { title: string; miScore?: number }[]
  }
  const tracks = parseSectionContent('talk_tracks', get('talk_tracks')?.content) as {
    tracks?: { scenario: string; content: string }[]
  }

  const stale = freshnessScore !== null && freshnessScore < 60

  return {
    competitorName,
    tierLabel: competitorTier,
    freshnessScore,
    stale,
    tldr: {
      theyPosition: tldrRaw.theyPosition ?? '',
      weCounter: tldrRaw.weCounter ?? '',
      remember: tldrRaw.remember ?? '',
    },
    whyWeWin: (ww.bullets ?? []).map((b) => ({ text: b.text })),
    whyTheyWin: (wt.bullets ?? []).map((b) => ({ text: b.text })),
    objections: obj.pairs ?? [],
    trapQuestions: traps.questions ?? [],
    proofPoints: proof.points ?? [],
    pricing: { theirs: price.theirs ?? '', ours: price.ours ?? '' },
    recentActivity: recent.items?.map((i) => ({ title: i.title, miScore: i.miScore })) ?? [],
    talkTracks: tracks.tracks ?? [],
  }
}
