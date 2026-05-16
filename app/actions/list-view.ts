'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withWorkspace } from '@/lib/auth/workspace'
import type { RecordReadStatus, UserRecordType } from '@/lib/types/dosi'

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

function dualWriteBriefUserState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  briefId: string,
  userId: string,
  status: RecordReadStatus,
  now: string
) {
  return supabase.from('brief_user_state').upsert(
    {
      brief_id: briefId,
      user_id: userId,
      status,
      read_at: now,
      updated_at: now,
    },
    { onConflict: 'brief_id,user_id' }
  )
}

export async function markRecordRead(recordType: UserRecordType, recordId: string): Promise<void> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const workspaceId = await resolveWorkspaceForRecord(recordType, recordId)
  const now = new Date().toISOString()

  await withWorkspace(workspaceId, ['admin', 'analyst', 'viewer'], async ({ user }) => {
    const supabase = await createSupabaseServerClient()
    const { error: uErr } = await supabase.from('user_record_state').upsert(
      {
        workspace_id: workspaceId,
        record_type: recordType,
        record_id: recordId,
        user_id: user.id,
        status: 'read',
        read_at: now,
        saved_at: null,
        dismissed_at: null,
        updated_at: now,
      },
      { onConflict: 'record_type,record_id,user_id' }
    )
    if (uErr) throw uErr

    if (recordType === 'brief') {
      const { error: bErr } = await dualWriteBriefUserState(supabase, recordId, user.id, 'read', now)
      if (bErr) throw bErr
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
    const { data: row } = await supabase
      .from('user_record_state')
      .select('status')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .eq('user_id', user.id)
      .maybeSingle()

    const nextStatus: RecordReadStatus = row?.status === 'saved' ? 'read' : 'saved'
    const { error: uErr } = await supabase.from('user_record_state').upsert(
      {
        workspace_id: workspaceId,
        record_type: recordType,
        record_id: recordId,
        user_id: user.id,
        status: nextStatus,
        read_at: now,
        saved_at: nextStatus === 'saved' ? now : null,
        dismissed_at: null,
        updated_at: now,
      },
      { onConflict: 'record_type,record_id,user_id' }
    )
    if (uErr) throw uErr

    if (recordType === 'brief') {
      const { error: bErr } = await dualWriteBriefUserState(supabase, recordId, user.id, nextStatus, now)
      if (bErr) throw bErr
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
    const { error: uErr } = await supabase.from('user_record_state').upsert(
      {
        workspace_id: workspaceId,
        record_type: recordType,
        record_id: recordId,
        user_id: user.id,
        status: 'dismissed',
        read_at: now,
        dismissed_at: now,
        updated_at: now,
      },
      { onConflict: 'record_type,record_id,user_id' }
    )
    if (uErr) throw uErr

    if (recordType === 'brief') {
      const { error: bErr } = await dualWriteBriefUserState(supabase, recordId, user.id, 'dismissed', now)
      if (bErr) throw bErr
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
      const { error: uErr } = await supabase.from('user_record_state').upsert(
        {
          workspace_id: workspaceId,
          record_type: recordType,
          record_id: recordId,
          user_id: user.id,
          status: newStatus,
          read_at: newStatus === 'read' || newStatus === 'saved' || newStatus === 'dismissed' ? now : null,
          saved_at: newStatus === 'saved' ? now : null,
          dismissed_at: newStatus === 'dismissed' ? now : null,
          updated_at: now,
        },
        { onConflict: 'record_type,record_id,user_id' }
      )
      if (uErr) throw uErr
      if (recordType === 'brief') {
        const { error: bErr } = await dualWriteBriefUserState(supabase, recordId, user.id, newStatus, now)
        if (bErr) throw bErr
      }
    }
    await broadcastRecordState(user.id, { recordType, recordIds, status: newStatus, bulk: true })
  })

  revalidatePath('/my-briefs')
  revalidatePath('/intel')
  revalidatePath('/', 'layout')
}
