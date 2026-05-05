import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { listSectionsAdmin } from '@/lib/battle-cards/queries'
import { buildRepBattleCardView } from '@/lib/battle-cards/rep-mapper'

/**
 * Slack slash command stub: `/dosi competitor <name>`
 * Configure SLACK_SIGNING_SECRET and wire URL verification in production.
 */
export async function POST(req: Request) {
  const bodyText = await req.text()
  const params = new URLSearchParams(bodyText)
  const text = (params.get('text') ?? '').trim()
  const teamId = params.get('team_id')

  if (!text.toLowerCase().startsWith('competitor')) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Usage: `/dosi competitor <name>` — resolves a published battle card by fuzzy competitor name.',
    })
  }

  const query = text.replace(/^competitor\s*/i, '').trim()
  if (!query) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Please pass a competitor name, e.g. `/dosi competitor Acme Logistics`.',
    })
  }

  // Platform mapping: store slack_team_id on workspace when OAuth is implemented.
  // For now, return a placeholder Block Kit response so the endpoint is safe to register.
  if (!teamId) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Slack workspace link not configured for this DOSI workspace yet. Use the in-app rep view or a share link.',
    })
  }

  const supabase = createSupabaseAdminClient()
  const { data: workspaces } = await supabase.from('workspace').select('id').limit(5)
  const wsId = workspaces?.[0]?.id
  if (!wsId) {
    return NextResponse.json({ response_type: 'ephemeral', text: 'No workspace context.' })
  }

  const { data: comps } = await supabase
    .from('competitor')
    .select('id, name')
    .eq('workspace_id', wsId)
    .ilike('name', `%${query}%`)
    .limit(3)

  const match = comps?.[0]
  if (!match) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `No competitor matching "${query}" in the linked workspace.`,
    })
  }

  const { data: card } = await supabase
    .from('battle_card')
    .select('*')
    .eq('workspace_id', wsId)
    .eq('competitor_id', match.id)
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!card) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Found ${match.name}, but no published battle card yet. Publish from DOSI.AI first.`,
    })
  }

  const sections = await listSectionsAdmin(card.id)
  const view = buildRepBattleCardView({
    competitorName: match.name,
    freshnessScore: card.freshness_score,
    sections,
  })

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${view.competitorName}* · freshness ${view.freshnessScore ?? '—'}\n_${view.tldr.theyPosition.slice(0, 280)}${view.tldr.theyPosition.length > 280 ? '…' : ''}_`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*They position*\n${view.tldr.theyPosition || '—'}` },
        { type: 'mrkdwn', text: `*We counter*\n${view.tldr.weCounter || '—'}` },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Open full rep view in DOSI for objections, traps, and pricing.`,
        },
      ],
    },
  ]

  return NextResponse.json({
    response_type: 'in_channel',
    blocks,
  })
}
