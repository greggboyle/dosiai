'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export async function updateProfileFromForm(formData: FormData): Promise<void> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const timezone = String(formData.get('timezone') ?? '').trim()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) throw userErr
  if (!user) redirect('/sign-in')

  const meta = { ...(user.user_metadata ?? {}) }
  if (fullName) {
    meta.full_name = fullName
  } else {
    delete meta.full_name
  }
  if (timezone) {
    meta.timezone = timezone
  } else {
    delete meta.timezone
  }

  const { error } = await supabase.auth.updateUser({ data: meta })
  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/profile', 'layout')
  redirect('/profile?saved=1')
}

export async function changePasswordFromForm(formData: FormData): Promise<void> {
  const next = String(formData.get('newPassword') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (next.length < 8) {
    redirect('/profile?errorCode=password_short')
  }
  if (next !== confirm) {
    redirect('/profile?errorCode=password_mismatch')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/profile', 'layout')
  redirect('/profile?password=updated')
}

export async function sendPasswordResetEmailAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) throw userErr
  if (!user?.email) {
    redirect('/profile?errorCode=no_email')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${appBaseUrl()}/reset-password`,
  })
  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/profile?resetEmail=sent')
}
