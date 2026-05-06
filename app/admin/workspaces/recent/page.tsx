import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { RecentWorkspacesClient, type RecentWorkspaceRow } from './recent-workspaces-client'

export default async function RecentWorkspacesPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: workspaces }, { data: sweeps }] = await Promise.all([
    admin
      .from('workspace')
      .select('id,name,domain,plan,status,last_active_at,last_sweep_at')
      .or(`last_active_at.gte.${twentyFourHoursAgo},last_sweep_at.gte.${twentyFourHoursAgo}`)
      .order('last_active_at', { ascending: false })
      .limit(500),
    admin.from('sweep').select('workspace_id,status,items_found,started_at').gte('started_at', sevenDaysAgo),
  ])

  const failedSweepCounts = new Map<string, number>()
  const lastSweepItems = new Map<string, number>()
  for (const s of sweeps ?? []) {
    if (s.status === 'failed') {
      failedSweepCounts.set(s.workspace_id, (failedSweepCounts.get(s.workspace_id) ?? 0) + 1)
    }
    if (!lastSweepItems.has(s.workspace_id)) {
      lastSweepItems.set(s.workspace_id, s.items_found ?? 0)
    }
  }

  const rows: RecentWorkspaceRow[] = (workspaces ?? []).map((w) => {
    const lastActivity = w.last_sweep_at && (!w.last_active_at || w.last_sweep_at > w.last_active_at)
      ? w.last_sweep_at
      : w.last_active_at
    const failed = failedSweepCounts.get(w.id) ?? 0
    const sweepStatus = !w.last_sweep_at
      ? 'never-run'
      : failed >= 3
        ? 'failing'
        : failed > 0
          ? 'degraded'
          : 'healthy'

    return {
      id: w.id,
      name: w.name,
      domain: w.domain ?? '',
      plan: w.plan,
      lastActivity: lastActivity ?? w.last_active_at,
      activityType:
        w.last_sweep_at && (!w.last_active_at || w.last_sweep_at > w.last_active_at)
          ? 'Sweep completed'
          : 'User activity',
      sweepStatus,
      items: lastSweepItems.get(w.id) ?? 0,
    }
  })

  rows.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  return <RecentWorkspacesClient initialRows={rows} />
}
