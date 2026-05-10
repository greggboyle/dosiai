import { plainTextBriefPreview, sendBriefingReadyEmail } from '@/lib/email/resend'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { briefReadyNotificationCopy } from '@/lib/brief/brief-kind'
import type { BriefKind } from '@/lib/types'

/**
 * Creates in-app notifications for workspace members subscribed to this brief's kind.
 * Idempotent per (user, brief): duplicates are ignored when the unique index conflicts.
 */
export async function notifyBriefSubscribersOfPublish(briefId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: brief, error: bErr } = await supabase
    .from('brief')
    .select('id, workspace_id, brief_kind, title, summary, status')
    .eq('id', briefId)
    .maybeSingle()

  if (bErr || !brief || brief.status !== 'published') return

  // Competitor briefs are workspace-global: clear prior in-app rows so every publish/update can re-notify subscribers.
  if (brief.brief_kind === 'competitor') {
    await supabase.from('user_notification').delete().eq('brief_id', briefId)
  }

  const { data: activeMembers, error: mErr } = await supabase
    .from('workspace_member')
    .select('user_id')
    .eq('workspace_id', brief.workspace_id)
    .eq('status', 'active')

  if (mErr) throw mErr
  const active = new Set((activeMembers ?? []).map((r) => r.user_id))

  const { data: subs, error: sErr } = await supabase
    .from('workspace_member_brief_subscription')
    .select('user_id')
    .eq('workspace_id', brief.workspace_id)
    .eq('brief_kind', brief.brief_kind)
    .eq('subscribed', true)

  if (sErr) throw sErr

  const copy = briefReadyNotificationCopy(brief.brief_kind as BriefKind)
  const notifyTitle = copy.title
  const body = brief.title?.trim() || brief.summary?.trim() || copy.bodyFallback

  const { data: wsRow } = await supabase
    .from('workspace')
    .select('name')
    .eq('id', brief.workspace_id)
    .maybeSingle()
  const workspaceName = wsRow?.name ?? 'Workspace'

  const previewSource =
    brief.summary?.trim() || brief.title?.trim() || body

  for (const row of subs ?? []) {
    if (!active.has(row.user_id)) continue

    const { error: insErr } = await supabase.from('user_notification').insert({
      user_id: row.user_id,
      workspace_id: brief.workspace_id,
      type: 'brief_ready',
      title: notifyTitle,
      body,
      brief_id: briefId,
    })

    if (insErr) {
      // Unique violation: already notified for this brief
      if ((insErr as { code?: string }).code === '23505') continue
      throw insErr
    }

    await supabase.channel(`user:${row.user_id}`).send({
      type: 'broadcast',
      event: 'notification.new',
      payload: { briefId },
    })

    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(row.user_id)
      if (authErr || !authData?.user?.email) continue
      await sendBriefingReadyEmail({
        to: authData.user.email,
        notificationHeadline: notifyTitle,
        briefTitle: brief.title?.trim() || 'Briefing',
        briefSummaryExcerpt: plainTextBriefPreview(previewSource, 420),
        ctaPath: `/briefs/${briefId}`,
        workspaceName,
      })
    } catch (mailErr) {
      console.warn('[brief notify] briefing email failed', {
        briefId,
        userId: row.user_id,
        error: mailErr instanceof Error ? mailErr.message : String(mailErr),
      })
    }
  }
}
