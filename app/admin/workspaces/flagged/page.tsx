import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { FlaggedWorkspacesClient, type FlaggedWorkspaceRow } from './flagged-workspaces-client'

export default async function FlaggedWorkspacesPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: workspaces }, { data: sweeps }, { data: competitors }] = await Promise.all([
    admin
      .from('workspace')
      .select('id,name,domain,status,plan,last_sweep_at,grace_period_ends_at,ai_cost_mtd_cents,ai_cost_ceiling_cents')
      .order('last_active_at', { ascending: false })
      .limit(1000),
    admin
      .from('sweep')
      .select('workspace_id,status,started_at')
      .gte('started_at', sevenDaysAgo),
    admin.from('competitor').select('workspace_id,status'),
  ])

  const failedSweepCounts = new Map<string, number>()
  for (const s of sweeps ?? []) {
    if (s.status !== 'failed') continue
    failedSweepCounts.set(s.workspace_id, (failedSweepCounts.get(s.workspace_id) ?? 0) + 1)
  }

  const competitorCounts = new Map<string, number>()
  for (const c of competitors ?? []) {
    if (c.status !== 'active') continue
    competitorCounts.set(c.workspace_id, (competitorCounts.get(c.workspace_id) ?? 0) + 1)
  }

  const rows: FlaggedWorkspaceRow[] = []
  for (const w of workspaces ?? []) {
    const failed = failedSweepCounts.get(w.id) ?? 0
    const competitorCount = competitorCounts.get(w.id) ?? 0
    const costRatio = w.ai_cost_ceiling_cents > 0 ? w.ai_cost_mtd_cents / w.ai_cost_ceiling_cents : 0

    if (w.status === 'grace_period' || w.status === 'cancelled') {
      rows.push({
        id: w.id,
        name: w.name,
        domain: w.domain ?? '',
        flagType: 'payment-failed',
        flagReason: w.status === 'grace_period' ? 'Workspace is in grace period due to billing status.' : 'Workspace is cancelled and requires billing review.',
        flaggedAt: w.grace_period_ends_at ?? w.last_sweep_at ?? new Date().toISOString(),
      })
    }
    if (failed >= 3) {
      rows.push({
        id: w.id,
        name: w.name,
        domain: w.domain ?? '',
        flagType: 'sweep-failing',
        flagReason: `${failed} failed sweeps in the last 7 days.`,
        flaggedAt: w.last_sweep_at ?? new Date().toISOString(),
      })
    }
    if (costRatio >= 0.9) {
      rows.push({
        id: w.id,
        name: w.name,
        domain: w.domain ?? '',
        flagType: 'usage-spike',
        flagReason: `AI spend is at ${(costRatio * 100).toFixed(0)}% of workspace ceiling.`,
        flaggedAt: w.last_sweep_at ?? new Date().toISOString(),
      })
    }
    if (competitorCount >= 15) {
      rows.push({
        id: w.id,
        name: w.name,
        domain: w.domain ?? '',
        flagType: 'needs-attention',
        flagReason: `High tracked competitor count (${competitorCount}) may need plan/override review.`,
        flaggedAt: w.last_sweep_at ?? new Date().toISOString(),
      })
    }
  }

  rows.sort((a, b) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime())
  return <FlaggedWorkspacesClient initialRows={rows} />
}
