import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeRelativePath } from '@/lib/url/safe-relative-path'

/**
 * GET /logout — ends the Supabase session (clears auth cookies) and redirects.
 * Optional query: `next` — same-origin path only (default `/sign-in`).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const nextPath = safeRelativePath(requestUrl.searchParams.get('next'), '/sign-in')
  return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
}
