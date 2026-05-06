import { requireOperator } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { OperatorsClient, type OperatorsPageData } from './operators-client'

export default async function OperatorsPage() {
  await requireOperator()
  const admin = createSupabaseAdminClient()

  const [{ data: operators }, { data: sessions }, { data: audit }] = await Promise.all([
    admin.from('operator_user').select('*').order('created_at', { ascending: false }),
    admin
      .from('impersonation_session')
      .select('id,operator_id,workspace_id,mode,reason,started_at,ended_at,approved_by_id')
      .is('ended_at', null)
      .order('started_at', { ascending: false }),
    admin
      .from('audit_log_entry')
      .select('id,timestamp,operator_id,action,target_name,reason,category')
      .eq('category', 'operator')
      .order('timestamp', { ascending: false })
      .limit(200),
  ])

  const operatorIds = [...new Set((sessions ?? []).map((s) => s.operator_id).filter(Boolean))]
  const workspaceIds = [...new Set((sessions ?? []).map((s) => s.workspace_id).filter(Boolean))]

  const [{ data: sessionOperators }, { data: sessionWorkspaces }] = await Promise.all([
    operatorIds.length > 0
      ? admin.from('operator_user').select('id,name,email,role').in('id', operatorIds)
      : Promise.resolve({ data: [] }),
    workspaceIds.length > 0
      ? admin.from('workspace').select('id,name').in('id', workspaceIds)
      : Promise.resolve({ data: [] }),
  ])

  const operatorNameById = new Map((sessionOperators ?? []).map((o) => [o.id, o.name]))
  const workspaceNameById = new Map((sessionWorkspaces ?? []).map((w) => [w.id, w.name]))

  const data: OperatorsPageData = {
    operators:
      operators?.map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        role: o.role,
        mfaEnabled: o.mfa_enabled,
        status: o.status,
        lastSignInAt: o.last_sign_in_at,
        createdAt: o.created_at,
        createdById: o.created_by_id,
      })) ?? [],
    activeSessions:
      sessions?.map((s) => ({
        id: s.id,
        operatorId: s.operator_id,
        operatorName: operatorNameById.get(s.operator_id) ?? s.operator_id,
        workspaceId: s.workspace_id,
        workspaceName: workspaceNameById.get(s.workspace_id) ?? s.workspace_id,
        mode: s.mode,
        reason: s.reason,
        startedAt: s.started_at,
        endedAt: s.ended_at,
      })) ?? [],
    audit:
      audit?.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        operatorId: a.operator_id,
        action: a.action,
        targetName: a.target_name,
        reason: a.reason,
      })) ?? [],
  }

  return <OperatorsClient data={data} />
}
