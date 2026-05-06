import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { WorkspacesSearchClient, type WorkspaceSearchRow } from './workspaces-search-client'

export default async function AdminWorkspacesSearchPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()

  const [
    { data: workspaces },
    { data: members },
    { data: competitors },
    { data: topics },
    { data: overrides },
    { data: recentSweeps },
  ] = await Promise.all([
    admin
      .from('workspace')
      .select('id,name,domain,plan,status,created_at,last_active_at,last_sweep_at,ai_cost_mtd_cents,grace_period_ends_at')
      .order('last_active_at', { ascending: false })
      .limit(500),
    admin.from('workspace_member').select('workspace_id,role,status,user_id'),
    admin.from('competitor').select('workspace_id'),
    admin.from('topic').select('workspace_id'),
    admin.from('workspace_override').select('workspace_id,is_active'),
    admin
      .from('sweep')
      .select('workspace_id,status,started_at')
      .order('started_at', { ascending: false })
      .limit(5000),
  ])

  const memberCounts = new Map<string, number>()
  const adminByWorkspace = new Map<string, string>()
  for (const m of members ?? []) {
    if (m.status !== 'active') continue
    memberCounts.set(m.workspace_id, (memberCounts.get(m.workspace_id) ?? 0) + 1)
    if (m.role === 'admin' && !adminByWorkspace.has(m.workspace_id)) {
      adminByWorkspace.set(m.workspace_id, m.user_id)
    }
  }

  const competitorCounts = new Map<string, number>()
  for (const c of competitors ?? []) {
    competitorCounts.set(c.workspace_id, (competitorCounts.get(c.workspace_id) ?? 0) + 1)
  }

  const topicCounts = new Map<string, number>()
  for (const t of topics ?? []) {
    topicCounts.set(t.workspace_id, (topicCounts.get(t.workspace_id) ?? 0) + 1)
  }

  const activeOverrideCounts = new Map<string, number>()
  for (const o of overrides ?? []) {
    if (!o.is_active) continue
    activeOverrideCounts.set(o.workspace_id, (activeOverrideCounts.get(o.workspace_id) ?? 0) + 1)
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const failedSweepCounts = new Map<string, number>()
  for (const s of recentSweeps ?? []) {
    if (!s.started_at) continue
    if (new Date(s.started_at).getTime() < sevenDaysAgo) continue
    if (s.status !== 'failed') continue
    failedSweepCounts.set(s.workspace_id, (failedSweepCounts.get(s.workspace_id) ?? 0) + 1)
  }

  const rows: WorkspaceSearchRow[] = (workspaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    domain: w.domain ?? '',
    plan: w.plan,
    status: w.status,
    createdAt: w.created_at,
    lastActiveAt: w.last_active_at,
    lastSweepAt: w.last_sweep_at,
    aiCostMtdCents: w.ai_cost_mtd_cents ?? 0,
    memberCount: memberCounts.get(w.id) ?? 0,
    competitorCount: competitorCounts.get(w.id) ?? 0,
    topicCount: topicCounts.get(w.id) ?? 0,
    activeOverrideCount: activeOverrideCounts.get(w.id) ?? 0,
    failedSweepsLast7Days: failedSweepCounts.get(w.id) ?? 0,
    adminUserId: adminByWorkspace.get(w.id) ?? null,
    gracePeriodEndsAt: w.grace_period_ends_at,
  }))

  return <WorkspacesSearchClient initialRows={rows} />
}
