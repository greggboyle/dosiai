'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { withWorkspace } from '@/lib/auth/workspace'
import { clampDailyIntelligenceSweepHourUtc } from '@/lib/sweep/daily-intelligence-slot'
import { persistWorkspaceProfileEmbeddings } from '@/lib/workspace/profile-embeddings'

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

    const productNames = parseLines(formData.get('productNames'))
    const brandAliases = parseLines(formData.get('brandAliases'))
    const valueProps = parseLines(formData.get('valueProps'))
    const differentiators = parseLines(formData.get('differentiators'))

    const { error } = await supabase.from('workspace_profile').upsert({
      workspace_id: workspace.id,
      legal_name: legalName || null,
      primary_url: primaryUrl || null,
      product_names: productNames,
      brand_aliases: brandAliases,
      founded_year: parseYear(formData.get('foundedYear')),
      headquarters: String(formData.get('headquarters') ?? '').trim() || null,
      industry: String(formData.get('industry') ?? '').trim() || null,
      geography_served: parseLines(formData.get('geographyServed')),
      company_summary: String(formData.get('companySummary') ?? '').trim() || null,
      icp_description: String(formData.get('icpDescription') ?? '').trim() || null,
      value_props: valueProps,
      differentiators,
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

    await persistWorkspaceProfileEmbeddings(supabase, workspace.id, workspace.plan, {
      legalName,
      primaryUrl,
      companySummary: String(formData.get('companySummary') ?? '').trim() || null,
      icpDescription: String(formData.get('icpDescription') ?? '').trim() || null,
      industry: String(formData.get('industry') ?? '').trim() || null,
      productNames,
      brandAliases,
      valueProps,
      differentiators,
    })

    const autoBriefsAutoApprove = formData.get('autoBriefsAutoApprove') === 'on'
    const hourRaw = formData.get('dailyIntelligenceSweepHourUtc')
    const dailyIntelligenceSweepHourUtc = clampDailyIntelligenceSweepHourUtc(
      typeof hourRaw === 'string' ? Number.parseInt(hourRaw, 10) : hourRaw
    )
    let wsError =
      (
        await supabase
          .from('workspace')
          .update({
            auto_briefs_auto_approve: autoBriefsAutoApprove,
            daily_intelligence_sweep_hour_utc: dailyIntelligenceSweepHourUtc,
          })
          .eq('id', workspace.id)
      ).error ?? null

    if (wsError) {
      const withoutSweep = await supabase
        .from('workspace')
        .update({ auto_briefs_auto_approve: autoBriefsAutoApprove })
        .eq('id', workspace.id)
      if (!withoutSweep.error) wsError = null
      else {
        const withoutAuto = await supabase
          .from('workspace')
          .update({ daily_intelligence_sweep_hour_utc: dailyIntelligenceSweepHourUtc })
          .eq('id', workspace.id)
        if (!withoutAuto.error) wsError = null
        else wsError = withoutSweep.error
      }
    }

    if (wsError) throw wsError
  })

  revalidatePath('/settings/company-profile')
  revalidatePath('/settings')
  redirect('/settings/company-profile?saved=1')
}
