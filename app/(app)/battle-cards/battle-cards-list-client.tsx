'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Smartphone, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListViewLayout } from '@/components/list-view/list-view-layout'
import { ListControlBar } from '@/components/list-view/list-control-bar'
import { ListCard } from '@/components/list-view/list-card'
import { ListEmptyState } from '@/components/list-view/list-empty-state'
import { battleCardRowToListCardData } from '@/lib/battle-cards/battle-card-list-map'
import { deleteBattleCard } from '@/lib/battle-cards/actions'
import type { BattleCardListRow } from '@/lib/battle-cards/battle-card-types'

export type { BattleCardListRow }

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

  const handleDelete = React.useCallback(
    async (card: BattleCardListRow) => {
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
    },
    [deletingId]
  )

  return (
    <ListViewLayout
      className="mx-auto max-w-6xl px-4 py-6 md:px-6"
      title="Battle cards"
      subtitle="Interview-backed positioning, objections, and talk tracks per competitor"
      layout="grid"
      headerActions={
        canAuthor ? (
          <Button asChild>
            <Link href="/battle-cards/new">
              <Plus className="size-4 mr-2" />
              New battle card
            </Link>
          </Button>
        ) : null
      }
      controlBar={
        <ListControlBar>
          <Input
            placeholder="Search battle cards…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-md"
            aria-label="Search battle cards"
          />
        </ListControlBar>
      }
    >
      {filtered.length === 0 ? (
        <ListEmptyState
          className="col-span-full"
          variant="no_records"
          recordLabel="battle cards"
          description={
            canAuthor
              ? 'Create a battle card to run the interview flow.'
              : 'Battle cards will appear here when your team publishes them.'
          }
          primaryAction={
            canAuthor ? { label: 'New battle card', href: '/battle-cards/new' } : undefined
          }
        />
      ) : (
        filtered.map((card) => {
          const data = battleCardRowToListCardData(card)
          return (
            <ListCard
              key={card.id}
              data={data}
              href={`/battle-cards/${card.id}/edit`}
              customRight={
                <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === card.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleDelete(card)
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      {deletingId === card.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/rep/${card.competitorId}`} target="_blank">
                      <Smartphone className="size-3.5 mr-1" />
                      Rep
                    </Link>
                  </Button>
                  <Button type="button" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                    <Link href={`/battle-cards/${card.id}/edit`}>
                      Open
                      <ChevronRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              }
            />
          )
        })
      )}
    </ListViewLayout>
  )
}
