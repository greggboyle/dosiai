'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = React.useState(false)
  const [confirmationEmail, setConfirmationEmail] = React.useState('')
  const [hadInviteParam, setHadInviteParam] = React.useState(false)

  React.useEffect(() => {
    setSupabase(createSupabaseBrowserClient())
  }, [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setError(null)

    const inviteToken = params.get('invite')
    const redirectTarget = inviteToken ? `/invites/${inviteToken}` : '/onboarding'
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTarget)}`

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    })

    setIsSubmitting(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // When "Confirm email" is enabled, Supabase returns no session until the user verifies.
    if (!signUpData.session) {
      setConfirmationEmail(email.trim())
      setHadInviteParam(!!inviteToken)
      setAwaitingEmailConfirmation(true)
      return
    }

    if (inviteToken) {
      router.push(`/invites/${inviteToken}`)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <Card className="w-full border-border/80 bg-card/90">
          <CardHeader>
            <div className="mb-2 flex justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Mail className="size-6" aria-hidden />
              </div>
            </div>
            <CardTitle className="text-center text-xl">Confirm your email</CardTitle>
            <CardDescription className="text-center">
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground">{confirmationEmail}</span>. Open it to verify your address
              and continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hadInviteParam && (
              <p className="text-sm text-muted-foreground">
                After you confirm, use your invite link again or sign in — we&apos;ll finish connecting you to the
                workspace.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Didn&apos;t get the message? Check spam or promotions, then try signing up again if needed.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="text-xl">Create your DOSI.AI account</CardTitle>
          <CardDescription>
            You may need to confirm your email before onboarding. We&apos;ll send a link if your project requires it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-500" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
