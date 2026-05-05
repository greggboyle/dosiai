import { Resend } from 'resend'

function getClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
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
