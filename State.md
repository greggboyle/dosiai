## Phase 2 (In progress): Ingestion Engine

### Migrations applied
- `0009_enable_pgvector.sql`
- `0010_ingestion_engine.sql` — intelligence_item, intelligence_item_vendor_call, item_user_state, ai_routing_config, prompt_template, embedding_migration_state, vendor_call, sweep, suggested_competitor; workspace/workspace_profile/competitor/topic extensions; RLS; vendor_call → workspace AI cost trigger
- `0023_topic_related_topic_ids.sql` — `topic.related_topic_ids` for cross-tagging (run against your DB if not yet applied)

### Inngest functions (Phase 2 additions)
- `run-sweep` (event `sweep/run`)
- `schedule-sweeps` (hourly cron)
- `populate-competitor-profile` (stub, event `competitor/populate-profile`)
- `reembed-corpus` (stub, event `embedding/reembed-corpus`)
- `monthly-cost-reset` (cron 1st of month UTC)
- Brief drafting: six functions on `brief/draft-requested/<kind>`; legacy `brief/draft-requested` compat re-emits by `brief_kind`; AI routing uses `brief_drafting_all` only (`/admin/ai-routing`).

### Routes / surfaces wired to real data
- `/intel` — server-loaded `intelligence_item` rows (`visibility=feed`); review queue tab uses workspace `review_queue_threshold`; **Mark reviewed** persists `reviewed_at` / `reviewed_by`; detail panel shows vendor consensus ratio
- `/` dashboard — `loadDashboardSnapshot` drives feed, sweep status, competitor heatmap (7d), topic counts (7d), suggested competitors, usage counts, review queue count
- `/admin` operator sweep — `runSweepOnBehalf` dispatches `sweep/run`
- Operator `/admin/ai-routing`, `/admin/prompts`, `/admin/vendor-health`, `/admin/billing` — wired to server actions / queries (service role after operator check)
- `/competitors/[id]` — competitor profile loaded from `competitor` + related intel, battle cards, briefs, win/loss outcomes
- `/topics` — topics loaded from DB; cards show **Related topics** when `related_topic_ids` is set
- App shell — **cost ceiling banner** when AI usage ≥85% of workspace ceiling

### Tests
- `npm test` — Vitest smoke test for dashboard helpers (`tests/dashboard-helpers.test.ts`). Run `npm install` after pull to pick up `vitest`.

### Open issues / known limitations
- Dashboard win-rate, briefs, channel roll-up, and regulatory modules remain illustrative placeholders (no backing queries yet)
- Topics UI create/edit/archive still updates client state only unless extended with server actions
- Vendor health charts use aggregate counts over the window (not hourly series from DB)
