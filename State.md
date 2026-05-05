## Phase 2 (In progress): Ingestion Engine

### Migrations applied
- `0009_enable_pgvector.sql`
- `0010_ingestion_engine.sql` — intelligence_item, intelligence_item_vendor_call, item_user_state, ai_routing_config, prompt_template, embedding_migration_state, vendor_call, sweep, suggested_competitor; workspace/workspace_profile/competitor/topic extensions; RLS; vendor_call → workspace AI cost trigger

### Inngest functions (Phase 2 additions)
- `run-sweep` (event `sweep/run`)
- `schedule-sweeps` (hourly cron)
- `populate-competitor-profile` (stub, event `competitor/populate-profile`)
- `reembed-corpus` (stub, event `embedding/reembed-corpus`)
- `monthly-cost-reset` (cron 1st of month UTC)

### Routes / surfaces wired to real data
- `/feed` — server-loaded `intelligence_item` rows (`visibility=feed`) mapped to existing `FeedClient`
- `/admin` operator sweep — `runSweepOnBehalf` dispatches `sweep/run`

### Open issues / known limitations
- Operator `/admin/ai-routing`, `/admin/prompts`, `/admin/vendor-health`, `/admin/cost` UIs remain largely static until wired to server mutations and queries
- Dashboard page still uses mock modules; needs module-by-module queries
- Competitor profiles, review queue actions, topic cross-tagging polish, multi-vendor consensus merge, integration tests, and cost-overage UI banner are partial or pending
- Run `npm install` after pulling (adds `openai`, `@anthropic-ai/sdk`)
