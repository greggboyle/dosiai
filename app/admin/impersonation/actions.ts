'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOperatorSession } from '@/lib/auth/operator'
import { logAuditEvent } from '@/lib/audit/log'

export async function startImpersonation(
  workspaceId: string,
  mode: 'read_only' | 'write',
  reason: string,
  approvedByOperatorId?: string
) {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')
  if (!reason.trim()) throw new Error('Reason is required')
  if (mode === 'write' && !approvedByOperatorId) {
    throw new Error('Write mode requires second operator approval')
  }

  const supabase = await createSupabaseServerClient()

  const { data: workspace } = await supabase.from('workspace').select('id,name').eq('id', workspaceId).single()
  if (!workspace) throw new Error('Workspace not found')

  const { error } = await supabase.from('impersonation_session').insert({
    operator_id: operatorSession.operator.id,
    workspace_id: workspace.id,
    mode,
    reason,
    approved_by_id: approvedByOperatorId ?? null,
  })
  if (error) throw error

  await logAuditEvent({
    severity: 'warn',
    category: 'operator',
    operatorId: operatorSession.operator.id,
    operatorName: operatorSession.operator.email,
    operatorRole: operatorSession.operator.role,
    action: 'impersonation_started',
    targetType: 'workspace',
    targetId: workspace.id,
    targetName: workspace.name,
    reason,
  })

  revalidatePath('/admin/impersonation')
}

export async function endImpersonation(sessionId: string) {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: session } = await supabase
    .from('impersonation_session')
    .select('id,workspace_id,workspace:workspace_id(name)')
    .eq('id', sessionId)
    .is('ended_at', null)
    .single()

  if (!session) throw new Error('Active impersonation session not found')

  const { error } = await supabase
    .from('impersonation_session')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error

  await logAuditEvent({
    severity: 'info',
    category: 'operator',
    operatorId: operatorSession.operator.id,
    operatorName: operatorSession.operator.email,
    operatorRole: operatorSession.operator.role,
    action: 'impersonation_ended',
    targetType: 'workspace',
    targetId: session.workspace_id,
    targetName: (session.workspace as unknown as { name?: string })?.name ?? session.workspace_id,
    reason: 'Operator ended impersonation session',
  })

  revalidatePath('/admin/impersonation')
}
