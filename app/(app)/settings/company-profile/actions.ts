'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/auth/workspace'

function parseLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
}

function parseYear(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const n = Number.parseInt(value.trim(), 10)
  return Number.isFinite(n) ? n : null
}

export async function updateCompanyProfile(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId') ?? '')
  if (!workspaceId) throw new Error('Missing workspace')

  const legalName = String(formData.get('legalName') ?? '').trim()
  const primaryUrl = String(formData.get('primaryUrl') ?? '').trim()

  await withWorkspace(workspaceId, 'admin', async ({ workspace, user }) => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseServerClient()

    const socialHandles = {
      linkedin: String(formData.get('linkedin') ?? '').trim(),
      twitter: String(formData.get('twitter') ?? '').trim(),
      github: String(formData.get('github') ?? '').trim(),
      other: String(formData.get('otherSocial') ?? '').trim(),
    }

    const { error } = await supabase.from('workspace_profile').upsert({
      workspace_id: workspace.id,
      legal_name: legalName || null,
      primary_url: primaryUrl || null,
      product_names: parseLines(formData.get('productNames')),
      brand_aliases: parseLines(formData.get('brandAliases')),
      founded_year: parseYear(formData.get('foundedYear')),
      headquarters: String(formData.get('headquarters') ?? '').trim() || null,
      industry: String(formData.get('industry') ?? '').trim() || null,
      geography_served: parseLines(formData.get('geographyServed')),
      company_summary: String(formData.get('companySummary') ?? '').trim() || null,
      icp_description: String(formData.get('icpDescription') ?? '').trim() || null,
      value_props: parseLines(formData.get('valueProps')),
      differentiators: parseLines(formData.get('differentiators')),
      social_handles: socialHandles,
      press_kit_url: String(formData.get('pressKitUrl') ?? '').trim() || null,
      updated_by: user.id,
      // Keep legacy columns populated for backward compatibility.
      company_name: legalName || null,
      company_website: primaryUrl || null,
      icp: String(formData.get('icpDescription') ?? '').trim() || null,
      geography: parseLines(formData.get('geographyServed')).join(', ') || null,
    })

    if (error) throw error
  })

  revalidatePath('/settings/company-profile')
}
