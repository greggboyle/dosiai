import Link from 'next/link'
import { listWorkspaceCostOverview } from '@/app/admin/actions/platform'
import type { WorkspaceCostRow } from '@/lib/admin/platform-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function pctUsed(row: WorkspaceCostRow) {
  if (!row.ai_cost_ceiling_cents || row.ai_cost_ceiling_cents <= 0) return 0
  return Math.min(100, Math.round((row.ai_cost_mtd_cents / row.ai_cost_ceiling_cents) * 100))
}

export default async function AdminBillingCostPage() {
  const rows = await listWorkspaceCostOverview()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Credits &amp; cost overview</h1>
        <p className="text-[13px] text-slate-500">
          Workspace AI spend month-to-date vs configured ceilings (from{' '}
          <code className="font-mono text-[11px]">workspace.ai_cost_*</code>).
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[12px]">Workspace</TableHead>
              <TableHead className="text-[12px]">Plan</TableHead>
              <TableHead className="text-[12px]">Status</TableHead>
              <TableHead className="text-[12px] text-right">AI MTD</TableHead>
              <TableHead className="text-[12px] text-right">Ceiling</TableHead>
              <TableHead className="text-[12px] text-right">%</TableHead>
              <TableHead className="text-[12px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-2 text-[13px] font-medium">{row.name}</TableCell>
                <TableCell className="py-2 text-[13px] capitalize">{row.plan}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-[11px]">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-[13px]">
                  {(row.ai_cost_mtd_cents / 100).toFixed(2)}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-[13px]">
                  {(row.ai_cost_ceiling_cents / 100).toFixed(2)}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-[13px]">{pctUsed(row)}%</TableCell>
                <TableCell className="py-2 text-right">
                  <Link href={`/admin/workspaces/${row.id}`} className="text-[12px] text-blue-600 hover:underline">
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
