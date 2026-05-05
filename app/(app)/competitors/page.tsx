'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, MoreHorizontal, ExternalLink, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { Competitor, MISScore } from '@/lib/types'

// Mock data - realistic logistics competitors (C2: updated tier enum and status)
const competitors: (Competitor & { lastActivity: string })[] = [
  {
    id: '1',
    name: 'Acme Logistics',
    website: 'acmelogistics.com',
    description: 'AI-native TMS for mid-market shippers',
    overallMIS: { value: 87, band: 'critical', confidence: 'high' },
    recentActivity: 23,
    status: 'active',
    lastActivity: '2 hours ago',
    tier: 'primary_direct',
  },
  {
    id: '2',
    name: 'FreightHero',
    website: 'freighthero.com',
    description: 'Digital freight brokerage platform for enterprise shippers.',
    overallMIS: { value: 72, band: 'high', confidence: 'high' },
    recentActivity: 18,
    status: 'active',
    lastActivity: '5 hours ago',
    tier: 'primary_direct',
  },
  {
    id: '3',
    name: 'RouteIQ',
    website: 'routeiq.io',
    description: 'Route optimization and fleet management software.',
    overallMIS: { value: 65, band: 'high', confidence: 'medium' },
    recentActivity: 12,
    status: 'active',
    lastActivity: '8 hours ago',
    tier: 'secondary_indirect',
  },
  {
    id: '4',
    name: 'ChainShield',
    website: 'chainshield.com',
    description: 'Supply chain visibility and risk management platform.',
    overallMIS: { value: 45, band: 'medium', confidence: 'high' },
    recentActivity: 8,
    status: 'active',
    lastActivity: '1 day ago',
    tier: 'adjacent',
  },
  {
    id: '5',
    name: 'LogiFlow',
    website: 'logiflow.com',
    description: 'Legacy TMS with strong ERP integrations.',
    overallMIS: { value: 58, band: 'medium', confidence: 'high' },
    recentActivity: 6,
    status: 'archived',
    lastActivity: '2 days ago',
    tier: 'secondary_indirect',
  },
  {
    id: '6',
    name: 'TransitPro',
    website: 'transitpro.io',
    description: 'Emerging TMS startup with strong AI positioning.',
    overallMIS: { value: 32, band: 'low', confidence: 'medium' },
    recentActivity: 3,
    status: 'active',
    lastActivity: '3 days ago',
    tier: 'emerging',
  },
]

// C2: Updated status styles to match CompetitorStatus enum
const statusStyles: Record<string, string> = {
  active: 'bg-positive/10 text-positive border-positive/20',
  archived: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-negative/10 text-negative border-negative/20',
}

// C2: Updated tier labels to match CompetitorTier enum
const tierLabels: Record<string, string> = {
  'primary_direct': 'Primary Direct',
  'secondary_indirect': 'Secondary Indirect',
  'emerging': 'Emerging',
  'adjacent': 'Adjacent',
  'watching': 'Watching',
}

// C2: Updated tier colors to match CompetitorTier enum
const tierColors: Record<string, string> = {
  'primary_direct': 'bg-mis-critical/15 text-mis-critical border-mis-critical/30',
  'secondary_indirect': 'bg-mis-high/15 text-mis-high border-mis-high/30',
  'emerging': 'bg-mis-low/15 text-mis-low border-mis-low/30',
  'adjacent': 'bg-mis-medium/15 text-mis-medium border-mis-medium/30',
  'watching': 'bg-muted text-muted-foreground border-border',
}

export default function CompetitorsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const { workspace } = useWorkspaceContext()
  const canAddCompetitor = canMutate({ status: workspace.status }, 'add_competitor')

  const filteredCompetitors = competitors.filter((competitor) =>
    competitor.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            Track and analyze your competitive landscape
          </p>
        </div>
        <MutationGuard canMutate={canAddCompetitor} reason={mutationBlockedReason({ status: workspace.status })}>
          <Button>
            <Plus className="size-4 mr-2" />
            Add Competitor
          </Button>
        </MutationGuard>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search competitors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Competitors Table */}
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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompetitors.map((competitor) => (
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
                          {competitor.website}
                          <ExternalLink className="size-3" />
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
                    {competitor.lastActivity}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('capitalize', statusStyles[competitor.status])}
                    >
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
                          <Link href={`/battle-cards?competitor=${competitor.id}`}>
                            View Battle Card
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {competitor.status === 'archived' ? (
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
