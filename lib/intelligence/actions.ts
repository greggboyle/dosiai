'use server'

import { revalidatePath } from 'next/cache'
import { withWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getWorkspaceIdForUser } from '@/lib/feed/queries'

export async function markIntelligenceItemReviewed(itemId: string): Promise<void> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) throw new Error('Unauthorized')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('intelligence_item')
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)

    if (error) throw error
  })

  revalidatePath('/intel')
  revalidatePath('/')
}

export async function attachCompetitorToIntelligenceItem(
  itemId: string,
  competitorId: string
): Promise<void> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) throw new Error('Unauthorized')
  if (!itemId || !competitorId) throw new Error('Missing item or competitor id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async () => {
    const supabase = await createSupabaseServerClient()

    const { data: row, error: fetchErr } = await supabase
      .from('intelligence_item')
      .select('related_competitors')
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!row) throw new Error('Item not found')

    const existing = Array.isArray(row.related_competitors) ? row.related_competitors : []
    const next = Array.from(new Set([...existing, competitorId]))

    const { error } = await supabase
      .from('intelligence_item')
      .update({ related_competitors: next })
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)
    if (error) throw error
  })

  revalidatePath('/intel')
  revalidatePath('/')
}

export async function detachCompetitorFromIntelligenceItem(
  itemId: string,
  competitorId: string
): Promise<void> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) throw new Error('Unauthorized')
  if (!itemId || !competitorId) throw new Error('Missing item or competitor id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async () => {
    const supabase = await createSupabaseServerClient()

    const { data: row, error: fetchErr } = await supabase
      .from('intelligence_item')
      .select('related_competitors')
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!row) throw new Error('Item not found')

    const existing = Array.isArray(row.related_competitors) ? row.related_competitors : []
    const next = existing.filter((id: string) => id !== competitorId)

    const { error } = await supabase
      .from('intelligence_item')
      .update({ related_competitors: next })
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)
    if (error) throw error
  })

  revalidatePath('/intel')
  revalidatePath('/')
}

export async function setIntelligenceItemWatching(itemId: string, isWatching: boolean): Promise<void> {
  const workspaceId = await getWorkspaceIdForUser()
  if (!workspaceId) throw new Error('Unauthorized')
  if (!itemId) throw new Error('Missing item id')

  await withWorkspace(workspaceId, ['admin', 'analyst'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()

    const { data: item, error: itemErr } = await supabase
      .from('intelligence_item')
      .select('id')
      .eq('id', itemId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (itemErr) throw itemErr
    if (!item) throw new Error('Item not found')

    const { data: existing, error: stateErr } = await supabase
      .from('item_user_state')
      .select('item_id')
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (stateErr) throw stateErr

    if (existing) {
      const { error } = await supabase
        .from('item_user_state')
        .update({
          is_watching: isWatching,
          updated_at: new Date().toISOString(),
        })
        .eq('item_id', itemId)
        .eq('user_id', user.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('item_user_state').insert({
        item_id: itemId,
        user_id: user.id,
        status: 'new',
        is_watching: isWatching,
      })
      if (error) throw error
    }
  })

  revalidatePath('/intel')
  revalidatePath('/')
}
