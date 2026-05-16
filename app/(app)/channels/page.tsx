import { Suspense } from 'react'
import { ChannelsPageClient } from './channels-page-client'

export default function ChannelsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading channels…</div>}>
      <ChannelsPageClient />
    </Suspense>
  )
}
