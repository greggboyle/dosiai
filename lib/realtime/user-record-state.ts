'use client'

import * as React from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Subscribe to broadcast `user_record_state.updated` on the user channel (same transport as notifications).
 * Caller should `router.refresh()` or update local state when payload matches visible records.
 */
export function useUserRecordStateBroadcast(
  userId: string | undefined,
  onEvent: (payload: Record<string, unknown>) => void
) {
  React.useEffect(() => {
    if (!userId) return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`user:${userId}`)
      .on('broadcast', { event: 'user_record_state.updated' }, ({ payload }) => {
        if (payload && typeof payload === 'object') onEvent(payload as Record<string, unknown>)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, onEvent])
}
