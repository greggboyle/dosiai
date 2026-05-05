import { redirect } from 'next/navigation'
import { createBriefDraft } from '@/lib/brief/actions'

export default async function NewBriefPage() {
  const id = await createBriefDraft()
  redirect(`/briefs/${id}/edit`)
}
