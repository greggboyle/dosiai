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
import type { BattleCardSectionType } from '@/lib/types'

export interface BattleCardAuthorClientProps {
  battleCardId: string
  competitorId: string
  competitorName: string
  status: string
  freshnessScore: number | null
  sections: BattleCardSectionRow[]
  readOnly: boolean
}

export function BattleCardAuthorClient({
  battleCardId,
  competitorId,
  competitorName,
  status,
  freshnessScore,
  sections,
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

  const [jsonText, setJsonText] = React.useState('')
  React.useEffect(() => {
    const raw = section?.content
    const parsed = parseSectionContent(tab, raw)
    setJsonText(JSON.stringify(parsed, null, 2))
  }, [tab, section?.id, section?.content])

  const [saving, setSaving] = React.useState(false)

  const saveSection = async () => {
    if (!section?.id || readOnly) return
    setSaving(true)
    try {
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonText)
      } catch {
        toast.error('Invalid JSON')
        setSaving(false)
        return
      }
      await updateBattleSectionContent(section.id, parsed, { humanOverwriteAi: true })
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
            Edit structured JSON for this section. Feedback {section?.feedback_count ?? 0} · Gaps {section?.gap_count ?? 0}
          </p>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="min-h-[360px] font-mono text-sm"
            disabled={readOnly}
          />
          <Button onClick={() => void saveSection()} disabled={readOnly || saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save section
          </Button>
        </div>
      </Tabs>
    </div>
  )
}
