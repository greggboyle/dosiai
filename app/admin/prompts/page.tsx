import { listPromptTemplates, seedPromptTemplatesFromCode } from '@/app/admin/actions/platform'
import { PromptsClient } from '@/app/admin/prompts/prompts-client'
import { promptRowToUi } from '@/lib/admin/map-prompt-row'

export default async function AdminPromptsPage() {
  await seedPromptTemplatesFromCode()
  const rows = await listPromptTemplates()
  const initialTemplates = rows.map(promptRowToUi)
  return <PromptsClient initialTemplates={initialTemplates} />
}
