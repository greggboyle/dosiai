'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { RESOURCES_BUCKET, ensureResourcesBucket } from '@/lib/resources/storage'

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadResource(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('No file selected')
  if (!file.name || file.size <= 0) throw new Error('Invalid file')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member) throw new Error('No workspace')
  if (member.role === 'viewer') throw new Error('Forbidden')

  await ensureResourcesBucket()

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeName = sanitizeFileName(file.name)
  const objectPath = `workspace/${member.workspace_id}/resources/${timestamp}-${safeName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage.from(RESOURCES_BUCKET).upload(objectPath, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error

  revalidatePath('/resources')
}
