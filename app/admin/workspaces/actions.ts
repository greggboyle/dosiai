'use server'

import { revalidatePath } from 'next/cache'
import { logAuditEvent } from '@/lib/audit/log'
import { getOperatorSession } from '@/lib/auth/operator'
import { requireOperatorAdminOrOwner } from '@/lib/admin/require-operator'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { dispatchSweepRun } from '@/lib/sweep/dispatch-run'
import { dispatchHiringSweepRun } from '@/lib/sweep/dispatch-hiring-sweep'
import type { AiPurposeDb } from '@/lib/supabase/types'
import type { WorkspacePlan } from '@/lib/types/dosi'

const WORKSPACE_PLANS: WorkspacePlan[] = ['trial', 'starter', 'team', 'business', 'enterprise']

export async function updateWorkspacePlan(workspaceId: string, plan: WorkspacePlan, reason: string) {
  const { operator } = await requireOperatorAdminOrOwner()
  if (!reason.trim()) throw new Error('Reason is required')
  if (!WORKSPACE_PLANS.includes(plan)) throw new Error('Invalid plan')

  const admin = createSupabaseAdminClient()
  const { data: ws, error: fetchError } = await admin
    .from('workspace')
    .select('id,name,plan')
    .eq('id', workspaceId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!ws) throw new Error('Workspace not found')

  if (ws.plan === plan) {
    return { ok: true as const, unchanged: true as const }
  }

  const { error: updateError } = await admin.from('workspace').update({ plan }).eq('id', workspaceId)
  if (updateError) throw updateError

  await logAuditEvent({
    severity: 'warn',
    category: 'operator',
    operatorId: operator.id,
    operatorName: operator.email,
    operatorRole: operator.role,
    action: 'workspace_plan_changed',
    targetType: 'workspace',
    targetId: ws.id,
    targetName: ws.name,
    reason: `Operator changed workspace plan: ${reason}`,
    beforeValue: ws.plan,
    afterValue: plan,
  })

  revalidatePath(`/admin/workspaces/${workspaceId}`)
  revalidatePath('/admin/workspaces/search')
  revalidatePath('/admin/workspaces/recent')
  revalidatePath('/admin/billing')
  return { ok: true as const, unchanged: false as const }
}

export async function runSweepOnBehalf(
  workspaceId: string,
  reason: string,
  purposes?: readonly AiPurposeDb[]
) {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')
  if (!reason.trim()) throw new Error('Reason is required')

  const supabase = await createSupabaseServerClient()
  const { data: workspace } = await supabase.from('workspace').select('id,name').eq('id', workspaceId).single()
  if (!workspace) throw new Error('Workspace not found')

  await dispatchSweepRun({
    workspaceId,
    trigger: 'manual',
    triggerUserId: null,
    purposes: purposes?.length ? purposes : undefined,
  })

  await logAuditEvent({
    severity: 'warn',
    category: 'operator',
    operatorId: operatorSession.operator.id,
    operatorName: operatorSession.operator.email,
    operatorRole: operatorSession.operator.role,
    action: 'sweep_triggered',
    targetType: 'workspace',
    targetId: workspace.id,
    targetName: workspace.name,
    reason: `Operator-triggered sweep request: ${reason}${purposes?.length ? ` (purposes: ${purposes.join(', ')})` : ''}`,
  })

  return { accepted: true }
}

export async function runHiringSweepOnBehalf(workspaceId: string, reason: string) {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')
  if (!reason.trim()) throw new Error('Reason is required')

  const supabase = await createSupabaseServerClient()
  const { data: workspace } = await supabase.from('workspace').select('id,name').eq('id', workspaceId).single()
  if (!workspace) throw new Error('Workspace not found')

  await dispatchHiringSweepRun({
    workspaceId,
    trigger: 'manual',
    triggerUserId: null,
  })

  await logAuditEvent({
    severity: 'warn',
    category: 'operator',
    operatorId: operatorSession.operator.id,
    operatorName: operatorSession.operator.email,
    operatorRole: operatorSession.operator.role,
    action: 'hiring_sweep_triggered',
    targetType: 'workspace',
    targetId: workspace.id,
    targetName: workspace.name,
    reason: `Operator-triggered hiring sweep: ${reason}`,
  })

  return { accepted: true }
}
