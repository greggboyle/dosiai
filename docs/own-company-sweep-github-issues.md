# Own-Company Sweep - GitHub Issue Drafts

Copy/paste each issue into GitHub. These are scoped for small reviewable increments.

---

## Issue 1: Extend workspace profile schema for own-company sweep

**Title**  
`feat(db): extend workspace_profile for own-company sweep inputs`

**Problem**  
Own-company sweep requires richer company identity, positioning, and alias data than the current `workspace_profile` schema provides.

**Scope**
- Add migration for new profile fields from spec:
  - identity (`legal_name`, `primary_url`, `product_names`, `brand_aliases`)
  - context (`founded_year`, `headquarters`, `industry`, `geography_served`)
  - narrative/positioning (`company_summary`, `icp_description`, `value_props`, `differentiators`)
  - channels (`social_handles`, `press_kit_url`)
  - embeddings (`summary_embedding`, `value_prop_embedding`)
  - audit (`updated_by`)
- Keep backward compatibility with existing fields or include migration strategy.
- Update consolidated schema + TS DB types.
- Apply RLS updates for admin update scope.

**Files**
- `supabase/migrations/*`
- `supabase/consolidated-schema.sql`
- `lib/supabase/types.ts`

**Acceptance criteria**
- New columns exist in DB and are reflected in generated/manual types.
- Existing onboarding and profile reads do not break on deploy.
- RLS allows active members to read and admins to update.

---

## Issue 2: Expand onboarding "Your Company" step with brand aliases and structured fields

**Title**  
`feat(onboarding): capture full own-company profile fields`

**Problem**  
Current onboarding captures only basic company details, which is insufficient for reliable own-company recall and scoring.

**Scope**
- Extend Step 2 UI with:
  - legal name, primary URL
  - product names list, brand aliases list (with explanatory helper text)
  - value props, differentiators
  - optional context fields (HQ, founded year, geography, social handles, press kit)
- Extend AI draft action to propose additional fields, including aliases.
- Update save action payload and persistence mapping.

**Files**
- `app/onboarding/page.tsx`
- `app/onboarding/actions.ts`

**Acceptance criteria**
- User can complete onboarding with populated alias list.
- Saved data lands in the extended `workspace_profile`.
- Draft action returns and populates new structured fields.

---

## Issue 3: Add settings page for company profile editing

**Title**  
`feat(settings): add editable company profile page`

**Problem**  
Profile data needs ongoing edits after onboarding; currently there is no dedicated settings surface.

**Scope**
- Add `/settings/company-profile` page and form.
- Create load/update server actions.
- Show info message that scoring recalibrates on next sweep when key fields change.
- Wire route into settings navigation.

**Files**
- `app/(app)/settings/company-profile/page.tsx`
- `app/(app)/settings/company-profile/actions.ts` (or equivalent)
- settings nav component(s)

**Acceptance criteria**
- Workspace admin can view/edit all profile fields.
- Updates persist and are visible on reload.
- Non-admin users are blocked from write actions.

---

## Issue 4: Add `sweep_self` purpose to AI routing and prompt templates

**Title**  
`feat(ai-routing): support sweep_self purpose`

**Problem**  
Own-company sweep requires independent vendor/model routing and prompt management.

**Scope**
- Add `'sweep_self'` to `AiPurposeDb`.
- Ensure admin AI routing UI supports this purpose.
- Add prompt defaults/template management for `sweep_self`.
- Ensure vendor health/cost aggregations include new purpose.

**Files**
- `lib/supabase/types.ts`
- `lib/admin/platform-types.ts`
- `lib/admin/map-ai-routing-db.ts`
- `lib/admin/prompt-defaults.ts`
- `app/admin/ai-routing/*`
- `app/admin/prompts/*`

**Acceptance criteria**
- Operator can configure `sweep_self` vendor/model.
- Operator can author/version `sweep_self` prompt template.
- Purpose appears in admin analytics tables.

---

## Issue 5: Implement own-company pass in sweep orchestrator

**Title**  
`feat(sweep): add runSelfPass and self-item ingestion`

**Problem**  
Current sweep workflow lacks the fifth pass for own-company mentions.

**Scope**
- Implement `runSelfPass` in orchestrator:
  - uses `sweep_self` routing
  - skips when profile incomplete
  - records vendor calls with purpose `sweep_self`
  - tags returned items `isAboutSelf = true`
- Run self pass in orchestration sequence before topics.
- Persist `is_about_self` flag on insert.

**Files**
- `lib/sweep/orchestrator.ts`
- `lib/sweep/schemas.ts` (if schema extensions needed)

**Acceptance criteria**
- Manual sweep with complete profile produces self-tagged items.
- Vendor calls include purpose `sweep_self`.
- Sweep completes with both self and non-self items as expected.

---

## Issue 6: Add brand-alias self matching during dedup

**Title**  
`feat(sweep): mark cross-pass items as self via alias matching`

**Problem**  
Items from category/topic passes that mention the workspace should also be discoverable in own-company views.

**Scope**
- Add alias matching over title + summary using:
  - legal name, primary URL, product names, brand aliases
- Set `isAboutSelf` when match found.
- Keep permissive substring behavior for v1.

**Files**
- `lib/sweep/orchestrator.ts`

**Acceptance criteria**
- Category item mentioning workspace alias is stored with `is_about_self = true`.
- Non-matching items remain false.

---

## Issue 7: Extend MIS scoring for own-company items

**Title**  
`feat(mis): add self_relevance component and own-company floor`

**Problem**  
Current MIS formula is competitor-centric and does not prioritize urgent own-company events appropriately.

**Scope**
- Add `self_relevance` computation.
- When item is about self:
  - replace/deactivate `competitor_weight`
  - incorporate `self_relevance`
  - apply MIS floor: if `self_relevance >= 80`, final MIS cannot be below 65
- Include sentiment + source + crisis indicator signals in formula.

**Files**
- `lib/mis/score.ts`
- `lib/sweep/schemas.ts` (ensure review metadata reaches scorer)

**Acceptance criteria**
- Own-company items use self-aware scoring.
- Severe negative mentions never sink below floor.
- Existing non-self scoring remains stable.

---

## Issue 8: Add `is_about_self` DB field and query support

**Title**  
`feat(data): add intelligence_item.is_about_self with index`

**Problem**  
UI and notification behavior depend on a reliable persisted self-subject flag.

**Scope**
- Migration adds `is_about_self boolean not null default false`.
- Add partial index for self queries.
- Update DB types and row mapping.

**Files**
- `supabase/migrations/*`
- `supabase/consolidated-schema.sql`
- `lib/supabase/types.ts`
- `lib/intelligence/map-row.ts`
- `lib/types.ts`

**Acceptance criteria**
- New column and index present in DB.
- App queries/types compile and run with new field.

---

## Issue 9: Add feed subject filter (`competitors` vs `our-company`)

**Title**  
`feat(feed): add subject filter with URL param`

**Problem**  
Users need to isolate own-company mentions from broader market intelligence on the main feed.

**Scope**
- Add subject filter control in feed client.
- Persist filter in URL search params.
- Apply `is_about_self` filter in server query.

**Files**
- `app/(app)/intel/feed-client.tsx`
- `app/(app)/intel/page.tsx`
- `lib/feed/queries.ts`

**Acceptance criteria**
- Filter is shareable via URL and back-button safe.
- "Our company" shows only `is_about_self = true`.

---

## Issue 10: Add About Us tab with category sub-tabs

**Title**  
`feat(about-us): add dedicated own-company intelligence view`

**Problem**  
Users need a daily destination specifically for brand/reputation monitoring.

**Scope**
- Add `/about-us` route.
- Add sub-tabs: all, customer voice, sell-side, channel, regulatory.
- Reuse feed UI/query plumbing with enforced self filter.
- Add nav entry.

**Files**
- `app/(app)/about-us/page.tsx`
- `app/(app)/layout.tsx`
- shared feed components/queries

**Acceptance criteria**
- About Us renders self-only items.
- Sub-tabs correctly segment by source/category.

---

## Issue 11: Add Your Company Pulse dashboard module

**Title**  
`feat(dashboard): add own-company pulse module`

**Problem**  
Dashboard lacks a concise own-company health snapshot (volume, sentiment, critical mentions).

**Scope**
- Add query layer for:
  - 7d/30d mention counts + deltas
  - sentiment mix and shift
  - top self item last 24h
  - critical MIS>80 alerts last 24h
- Render module below top-of-feed.
- Add empty state with alias completeness hint.

**Files**
- `lib/dashboard/queries.ts`
- `app/(app)/dashboard-home-client.tsx`

**Acceptance criteria**
- Module shows accurate counts/trends for self items.
- Empty state appears when no mentions exist.

---

## Issue 12: Immediate own-company alerts with burst digest safeguard

**Title**  
`feat(notifications): immediate self alerts + burst-rate digest`

**Problem**  
High-severity own-company events require immediate alerts, but volume spikes must be throttled per user.

**Scope**
- Implement trigger conditions:
  - self + MIS >= 70
  - self + MIS >= 60 + negative sentiment
- Send via existing channels (respecting user prefs/quiet hours behavior).
- Add burst safeguard:
  - >3 immediate alerts in 60m => digest
- Add copy templates for Slack/email/in-app.

**Files**
- notification dispatcher/event handlers (existing notify modules)
- Inngest functions that emit item-level alerts

**Acceptance criteria**
- Qualifying item triggers immediate alert.
- 4th+ alert in 60m is grouped into digest.
- Links deep-link to About Us/time window view.

---

## Issue 13: Re-embed and rescore jobs for profile updates

**Title**  
`feat(inngest): add workspace profile re-embed and rescore jobs`

**Problem**  
Profile changes to summary/value props should update embeddings and scoring behavior.

**Scope**
- Add `reembed-workspace-profile` function.
- Add `rescore-workspace` function (or next-sweep recalibration workflow).
- Trigger on profile updates to key fields.

**Files**
- `inngest/functions/*` (new)
- `inngest/index.ts`
- profile update actions in onboarding/settings

**Acceptance criteria**
- Updating key profile fields schedules jobs.
- Embedding fields refresh successfully.
- Subsequent scores reflect updated profile semantics.

---

## Issue 14: Test coverage for own-company sweep and filters

**Title**  
`test: add own-company sweep, scoring, and alert coverage`

**Problem**  
Feature has multiple inference-heavy paths that can regress without targeted tests.

**Scope**
- Unit tests:
  - alias matching behavior
  - self MIS formula + floor
  - feed subject query filtering
  - immediate alert trigger + burst safeguard
- Add fixtures for review metadata sentiment cases.

**Files**
- `tests/*` (new/updated)
- `lib/sweep/orchestrator.ts` tests
- `lib/mis/score.ts` tests
- notification logic tests

**Acceptance criteria**
- New tests pass in CI.
- Core own-company behaviors are protected against regression.
