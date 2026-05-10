import { Resend } from 'resend'

function getClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Strip minimal markdown / noise for a short email preview (not full markdown rendering). */
export function plainTextBriefPreview(source: string, maxLen: number): string {
  const t = source
    .replace(/\r?\n/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`
}

export async function sendBriefingReadyEmail(input: {
  to: string
  /** In-app notification headline (e.g. "Your Weekly Intelligence Brief is available"). */
  notificationHeadline: string
  briefTitle: string
  briefSummaryExcerpt: string
  ctaPath: string
  workspaceName: string
}) {
  const client = getClient()
  if (!client) {
    console.log('[email] RESEND_API_KEY missing; briefing email not sent', { to: input.to, path: input.ctaPath })
    return
  }

  const base = appBaseUrl().replace(/\/$/, '')
  const path = input.ctaPath.startsWith('/') ? input.ctaPath : `/${input.ctaPath}`
  const ctaUrl = `${base}${path}`
  const safeWs = escapeHtml(input.workspaceName)
  const safeHeadline = escapeHtml(input.notificationHeadline)
  const safeTitle = escapeHtml(input.briefTitle)
  const safePreview = escapeHtml(input.briefSummaryExcerpt)

  const rawSubject = `${input.briefTitle} · ${input.workspaceName}`
  const subject = rawSubject.length > 180 ? `${rawSubject.slice(0, 177)}…` : rawSubject

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px 8px 24px;font-size:13px;color:#71717a;font-weight:600;letter-spacing:0.02em;">${safeWs}</td>
          </tr>
          <tr>
            <td style="padding:4px 24px 8px 24px;font-size:18px;font-weight:600;color:#18181b;line-height:1.35;">${safeHeadline}</td>
          </tr>
          <tr>
            <td style="padding:0 24px 12px 24px;font-size:16px;font-weight:600;color:#27272a;line-height:1.4;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px 24px;font-size:15px;color:#3f3f46;line-height:1.55;border-bottom:1px solid #f4f4f5;">${safePreview || '<span style="color:#a1a1aa;">Open in DOSI.AI to read the full briefing.</span>'}</td>
          </tr>
          <tr>
            <td style="padding:24px;" align="center">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:9999px;">Read full briefing</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 20px 24px;font-size:12px;color:#a1a1aa;line-height:1.45;text-align:center;">
              You are subscribed to this briefing type in ${safeWs}. Open the app to manage notifications under My Market Briefs.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${input.notificationHeadline}\n\n${input.briefTitle}\n\n${input.briefSummaryExcerpt || 'Open the app to read the full briefing.'}\n\n${ctaUrl}`

  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'DOSI.AI <noreply@dosi.ai>',
    to: input.to,
    subject,
    html,
    text,
  })
}

export async function sendInviteEmail(input: {
  to: string
  inviterName: string
  workspaceName: string
  inviteUrl: string
}) {
  const client = getClient()
  if (!client) {
    console.log('[email] RESEND_API_KEY missing; invite email not sent', input)
    return
  }

  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'DOSI.AI <noreply@dosi.ai>',
    to: input.to,
    subject: `You were invited to ${input.workspaceName} on DOSI.AI`,
    html: `
      <p>${input.inviterName} invited you to join <strong>${input.workspaceName}</strong> on DOSI.AI.</p>
      <p><a href="${input.inviteUrl}">Accept your invite</a></p>
      <p>This invite link expires in 7 days.</p>
    `,
  })
}
