'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Upload, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CompetitorWinLossAgg, ReasonTagAgg, WinLossRow } from '@/lib/win-loss/queries'

interface Props {
  canAnalyst: boolean
  outcomes: (WinLossRow & { competitorName?: string })[]
  byCompetitor: CompetitorWinLossAgg[]
  byReason: ReasonTagAgg[]
}

function rate(won: number, lost: number): string {
  const d = won + lost
  if (!d) return '—'
  return `${Math.round((won / d) * 100)}%`
}

export function WinLossHubClient({ canAnalyst, outcomes, byCompetitor, byReason }: Props) {
  const chartData = byReason.slice(0, 12).map((r) => ({
    tag: r.tag,
    won: r.won,
    lost: r.lost,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Win / Loss</h1>
          <p className="text-sm text-muted-foreground">Outcomes, competitor performance, and reason tags</p>
        </div>
        {canAnalyst ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/win-loss/import">
                <Upload className="size-4 mr-2" />
                Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/win-loss/log">
                <Plus className="size-4 mr-2" />
                Log outcome
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="outcomes">
        <TabsList>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="competitors">By competitor</TabsTrigger>
          <TabsTrigger value="reasons">By reason</TabsTrigger>
        </TabsList>

        <TabsContent value="outcomes" className="mt-4">
          {!canAnalyst ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Viewer access</CardTitle>
                <CardDescription>
                  Individual deals and exact sizes are hidden. Use the other tabs for aggregate views.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No outcomes yet — log your first deal.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{o.deal_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {o.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell>{o.competitorName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.close_date}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {o.reason_summary}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="competitors" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {byCompetitor.map((c) => (
              <Card key={c.competitorId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.competitorName}
                    <TrendingUp className="size-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>Last 90d closed won vs lost (where applicable)</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win rate (90d)</span>
                    <span className="font-medium">{rate(c.won90, c.lost90)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>W {c.won90}</span>
                    <span>L {c.lost90}</span>
                    <span>ND/DQ {c.nod90 + c.dq90}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">All time</span>
                    <span>
                      {c.wonAll}W / {c.lostAll}L
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reasons" className="mt-4 space-y-4">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <XAxis dataKey="tag" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Bar dataKey="won" stackId="a" fill="hsl(142 70% 45%)" name="Won" />
                <Bar dataKey="lost" stackId="a" fill="hsl(0 70% 50%)" name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {byReason.slice(0, 20).map((r) => (
              <Badge key={r.tag} variant="secondary" className="text-xs">
                {r.tag} · {r.total}
              </Badge>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
