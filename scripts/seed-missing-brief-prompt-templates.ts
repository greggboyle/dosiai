/**
 * Inserts starter `prompt_template` rows for each brief kind (`brief_drafting_manual` … `brief_drafting_competitor`)
 * for every vendor enabled on `ai_routing_config.brief_drafting_all`, only when that purpose+vendor pair is missing.
 *
 * Uses the same embedded defaults as `/admin/prompts` seeding ([`lib/admin/prompt-defaults.ts`](../lib/admin/prompt-defaults.ts)).
 *
 * Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Loads `.env.local` / `.env` from the project root if unset.
 *
 * Usage:
 *   pnpm seed-brief-prompts
 *   pnpm exec tsx scripts/seed-missing-brief-prompt-templates.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildMissingBriefKindPromptTemplateRows } from '@/lib/admin/brief-prompt-template-seed'

function loadDotenvFiles(): void {
  for (const name of ['.env.local', '.env']) {
    const fp = path.join(process.cwd(), name)
    if (!fs.existsSync(fp)) continue
    const content = fs.readFileSync(fp, 'utf8')
    for (let line of content.split('\n')) {
      line = line.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
}

async function main(): Promise<void> {
  loadDotenvFiles()
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data: prompts, error: pErr } = await admin.from('prompt_template').select('purpose,vendor')
  if (pErr) throw pErr
  const existing = new Set((prompts ?? []).map((r) => `${r.purpose}::${r.vendor}`))

  const { data: routingRows, error: rErr } = await admin
    .from('ai_routing_config')
    .select('purpose,rules')
    .eq('purpose', 'brief_drafting_all')
    .maybeSingle()
  if (rErr) throw rErr

  const rows = buildMissingBriefKindPromptTemplateRows(routingRows?.rules, existing, {
    now,
    operatorId: null,
    operatorName: 'seed-missing-brief-prompt-templates',
  })

  if (rows.length === 0) {
    console.info('No missing brief-kind prompt templates (all combinations already exist).')
    return
  }

  const { error: insErr } = await admin.from('prompt_template').insert(rows)
  if (insErr) throw insErr
  console.info(`Inserted ${rows.length} starter brief prompt template row(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
