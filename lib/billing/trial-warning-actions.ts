'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TrialThreshold } from '@/lib/billing/trial-warning-data'

export async function dismissTrialWarning(threshold: TrialThreshold): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) throw new Error('No workspace')

  const { error } = await supabase
    .from('trial_warning_seen')
    .update({ dismissed: true })
    .eq('workspace_id', member.workspace_id)
    .eq('threshold', threshold)

  if (error) throw error

  revalidatePath('/', 'layout')
}
