import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log'

export const trialExpirationCheck = inngest.createFunction(
  { id: 'trial-expiration-check' },
  { cron: '0 * * * *' },
  async () => {
    const supabase = createSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const { data: expiredTrials, error } = await supabase
      .from('workspace')
      .select('id, name, status')
      .eq('plan', 'trial')
      .eq('status', 'active')
      .lt('trial_ends_at', nowIso)

    if (error) throw error
    if (!expiredTrials?.length) return { updated: 0 }

    let updatedCount = 0

    for (const workspace of expiredTrials) {
      const { error: updateError } = await supabase
        .from('workspace')
        .update({ status: 'read_only' })
        .eq('id', workspace.id)
        .eq('status', 'active')

      if (updateError) throw updateError
      updatedCount += 1

      await supabase.channel(`workspace:${workspace.id}`).send({
        type: 'broadcast',
        event: 'workspace.status.updated',
        payload: { workspaceId: workspace.id, status: 'read_only' },
      })

      await logAuditEvent({
        severity: 'info',
        category: 'system',
        operatorName: 'system',
        operatorRole: 'system',
        action: 'trial_expired',
        targetType: 'workspace',
        targetId: workspace.id,
        targetName: workspace.name,
        reason: 'Workspace trial expired and status transitioned to read_only.',
        beforeValue: 'active',
        afterValue: 'read_only',
      })
    }

    return { updated: updatedCount }
  }
)
