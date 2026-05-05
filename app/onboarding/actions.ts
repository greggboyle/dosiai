'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { withWorkspace } from '@/lib/auth/workspace'

interface CreateWorkspaceInput {
  name: string
  domain?: string
  companyDescription?: string
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('workspace')
    .insert({
      name: input.name,
      domain: input.domain ?? null,
      plan: 'trial',
      status: 'active',
      trial_ends_at: trialEndsAt,
      ai_cost_ceiling_cents: 4000,
    })
    .select('id')
    .single()

  if (workspaceError) {
    throw workspaceError
  }

  const { error: memberError } = await supabaseAdmin.from('workspace_member').insert({
    user_id: session.user.id,
    workspace_id: workspace.id,
    role: 'admin',
    status: 'active',
  })

  if (memberError) {
    throw memberError
  }

  revalidatePath('/onboarding')
  return { workspaceId: workspace.id, companyDescription: input.companyDescription ?? '' }
}

export async function saveWorkspaceProfile(input: {
  workspaceId: string
  companyName: string
  companyWebsite: string
  companySummary: string
  companyICP: string
  industry: string
  geography?: string
}) {
  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.from('workspace_profile').upsert({
      workspace_id: workspace.id,
      company_name: input.companyName,
      company_website: input.companyWebsite,
      company_summary: input.companySummary,
      icp: input.companyICP,
      industry: input.industry,
      geography: input.geography ?? null,
    })

    if (error) throw error
    revalidatePath('/onboarding')
    return true
  })
}

export async function saveCompetitors(input: {
  workspaceId: string
  competitors: Array<{ name: string; website: string }>
}) {
  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseServerClient()

    const rows = input.competitors
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({
        workspace_id: workspace.id,
        name: c.name.trim(),
        website: c.website.trim() || null,
        source: 'onboarding',
        status: 'active' as const,
      }))

    if (rows.length === 0) return true

    const { error } = await supabase.from('competitor').insert(rows)
    if (error) throw error
    revalidatePath('/onboarding')
    return true
  })
}

export async function saveTopics(input: {
  workspaceId: string
  topics: Array<{ name: string; description?: string }>
}) {
  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace, user }) => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseServerClient()

    const rows = input.topics
      .filter((t) => t.name.trim().length > 0)
      .map((t) => ({
        workspace_id: workspace.id,
        name: t.name.trim(),
        description: t.description?.trim() || null,
        created_by_id: user.id,
        status: 'active' as const,
      }))

    if (rows.length === 0) return true

    const { error } = await supabase.from('topic').insert(rows)
    if (error) throw error
    revalidatePath('/onboarding')
    return true
  })
}
