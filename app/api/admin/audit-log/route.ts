import { NextResponse } from 'next/server'
import { getOperatorSession } from '@/lib/auth/operator'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const operatorSession = await getOperatorSession()
  if (!operatorSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('audit_log_entry')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data ?? [] })
}
