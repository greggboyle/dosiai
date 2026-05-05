import type { AuditCategory, AuditSeverity, OperatorRole } from '@/lib/types/dosi'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function logAuditEvent(input: {
  severity: AuditSeverity
  category: AuditCategory
  operatorId?: string
  operatorName: string
  operatorRole: OperatorRole | 'system'
  action: string
  targetType: string
  targetId: string
  targetName: string
  reason: string
  beforeValue?: string
  afterValue?: string
  ipAddress?: string
  sessionId?: string
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('audit_log_entry').insert({
    severity: input.severity,
    category: input.category,
    operator_id: input.operatorId ?? null,
    operator_role: input.operatorRole,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    target_name: input.targetName,
    reason: input.reason,
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
    ip_address: input.ipAddress ?? null,
    session_id: input.sessionId ?? null,
  })

  if (error) throw error
}
