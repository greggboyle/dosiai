# Own-Company Sweep Implementation Checklist (Codebase-Mapped)

This checklist translates `docs/own-company-sweep-feature-design-spec.md` into concrete implementation steps for this repository.

---

## Current Baseline in This Repo

- Phase 2 ingestion engine exists (`run-sweep`, vendor calls, MIS scoring, feed ingestion).
- `workspace_profile` already exists but currently uses legacy fields (`company_name`, `company_website`, etc.).
- `intelligence_item` exists but does not yet have `is_about_self`.
- AI routing purposes include `sweep_buy`, `sweep_sell`, `sweep_channel`, `sweep_regulatory`, `sweep_topic`, but not `sweep_self`.
- Onboarding currently captures only basic company profile fields.

---

## Phase 1 - Foundation

### 1) Extend `workspace_profile` schema

- [ ] Add migration to extend `workspace_profile` with:
  - `legal_name text not null`
  - `primary_url text not null`
  - `product_names text[] default '{}'`
  - `brand_aliases text[] default '{}'`
  - `founded_year int`
  - `headquarters text`
  - `geography_served text[] default '{}'`
  - `icp_description text`
  - `value_props text[] default '{}'`
  - `differentiators text[] default '{}'`
  - `social_handles jsonb default '{}'`
  - `press_kit_url text`
  - `summary_embedding vector(1536)`
  - `value_prop_embedding vector(1536)`
  - `updated_by uuid references auth.users(id)`
- [ ] Decide migration strategy for existing fields:
  - Keep legacy (`company_name`, `company_website`, `icp`, `geography`, `embedding`, `differentiators_embedding`) temporarily for backward compatibility, or
  - Migrate/rename and update all references in one pass.
- [ ] Apply/adjust RLS policies so admin-only updates are enforced per spec.

**Primary files**:
- `supabase/migrations/*` (new migration)
- `supabase/consolidated-schema.sql`
- `lib/supabase/types.ts`

### 2) Update onboarding capture (Step 2)

- [ ] Extend client state/UI in `app/onboarding/page.tsx` to collect:
  - legal name, primary URL
  - product names list
  - brand aliases list (prominent guidance copy)
  - summary + ICP + value props + differentiators
  - founded year, HQ, geography served
  - social handles, press kit URL
- [ ] Extend draft action to generate brand aliases and additional structured fields.
- [ ] Update save action payload and persistence logic.
- [ ] Keep AI-drafted fields editable before save.

**Primary files**:
- `app/onboarding/page.tsx`
- `app/onboarding/actions.ts`

### 3) Add settings page for company profile

- [ ] Add `/settings/company-profile` route with admin-editable form.
- [ ] Add server actions for load/update profile.
- [ ] Add success banner: "Profile updated. Scoring will recalibrate on the next sweep."
- [ ] Add nav entry from settings index (if needed).

**Primary files**:
- `app/(app)/settings/company-profile/page.tsx` (new)
- `app/(app)/settings/company-profile/actions.ts` (new or colocated)
- `app/(app)/layout.tsx` or settings nav component(s)

---

## Phase 2 - Ingestion Engine

### 4) Add `sweep_self` to routing and prompt infrastructure

- [ ] Extend `AiPurposeDb` union with `'sweep_self'`.
- [ ] Ensure routing UI/admin accepts and saves `sweep_self`.
- [ ] Add prompt defaults/template support for `sweep_self`.

**Primary files**:
- `lib/supabase/types.ts`
- `lib/admin/platform-types.ts`
- `lib/admin/map-ai-routing-db.ts`
- `lib/admin/prompt-defaults.ts`
- `app/admin/ai-routing/*`
- `app/admin/prompts/*`

### 5) Add `intelligence_item.is_about_self`

- [ ] Add migration:
  - `is_about_self boolean not null default false`
  - partial index `(workspace_id, is_about_self, ingested_at desc) where is_about_self = true`
- [ ] Update generated/manual DB types.
- [ ] Ensure row mapper includes this field.

**Primary files**:
- `supabase/migrations/*` (new)
- `supabase/consolidated-schema.sql`
- `lib/supabase/types.ts`
- `lib/intelligence/map-row.ts`
- `lib/types.ts`

### 6) Implement `runSelfPass` in sweep orchestration

- [ ] Add helper in `lib/sweep/orchestrator.ts` to run purpose `sweep_self`.
- [ ] Build prompt inputs from `workspace_profile` fields.
- [ ] Skip pass when required profile fields are missing.
- [ ] Record vendor calls with purpose `sweep_self`.
- [ ] Mark all returned items as `isAboutSelf: true`.
- [ ] Integrate into orchestration order before topics pass.

**Primary files**:
- `lib/sweep/orchestrator.ts`
- `lib/sweep/schemas.ts` (if schema needs self-specific fields)
- `lib/ai/router.ts`

### 7) Add brand-alias matching during dedup

- [ ] Add alias list construction from profile (`legal_name`, `primary_url`, `product_names`, `brand_aliases`).
- [ ] Set `isAboutSelf` for category/topic pass items when title+summary matches aliases.
- [ ] Keep matching permissive initially (substring).

**Primary files**:
- `lib/sweep/orchestrator.ts`

### 8) Persist `is_about_self` during ingestion

- [ ] Add `is_about_self` to insert payload for `intelligence_item`.
- [ ] Ensure defaults preserve behavior for non-matching items.

**Primary files**:
- `lib/sweep/orchestrator.ts`

### 9) Extend MIS scoring with `self_relevance`

- [ ] Add `self_relevance` computation helper.
- [ ] If `isAboutSelf`:
  - set `competitor_weight = 0`
  - include `self_relevance` component
  - reduce/adjust proximity impact (per chosen formula)
  - apply floor: `if self_relevance >= 80 then MIS >= 65`
- [ ] Update explanation prompt context to include self-specific drivers.

**Primary files**:
- `lib/mis/score.ts`
- `lib/sweep/schemas.ts` (ensure review metadata available to scorer)

### 10) Re-embed + rescore jobs

- [ ] Add Inngest function for `reembed-workspace-profile`.
- [ ] Add Inngest function for `rescore-workspace` (or integrate with next sweep flow).
- [ ] Wire profile update action to enqueue jobs when summary/value props change.

**Primary files**:
- `inngest/functions/*` (new)
- `inngest/index.ts`
- `app/onboarding/actions.ts`
- settings company-profile actions

### 11) Operator observability for `sweep_self`

- [ ] Ensure vendor health/cost rollups include `sweep_self` purpose rows.
- [ ] Ensure workspace sweep drill-down surfaces `sweep_self` calls.

**Primary files**:
- `lib/admin/vendor-health-from-calls.ts`
- `app/admin/vendor-health/*`
- `app/admin/workspaces/[id]/page.tsx`

---

## Phase 3 - Consumption Surfaces

### 12) Main feed subject filter

- [ ] Add URL param, e.g. `subject=competitors|self`.
- [ ] Apply `where is_about_self = true/false` in feed queries.
- [ ] Update feed client controls.

**Primary files**:
- `app/(app)/feed/page.tsx`
- `app/(app)/feed/feed-client.tsx`
- `lib/feed/queries.ts`

### 13) About Us tab

- [ ] Add route `/about-us`.
- [ ] Add sub-tabs: all, customer voice, sell-side, channel, regulatory.
- [ ] Reuse feed list components; enforce `is_about_self = true`.

**Primary files**:
- `app/(app)/about-us/page.tsx` (new)
- `app/(app)/layout.tsx` (nav)
- shared feed components/queries

### 14) Your Company Pulse dashboard module

- [ ] Add query helpers for:
  - 7d/30d mention counts and deltas
  - sentiment distribution and shift
  - top MIS own-company item in last 24h
  - critical attention list (MIS > 80, 24h)
- [ ] Add module card to dashboard, placed below top-of-feed.

**Primary files**:
- `lib/dashboard/queries.ts`
- `app/(app)/dashboard-home-client.tsx`

### 15) Customer Voice subject filter backing

- [ ] Ensure customer voice queries support/consume `is_about_self`.
- [ ] Verify "Our company" returns real rows.

**Primary files**:
- `lib/customer-voice/queries.ts`
- `app/(app)/customer-voice/*`

### 16) Immediate alerts + burst safeguard

- [ ] Add immediate alert trigger evaluation:
  - self && MIS >= 70
  - self && MIS >= 60 && negative sentiment
- [ ] Implement per-user burst protection:
  - >3 alerts in 60m -> digest
- [ ] Add channel copy templates and links to About Us filtered view.

**Primary files** (likely new + existing notify plumbing):
- notification dispatcher modules (create if missing)
- `inngest/*` event handlers that currently notify on sweep complete

---

## Cross-Cutting Validation

- [ ] Add/extend unit tests for:
  - alias matching behavior
  - `self_relevance` formula and MIS floor
  - feed filtering by subject
  - immediate-alert + burst digest logic
- [ ] Add migration tests/smoke checks if present in repo standards.
- [ ] Update `State.md` after phase completion.

---

## Suggested Delivery Order (Lowest Risk)

1. Schema + types + routing enum additions
2. Orchestrator (`runSelfPass`, alias matching, ingestion flag)
3. MIS scoring updates
4. Onboarding + settings profile capture
5. Feed subject filter + About Us tab
6. Dashboard pulse module
7. Notifications + burst safeguard
8. Final QA + operator admin validation
