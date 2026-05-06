'use server'

import { revalidatePath } from 'next/cache'
import { inngest } from '@/inngest/client'
import { getSession } from '@/lib/auth/session'
import { withWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { WorkspacePlan } from '@/lib/types/dosi'
import type { CompetitorStatus, CompetitorTier } from '@/lib/types'
import { getCompetitorProfileRefreshPolicy } from '@/lib/competitors/profile-refresh'
import { assertCompetitorCapacity } from '@/lib/competitors/limits'

export async function requestCompetitorProfileRefresh(competitorId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id,role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role === 'viewer') throw new Error('Forbidden')

  const [{ data: workspace, error: wsErr }, { data: competitor, error: compErr }] = await Promise.all([
    supabase.from('workspace').select('id,plan,status').eq('id', member.workspace_id).single(),
    supabase
      .from('competitor')
      .select('id,last_profile_refresh')
      .eq('workspace_id', member.workspace_id)
      .eq('id', competitorId)
      .single(),
  ])

  if (wsErr || !workspace) throw wsErr ?? new Error('Workspace not found')
  if (workspace.status === 'read_only') throw new Error('Workspace is read-only')
  if (compErr || !competitor) throw compErr ?? new Error('Competitor not found')

  const policy = getCompetitorProfileRefreshPolicy({
    plan: workspace.plan as WorkspacePlan,
    lastProfileRefreshAt: competitor.last_profile_refresh,
  })
  if (!policy.allowed) {
    if (policy.nextAllowedAt) {
      const when = new Date(policy.nextAllowedAt).toLocaleString()
      throw new Error(`${policy.reason ?? 'Refresh limit reached'} Next allowed: ${when}.`)
    }
    throw new Error(policy.reason ?? 'Refresh not allowed for this workspace')
  }

  await inngest.send({
    name: 'competitor/populate-profile',
    data: {
      workspaceId: member.workspace_id,
      competitorId,
      requestedByUserId: session.user.id,
      source: 'manual',
      bypassLimits: false,
    },
  })

  revalidatePath(`/competitors/${competitorId}`)
}
export async function createCompetitor(input: {
  workspaceId: string
  name: string
  website?: string
  tier?: CompetitorTier
}): Promise<{ id: string }> {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')

  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    if (workspace.status !== 'active') {
      throw new Error('Workspace cannot add competitors in the current state.')
    }

    await assertCompetitorCapacity(workspace.id, workspace.plan)

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('competitor')
      .insert({
        workspace_id: workspace.id,
        name,
        website: input.website?.trim() || null,
        source: 'manual',
        status: 'active',
        tier: input.tier ?? 'primary_direct',
      })
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('Failed to create competitor')

    revalidatePath('/competitors')
    revalidatePath('/')
    return { id: data.id }
  })
}

export async function setCompetitorStatus(input: {
  workspaceId: string
  competitorId: string
  status: CompetitorStatus
}): Promise<void> {
  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    if (workspace.status !== 'active') {
      throw new Error('Workspace cannot update competitors in the current state.')
    }

    if (input.status === 'active') {
      await assertCompetitorCapacity(workspace.id, workspace.plan)
    }

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('competitor')
      .update({ status: input.status })
      .eq('id', input.competitorId)
      .eq('workspace_id', workspace.id)

    if (error) throw error

    revalidatePath('/competitors')
    revalidatePath('/')
  })
}
