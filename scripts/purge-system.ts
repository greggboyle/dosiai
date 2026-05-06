/**
 * Destructive admin utility: remove workspace rows (CASCADE deletes app data for that workspace)
 * and/or Supabase Auth users (CASCADE deletes public rows that reference auth.users).
 *
 * Loads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment,
 * or from .env.local / .env in the project root if unset.
 *
 * Usage:
 *   pnpm purge-system --workspace <uuid> [<uuid> ...] --dry-run
 *   pnpm purge-system --workspace <uuid> [<uuid> ...] --execute
 *   pnpm purge-system --user <uuid> --dry-run | --execute
 *   pnpm purge-system --user --email <email> --dry-run | --execute
 *
 * Safety: mutations require explicit --execute. Use --dry-run first.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set env or use .env.local).'
    )
    process.exit(1)
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Parsed =
  | {
      mode: 'workspace'
      ids: string[]
      dryRun: boolean
      execute: boolean
    }
  | {
      mode: 'user'
      userId?: string
      email?: string
      dryRun: boolean
      execute: boolean
    }
  | { mode: 'help' }

function parseArgs(argv: string[]): Parsed {
  const dryRun = argv.includes('--dry-run')
  const execute = argv.includes('--execute')
  const filtered = argv.filter((a) => a !== '--dry-run' && a !== '--execute')

  if (filtered.length === 0 || filtered[0] === 'help' || filtered.includes('--help')) {
    return { mode: 'help' }
  }

  if (filtered[0] === '--workspace') {
    const ids = filtered.slice(1).filter((x) => x.length > 0)
    if (ids.length === 0) {
      console.error('Expected one or more workspace UUIDs after --workspace')
      process.exit(1)
    }
    for (const id of ids) {
      if (!isUuid(id)) {
        console.error(`Invalid workspace UUID: ${id}`)
        process.exit(1)
      }
    }
    return { mode: 'workspace', ids, dryRun, execute }
  }

  if (filtered[0] === '--user') {
    const rest = filtered.slice(1)
    if (rest[0] === '--email' && rest[1]) {
      return {
        mode: 'user',
        email: rest[1].trim(),
        dryRun,
        execute,
      }
    }
    if (rest[0] && isUuid(rest[0])) {
      return {
        mode: 'user',
        userId: rest[0].trim(),
        dryRun,
        execute,
      }
    }
    console.error('Usage: --user <uuid> | --user --email <email>')
    process.exit(1)
  }

  return { mode: 'help' }
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdmin>,
  email: string
): Promise<string | null> {
  const want = email.trim().toLowerCase()
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === want)
    if (found) return found.id
    if (!data.users.length || data.users.length < perPage) break
    page += 1
  }
  return null
}

async function purgeWorkspaces(
  admin: ReturnType<typeof createAdmin>,
  ids: string[],
  dryRun: boolean
): Promise<void> {
  for (const id of ids) {
    const { data: ws, error: selErr } = await admin
      .from('workspace')
      .select('id,name')
      .eq('id', id)
      .maybeSingle()

    if (selErr) throw selErr
    if (!ws) {
      console.warn(`Workspace not found: ${id}`)
      continue
    }

    console.log(
      `${dryRun ? '[dry-run] Would delete' : 'Deleting'} workspace "${ws.name}" (${ws.id}) and CASCADE-linked rows.`
    )
    if (dryRun) continue

    const { error } = await admin.from('workspace').delete().eq('id', id)
    if (error) throw error
    console.log(`Deleted workspace ${id}.`)
  }
}

async function purgeUser(
  admin: ReturnType<typeof createAdmin>,
  opts: { userId?: string; email?: string },
  dryRun: boolean
): Promise<void> {
  let userId = opts.userId ?? null
  if (!userId && opts.email) {
    userId = await findUserIdByEmail(admin, opts.email)
    if (!userId) {
      console.error(`No auth user found with email: ${opts.email}`)
      process.exit(1)
    }
  }
  if (!userId) {
    console.error('Missing user id')
    process.exit(1)
  }

  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(userId)
  if (getErr || !userData.user) {
    console.error(`Auth user not found: ${userId}`)
    process.exit(1)
  }

  const email = userData.user.email ?? '(no email)'
  console.log(
    `${dryRun ? '[dry-run] Would delete' : 'Deleting'} auth user ${email} (${userId}) and CASCADE-linked public rows (memberships, authored records, etc.).`
  )

  if (dryRun) return

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw error
  console.log(`Deleted auth user ${userId}.`)
}

function printHelp(): void {
  console.log(`
purge-system — remove workspaces and/or Auth users (irreversible).

Commands:
  pnpm purge-system --workspace <uuid> [<uuid> ...] --dry-run
  pnpm purge-system --workspace <uuid> [<uuid> ...] --execute

  pnpm purge-system --user <uuid> --dry-run
  pnpm purge-system --user --email <email> --dry-run
  (same with --execute)

Rules:
  • Use exactly one of --dry-run or --execute.
  • Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.

Workspace delete removes the workspace row; Postgres ON DELETE CASCADE removes
workspace-scoped data (competitors, intel items, members for that workspace, etc.).

User delete uses Auth Admin API; FKs on auth.users CASCADE to dependent public rows.

Does not cancel Stripe subscriptions or delete Storage objects by default — handle those separately if needed.
`)
}

async function main(): Promise<void> {
  loadDotenvFiles()
  const parsed = parseArgs(process.argv.slice(2))

  if (parsed.mode === 'help') {
    printHelp()
    process.exit(0)
  }

  if (parsed.dryRun === parsed.execute) {
    console.error('Specify exactly one of --dry-run (preview) or --execute (perform deletes).')
    process.exit(1)
  }

  const dryRun = parsed.dryRun
  const admin = createAdmin()

  if (parsed.mode === 'workspace') {
    await purgeWorkspaces(admin, parsed.ids, dryRun)
    return
  }

  await purgeUser(admin, { userId: parsed.userId, email: parsed.email }, dryRun)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
