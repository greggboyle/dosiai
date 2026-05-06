'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TopicImportance } from '@/lib/types'

export async function createTopic(input: {
  workspaceId: string
  name: string
  description: string
  importance: TopicImportance
  searchSeeds: string[]
}): Promise<{ id: string }> {
  const name = input.name.trim()
  if (!name) throw new Error('Topic name is required')

  return withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace, user }) => {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('topic')
      .insert({
        workspace_id: workspace.id,
        name,
        description: input.description.trim() || null,
        importance: input.importance,
        status: 'active',
        created_by_id: user.id,
        search_seeds: input.searchSeeds,
      })
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('Failed to create topic')

    revalidatePath('/topics')
    revalidatePath('/feed')
    return { id: data.id }
  })
}

export async function updateTopic(input: {
  workspaceId: string
  topicId: string
  name: string
  description: string
  importance: TopicImportance
  searchSeeds: string[]
}): Promise<void> {
  const name = input.name.trim()
  if (!name) throw new Error('Topic name is required')

  await withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('topic')
      .update({
        name,
        description: input.description.trim() || null,
        importance: input.importance,
        search_seeds: input.searchSeeds,
      })
      .eq('workspace_id', workspace.id)
      .eq('id', input.topicId)

    if (error) throw error
  })

  revalidatePath('/topics')
  revalidatePath('/feed')
}

export async function archiveTopic(input: { workspaceId: string; topicId: string }): Promise<void> {
  await withWorkspace(input.workspaceId, ['admin', 'analyst'], async ({ workspace }) => {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('topic')
      .update({ status: 'archived' })
      .eq('workspace_id', workspace.id)
      .eq('id', input.topicId)

    if (error) throw error
  })

  revalidatePath('/topics')
  revalidatePath('/feed')
}
