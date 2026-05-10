import { createSupabaseServerClient } from '@/lib/supabase/server'

export type NotificationListItem = {
  id: string
  title: string
  body: string | null
  briefId: string | null
  createdAt: string
  readAt: string | null
}

export async function loadNotificationBootstrap(userId: string): Promise<{
  unreadCount: number
  recent: NotificationListItem[]
}> {
  const supabase = await createSupabaseServerClient()

  const { count, error: cErr } = await supabase
    .from('user_notification')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (cErr) throw cErr

  const { data: rows, error } = await supabase
    .from('user_notification')
    .select('id, title, body, brief_id, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  const recent: NotificationListItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    briefId: r.brief_id,
    readAt: r.read_at,
    createdAt: r.created_at,
  }))

  return { unreadCount: count ?? 0, recent }
}
