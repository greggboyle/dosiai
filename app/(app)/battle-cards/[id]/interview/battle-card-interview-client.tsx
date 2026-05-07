'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  SkipForward,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { MISBadge } from '@/components/mis-badge'
import { BATTLE_SECTION_LABEL, BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
import { interviewQuestionForSection } from '@/lib/battle-cards/interview-questions'
import {
  enqueueSynthesizeSection,
  markInterviewSectionComplete,
  saveInterviewDraftAnswer,
} from '@/lib/battle-cards/actions'
import type { BattleCardSectionRow } from '@/lib/battle-cards/queries'
import type { BattleCardSectionType } from '@/lib/types'
import type { IntelligenceItem } from '@/lib/types'
import { getRelativeTime } from '@/lib/types'

export interface BattleCardInterviewClientProps {
  battleCardId: string
  competitorName: string
  feedPreview: IntelligenceItem[]
  sections: BattleCardSectionRow[]
  interviewState: {
    completedSectionTypes?: BattleCardSectionType[]
    draftAnswers?: Record<string, string>
  }
}

export function BattleCardInterviewClient({
  battleCardId,
  competitorName,
  feedPreview,
  sections,
  interviewState,
}: BattleCardInterviewClientProps) {
  const router = useRouter()
  const byType = React.useMemo(() => {
    const m = new Map<BattleCardSectionType, BattleCardSectionRow>()
    for (const s of sections) {
      m.set(s.section_type as BattleCardSectionType, s)
    }
    return m
  }, [sections])

  const completed = new Set(interviewState.completedSectionTypes ?? [])

  const currentType =
    BATTLE_SECTION_ORDER.find((t) => !completed.has(t)) ?? BATTLE_SECTION_ORDER[BATTLE_SECTION_ORDER.length - 1]

  const currentSection = byType.get(currentType)
  const [answer, setAnswer] = React.useState(() => interviewState.draftAnswers?.[currentType] ?? '')
  const [isDirty, setIsDirty] = React.useState(false)
  const lastSectionTypeRef = React.useRef<BattleCardSectionType>(currentType)

  React.useEffect(() => {
    const sectionChanged = lastSectionTypeRef.current !== currentType
    if (sectionChanged) {
      lastSectionTypeRef.current = currentType
      setAnswer(interviewState.draftAnswers?.[currentType] ?? '')
      setIsDirty(false)
      return
    }
    if (!isDirty) {
      setAnswer(interviewState.draftAnswers?.[currentType] ?? '')
    }
  }, [currentType, interviewState.draftAnswers, isDirty])

  const progressPct = Math.round((completed.size / BATTLE_SECTION_ORDER.length) * 100)

  const [busy, setBusy] = React.useState<'save' | 'synth' | 'skip' | null>(null)

  const persistDraft = async () => {
    await saveInterviewDraftAnswer(battleCardId, currentType, answer)
    setIsDirty(false)
  }

  const handleSaveDraft = async () => {
    setBusy('save')
    try {
      await persistDraft()
      toast.success('Draft saved')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const handleSynthesize = async () => {
    if (!currentSection?.id) return
    setBusy('synth')
    try {
      await persistDraft()
      await enqueueSynthesizeSection(currentSection.id, answer)
      toast.success('Synthesis queued — refreshing shortly.')
      let n = 0
      const t = window.setInterval(() => {
        router.refresh()
        n += 1
        if (n > 25) window.clearInterval(t)
      }, 2500)
      window.setTimeout(() => window.clearInterval(t), 65_000)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Queue failed')
    } finally {
      setBusy(null)
    }
  }

  const handleSkip = async () => {
    setBusy('skip')
    try {
      await persistDraft()
      await markInterviewSectionComplete(battleCardId, currentType)
      toast.success('Section skipped')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Skip failed')
    } finally {
      setBusy(null)
    }
  }

  const handleContinueAfterSynth = async () => {
    try {
      await markInterviewSectionComplete(battleCardId, currentType)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Continue failed')
    }
  }

  const synthesized = Boolean(currentSection?.ai_drafted)

  const question = interviewQuestionForSection(currentType, competitorName)

  const allDone = completed.size >= BATTLE_SECTION_ORDER.length

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/battle-cards/${battleCardId}/edit`}>
            <ArrowLeft className="size-4 mr-2" />
            Author view
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{competitorName}</span>
          <ChevronRight className="size-4" />
          <span>Interview</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Progress</span>
          <span>
            {completed.size} / {BATTLE_SECTION_ORDER.length} sections
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {allDone ? (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-lg font-medium">Interview complete</p>
            <p className="text-muted-foreground text-sm">
              Polish sections in the author view, then publish when reps should see this card.
            </p>
            <Button asChild>
              <Link href={`/battle-cards/${battleCardId}/edit`}>Open author view</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{BATTLE_SECTION_LABEL[currentType]}</Badge>
              {currentSection?.ai_drafted ? <Badge variant="secondary">AI drafted</Badge> : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{question}</p>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Intelligence context (last ~30 days, top MIS)
              </p>
              <div className="space-y-2 max-h-[280px] overflow-auto">
                {feedPreview.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent feed items for this competitor yet.</p>
                ) : (
                  feedPreview.map((item) => (
                    <Card key={item.id} className="border-border/80">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <MISBadge score={item.mis} size="sm" />
                          <span className="text-sm font-medium leading-snug">{item.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">{item.summary}</p>
                        <p className="text-[10px] text-muted-foreground">{getRelativeTime(item.timestamp)}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Your answer</label>
            <Textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value)
                setIsDirty(true)
              }}
              placeholder="Type your notes here. Be specific — this feeds AI synthesis."
              className="min-h-[220px] resize-y"
            />

            {synthesized ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                  <Check className="size-4" /> Synthesized content saved
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Review and refine in the author view. Continue to the next section when ready.
                </p>
                <Button size="sm" onClick={() => void handleContinueAfterSynth()}>
                  Continue
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleSaveDraft()} disabled={busy !== null}>
                {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : null}
                Save draft
              </Button>
              <Button
                onClick={() => void handleSynthesize()}
                disabled={busy !== null || !answer.trim() || currentType === 'recent_activity'}
              >
                {busy === 'synth' ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                Save &amp; synthesize
              </Button>
              <Button variant="ghost" onClick={() => void handleSkip()} disabled={busy !== null}>
                {busy === 'skip' ? <Loader2 className="size-4 animate-spin" /> : <SkipForward className="size-4 mr-2" />}
                Skip section
              </Button>
            </div>
            {currentType === 'recent_activity' ? (
              <p className="text-xs text-muted-foreground">
                Recent activity is filled automatically overnight from your feed. Use Skip to move on.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
