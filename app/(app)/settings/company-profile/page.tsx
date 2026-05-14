import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { updateCompanyProfile } from './actions'
import { CompanyProfileSaveToast } from './save-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function lines(value: unknown): string {
  return Array.isArray(value) ? value.map((v) => String(v)).join('\n') : ''
}

function socialValue(social: unknown, key: string): string {
  if (!social || typeof social !== 'object') return ''
  const value = (social as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export default async function CompanyProfilePage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const supabase = await createSupabaseServerClient()
  const { data: membership } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')
  if (membership.role !== 'admin') redirect('/settings/members')

  const { data: profile } = await supabase
    .from('workspace_profile')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle()
  const { data: workspace } = await supabase
    .from('workspace')
    .select('auto_briefs_auto_approve, daily_intelligence_sweep_hour_utc')
    .eq('id', membership.workspace_id)
    .maybeSingle()

  return (
    <div className="max-w-4xl space-y-6">
      <CompanyProfileSaveToast />
      <div>
        <h1 className="text-2xl font-semibold">Company Profile</h1>
        <p className="text-sm text-muted-foreground">
          This information powers the own-company sweep and brand mention detection.
        </p>
      </div>

      <form action={updateCompanyProfile} className="space-y-6 rounded-lg border p-4">
        <input type="hidden" name="workspaceId" value={membership.workspace_id} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal name</Label>
            <Input
              id="legalName"
              name="legalName"
              defaultValue={(profile?.legal_name ?? profile?.company_name ?? '') as string}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryUrl">Primary URL</Label>
            <Input
              id="primaryUrl"
              name="primaryUrl"
              defaultValue={(profile?.primary_url ?? profile?.company_website ?? '') as string}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="productNames">Product names (one per line)</Label>
            <Textarea id="productNames" name="productNames" defaultValue={lines(profile?.product_names)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandAliases">Brand aliases (one per line)</Label>
            <Textarea id="brandAliases" name="brandAliases" defaultValue={lines(profile?.brand_aliases)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companySummary">Company summary</Label>
          <Textarea id="companySummary" name="companySummary" defaultValue={(profile?.company_summary ?? '') as string} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icpDescription">ICP description</Label>
          <Textarea
            id="icpDescription"
            name="icpDescription"
            defaultValue={(profile?.icp_description ?? profile?.icp ?? '') as string}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valueProps">Value props (one per line)</Label>
            <Textarea id="valueProps" name="valueProps" defaultValue={lines(profile?.value_props)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="differentiators">Differentiators (one per line)</Label>
            <Textarea id="differentiators" name="differentiators" defaultValue={lines(profile?.differentiators)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="foundedYear">Founded year</Label>
            <Input id="foundedYear" name="foundedYear" defaultValue={(profile?.founded_year ?? '') as string | number} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headquarters">Headquarters</Label>
            <Input id="headquarters" name="headquarters" defaultValue={(profile?.headquarters ?? '') as string} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" defaultValue={(profile?.industry ?? '') as string} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pressKitUrl">Press kit URL</Label>
            <Input id="pressKitUrl" name="pressKitUrl" defaultValue={(profile?.press_kit_url ?? '') as string} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="geographyServed">Geography served (one per line)</Label>
          <Textarea id="geographyServed" name="geographyServed" defaultValue={lines(profile?.geography_served)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input id="linkedin" name="linkedin" defaultValue={socialValue(profile?.social_handles, 'linkedin')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input id="twitter" name="twitter" defaultValue={socialValue(profile?.social_handles, 'twitter')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input id="github" name="github" defaultValue={socialValue(profile?.social_handles, 'github')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherSocial">Other social</Label>
            <Input id="otherSocial" name="otherSocial" defaultValue={socialValue(profile?.social_handles, 'other')} />
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="dailyIntelligenceSweepHourUtc">Daily intelligence run (UTC)</Label>
          <p className="text-xs text-muted-foreground">
            Hour when the scheduled intelligence sweep may run (checked hourly). Default 17:00 UTC matches
            9:00 AM Pacific Standard Time; 9:00 AM Pacific Daylight Time is 16:00 UTC.
          </p>
          <select
            id="dailyIntelligenceSweepHourUtc"
            name="dailyIntelligenceSweepHourUtc"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full max-w-xs rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            defaultValue={String(workspace?.daily_intelligence_sweep_hour_utc ?? 17)}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={String(h)}>
                {String(h).padStart(2, '0')}:00 UTC
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div>
            <Label htmlFor="autoBriefsAutoApprove">Automated brief approval mode</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Every sweep generates an automated leadership brief. Scheduled nightly sweeps auto-publish
              when this is enabled; otherwise they remain drafts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoBriefsAutoApprove"
              name="autoBriefsAutoApprove"
              defaultChecked={Boolean(workspace?.auto_briefs_auto_approve ?? true)}
              className="size-4"
            />
            <Label htmlFor="autoBriefsAutoApprove" className="text-sm font-normal">
              Automatically approve scheduled-sweep briefs
            </Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save profile</Button>
        </div>
      </form>
    </div>
  )
}
