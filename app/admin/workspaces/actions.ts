'use server'

import { logAuditEvent } from '@/lib/audit/log'
import { getOperatorSession } from '@/lib/auth/operator'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

export async function runSweepOnBehalf(workspaceId: string, reason: string) {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) throw new Error('Unauthorized')
  if (!reason.trim()) throw new Error('Reason is required')

  const supabase = await createSupabaseServerClient()
  const { data: workspace } = await supabase.from('workspace').select('id,name').eq('id', workspaceId).single()
  if (!workspace) throw new Error('Workspace not found')

  await inngest.send({
    name: 'sweep/run',
    data: { workspaceId, trigger: 'manual' as const, triggerUserId: null },
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
    reason: `Operator-triggered sweep request: ${reason}`,
  })

  return { accepted: true }
}
