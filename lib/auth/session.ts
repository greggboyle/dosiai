import type { Session } from '@supabase/supabase-js'

/**
 * Server-only session helper; avoided static import of `next/headers` at module scope for Turbopack.
 * Uses only `getUser()` for identity (JWT validated with Auth). Does not call `getSession()`, which
 * would log Supabase’s “insecure user from storage” warning on the server.
 */
export async function getSession(): Promise<Session | null> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const now = Math.floor(Date.now() / 1000)

  return {
    access_token: '',
    refresh_token: '',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  }
}
