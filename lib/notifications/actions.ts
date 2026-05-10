'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function markNotificationRead(notificationId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_notification')
    .update({ read_at: now })
    .eq('id', notificationId)
    .eq('user_id', session.user.id)

  if (error) throw error

  revalidatePath('/', 'layout')
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_notification')
    .update({ read_at: now })
    .eq('user_id', session.user.id)
    .is('read_at', null)

  if (error) throw error

  revalidatePath('/', 'layout')
}
