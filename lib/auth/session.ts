import type { Session } from '@supabase/supabase-js'

/** Server-only session helper; avoided static import of `next/headers` at module scope for Turbopack. */
export async function getSession(): Promise<Session | null> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!session) return null

  return { ...session, user }
}
