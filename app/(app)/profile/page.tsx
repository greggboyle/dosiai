import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { changePasswordFromForm, sendPasswordResetEmailAction, updateProfileFromForm } from '@/lib/profile/actions'
import { ProfileToast } from './profile-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function listIanaTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone').slice().sort()
  } catch {
    return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London']
  }
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) redirect('/sign-in')

  const fullName =
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '')
  const timezone =
    typeof user.user_metadata?.timezone === 'string' ? user.user_metadata.timezone : ''
  const timezones = listIanaTimezones()

  return (
    <div className="max-w-4xl space-y-6">
      <ProfileToast />
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update how you appear in the app, your timezone, and sign-in security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your name and regional settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileFromForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email ?? ''} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Display name</Label>
              <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={timezone}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Use browser default</option>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Used for dates and summaries across the workspace where a personal timezone applies.
              </p>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your password while signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordFromForm} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password reset email</CardTitle>
          <CardDescription>
            Send a reset link to <span className="font-medium text-foreground">{user.email}</span> if you prefer to
            reset via email (same flow as “Forgot password”).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendPasswordResetEmailAction}>
            <Button type="submit" variant="outline">
              Email me a reset link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
