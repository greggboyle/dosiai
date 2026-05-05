import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * `next/headers` is loaded dynamically so Turbopack does not treat this module as shared client code.
 */
export async function createSupabaseServerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Cookie writes are forbidden in Server Components; Supabase may still try to refresh the session.
            // Writes succeed in Route Handlers and Server Actions. Consider middleware if you need refresh in RSC.
          }
        },
      },
    }
  )
}
