'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { NotificationListItem } from '@/lib/notifications/queries'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/notifications/actions'

export interface NotificationsBellProps {
  userId: string
  initialUnread: number
  initialRecent: NotificationListItem[]
}

export function NotificationsBell({ userId, initialUnread, initialRecent }: NotificationsBellProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [unread, setUnread] = React.useState(initialUnread)
  const [items, setItems] = React.useState(initialRecent)

  React.useEffect(() => {
    setUnread(initialUnread)
  }, [initialUnread])

  React.useEffect(() => {
    setItems(initialRecent)
  }, [initialRecent])

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase.channel(`user:${userId}`)
    channel.on('broadcast', { event: 'notification.new' }, async () => {
      setUnread((n) => n + 1)
      const { data } = await supabase
        .from('user_notification')
        .select('id, title, body, brief_id, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        const entry: NotificationListItem = {
          id: data.id,
          title: data.title,
          body: data.body,
          briefId: data.brief_id,
          readAt: data.read_at,
          createdAt: data.created_at,
        }
        setItems((prev) => {
          const rest = prev.filter((p) => p.id !== entry.id)
          return [entry, ...rest].slice(0, 20)
        })
      }
    })
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const onOpenItem = async (n: NotificationListItem) => {
    if (!n.readAt) {
      try {
        await markNotificationRead(n.id)
        setUnread((u) => Math.max(0, u - 1))
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        )
      } catch {
        // still navigate
      }
    }
    if (n.briefId) {
      setOpen(false)
      router.push(`/briefs/${n.briefId}`)
    }
  }

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setUnread(0)
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
      router.refresh()
    } catch {
      // ignore
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium leading-none text-accent-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void onMarkAllRead()}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80',
                      !n.readAt && 'bg-muted/40'
                    )}
                    onClick={() => void onOpenItem(n)}
                  >
                    <span className="font-medium leading-snug">{n.title}</span>
                    {n.body ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t px-3 py-2">
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link href="/my-briefs" onClick={() => setOpen(false)}>
              View briefs
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
