import { redirect } from 'next/navigation'
import { createEmptyBriefDraftForSession } from '@/lib/brief/create-empty-draft'

export const dynamic = 'force-dynamic'

export default async function NewBriefPage() {
  const result = await createEmptyBriefDraftForSession()
  if (!result.ok) {
    redirect('/briefs')
  }
  redirect(`/briefs/${result.id}/edit`)
}
