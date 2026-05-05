'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { submitWinLossOutcome } from '@/lib/win-loss/actions'
import type { BattleCardSectionType } from '@/lib/types'

export type CompetitorOption = { id: string; name: string; segments: string[] }
export type BattleCardOption = { id: string; label: string; competitorId: string }

const SECTIONS: { value: BattleCardSectionType; label: string }[] = [
  { value: 'tldr', label: 'TL;DR' },
  { value: 'why_we_win', label: 'Why we win' },
  { value: 'why_they_win', label: 'Why they win' },
  { value: 'objections', label: 'Objections' },
  { value: 'trap_setters', label: 'Trap setters' },
  { value: 'proof_points', label: 'Proof points' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'recent_activity', label: 'Recent activity' },
  { value: 'talk_tracks', label: 'Talk tracks' },
]

export function WinLossLogClient(props: {
  competitors: CompetitorOption[]
  battleCards: BattleCardOption[]
}) {
  const router = useRouter()
  const [outcome, setOutcome] = React.useState<'won' | 'lost' | 'no_decision' | 'disqualified' | ''>('')
  const [competitorId, setCompetitorId] = React.useState('')
  const [dealName, setDealName] = React.useState('')
  const [closeDate, setCloseDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [sizeMode, setSizeMode] = React.useState<'none' | 'cents' | 'band'>('none')
  const [dealSizeCents, setDealSizeCents] = React.useState('')
  const [band, setBand] = React.useState('')
  const [segment, setSegment] = React.useState('')
  const [reasonSummary, setReasonSummary] = React.useState('')
  const [tags, setTags] = React.useState('')
  const [battleCardId, setBattleCardId] = React.useState<string | '__none'>('__none')
  const [helpfulSection, setHelpfulSection] = React.useState<BattleCardSectionType | '__none'>('__none')
  const [missing, setMissing] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const competitor = props.competitors.find((c) => c.id === competitorId)

  React.useEffect(() => {
    if (!competitorId) {
      setSegment('')
      return
    }
    if (!segment || !competitor?.segments.includes(segment)) {
      setSegment(competitor?.segments[0] ?? '')
    }
  }, [competitorId, competitor?.segments, segment])

  const cardsForCompetitor = props.battleCards.filter((b) => b.competitorId === competitorId)

  const submit = React.useCallback(async () => {
    if (!outcome || !competitorId || !dealName.trim() || !reasonSummary.trim()) {
      toast.error('Outcome, competitor, deal name, and reason summary are required.')
      return
    }
    setBusy(true)
    try {
      const tagList = tags
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)

      let dsc: number | null = null
      let dsband: string | null = null
      if (sizeMode === 'cents') {
        const n = Number(dealSizeCents)
        dsc = Number.isFinite(n) ? Math.round(n * 100) : null
      }
      if (sizeMode === 'band') dsband = band || null

      await submitWinLossOutcome({
        dealName: dealName.trim(),
        outcome,
        competitorId,
        additionalCompetitorIds: [],
        closeDate,
        dealSizeCents: dsc,
        dealSizeBand: dsband,
        segment: segment || null,
        reasonSummary: reasonSummary.trim(),
        reasonTags: tagList,
        battleCardId: battleCardId === '__none' ? null : battleCardId,
        mostHelpfulSectionType:
          battleCardId !== '__none' && helpfulSection !== '__none' ? helpfulSection : null,
        missingSectionFeedback: missing.trim() || null,
        notes: notes.trim() || null,
      })

      toast.success('Outcome logged')
      router.push('/win-loss')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }, [
    outcome,
    competitorId,
    dealName,
    closeDate,
    sizeMode,
    dealSizeCents,
    band,
    segment,
    reasonSummary,
    tags,
    battleCardId,
    helpfulSection,
    missing,
    notes,
    router,
  ])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit])

  const outcomes: typeof outcome[] = ['won', 'lost', 'no_decision', 'disqualified']

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-16">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/win-loss">
          <ArrowLeft className="size-4 mr-2" /> Back
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Log outcome</h1>
        <p className="text-sm text-muted-foreground">&lt;60s target · ⌘↵ submits</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {outcomes.map((o) => (
          <Button
            key={o}
            type="button"
            size="sm"
            variant={outcome === o ? 'default' : 'outline'}
            className={cn('capitalize', outcome === o && 'ring-2 ring-accent')}
            onClick={() => setOutcome(o)}
          >
            {o.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label>Primary competitor</Label>
          <Select value={competitorId} onValueChange={setCompetitorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose competitor" />
            </SelectTrigger>
            <SelectContent>
              {props.competitors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Deal name</Label>
          <Input value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="Acme rollout" />
        </div>

        <div>
          <Label>Close date</Label>
          <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
        </div>

        <div>
          <Label>Deal size</Label>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" size="sm" variant={sizeMode === 'none' ? 'secondary' : 'outline'} onClick={() => setSizeMode('none')}>None</Button>
            <Button type="button" size="sm" variant={sizeMode === 'cents' ? 'secondary' : 'outline'} onClick={() => setSizeMode('cents')}>ACV USD</Button>
            <Button type="button" size="sm" variant={sizeMode === 'band' ? 'secondary' : 'outline'} onClick={() => setSizeMode('band')}>Band</Button>
          </div>
          {sizeMode === 'cents' ? (
            <Input
              type="number"
              className="mt-2"
              placeholder="e.g. 120000 dollars"
              value={dealSizeCents}
              onChange={(e) => setDealSizeCents(e.target.value)}
            />
          ) : null}
          {sizeMode === 'band' ? (
            <Input className="mt-2" placeholder="e.g. 50k-250k" value={band} onChange={(e) => setBand(e.target.value)} />
          ) : null}
        </div>

        {competitor && competitor.segments.length > 0 ? (
          <div>
            <Label>Segment</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {competitor.segments.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={segment === s ? 'default' : 'outline'}
                  onClick={() => setSegment(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <Label>Reason summary</Label>
          <Textarea
            rows={4}
            value={reasonSummary}
            onChange={(e) => setReasonSummary(e.target.value)}
            placeholder="1–2 sentences"
          />
        </div>

        <div>
          <Label>Reason tags</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="pricing, champion_left (; or , separated)" />
        </div>

        <div>
          <Label>Battle card consulted (optional)</Label>
          <Select value={battleCardId} onValueChange={(v) => setBattleCardId(v as typeof battleCardId)}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {cardsForCompetitor.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {battleCardId !== '__none' ? (
          <div className="space-y-2">
            <Label>Most helpful section</Label>
            <Select
              value={helpfulSection}
              onValueChange={(v) => setHelpfulSection(v === '__none' ? '__none' : (v as BattleCardSectionType))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>What was missing?</Label>
            <Textarea rows={3} value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="Gap note for authors" />
          </div>
        ) : null}

        <div>
          <Label>Notes (optional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <Button className="w-full" disabled={busy} onClick={() => void submit()}>
        {busy ? 'Saving…' : 'Submit'}
      </Button>
    </div>
  )
}
