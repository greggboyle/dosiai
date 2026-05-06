import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeRelativePath } from '@/lib/url/safe-relative-path'

/** After auth, send users to the app root; `(app)` layout sends workspace-less users to `/onboarding`. */
const DEFAULT_POST_AUTH_PATH = '/'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeRelativePath(requestUrl.searchParams.get('next'), DEFAULT_POST_AUTH_PATH)

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
