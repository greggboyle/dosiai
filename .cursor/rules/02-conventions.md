# DOSI.AI Conventions

File and folder structure:
- `app/(app)/*` — authenticated customer routes (uses customer UI shell)
- `app/admin/*` — operator admin routes (uses operator UI shell, separate auth)
- `app/rep/*` — battle card rep view (mobile-first, no shell)
- `app/(marketing)/pricing` — unauthenticated pricing page
- `components/ui/*` — shadcn primitives, untouched (copy out and rename if customization needed)
- `components/feature/<area>/*` — feature components grouped by domain (feed, competitor, battle-card, win-loss, brief, etc.)
- `lib/types/dosi.ts` — canonical TS types (camelCase). Never redeclare types inline.
- `lib/supabase/server.ts` — server-side Supabase client
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/mappers.ts` — camelCase ↔ snake_case translators
- `lib/supabase/types.ts` — generated Supabase row types (snake_case)
- `lib/auth/workspace.ts` — withWorkspace() middleware; every workspace-scoped route handler uses it
- `lib/billing/*` — Stripe integration
- `lib/dev/seed.ts` — fixture data for development
- `supabase/migrations/*` — SQL migrations (incl. RLS policies in same file as table)
- `inngest/*` — background job definitions

Mechanical rules — non-negotiable:
1. Every workspace-scoped table requires RLS policies in the same migration as the table. No exceptions.
2. Every mutation route handler uses lib/auth/workspace.ts withWorkspace(). Do not invent new auth helpers.
3. Every TS type lives in lib/types/dosi.ts and is imported. Never redeclare inline.
4. Every audit-logged mutation has a trigger or explicit insert into audit_log_entry.
5. RLS policies join through workspace_member.user_id = auth.uid() for customer tables.
6. Components reading workspace data are Server Components unless they have client-only state.
7. Naming: kebab-case.tsx for components, camelCase.ts for utilities, PascalCase for type names, snake_case for DB columns and table names.
8. shadcn primitives in components/ui/ are never edited directly; copy and rename if customizing.
9. Tailwind only — no CSS modules, no styled-components, no inline style props except for dynamic values.
10. Changes to PromptTemplate, AIRoutingConfig, or any data model entity must update lib/types/dosi.ts, supabase/migrations/, AND docs/spec/dosi_ai_design_prompt.md §4 in the same commit. Drift between these three is the most likely place for the project to lose coherence.
