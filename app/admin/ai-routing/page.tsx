import { listAiRoutingConfigs } from '@/app/admin/actions/platform'
import { AiRoutingClient } from '@/app/admin/ai-routing/ai-routing-client'
import type { AiRoutingDbRow } from '@/lib/admin/map-ai-routing-db'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AdminAiRoutingPage() {
  const rows = await listAiRoutingConfigs()
  const admin = createSupabaseAdminClient()
  const { data: auditRows } = await admin
    .from('audit_log_entry')
    .select('timestamp,operator_role,action,reason,target_name')
    .eq('category', 'ai_routing')
    .order('timestamp', { ascending: false })
    .limit(20)

  return <AiRoutingClient initialConfigs={rows as AiRoutingDbRow[]} initialAuditRows={auditRows ?? []} />
}
