'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CompetitorStatus, CompetitorTier } from '@/lib/types'
import { assertCompetitorCapacity } from '@/lib/competitors/limits'

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
