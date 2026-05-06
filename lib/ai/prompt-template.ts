import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AiPurposeDb, AiVendorDb, Database } from '@/lib/supabase/types'

type PromptTemplateRow = Database['public']['Tables']['prompt_template']['Row']

export function renderPromptTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => variables[key] ?? '')
}

export async function getActivePromptTemplateFor(
  purpose: AiPurposeDb,
  vendor: AiVendorDb
): Promise<PromptTemplateRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('prompt_template')
    .select('*')
    .eq('purpose', purpose)
    .eq('vendor', vendor)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
