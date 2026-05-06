import type { PromptTemplate, PromptVariable, AIPurpose, AIVendor } from '@/lib/admin-types'
import type { Database } from '@/lib/supabase/types'

type PromptRow = Database['public']['Tables']['prompt_template']['Row']

export function promptRowToUi(row: PromptRow): PromptTemplate {
  let variables: PromptVariable[] = []
  if (Array.isArray(row.variables)) {
    variables = row.variables as PromptVariable[]
  } else if (row.variables && typeof row.variables === 'object') {
    variables = []
  }

  const deploymentHistory = Array.isArray(row.deployment_history)
    ? (row.deployment_history as PromptTemplate['deploymentHistory'])
    : []
  const latestDeployment = deploymentHistory[0]

  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose as AIPurpose,
    vendor: row.vendor as AIVendor,
    status: row.status,
    version: row.version,
    draftVersion: row.draft_content ? row.version + 1 : row.version,
    content: row.content,
    draftContent: row.draft_content ?? undefined,
    draftNote: row.draft_note ?? undefined,
    variables,
    callsPerDay: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by_operator_id ?? 'operator',
    deployedAt: latestDeployment?.deployedAt ?? null,
    deployedBy: latestDeployment?.deployedBy ?? null,
    deploymentHistory,
    abTest: undefined,
  }
}
