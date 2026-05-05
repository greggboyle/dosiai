import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBattleCardFromForm } from '@/lib/battle-cards/actions'

export default async function NewBattleCardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect('/sign-in')

  const { data: member } = await supabase
    .from('workspace_member')
    .select('workspace_id, role')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member || member.role === 'viewer') redirect('/battle-cards')

  const { data: competitors } = await supabase
    .from('competitor')
    .select('id, name')
    .eq('workspace_id', member.workspace_id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/battle-cards">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New battle card</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a competitor to start the interview flow.</p>
      </div>

      <div className="space-y-3">
        {(competitors ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a competitor first, then return here to build a battle card.
          </p>
        ) : (
          (competitors ?? []).map((c) => (
            <Card key={c.id}>
              <CardHeader className="py-4">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <CardDescription className="text-xs">Starts interview wizard for this competitor</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <form action={createBattleCardFromForm}>
                  <input type="hidden" name="competitorId" value={c.id} />
                  <Button type="submit" size="sm">
                    Start interview
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
