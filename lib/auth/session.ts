import type { Session } from '@supabase/supabase-js'

/** Server-only session helper; avoided static import of `next/headers` at module scope for Turbopack. */
export async function getSession(): Promise<Session | null> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw error
  return session
}
