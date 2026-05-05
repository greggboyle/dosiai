'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const router = useRouter()
  const [supabase, setSupabase] = React.useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSupabase(createSupabaseBrowserClient())
  }, [])

  const signInWithProvider = async (provider: 'google' | 'azure') => {
    if (!supabase) return
    setError(null)
    const { error: providerError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
    if (providerError) setError(providerError.message)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full border-border/80 bg-card/90">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to DOSI.AI</CardTitle>
          <CardDescription>Use email, Google, or Microsoft to continue.</CardDescription>
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
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => signInWithProvider('google')}>
              Google
            </Button>
            <Button variant="outline" onClick={() => signInWithProvider('azure')}>
              Microsoft
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <Link href="/forgot-password" className="underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/sign-up" className="underline underline-offset-4">
              Create an account
            </Link>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
