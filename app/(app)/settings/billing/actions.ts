'use server'

import { getSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createBillingPortalSession, createCheckoutSession } from '@/lib/billing/stripe'
import type { BillingCycle, WorkspacePlan } from '@/lib/types/dosi'

async function getWorkspaceIdForCurrentUser() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data: member } = await supabase
    .from('workspace_member')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!member) throw new Error('No active workspace')
  return member.workspace_id as string
}

export async function startCheckout(plan: WorkspacePlan, billingCycle: BillingCycle) {
  const workspaceId = await getWorkspaceIdForCurrentUser()
  const url = await createCheckoutSession(workspaceId, plan, billingCycle)
  if (!url) throw new Error('Failed to create Stripe checkout session')
  return url
}

export async function openBillingPortal() {
  const workspaceId = await getWorkspaceIdForCurrentUser()
  const url = await createBillingPortalSession(workspaceId)
  if (!url) throw new Error('Failed to create Stripe billing portal session')
  return url
}
