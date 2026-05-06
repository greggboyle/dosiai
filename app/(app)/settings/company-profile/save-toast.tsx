'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function CompanyProfileSaveToast() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    if (searchParams.get('saved') !== '1') return

    toast.success('Company profile saved')

    const next = new URLSearchParams(searchParams.toString())
    next.delete('saved')
    const nextUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [searchParams, pathname, router])

  return null
}
