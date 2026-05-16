'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pause, Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ListViewLayout } from '@/components/list-view/list-view-layout'
import { ListControlBar } from '@/components/list-view/list-control-bar'
import { ListCard } from '@/components/list-view/list-card'
import { ListEmptyState } from '@/components/list-view/list-empty-state'
import { competitorRowToListCardData } from '@/lib/competitors/competitor-list-card-map'
import { MutationGuard } from '@/components/mutation-guard'
import { useWorkspaceContext } from '@/components/workspace-context'
import { canMutate, mutationBlockedReason } from '@/lib/auth/permissions'
import type { CompetitorTier } from '@/lib/types'
import type { CompetitorTableRow } from '@/lib/competitors/queries'
import { createCompetitor, setCompetitorStatus } from '@/lib/competitors/actions'

const tierOptions: { value: CompetitorTier; label: string }[] = [
  { value: 'primary_direct', label: 'Primary Direct' },
  { value: 'secondary_indirect', label: 'Secondary Indirect' },
  { value: 'emerging', label: 'Emerging' },
  { value: 'adjacent', label: 'Adjacent' },
  { value: 'watching', label: 'Watching' },
]

export function CompetitorsPageClient({ initialCompetitors }: { initialCompetitors: CompetitorTableRow[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'archived'>('active')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [tier, setTier] = React.useState<CompetitorTier>('primary_direct')
  const [saving, setSaving] = React.useState(false)
  const [rowActionId, setRowActionId] = React.useState<string | null>(null)

  const { workspace, memberRole } = useWorkspaceContext()
  const canAddCompetitor =
    canMutate({ status: workspace.status }, 'add_competitor') && memberRole !== 'viewer'

  const statusFilteredCompetitors = initialCompetitors.filter((competitor) => competitor.status === statusFilter)
  const filteredCompetitors = statusFilteredCompetitors.filter((competitor) =>
    competitor.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setName('')
    setWebsite('')
    setTier('primary_direct')
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Enter a competitor name.')
      return
    }
    setSaving(true)
    try {
      await createCompetitor({
        workspaceId: workspace.id,
        name: trimmed,
        website: website.trim() || undefined,
        tier,
      })
      toast.success('Competitor added.')
      setDialogOpen(false)
      resetForm()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add competitor.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (competitorId: string, status: 'active' | 'archived') => {
    setRowActionId(competitorId)
    try {
      await setCompetitorStatus({ workspaceId: workspace.id, competitorId, status })
      toast.success(status === 'archived' ? 'Competitor archived.' : 'Competitor reactivated.')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status.')
    } finally {
      setRowActionId(null)
    }
  }

  return (
    <>
      <ListViewLayout
        className="mx-auto max-w-4xl px-4 py-6 md:px-6"
        title="Competitors"
        subtitle="Track and analyze your competitive landscape"
        headerActions={
          <MutationGuard
            canMutate={canAddCompetitor}
            reason={
              memberRole === 'viewer'
                ? 'Viewers cannot add competitors.'
                : mutationBlockedReason({ status: workspace.status })
            }
          >
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Add Competitor
            </Button>
          </MutationGuard>
        }
        controlBar={
          <ListControlBar>
            <div className="inline-flex items-center rounded-md border bg-muted/30 p-1">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === 'active' ? 'default' : 'ghost'}
                className="h-7 px-3"
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === 'archived' ? 'default' : 'ghost'}
                className="h-7 px-3"
                onClick={() => setStatusFilter('archived')}
              >
                Archived
              </Button>
            </div>
            <Input
              placeholder="Search competitors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm"
              aria-label="Search competitors"
            />
          </ListControlBar>
        }
      >
        {statusFilteredCompetitors.length === 0 ? (
          <ListEmptyState
            variant="no_records"
            recordLabel={statusFilter === 'active' ? 'active competitors' : 'archived competitors'}
            description={
              statusFilter === 'active'
                ? 'Add your first competitor to start tracking.'
                : undefined
            }
          />
        ) : filteredCompetitors.length === 0 ? (
          <ListEmptyState variant="filtered_empty" recordLabel="competitors" />
        ) : (
          filteredCompetitors.map((competitor) => {
            const data = competitorRowToListCardData(competitor)
            return (
              <ListCard
                key={competitor.id}
                data={data}
                href={`/competitors/${competitor.id}`}
                misScore={competitor.overallMIS}
                customRight={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/competitors/${competitor.id}`}>View Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/battle-cards?competitor=${competitor.id}`}>View Battle Cards</Link>
                      </DropdownMenuItem>
                      {canAddCompetitor ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={rowActionId === competitor.id}
                            onClick={(e) => {
                              e.preventDefault()
                              void handleStatusChange(
                                competitor.id,
                                competitor.status === 'archived' ? 'active' : 'archived'
                              )
                            }}
                          >
                            {rowActionId === competitor.id ? (
                              <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : competitor.status === 'archived' ? (
                              <>
                                <Play className="size-4 mr-2" />
                                Reactivate
                              </>
                            ) : (
                              <>
                                <Pause className="size-4 mr-2" />
                                Archive
                              </>
                            )}
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            )
          })
        )}
      </ListViewLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="comp-name">Name</Label>
              <Input
                id="comp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Logistics"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-web">Website (optional)</Label>
              <Input
                id="comp-web"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="acme.com"
                autoComplete="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as CompetitorTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Add competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
