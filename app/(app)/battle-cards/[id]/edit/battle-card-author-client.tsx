'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Share2,
  Send,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { BATTLE_SECTION_LABEL, BATTLE_SECTION_ORDER } from '@/lib/battle-cards/constants'
import { parseSectionContent } from '@/lib/battle-cards/section-json'
import {
  createBattleCardShareLink,
  publishBattleCard,
  updateBattleSectionContent,
} from '@/lib/battle-cards/actions'
import type { BattleCardSectionRow } from '@/lib/battle-cards/queries'
import type { BattleCardGenerationRunRow, BattleCardRecommendationRow } from '@/lib/battle-cards/queries'
import type { BattleCardSectionType } from '@/lib/types'

export interface BattleCardAuthorClientProps {
  battleCardId: string
  competitorId: string
  competitorName: string
  status: string
  freshnessScore: number | null
  sections: BattleCardSectionRow[]
  recommendations: BattleCardRecommendationRow[]
  latestGenerationRun: BattleCardGenerationRunRow | null
  readOnly: boolean
}

export function BattleCardAuthorClient({
  battleCardId,
  competitorId,
  competitorName,
  status,
  freshnessScore,
  sections,
  recommendations,
  latestGenerationRun,
  readOnly,
}: BattleCardAuthorClientProps) {
  const router = useRouter()
  const byType = React.useMemo(() => {
    const m = new Map<BattleCardSectionType, BattleCardSectionRow>()
    for (const s of sections) {
      m.set(s.section_type as BattleCardSectionType, s)
    }
    return m
  }, [sections])

  const [tab, setTab] = React.useState<BattleCardSectionType>('tldr')
  const section = byType.get(tab)

  const [draftContent, setDraftContent] = React.useState<unknown>(null)
  React.useEffect(() => {
    const raw = section?.content
    const parsed = parseSectionContent(tab, raw)
    setDraftContent(parsed)
  }, [tab, section?.id, section?.content])

  const [saving, setSaving] = React.useState(false)

  const saveSection = async () => {
    if (!section?.id || readOnly) return
    setSaving(true)
    try {
      await updateBattleSectionContent(section.id, draftContent, { humanOverwriteAi: true })
      toast.success('Section saved')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (readOnly) return
    setSaving(true)
    try {
      await publishBattleCard(battleCardId)
      toast.success('Published')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  const share = async () => {
    if (readOnly) return
    setSaving(true)
    try {
      const token = await createBattleCardShareLink(battleCardId, 30)
      const url = `${window.location.origin}/share/battle-card/${token}`
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied (30 days)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Share link failed')
    } finally {
      setSaving(false)
    }
  }

  const stale = freshnessScore !== null && freshnessScore < 60
  const currentIndex = BATTLE_SECTION_ORDER.indexOf(tab)
  const totalSections = BATTLE_SECTION_ORDER.length
  const progressPct = Math.round(((currentIndex + 1) / totalSections) * 100)

  const goPrev = () => {
    if (currentIndex <= 0) return
    setTab(BATTLE_SECTION_ORDER[currentIndex - 1])
  }
  const goNext = () => {
    if (currentIndex >= totalSections - 1) return
    setTab(BATTLE_SECTION_ORDER[currentIndex + 1])
  }

  const updateDraftContent = (next: unknown) => setDraftContent(next)

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/battle-cards">
              <ArrowLeft className="size-4 mr-2" />
              Battle cards
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{competitorName}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={status === 'published' ? 'default' : 'secondary'}>{status}</Badge>
            {latestGenerationRun ? (
              <Badge variant="outline" className="capitalize">
                AI Draft {latestGenerationRun.status}
              </Badge>
            ) : null}
            {freshnessScore !== null ? (
              <Badge variant="outline">
                Freshness {freshnessScore}
                {stale ? ' · review suggested' : ''}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/battle-cards/${battleCardId}/interview`}>
              <Sparkles className="size-4 mr-2" />
              Interview
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rep/${competitorId}`} target="_blank">
              <Eye className="size-4 mr-2" />
              Rep preview
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void share()} disabled={readOnly || saving}>
            <Share2 className="size-4 mr-2" />
            Share link
          </Button>
          <Button size="sm" onClick={() => void publish()} disabled={readOnly || saving || status === 'published'}>
            <Send className="size-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Section progress</span>
          <span>
            {currentIndex + 1} / {totalSections}
          </span>
        </div>
        <div className="h-2 rounded bg-muted">
          <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium">AI improvement suggestions</p>
          <div className="mt-2 space-y-2">
            {recommendations.slice(0, 6).map((rec) => (
              <div key={rec.id} className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground capitalize">{rec.section_type.replaceAll('_', ' ')}</div>
                <div className="text-sm">{rec.suggested_content}</div>
                {rec.rationale ? <div className="text-xs text-muted-foreground mt-1">{rec.rationale}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as BattleCardSectionType)}>
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          {BATTLE_SECTION_ORDER.map((t) => {
            const row = byType.get(t)
            return (
              <TabsTrigger key={t} value={t} className="text-xs">
                {BATTLE_SECTION_LABEL[t]}
                {row?.ai_drafted ? <span className="ml-1 opacity-60">· AI</span> : null}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Feedback {section?.feedback_count ?? 0} · Gaps {section?.gap_count ?? 0}
          </p>
          <SectionWizardFields sectionType={tab} value={draftContent} onChange={updateDraftContent} disabled={readOnly} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goPrev} disabled={readOnly || saving || currentIndex === 0}>
              Previous
            </Button>
            <Button variant="outline" onClick={goNext} disabled={readOnly || saving || currentIndex === totalSections - 1}>
              Next
            </Button>
            <Button onClick={() => void saveSection()} disabled={readOnly || saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save section
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

function SectionWizardFields({
  sectionType,
  value,
  onChange,
  disabled,
}: {
  sectionType: BattleCardSectionType
  value: unknown
  onChange: (next: unknown) => void
  disabled: boolean
}) {
  const v = (value ?? {}) as any
  if (sectionType === 'tldr') {
    return (
      <div className="space-y-3">
        <LabeledTextarea
          label="How they position"
          value={v.theyPosition ?? ''}
          disabled={disabled}
          onChange={(x) => onChange({ ...v, theyPosition: x })}
        />
        <LabeledTextarea
          label="How we counter"
          value={v.weCounter ?? ''}
          disabled={disabled}
          onChange={(x) => onChange({ ...v, weCounter: x })}
        />
        <LabeledTextarea
          label="What reps should remember"
          value={v.remember ?? ''}
          disabled={disabled}
          onChange={(x) => onChange({ ...v, remember: x })}
        />
      </div>
    )
  }
  if (sectionType === 'why_we_win' || sectionType === 'why_they_win') {
    return (
      <LabeledTextarea
        label="One bullet per line"
        value={Array.isArray(v.bullets) ? v.bullets.map((b: any) => b?.text ?? '').join('\n') : ''}
        disabled={disabled}
        onChange={(x) =>
          onChange({
            ...v,
            bullets: x
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((text) => ({ text })),
          })
        }
      />
    )
  }
  if (sectionType === 'objections') {
    return (
      <LabeledTextarea
        label="Use format: objection => response (one per line)"
        value={Array.isArray(v.pairs) ? v.pairs.map((p: any) => `${p?.objection ?? ''} => ${p?.response ?? ''}`).join('\n') : ''}
        disabled={disabled}
        onChange={(x) =>
          onChange({
            ...v,
            pairs: x
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [objection, ...rest] = line.split('=>')
                return { objection: objection?.trim() ?? '', response: rest.join('=>').trim() }
              }),
          })
        }
      />
    )
  }
  if (sectionType === 'trap_setters') {
    return (
      <LabeledTextarea
        label="One question per line"
        value={Array.isArray(v.questions) ? v.questions.join('\n') : ''}
        disabled={disabled}
        onChange={(x) =>
          onChange({
            ...v,
            questions: x
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          })
        }
      />
    )
  }
  if (sectionType === 'proof_points') {
    return (
      <LabeledTextarea
        label="Use format: headline => detail (one per line)"
        value={Array.isArray(v.points) ? v.points.map((p: any) => `${p?.headline ?? ''} => ${p?.detail ?? ''}`).join('\n') : ''}
        disabled={disabled}
        onChange={(x) =>
          onChange({
            ...v,
            points: x
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [headline, ...rest] = line.split('=>')
                return { headline: headline?.trim() ?? '', detail: rest.join('=>').trim() || undefined }
              }),
          })
        }
      />
    )
  }
  if (sectionType === 'pricing') {
    return (
      <div className="space-y-3">
        <LabeledTextarea
          label="Their pricing"
          value={v.theirs ?? ''}
          disabled={disabled}
          onChange={(x) => onChange({ ...v, theirs: x })}
        />
        <LabeledTextarea
          label="Our pricing"
          value={v.ours ?? ''}
          disabled={disabled}
          onChange={(x) => onChange({ ...v, ours: x })}
        />
      </div>
    )
  }
  if (sectionType === 'talk_tracks') {
    return (
      <LabeledTextarea
        label="Use format: scenario => talk track (one per line)"
        value={Array.isArray(v.tracks) ? v.tracks.map((t: any) => `${t?.scenario ?? ''} => ${t?.content ?? ''}`).join('\n') : ''}
        disabled={disabled}
        onChange={(x) =>
          onChange({
            ...v,
            tracks: x
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [scenario, ...rest] = line.split('=>')
                return { scenario: scenario?.trim() ?? '', content: rest.join('=>').trim() }
              }),
          })
        }
      />
    )
  }
  return (
    <LabeledTextarea
      label="Recent activity is populated from intel. Add notes if needed."
      value={JSON.stringify(v, null, 2)}
      disabled={disabled}
      onChange={() => {}}
    />
  )
}

function LabeledTextarea({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[120px]" disabled={disabled} />
    </div>
  )
}
