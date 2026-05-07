'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, ExternalLink, Pause, Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MISBadge } from '@/components/mis-badge'
import { MutationGuard } from '@/components/mutation-guard'
import { useWorkspaceContext } from '@/components/workspace-context'
import { canMutate, mutationBlockedReason } from '@/lib/auth/permissions'
import type { CompetitorTier } from '@/lib/types'
import type { CompetitorTableRow } from '@/lib/competitors/queries'
import { createCompetitor, setCompetitorStatus } from '@/lib/competitors/actions'

const statusStyles: Record<string, string> = {
  active: 'bg-positive/10 text-positive border-positive/20',
  archived: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-negative/10 text-negative border-negative/20',
}

const tierLabels: Record<string, string> = {
  primary_direct: 'Primary Direct',
  secondary_indirect: 'Secondary Indirect',
  emerging: 'Emerging',
  adjacent: 'Adjacent',
  watching: 'Watching',
}

const tierColors: Record<string, string> = {
  primary_direct: 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  secondary_indirect: 'bg-mis-high/15 text-mis-high border-mis-high/30',
  emerging: 'bg-mis-low/15 text-mis-low border-mis-low/30',
  adjacent: 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
  watching: 'bg-muted text-muted-foreground border-border',
}

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Competitors</h1>
          <p className="text-sm text-muted-foreground">Track and analyze your competitive landscape</p>
        </div>
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search competitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Competitor</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>MIS Score</TableHead>
                <TableHead>Activity (7d)</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusFilteredCompetitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                    {statusFilter === 'active'
                      ? 'No active competitors yet. Add your first competitor to start tracking.'
                      : 'No archived competitors.'}
                  </TableCell>
                </TableRow>
              ) : filteredCompetitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                    No competitors match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompetitors.map((competitor) => (
                  <TableRow key={competitor.id} className="group">
                    <TableCell>
                      <Link
                        href={`/competitors/${competitor.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="size-10 rounded bg-secondary flex items-center justify-center font-medium text-secondary-foreground flex-shrink-0">
                          {competitor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{competitor.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {competitor.website ?? '—'}
                            {competitor.website ? <ExternalLink className="size-3" /> : null}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {competitor.tier && (
                        <Badge variant="outline" className={cn('text-[10px]', tierColors[competitor.tier])}>
                          {tierLabels[competitor.tier]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <MISBadge score={competitor.overallMIS} size="sm" />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{competitor.recentActivity}</span>
                      <span className="text-muted-foreground text-sm"> items</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {competitor.lastActivityLabel}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', statusStyles[competitor.status])}>
                        {competitor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  )
}
