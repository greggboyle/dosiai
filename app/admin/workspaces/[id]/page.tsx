import { notFound } from 'next/navigation'
import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { WorkspaceDetailClient, type WorkspaceDetailData } from './workspace-detail-client'

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOperator()
  const { id } = await params
  const admin = createSupabaseAdminClient()

  const { data: workspace } = await admin
    .from('workspace')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!workspace) notFound()

  const [
    { data: profile },
    { data: members },
    { data: sweeps },
    { data: vendorCalls },
    { data: overrides },
    { data: auditEntries },
  ] = await Promise.all([
    admin.from('workspace_profile').select('*').eq('workspace_id', id).maybeSingle(),
    admin
      .from('workspace_member')
      .select('user_id,role,status,last_active_at,joined_at')
      .eq('workspace_id', id)
      .order('joined_at', { ascending: true }),
    admin.from('sweep').select('*').eq('workspace_id', id).order('started_at', { ascending: false }).limit(50),
    admin.from('vendor_call').select('id,sweep_id,vendor,latency_ms,success,error_message,called_at').eq('workspace_id', id).order('called_at', { ascending: false }).limit(500),
    admin.from('workspace_override').select('*').eq('workspace_id', id).order('created_at', { ascending: false }).limit(50),
    admin
      .from('audit_log_entry')
      .select('*')
      .or(`target_id.eq.${id},target_name.eq.${workspace.name}`)
      .order('timestamp', { ascending: false })
      .limit(100),
  ])
  const profileAny = profile as Record<string, unknown> | null

  const detail: WorkspaceDetailData = {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      domain: workspace.domain ?? '',
      plan: workspace.plan,
      status: workspace.status,
      createdAt: workspace.created_at,
      lastActiveAt: workspace.last_active_at,
      lastSweepAt: workspace.last_sweep_at,
      aiCostMtdCents: workspace.ai_cost_mtd_cents ?? 0,
      reviewQueueThreshold: workspace.review_queue_threshold ?? 30,
      gracePeriodEndsAt: workspace.grace_period_ends_at,
    },
    profile: {
      companySummary: (profileAny?.company_summary as string | undefined) ?? '',
      icp:
        (profileAny?.icp_description as string | undefined) ??
        (profileAny?.icp as string | undefined) ??
        '',
      industry: (profileAny?.industry as string | undefined) ?? '',
      geography: Array.isArray(profileAny?.geography_served)
        ? (profileAny?.geography_served as string[]).join(', ')
        : ((profileAny?.geography as string | undefined) ?? ''),
    },
    members:
      members?.map((m) => ({
        userId: m.user_id,
        role: m.role,
        status: m.status,
        lastActiveAt: m.last_active_at,
        joinedAt: m.joined_at,
      })) ?? [],
    sweeps:
      sweeps?.map((s) => ({
        id: s.id,
        status: s.status,
        trigger: s.trigger,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        itemsFound: s.items_found,
        itemsNew: s.items_new,
        errors: s.errors,
      })) ?? [],
    vendorCalls:
      vendorCalls?.map((v) => ({
        id: v.id,
        sweepId: v.sweep_id,
        vendor: v.vendor,
        latencyMs: v.latency_ms,
        success: v.success,
        errorMessage: v.error_message,
        calledAt: v.called_at,
      })) ?? [],
    overrides:
      overrides?.map((o) => ({
        id: o.id,
        type: o.type,
        originalValue: o.original_value,
        overrideValue: o.override_value,
        reason: o.reason,
        isActive: o.is_active,
        expiresAt: o.expires_at,
        createdAt: o.created_at,
      })) ?? [],
    audit:
      auditEntries?.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        action: a.action,
        category: a.category,
        targetName: a.target_name,
        reason: a.reason,
        operatorRole: a.operator_role,
      })) ?? [],
  }

  return <WorkspaceDetailClient data={detail} />
}
