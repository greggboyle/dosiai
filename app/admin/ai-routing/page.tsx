import { listAiRoutingConfigs } from '@/app/admin/actions/platform'
import { AiRoutingClient } from '@/app/admin/ai-routing/ai-routing-client'
import type { AiRoutingDbRow } from '@/lib/admin/map-ai-routing-db'

export default async function AdminAiRoutingPage() {
  const rows = await listAiRoutingConfigs()
  return <AiRoutingClient initialConfigs={rows as AiRoutingDbRow[]} />
}
