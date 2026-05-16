'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withWorkspace } from '@/lib/auth/workspace'
import type { RecordReadStatus, UserRecordType } from '@/lib/types/dosi'
import { isPostgrestMissingTable } from '@/lib/supabase/postgrest-errors'

const MIGRATION_HINT =
  'Apply Supabase migrations 0042_brief_user_state.sql and 0044_user_record_state.sql, then reload the API schema.'

async function resolveWorkspaceForRecord(
  recordType: UserRecordType,
  recordId: string
): Promise<string> {
  const supabase = await createSupabaseServerClient()
  switch (recordType) {
    case 'brief': {
      const { data, error } = await supabase.from('brief').select('workspace_id').eq('id', recordId).maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'intelligence_item':
    case 'customer_voice': {
      const { data, error } = await supabase
        .from('intelligence_item')
        .select('workspace_id')
        .eq('id', recordId)
        .maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'competitor': {
      const { data, error } = await supabase.from('competitor').select('workspace_id').eq('id', recordId).maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'topic': {
      const { data, error } = await supabase.from('topic').select('workspace_id').eq('id', recordId).maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'win_loss': {
      const { data, error } = await supabase
        .from('win_loss_outcome')
        .select('workspace_id')
        .eq('id', recordId)
        .maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'battle_card': {
      const { data, error } = await supabase.from('battle_card').select('workspace_id').eq('id', recordId).maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    case 'channel': {
      const { data, error } = await supabase.from('channel').select('workspace_id').eq('id', recordId).maybeSingle()
      if (error || !data) throw new Error('Record not found')
      return data.workspace_id
    }
    default:
      throw new Error('Unsupported record type')
  }
}

async function broadcastRecordState(userId: string, payload: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient()
  await supabase.channel(`user:${userId}`).send({
    type: 'broadcast',
    event: 'user_record_state.updated',
    payload,
  })
}

async function dualWriteBriefUserState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  briefId: string,
  userId: string,
  status: RecordReadStatus,
  now: string
) {
  const { error } = await supabase.from('brief_user_state').upsert(
    {
      brief_id: briefId,
      user_id: userId,
      status,
      read_at: now,
      updated_at: now,
    },
    { onConflict: 'brief_id,user_id' }
  )
  if (error && !isPostgrestMissingTable(error)) throw error
}

async function upsertUserRecordState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: {
    workspace_id: string
    record_type: UserRecordType
    record_id: string
    user_id: string
    status: RecordReadStatus
    read_at: string | null
    saved_at: string | null
    dismissed_at: string | null
    updated_at: string
  }
) {
  const { error } = await supabase.from('user_record_state').upsert(row, {
    onConflict: 'record_type,record_id,user_id',
  })
  if (!error) return

  if (isPostgrestMissingTable(error) && row.record_type === 'brief') {
    const { error: legacyErr } = await supabase.from('brief_user_state').upsert(
      {
        brief_id: row.record_id,
        user_id: row.user_id,
        status: row.status,
        read_at: row.updated_at,
        updated_at: row.updated_at,
      },
      { onConflict: 'brief_id,user_id' }
    )
    if (!legacyErr) return
    if (!isPostgrestMissingTable(legacyErr)) throw legacyErr

    if (row.status === 'read') {
      const { error: readErr } = await supabase.from('brief_user_read').upsert(
        {
          brief_id: row.record_id,
          user_id: row.user_id,
          read_at: row.updated_at,
        },
        { onConflict: 'user_id,brief_id' }
      )
      if (!readErr) return
      if (isPostgrestMissingTable(readErr)) throw new Error(MIGRATION_HINT)
      throw readErr
    }

    throw new Error(MIGRATION_HINT)
  }

  if (isPostgrestMissingTable(error)) throw new Error(MIGRATION_HINT)
  throw error
}

export async function markRecordRead(recordType: UserRecordType, recordId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveWorkspaceForRecord(recordType, recordId)
  const now = new Date().toISOString()

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    await upsertUserRecordState(supabase, {
      workspace_id: workspaceId,
      record_type: recordType,
      record_id: recordId,
      user_id: user.id,
      status: 'read',
      read_at: now,
      saved_at: null,
      dismissed_at: null,
      updated_at: now,
    })

    if (recordType === 'brief') {
      await dualWriteBriefUserState(supabase, recordId, user.id, 'read', now)
      await supabase
        .from('user_notification')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .eq('brief_id', recordId)
        .is('read_at', null)
    }

    await broadcastRecordState(user.id, { recordType, recordId, status: 'read' })
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

/** Saved if not saved; if saved, returns to read. From unread, goes to saved (per product spec). */
export async function saveRecord(recordType: UserRecordType, recordId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveWorkspaceForRecord(recordType, recordId)
  const now = new Date().toISOString()

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const { data: row, error: readErr } = await supabase
      .from('user_record_state')
      .select('status')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (readErr && !isPostgrestMissingTable(readErr)) throw readErr

    const nextStatus: RecordReadStatus = row?.status === 'saved' ? 'read' : 'saved'
    await upsertUserRecordState(supabase, {
      workspace_id: workspaceId,
      record_type: recordType,
      record_id: recordId,
      user_id: user.id,
      status: nextStatus,
      read_at: now,
      saved_at: nextStatus === 'saved' ? now : null,
      dismissed_at: null,
      updated_at: now,
    })

    if (recordType === 'brief') {
      await dualWriteBriefUserState(supabase, recordId, user.id, nextStatus, now)
    }

    await broadcastRecordState(user.id, { recordType, recordId, status: nextStatus })
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function dismissRecord(recordType: UserRecordType, recordId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveWorkspaceForRecord(recordType, recordId)
  const now = new Date().toISOString()

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    await upsertUserRecordState(supabase, {
      workspace_id: workspaceId,
      record_type: recordType,
      record_id: recordId,
      user_id: user.id,
      status: 'dismissed',
      read_at: now,
      saved_at: null,
      dismissed_at: now,
      updated_at: now,
    })

    if (recordType === 'brief') {
      await dualWriteBriefUserState(supabase, recordId, user.id, 'dismissed', now)
    }

    await broadcastRecordState(user.id, { recordType, recordId, status: 'dismissed' })
  })

  revalidatePath('/my-briefs')
  revalidatePath('/', 'layout')
}

export async function bulkUpdateRecordStatus(
  recordType: UserRecordType,
  recordIds: string[],
  newStatus: RecordReadStatus
): Promise<void> {
  if (recordIds.length === 0) return
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const workspaceId = await resolveWorkspaceForRecord(recordType, recordIds[0]!)
  const now = new Date().toISOString()

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    for (const recordId of recordIds) {
      const ws = await resolveWorkspaceForRecord(recordType, recordId)
      if (ws !== workspaceId) throw new Error('Mixed workspace batch not supported')
      await upsertUserRecordState(supabase, {
        workspace_id: workspaceId,
        record_type: recordType,
        record_id: recordId,
        user_id: user.id,
        status: newStatus,
        read_at: newStatus === 'read' || newStatus === 'saved' || newStatus === 'dismissed' ? now : null,
        saved_at: newStatus === 'saved' ? now : null,
        dismissed_at: newStatus === 'dismissed' ? now : null,
        updated_at: now,
      })
      if (recordType === 'brief') {
        await dualWriteBriefUserState(supabase, recordId, user.id, newStatus, now)
      }
    }
    await broadcastRecordState(user.id, { recordType, recordIds, status: newStatus, bulk: true })
  })

  revalidatePath('/my-briefs')
  revalidatePath('/intel')
  revalidatePath('/', 'layout')
}
