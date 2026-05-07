'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, Smartphone, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRelativeTime } from '@/lib/types'
import { deleteBattleCard } from '@/lib/battle-cards/actions'

export interface BattleCardListRow {
  id: string
  competitorId: string
  competitorName: string
  status: string
  version: number
  freshness_score: number | null
  updated_at: string
  aiDraftStatus: 'queued' | 'processing' | 'ready' | 'failed' | null
}

interface Props {
  cards: BattleCardListRow[]
  canAuthor: boolean
  canDelete: boolean
}

export function BattleCardsListClient({ cards, canAuthor, canDelete }: Props) {
  const [q, setQ] = React.useState('')
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filtered = cards.filter(
    (c) =>
      c.competitorName.toLowerCase().includes(q.toLowerCase()) ||
      c.status.toLowerCase().includes(q.toLowerCase())
  )

  const handleDelete = React.useCallback(async (card: BattleCardListRow) => {
    if (deletingId) return
    const confirmed = window.confirm(
      `Delete the battle card for ${card.competitorName}? This action cannot be undone.`
    )
    if (!confirmed) return
    try {
      setDeletingId(card.id)
      await deleteBattleCard(card.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete battle card'
      window.alert(message)
    } finally {
      setDeletingId(null)
    }
  }, [deletingId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Battle cards</h1>
          <p className="text-sm text-muted-foreground">
            Interview-backed positioning, objections, and talk tracks per competitor
          </p>
        </div>
        {canAuthor ? (
          <Button asChild>
            <Link href="/battle-cards/new">
              <Plus className="size-4 mr-2" />
              New battle card
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((card) => {
          const stale = card.freshness_score !== null && card.freshness_score < 60
          return (
            <Card key={card.id} className="hover:border-accent/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{card.competitorName}</CardTitle>
                  <div className="flex items-center gap-1">
                    {card.aiDraftStatus === 'queued' || card.aiDraftStatus === 'processing' ? (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        AI drafting…
                      </Badge>
                    ) : null}
                    <Badge variant={card.status === 'published' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {card.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  v{card.version}
                  {card.freshness_score != null ? (
                    <>
                      {' · '}
                      <span className={cn(stale && 'text-amber-500')}>freshness {card.freshness_score}</span>
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2 pt-0">
                <span className="text-xs text-muted-foreground">
                  Updated {getRelativeTime(card.updated_at)}
                </span>
                <div className="flex gap-2">
                  {canDelete ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === card.id}
                      onClick={() => void handleDelete(card)}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      {deletingId === card.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/rep/${card.competitorId}`} target="_blank">
                      <Smartphone className="size-3.5 mr-1" />
                      Rep
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/battle-cards/${card.id}/edit`}>
                      Open
                      <ChevronRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {canAuthor ? 'Create a battle card to run the interview flow.' : 'No battle cards yet.'}
        </p>
      )}
    </div>
  )
}
