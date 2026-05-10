import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listCustomerVoiceItems } from '@/lib/customer-voice/queries'
import type { SubjectOption } from './customer-voice-client'
import { CustomerVoiceClient } from './customer-voice-client'

export default async function CustomerVoicePage() {
  const supabase = await createSupabaseServerClient()
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) redirect('/onboarding')

  const items = await listCustomerVoiceItems(member.workspace_id, {})

  const bySubject = new Map<string, string>()
  for (const i of items) {
    const sid = i.reviewMetadata?.subjectId
    const sn = i.reviewMetadata?.subjectName
    if (sid && sn && !bySubject.has(sid)) bySubject.set(sid, sn)
  }
  const subjects: SubjectOption[] = [...bySubject.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return <CustomerVoiceClient items={items} subjects={subjects} />
}
