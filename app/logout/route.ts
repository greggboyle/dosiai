import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Same-origin relative paths only — avoids open redirects via `?next=`. */
function safeRelativeNext(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

/**
 * GET /logout — ends the Supabase session (clears auth cookies) and redirects.
 * Optional query: `next` — same-origin path only (default `/sign-in`).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const nextPath = safeRelativeNext(requestUrl.searchParams.get('next')) ?? '/sign-in'
  return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
}
