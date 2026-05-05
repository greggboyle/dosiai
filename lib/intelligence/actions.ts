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

  revalidatePath('/feed')
  revalidatePath('/')
}
