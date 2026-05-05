'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { bulkImportWinLossOutcomes, type SubmitWinLossInput } from '@/lib/win-loss/actions'

type Comp = { id: string; name: string }

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        q = !q
      }
    } else if (!q && c === ',') {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  out.push(cur.trim())
  return out
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    header.forEach((k, j) => {
      row[k] = (cells[j] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

function matchComp(competitors: Comp[], raw: string): Comp | undefined {
  const t = raw.trim().toLowerCase()
  if (!t) return undefined
  return competitors.find((c) => c.name.toLowerCase() === t)
}

function normOutcome(s: string): SubmitWinLossInput['outcome'] | undefined {
  const x = s.trim().toLowerCase().replace(/\s+/g, '_')
  const map: Record<string, SubmitWinLossInput['outcome']> = {
    won: 'won',
    win: 'won',
    lost: 'lost',
    loss: 'lost',
    no_decision: 'no_decision',
    nodecision: 'no_decision',
    'no-decision': 'no_decision',
    nd: 'no_decision',
    disqualified: 'disqualified',
    dq: 'disqualified',
  }
  return map[x]
}

export function WinLossImportClient({ competitors }: { competitors: Comp[] }) {
  const [text, setText] = React.useState('')
  const [preview, setPreview] = React.useState<SubmitWinLossInput[]>([])
  const [parseErrors, setParseErrors] = React.useState<string[]>([])
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)

  const rebuild = React.useCallback(() => {
    const parsed = parseCsv(text)
    const next: SubmitWinLossInput[] = []
    const err: string[] = []
    parsed.forEach((row, idx) => {
      const rowNum = idx + 2
      const dealName = row.deal_name ?? row.name ?? ''
      const outcomeRaw = row.outcome ?? ''
      const compName = row.competitor ?? row.competitor_name ?? ''
      const closeDate = row.close_date ?? ''
      const reasonSummary = row.reason_summary ?? row.reason ?? ''
      const o = normOutcome(outcomeRaw)
      if (!dealName) err.push(`Row ${rowNum}: missing deal_name`)
      if (!o) err.push(`Row ${rowNum}: invalid outcome "${outcomeRaw}"`)
      let dealSizeCents: number | null = null
      let dealSizeBand: string | null = null
      if (row.deal_size_cents)
        dealSizeCents = Math.round(Number(row.deal_size_cents.replace(/,/g, ''))) || null
      if (row.deal_size_usd ?? row.acv_usd ?? row.deal_size_dollars) {
        const n = Number((row.deal_size_usd ?? row.acv_usd ?? row.deal_size_dollars).replace(/,/g, ''))
        dealSizeCents = Number.isFinite(n) ? Math.round(n * 100) : null
      }
      if (row.deal_size_band) dealSizeBand = row.deal_size_band

      const c = matchComp(competitors, compName)
      if (!c) err.push(`Row ${rowNum}: unknown competitor "${compName}"`)

      const tags = (row.reason_tags ?? row.tags ?? '')
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)

      if (!reasonSummary.trim()) err.push(`Row ${rowNum}: missing reason_summary`)

      if (!dealName || !o || !c || !closeDate || !reasonSummary.trim()) return

      next.push({
        dealName,
        outcome: o,
        competitorId: c.id,
        additionalCompetitorIds: [],
        closeDate,
        dealSizeCents,
        dealSizeBand,
        segment: row.segment?.trim() || null,
        reasonSummary: reasonSummary.trim(),
        reasonTags: tags,
        battleCardId: null,
        mostHelpfulSectionType: null,
        missingSectionFeedback: null,
        notes: row.notes ?? null,
      })
    })
    setPreview(next)
    setParseErrors(err)
    setImportErrors([])
  }, [text, competitors])

  React.useEffect(() => rebuild(), [rebuild])

  const run = async () => {
    if (!preview.length || parseErrors.length) {
      toast.error('Fix validation errors before importing.')
      return
    }
    setBusy(true)
    try {
      const result = await bulkImportWinLossOutcomes(preview)
      toast.success(`Imported ${result.ok} rows`)
      if (result.errors.length) setImportErrors(result.errors)
      else {
        setText('')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const expected =
    'deal_name, outcome, competitor, close_date, reason_summary [, deal_size_usd | deal_size_cents | deal_size_band, segment, reason_tags, notes]'

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/win-loss">
          <ArrowLeft className="size-4 mr-2" /> Back
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Import win/loss CSV</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono break-all">{expected}</p>
        <p className="text-sm text-muted-foreground">Outcome values: won, lost, no_decision, disqualified.</p>
      </div>

      <div className="space-y-2">
        <Label>Paste CSV</Label>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="deal_name,outcome,competitor,close_date,reason_summary" />
        <Button type="button" variant="outline" size="sm" onClick={() => rebuild()}>
          Refresh preview
        </Button>
      </div>

      {parseErrors.length ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1 max-h-40 overflow-auto">
          <p className="font-medium mb-2">Preview issues</p>
          {parseErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      ) : null}

      {importErrors.length ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1 max-h-48 overflow-auto">
          <p className="font-medium mb-2">Import errors</p>
          {importErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      ) : null}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Competitor</TableHead>
              <TableHead>Close</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.slice(0, 15).map((r, i) => (
              <TableRow key={i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium truncate max-w-[160px]">{r.dealName}</TableCell>
                <TableCell>{r.outcome}</TableCell>
                <TableCell>{competitors.find((c) => c.id === r.competitorId)?.name}</TableCell>
                <TableCell className="text-xs">{r.closeDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {preview.length > 15 ? (
          <p className="text-xs text-muted-foreground p-2">… plus {preview.length - 15} more</p>
        ) : null}
      </div>

      <Button
        className="w-full sm:w-auto"
        disabled={busy || preview.length === 0 || parseErrors.length > 0}
        onClick={() => void run()}
      >
        Import {preview.length} row{preview.length !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}
