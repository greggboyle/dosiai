'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { RESOURCES_BUCKET, ensureResourcesBucket } from '@/lib/resources/storage'
import { inngest } from '@/inngest/client'

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

  const { error: docErr } = await admin
    .from('resource_document' as any)
    .upsert(
      {
        workspace_id: member.workspace_id,
        uploaded_by: session.user.id,
        storage_bucket: RESOURCES_BUCKET,
        storage_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        status: 'queued',
        last_error: null,
      } as any,
      { onConflict: 'workspace_id,storage_path' }
    )
  if (docErr) throw docErr

  await inngest.send({
    name: 'resources/uploaded',
    data: {
      workspaceId: member.workspace_id,
      uploadedBy: session.user.id,
      bucket: RESOURCES_BUCKET,
      path: objectPath,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: file.size,
    },
  })

  revalidatePath('/resources')
}

export async function retryResourceProcessing(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const documentId = formData.get('documentId')
  if (typeof documentId !== 'string' || !documentId) throw new Error('Missing document id')

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

  const admin = createSupabaseAdminClient()
  const { data: doc, error: docErr } = await admin
    .from('resource_document' as any)
    .select('id,workspace_id')
    .eq('id', documentId)
    .single()
  if (docErr || !doc || doc.workspace_id !== member.workspace_id) throw new Error('Not found')

  await admin
    .from('resource_document' as any)
    .update({
      status: 'queued',
      last_error: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', documentId)

  await inngest.send({
    name: 'resources/extract.requested',
    data: {
      resourceDocumentId: documentId,
      workspaceId: member.workspace_id,
    },
  })

  revalidatePath('/resources')
}
