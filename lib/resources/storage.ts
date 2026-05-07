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
