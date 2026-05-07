import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const RESOURCES_BUCKET = 'resources'

type StorageObject = {
  name: string
  id?: string
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: { size?: number }
}

export type WorkspaceResource = {
  name: string
  path: string
  sizeBytes: number
  updatedAt: string | null
  signedUrl: string | null
}

export type ResourceDocumentStatus = 'uploaded' | 'queued' | 'processing' | 'ready' | 'failed' | 'archived'

export type ResourceDocumentListItem = {
  id: string
  name: string
  path: string
  sizeBytes: number
  updatedAt: string
  status: ResourceDocumentStatus
  lastError: string | null
  signedUrl: string | null
}

export async function ensureResourcesBucket(): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage.createBucket(RESOURCES_BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  })
  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw error
  }
}

export async function listWorkspaceResources(workspaceId: string): Promise<WorkspaceResource[]> {
  await ensureResourcesBucket()
  const admin = createSupabaseAdminClient()
  const prefix = `workspace/${workspaceId}/resources`
  const { data, error } = await admin.storage.from(RESOURCES_BUCKET).list(prefix, {
    limit: 200,
    sortBy: { column: 'updated_at', order: 'desc' },
  })
  if (error) throw error
  const files = ((data ?? []) as StorageObject[]).filter((item) => item.name && !item.id?.endsWith('/'))
  const resources = await Promise.all(
    files.map(async (file) => {
      const objectPath = `${prefix}/${file.name}`
      const { data: signed } = await admin.storage.from(RESOURCES_BUCKET).createSignedUrl(objectPath, 3600)
      return {
        name: file.name,
        path: objectPath,
        sizeBytes: file.metadata?.size ?? 0,
        updatedAt: file.updated_at ?? file.created_at ?? null,
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )
  return resources
}

export async function listWorkspaceResourceDocuments(
  workspaceId: string
): Promise<ResourceDocumentListItem[]> {
  await ensureResourcesBucket()
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('resource_document' as any)
    .select('id,file_name,storage_path,size_bytes,updated_at,status,last_error')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const rows = (data ?? []) as Array<{
    id: string
    file_name: string
    storage_path: string
    size_bytes: number
    updated_at: string
    status: ResourceDocumentStatus
    last_error: string | null
  }>
  const resources = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await admin
        .storage
        .from(RESOURCES_BUCKET)
        .createSignedUrl(row.storage_path, 3600)
      return {
        id: row.id,
        name: row.file_name,
        path: row.storage_path,
        sizeBytes: row.size_bytes,
        updatedAt: row.updated_at,
        status: row.status,
        lastError: row.last_error,
        signedUrl: signed?.signedUrl ?? null,
      }
    })
  )
  return resources
}
