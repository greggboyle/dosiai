'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const ERROR_MESSAGES: Record<string, string> = {
  password_short: 'Password must be at least 8 characters.',
  password_mismatch: 'New password and confirmation do not match.',
  no_email: 'Your account does not have an email address for recovery.',
}

export function ProfileToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    const saved = searchParams.get('saved')
    const resetEmail = searchParams.get('resetEmail')
    const password = searchParams.get('password')
    const errorCode = searchParams.get('errorCode')
    const error = searchParams.get('error')

    if (saved === '1') {
      toast.success('Profile updated')
    } else if (resetEmail === 'sent') {
      toast.success('Password reset email sent. Check your inbox.')
    } else if (password === 'updated') {
      toast.success('Password updated')
    } else if (errorCode && ERROR_MESSAGES[errorCode]) {
      toast.error(ERROR_MESSAGES[errorCode])
    } else if (error) {
      toast.error(decodeURIComponent(error))
    } else {
      return
    }

    const next = new URLSearchParams(searchParams.toString())
    next.delete('saved')
    next.delete('resetEmail')
    next.delete('password')
    next.delete('errorCode')
    next.delete('error')
    const nextUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [searchParams, pathname, router])

  return null
}
