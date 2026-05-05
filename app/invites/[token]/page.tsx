import Link from 'next/link'
import { redirect } from 'next/navigation'
import { acceptInvite } from '@/app/invites/[token]/actions'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function InviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await getSession()
  const supabase = await createSupabaseServerClient()
  const { data: invite } = await supabase.from('workspace_invite').select('*').eq('token', token).maybeSingle()

  if (!invite) {
    return <div className="p-8">Invite not found.</div>
  }

  if (!session?.user) {
    redirect(`/sign-up?invite=${token}`)
  }

  const emailMismatch =
    !!session.user.email && invite.email.toLowerCase() !== session.user.email.toLowerCase()

  if (emailMismatch) {
    return (
      <div className="mx-auto max-w-md p-8 space-y-4">
        <h1 className="text-xl font-semibold">This invite is for a different email</h1>
        <p className="text-sm text-muted-foreground">
          Invite is for <strong>{invite.email}</strong>, but you are signed in as{' '}
          <strong>{session.user.email}</strong>.
        </p>
      </div>
    )
  }

  async function acceptAction() {
    'use server'
    await acceptInvite(token)
    redirect('/')
  }

  return (
    <div className="mx-auto max-w-md p-8 space-y-4">
      <h1 className="text-xl font-semibold">Join workspace</h1>
      <p className="text-sm text-muted-foreground">
        You were invited as <strong>{invite.role}</strong> for <strong>{invite.email}</strong>.
      </p>
      <form action={acceptAction}>
        <Button type="submit">Accept invite</Button>
      </form>
      <Link className="text-sm underline" href="/">
        Cancel
      </Link>
    </div>
  )
}
