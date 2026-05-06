# DOSI.AI - Own-Company Sweep: Feature Design Specification

This document is a self-contained specification for the own-company sweep feature (also called the "Your Company" lens or `sweep_self`). It is extracted from the master DOSI.AI design specification and includes only the data model, AI behavior, MIS scoring, UI surfaces, notifications, operator admin requirements, and phasing relevant to this feature.

Use this document when you want to understand the own-company sweep in isolation - for example, when scoping the feature for a separate engineering sprint, when explaining it to a stakeholder who doesn't need the full product context, or when reviewing it for completeness without the surrounding noise.

For the full product context, see `dosi_ai_design_prompt.md`. For the canonical TypeScript types, see `dosi_canonical_types.ts`.

---

## 1. Feature Summary

DOSI.AI sweeps multiple AI vendors for intelligence in four market-facing categories: buy-side, sell-side, channel, and regulatory. The own-company sweep is a fifth pass that runs at the same cadence within every sweep run and asks the same vendors a different question: "What is the world saying about us today?"

The feature exists because reputation- and self-monitoring is materially different from competitive monitoring. A negative review of your product, a press release about your funding, a podcast featuring your CEO, an enforcement action against your company - these are time-sensitive events the team needs to see today, not in a weekly digest. They also have different scoring dynamics from competitor items (a viral negative thread is high-priority regardless of competitor relevance) and different notification urgency (high-severity own-company items demand immediate alerts, not threshold-gated batched notifications).

### Why it's a fifth pass instead of a separate purpose

The own-company sweep is not architecturally distinct from a category sweep - it uses the same vendors, the same prompt patterns, the same 5W1H output structure, the same MIS scoring pipeline, the same ingestion path. The differences are semantic, not architectural:

- The subject is the user's company instead of competitors or topics.
- The scoring weights `self_relevance` instead of `competitor_weight`.
- The categorization still uses the four standard categories (a customer review of your product is still buy-side; a press release about your funding is still sell-side); items are flagged with `is_about_self = true` to distinguish them from competitor/topic items at query time.
- The notification urgency is higher (immediate-alert path bypasses normal thresholds for high-severity own-company items).

### What it produces

Every sweep run produces own-company items that flow into the unified Dossier Feed alongside competitor and topic items. Users access them through:

- A Subject filter on the main feed (orthogonal to category and competitor filters).
- A dedicated About Us tab in primary navigation, with sub-tabs by category.
- A Your Company Pulse dashboard module showing mention counts, sentiment trends, and critical-attention surfacing.
- The existing Customer Voice view's "Our company" subject filter, which is now backed by real data.
- Immediate notifications when high-MIS or high-severity own-company items arrive.

---

## 2. Data Model

Three data model changes support the feature.

### 2.1 WorkspaceProfile entity (extended)

The `workspace_profile` table holds the structured profile of the user's own company. One row per workspace, primary key on `workspace_id`. The structured fields are the input that drives both MIS scoring (proximity, strategic alignment, segment match) and the own-company sweep prompts.

```sql
CREATE TABLE workspace_profile (
  workspace_id UUID PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,

  -- Identity
  legal_name TEXT NOT NULL,
  primary_url TEXT NOT NULL,
  product_names TEXT[] DEFAULT '{}',
  brand_aliases TEXT[] DEFAULT '{}',  -- common variants: handles, abbreviations, etc.

  -- Context
  founded_year INT,
  headquarters TEXT,
  industry TEXT,
  geography_served TEXT[] DEFAULT '{}',

  -- Narrative
  company_summary TEXT NOT NULL,       -- 2-4 sentences, MIS proximity anchor
  icp_description TEXT,

  -- Positioning
  value_props TEXT[] DEFAULT '{}',     -- 3-5 bullets emphasized in marketing
  differentiators TEXT[] DEFAULT '{}', -- what distinguishes vs. competitors

  -- Channels
  social_handles JSONB DEFAULT '{}',   -- {linkedin, twitter, github, ...}
  press_kit_url TEXT,

  -- Embeddings (server-side only; not exposed in app types)
  summary_embedding VECTOR(1536),
  value_prop_embedding VECTOR(1536),

  -- Audit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id)
);

-- RLS scoped to workspace membership
ALTER TABLE workspace_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_profile_select ON workspace_profile FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_member
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY workspace_profile_update ON workspace_profile FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_member
    WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
  ));
```

#### Why `brand_aliases` matters

`brand_aliases` is the single most important field for own-company sweep recall. AI vendors surface mentions of companies under non-canonical names: Twitter handles, common abbreviations, product names, casual references. If a workspace has `legal_name = "Acme Logistics, Inc."` and no aliases, the sweep misses every mention that uses "Acme", "@acmelogistics", or "Acme TMS". Onboarding must capture aliases proactively (AI-assisted draft from the website's about page and social handles) - leaving this field empty is the difference between the feature working and not working on day one.

#### Embeddings

Two embedding columns. `summary_embedding` is computed from `company_summary` and is the proximity anchor for MIS. `value_prop_embedding` is computed from `value_props` and is the strategic-alignment anchor. Both are recomputed when their source field changes; both are workspace-private.

### 2.2 `IntelligenceItem.is_about_self` field

The `intelligence_item` table gains a single boolean column:

```sql
ALTER TABLE intelligence_item ADD COLUMN is_about_self BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX intelligence_item_self_idx ON intelligence_item(workspace_id, is_about_self, ingested_at DESC) WHERE is_about_self = TRUE;
```

Set automatically during ingestion in two cases:

1. Every item returned from the `sweep_self` pass.
2. Every item from any category sweep where the workspace's `legal_name`, `primary_url`, any of `product_names`, or any of `brand_aliases` appears in the item's title or summary text.

An item can be `is_about_self = true` and have `related_competitors` populated when the item is comparative - for example, a head-to-head review article that names both the workspace and a competitor. This is correct behavior; the item appears in both the About Us view (filtered by self) and the competitor's profile activity timeline.

### 2.3 `AIRoutingConfig` - `sweep_self` purpose

The `ai_routing_config` table's `purpose` enum gains one value: `sweep_self`. Operators configure vendor and model independently for this purpose, the same as the four category purposes. The full enum becomes:

```
sweep_buy
sweep_sell
sweep_channel
sweep_regulatory
sweep_self            -- NEW
scoring
embedding
brief_drafting
battle_card_interview
```

Multiple rows per `purpose = sweep_self` are permitted only when multi-vendor mode is enabled. In single-vendor mode (the default and recommended starting configuration), exactly one enabled row exists with `is_primary = true`.

---

## 3. AI Vendor Behavior

### 3.1 Prompt strategy

The `sweep_self` prompt template targets the same source-type universe as the four category sweeps but scoped to mentions of the workspace's brand identifiers. It instructs the model to find recent items where any of the workspace's identifiers appears, and to categorize each finding into one of the four standard categories.

A representative prompt template (operator-managed, versioned):

```text
You are a media monitoring analyst. Find recent items (within {{date_window}})
that mention the following company by any of its identifiers:

Legal name: {{legal_name}}
Primary URL: {{primary_url}}
Products: {{product_names}}
Brand aliases / common name variants: {{brand_aliases}}
Social handles: {{social_handles}}

For each item found, return a structured record with:
- event_title, summary, who, what, when, where, why, how
- source_urls (every claim must be sourced)
- source_type (e.g., press_release, g2_review, podcast_episode, news_article, social_post)
- category (one of: buy_side, sell_side, channel, regulatory)
- subcategory (free text - e.g., "g2_review", "funding_announcement", "podcast_appearance")
- confidence (low / medium / high) and confidence_reason
- review_metadata if and only if source_type indicates a review or community discussion:
  {platform, rating, sentiment (positive/negative/mixed/neutral), reviewer_role, excerpt}
- entities_mentioned (other companies named alongside the subject - useful for
  detecting comparative items)

Refuse to fabricate. If you have no grounded result, return an empty array.
Do not include items where the company is mentioned only in a list or
roundup without substantive context. Prioritize items where the company is
the subject, not a peripheral reference.
```

The prompt is operator-managed via the prompt template system in section 16. Versioning, A/B testing, and rollback work the same as for category prompts.

### 3.2 Source-type universe

The own-company sweep targets the union of sources used by the four category sweeps:

- Press releases and news (sell-side flavor when about funding, leadership, M&A; buy-side flavor when about customer wins).
- SEC and equivalent filings (sell-side; rare for SMB target customers but possible).
- Job postings on the workspace's careers page and on job boards (sell-side flavor when surfaced as a hiring signal).
- Patent databases (sell-side).
- Earnings calls (sell-side; only if the workspace is publicly traded).
- Customer reviews on G2, Capterra, TrustRadius, app stores (buy-side flavor; this is the most active source for SMB software products).
- Discussion communities: Reddit, Hacker News, vertical Slack/Discord communities where indexed (buy-side flavor for organic discussion, channel flavor when the workspace is featured in a podcast or thread).
- Conference programs, podcast episode pages, publication mastheads and bylines (channel).
- Agency websites, the Federal Register, court filings (regulatory; rare for SMB customers but high-stakes when present).

### 3.3 Vendor selection

Default routing recommendation: `sweep_self` uses the same vendor as `sweep_buy` because the buy-side category has the strongest overlap with the dominant own-company source types (customer reviews, social discussion). Operators can configure differently if observed quality favors a different vendor.

Multi-vendor mode is available but expensive - the own-company sweep tends to produce a higher item count than category sweeps, so triangulating across two or three vendors compounds AI cost. Recommend single-vendor mode as the default for paid tiers.

### 3.4 Cost considerations

Own-company sweep cost is bounded similarly to category sweeps. A typical own-company pass for a workspace with 3 product names and 8 brand aliases runs 50-150K tokens per vendor per sweep. Daily-cadence own-company sweep at this volume costs roughly $5-$15/month per vendor at current prices.

The sweep is not separately budgeted - it counts against the workspace's AI cost ceiling alongside category sweeps. The combined daily-cadence sweep (4 categories + 1 self pass + topics) on a Starter workspace runs $25-$35/month; Team runs $80-$140/month. These numbers already include the own-company pass in the section 15 plan limits.

---

## 4. Sweep Orchestration

The own-company sweep is a step in the existing sweep workflow, not a separate workflow.

### 4.1 Orchestration sequence

Within an Inngest `runSweep` workflow:

```text
1.  Budget check (rejects if AI cost ceiling exceeded)
2.  Load workspace context (profile, competitors, topics, routing config)
3.  Create sweep row (status: running)
4.  Fan out per category in parallel:
    - run_category('buy_side')
    - run_category('sell_side')
    - run_category('channel')
    - run_category('regulatory')
5.  Run own-company pass: run_self_pass()        <- NEW STEP
6.  Run topics pass: run_topics_pass()
7.  Dedup across all results (incl. brand-alias matching for is_about_self flag)
8.  Score every item (MIS computation; self_relevance instead of competitor_weight when is_about_self)
9.  Ingest into intelligence_item with is_about_self flag set appropriately
10. Detect and suggest new competitors
11. Complete sweep (status: completed)
12. Emit Realtime event for UI updates
```

### 4.2 `run_self_pass` implementation

```typescript
async function runSelfPass(sweepId: string, context: SweepContext): Promise<RawIntelligenceItem[]> {
  const profile = context.workspaceProfile

  // Skip if profile is incomplete (e.g., no legal_name)
  if (!profile.legalName || !profile.primaryUrl) {
    return []
  }

  // Read the routing config for sweep_self
  const routes = await getRoutingFor('sweep_self')

  const results: RawIntelligenceItem[] = []
  for (const route of routes) {
    if (!route.enabled) continue

    const prompt = renderPromptTemplate('sweep_self', route.vendor, {
      legal_name: profile.legalName,
      primary_url: profile.primaryUrl,
      product_names: profile.productNames,
      brand_aliases: profile.brandAliases,
      social_handles: profile.socialHandles,
      date_window: '7d',
    })

    const response = await callVendor(route.vendor, route.model, {
      prompt,
      responseSchema: SelfSweepResponseSchema,
      webSearch: true,
    })

    await recordVendorCall(context.workspaceId, {
      purpose: 'sweep_self',
      vendor: route.vendor,
      model: route.model,
      ...response.usage,
    })

    // Tag every item from this pass with is_about_self
    const items = response.parsed.items.map(item => ({
      ...item,
      isAboutSelf: true,
      sourceVendors: [route.vendor],
    }))

    results.push(...items)
  }

  return results
}
```

### 4.3 Brand-alias matching during dedup

The `dedupItems` step handles cross-vendor consensus and cross-sweep dedup. It also runs brand-alias matching to set `is_about_self = true` on items that came from category sweeps but mention the workspace's brand:

```typescript
function applyBrandAliasMatching(
  items: RawIntelligenceItem[],
  profile: WorkspaceProfile
): RawIntelligenceItem[] {
  const aliases = [
    profile.legalName.toLowerCase(),
    profile.primaryUrl.toLowerCase(),
    ...profile.productNames.map(n => n.toLowerCase()),
    ...profile.brandAliases.map(a => a.toLowerCase()),
  ].filter(Boolean)

  return items.map(item => {
    if (item.isAboutSelf) return item   // already set by sweep_self pass

    const haystack = `${item.title} ${item.summary}`.toLowerCase()
    const matched = aliases.some(alias => haystack.includes(alias))

    return matched ? { ...item, isAboutSelf: true } : item
  })
}
```

The matching is intentionally permissive - substring match without word-boundary checks - because aliases are short and ambiguous matches are rare in practice for B2B SaaS company names. If false positives become an issue post-launch (e.g., a workspace named "Hub" matching every mention of "GitHub"), the matching can be tightened with word boundaries and the operator admin can expose a "false positive correction" affordance per workspace.

---

## 5. MIS Scoring for Own-Company Items

The Market Intelligence Score is computed for every ingested item. Own-company items use a slightly different component formula.

### 5.1 Component changes

When `is_about_self = true`:

- `competitor_weight = 0`. The item isn't about a competitor; the component doesn't apply.
- `self_relevance` (new component) replaces competitor_weight in the weighted sum.
- `proximity` is essentially maximized for own-company items by definition. The proximity component still computes (it remains useful for distinguishing, say, an HR-trade-publication mention of the workspace's hiring practices from a customer review of the workspace's product), but its weight in the final score is reduced when `is_about_self = true` because the signal is already saturated.
- `strategic_alignment, recency, source_credibility, vendor_consensus, category_weight` all compute normally.
- `topic_relevance, segment_match` apply only when relevant; for own-company items they typically contribute less.

### 5.2 `self_relevance` component

`self_relevance` is a 0-100 score computed at scoring time. The component captures four signals:

1. Sentiment direction (when `review_metadata` is present): negative sentiment scores highest. A 1-star review or a community thread complaining about the workspace's product scores `self_relevance = 95`. A neutral mention scores `self_relevance = 40`. A positive mention scores `self_relevance = 65` (still meaningful, but less urgent than negative).
2. Magnitude: a major outlet (TechCrunch, Wall Street Journal, industry analyst report) covering the workspace scores higher than a Reddit thread mention. Source-type lookup table; same as the `source_credibility` component's lookup, but scaled differently.
3. Audience proximity to revenue: items from G2, Capterra, TrustRadius, and procurement-relevant sources score highest because they directly affect prospect decisions. Internal-industry chatter (e.g., a podcast where the workspace's CEO is quoted in passing) scores lower.
4. Crisis indicators: certain keywords or patterns in the item's content trigger a magnitude boost. Words like "outage", "breach", "lawsuit", "investigation", "acquired", "lays off", "shutters" - paired with the workspace's identifiers - push the score up sharply. This is a heuristic layer; refine post-launch based on what real workspaces flag as urgent.

A reference computation:

```typescript
function computeSelfRelevance(item: RawIntelligenceItem, profile: WorkspaceProfile): number {
  let base = 50  // neutral starting point

  // Sentiment
  if (item.reviewMetadata) {
    if (item.reviewMetadata.sentiment === 'negative') base = 95
    else if (item.reviewMetadata.sentiment === 'mixed') base = 70
    else if (item.reviewMetadata.sentiment === 'neutral') base = 40
    else if (item.reviewMetadata.sentiment === 'positive') base = 65
  }

  // Magnitude - use source-credibility lookup as a starting proxy
  const sourceMagnitude = SOURCE_MAGNITUDE_LOOKUP[item.sourceType] ?? 50
  base = (base + sourceMagnitude) / 2

  // Audience proximity to revenue
  if (PROCUREMENT_RELEVANT_SOURCES.includes(item.sourceType)) {
    base = Math.min(100, base + 10)
  }

  // Crisis indicators
  const crisisKeywords = ['outage', 'breach', 'lawsuit', 'investigation',
                          'acquired', 'lays off', 'shutters', 'data leak']
  const haystack = `${item.title} ${item.summary}`.toLowerCase()
  if (crisisKeywords.some(kw => haystack.includes(kw))) {
    base = Math.min(100, base + 15)
  }

  return Math.round(base)
}
```

The constants are operator-tunable for Team and Business tier workspaces (per the existing per-workspace MIS weight tuning capability). The platform default needs calibration against the first 30 days of real-world usage.

### 5.3 Score floor for own-company items

A floor is applied: own-company items where `self_relevance >= 80` cannot score below MIS 65 even if other components pull the weighted average lower. This prevents the case where a severe negative review scores low because, say, source credibility for Reddit is moderate and recency is a few days old. A bad review needs to be visible regardless of those secondary factors.

---

## 6. UI Surfaces

The own-company sweep produces items that flow into existing UI surfaces and one new one.

### 6.1 Subject filter on the main feed

The Dossier Feed gains a Subject filter, orthogonal to category and competitor filters. Two values:

- Competitors (default - items where `is_about_self = false`)
- Our company (items where `is_about_self = true`)

The filter composes with all existing filters. A user filtering to "Our company" + "Customer Voice" sees only review-source items about the workspace; filtering to "Our company" + "Regulatory" sees only regulatory items mentioning the workspace.

Implementation note: the filter is a URL search param so the state is shareable and back-button-respecting. Server Component reads the param and passes the appropriate `WHERE is_about_self = ?` clause to the query.

### 6.2 Dedicated About Us tab

A new top-level navigation entry (sibling to Dossier Feed, Competitors, Topics, Briefs, Battle Cards, Win/Loss, Customer Voice, Channels, Regulatory) called About Us. Path: `/about-us`.

The view is a filtered version of the feed where `is_about_self = true` is always applied. Sub-tabs across the top break down by category:

- All - every own-company item
- Customer Voice - items where `review_metadata IS NOT NULL`
- Sell-side - press, funding, leadership news about the workspace
- Channel - publications, podcasts, conferences featuring the workspace
- Regulatory - agency notices, enforcement actions, legal items about the workspace

Each sub-tab supports the same controls as the main feed (date range, score band, source type, search).

The view is the daily entry point for CMOs, comms leads, and CEOs. A user opening this tab in the morning sees what's been said about their company in the last 24 hours.

### 6.3 Your Company Pulse dashboard module

A high-priority dashboard module, placed just below "Top of Feed" in the dashboard's module ordering. The module shows:

- Mention counts: total own-company items in the last 7 days and the last 30 days, with arrow indicators for trend versus the prior period.
- Net sentiment: rolling 30-day sentiment score for own-company items with a horizontal bar visualization (positive | mixed | negative | neutral).
- Most recent high-MIS item: card preview of the highest-scoring own-company item in the last 24 hours, with click-through to feed detail.
- Critical-attention indicator: any items above MIS 80 about the workspace in the last 24 hours surface here with a "Review now" CTA. If there are none, the area collapses to a confirmation state.
- Sentiment shift indicator: if net sentiment dropped meaningfully versus the prior 30 days, an alert badge appears: "Net sentiment dropped 14 points over 30 days."

If the workspace has no own-company items in the period (which should be rare for any company with public presence, but possible during the trial's first day or for workspaces with very thin online presence), the module shows an empty state: "No new mentions in the last 7 days" with a small note about checking the company profile's `brand_aliases` for completeness.

### 6.4 Customer Voice view subject filter

The existing Customer Voice view (`/customer-voice`) already specifies a Subject filter with values "All", "Our company", and one chip per tracked competitor. The own-company sweep is what makes "Our company" actually populate with data. No UI changes required; the view simply has more content once `sweep_self` runs.

### 6.5 Settings -> Company Profile

A new admin-accessible settings page at `/settings/company-profile`. Workspace admins can edit the structured `WorkspaceProfile` fields at any time:

- Legal name
- Primary URL
- Product names (list, add/remove)
- Brand aliases (list, add/remove, with a small note: "Common variants of your company name. Helps DOSI.AI find mentions across the web.")
- Founded year
- Headquarters
- Industry, geography served
- Company summary (the narrative - drives MIS proximity)
- ICP description
- Value props (list)
- Differentiators (list)
- Social handles (LinkedIn, Twitter/X, GitHub, others)
- Press kit URL

Changes to `company_summary` or `value_props` re-embed (via Inngest job `reembed-workspace-profile(workspaceId)`) and trigger a workspace-wide rescore on the next sweep cycle. The rescore is automatic; the user sees a small notification: "Profile updated. Scoring will recalibrate on the next sweep."

### 6.6 Onboarding capture

The onboarding wizard's "Your Company" step (Step 2) captures the structured `WorkspaceProfile` fields. The flow:

1. User enters legal name and primary URL.
2. AI-assisted draft fetches the company website and proposes:
   - Company summary (2-4 sentences)
   - ICP description
   - Industry / vertical
   - Geography served
   - Product names (extracted from product/pricing/landing pages)
   - Brand aliases (extracted from social handles, abbreviations in copy, common references)
   - Value props (3-5 bullets)
   - Differentiators (where present in messaging)
3. User reviews and edits each AI-drafted field. The "AI-drafted, click to confirm" pattern matches the rest of the platform.
4. User confirms and proceeds.

The onboarding flow must surface `brand_aliases` prominently. A note explains: "These are common variants of your company name. DOSI.AI uses them to find mentions across the web. Add any short forms, social handles, or product abbreviations people use to refer to your company."

---

## 7. Notifications

The own-company sweep introduces an immediate-alert path that bypasses normal threshold logic for high-severity items.

### 7.1 Immediate-alert triggers

A vendor call's response that includes own-company items with any of these conditions triggers immediate notifications:

- `is_about_self = true` and `mi_score >= 70` - high relevance about the workspace itself.
- `is_about_self = true` and `mi_score >= 60` and `review_metadata.sentiment = 'negative'` - a negative review or community thread, scored medium-high.

### 7.2 Notification channels

Subject to per-user notification preferences (channels enabled, quiet hours, mute lists). The platform-wide override is that the immediate-alert path cannot be globally disabled - it can only be muted per-user during quiet hours, and even then is delivered when quiet hours end.

Channels (per existing notification stack in section 9 of the master spec):

- In-app via Supabase Realtime
- Email (Resend or Postmark)
- Slack (incoming webhook or via the existing Slack OAuth install)
- Microsoft Teams (incoming webhook)
- Generic webhook

### 7.3 Burst-rate safeguard

To prevent oppressive notification volumes during a coordinated event (a viral negative thread that produces 12 own-company items at high MIS in an hour), the dispatcher implements a burst-rate safeguard:

- If more than 3 immediate-alerts for own-company items have fired to the same user in the last 60 minutes, the next alert is rolled into a digest instead of firing as a single notification.
- The digest groups the items into a single "DOSI.AI Alert: 4 new high-priority mentions of your company" notification with a click-through to the About Us tab filtered to the relevant time window.
- The threshold (3 alerts in 60 minutes) is operator-tunable at the platform level via section 16 admin.

### 7.4 Notification copy

Immediate-alert messages are direct and informative. Examples:

**Slack message format**:

> 🚨 DOSI.AI Alert  
> A new high-priority mention of [Workspace name] was found.  
> **[Item title]**  
> Score: 78 · Sentiment: Negative · Source: G2  
> [View item]

**Email subject**:

> [DOSI.AI] High-priority mention of [Workspace name] · MIS 78

The copy avoids urgency theater and emoji clutter while conveying the substance. Negative-sentiment items get the same visual treatment as other high-MIS items; the urgency is in the content, not the styling.

---

## 8. Operator Admin

### 8.1 Routing configuration

The AI Routing configuration page (`/admin/ai-routing`) gains `sweep_self` as a row alongside the four category purposes. Each row exposes:

- Vendor selection
- Model selection
- isPrimary flag
- enabled flag
- Operational metrics: cost-per-1M-tokens, average latency, citation rate, factual grounding score
- Notes field
- Last changed by / when

Default platform configuration: `sweep_self` uses the same vendor as `sweep_buy` (typically OpenAI gpt-4o or equivalent), single-vendor mode. Operators can configure differently if observed quality favors a different vendor for own-company queries.

### 8.2 Prompt template

A new prompt template entry at `/admin/prompts/sweep_self` per vendor. Versioned, testable inline, A/B testable. The default platform-shipped prompt is the template described in section 3.1 above; engineers tune over time based on observed quality.

### 8.3 Vendor health and cost dashboards

The existing vendor health page and cost page already aggregate by purpose. `sweep_self` appears as a separate row in those tables alongside the four category purposes, with its own latency, success rate, error count, and cost contribution. No new screens required.

### 8.4 Per-workspace observability

The operator workspace detail view (`/admin/workspaces/[id]`) has a Sweep History tab. Each sweep row should show the vendor calls grouped by purpose, including the `sweep_self` calls. Operators debugging "why isn't my customer's About Us tab showing items?" can drill into a specific sweep, see the `sweep_self` vendor call, inspect the request and response, and identify whether the issue is profile completeness (missing `brand_aliases`), prompt quality (the model is filtering too aggressively), or vendor behavior.

---

## 9. Plans and Limits

The own-company sweep is included in every paid tier and the trial. No tier gates the sweep itself; cadence and AI cost ceiling apply uniformly.

### 9.1 Per-tier behavior

- Trial: own-company sweep runs at the same cadence as category sweeps (initial sweep on profile completion, then daily on a manual or auto-triggered basis depending on the workspace's trial-to-Starter capability set). Counts against the workspace's AI cost ceiling.
- Starter, Team, Business: same. Own-company sweep is a standard pass within every sweep run.
- Enterprise (placeholder): same; can be customized per contract.

### 9.2 AI cost impact

The own-company sweep adds roughly 15-25% to each sweep's total AI cost. This is reflected in the per-tier cost ceilings in section 15 of the master spec ($40/$200/$700 monthly for Starter/Team/Business). The ceilings are calibrated to include all five passes (4 categories + self) at the tier's typical cadence; no separate budget allocation is required.

### 9.3 Cadence

The own-company sweep runs at the same cadence as category sweeps within each scheduled or manual sweep run - not separately scheduled. If a workspace is configured for daily sweeps, the own-company pass runs daily; if configured for twice-daily, it runs twice daily; if manual-only on the trial, it runs only on user-triggered manual sweeps.

This is a deliberate simplification. An earlier draft of this design proposed running the own-company sweep more frequently than category sweeps because reputation-monitoring is more time-sensitive. That option was rejected in favor of cadence parity for three reasons: simpler operator admin (one cadence per workspace, not five), simpler cost reasoning (one ceiling, not separate envelopes), and acceptable latency in practice (a daily sweep catches significant own-company events within 24 hours, which is fast enough for SMB use cases). Enterprise customers needing real-time reputation monitoring can configure higher cadences across all sweeps.

---

## 10. Phasing

The own-company sweep is built incrementally across the three build phases.

### 10.1 Phase 1 - Foundation

Schema and onboarding only. No AI behavior yet.

- Schema: `workspace_profile` table with full structured fields. RLS policies. Embedding columns added but not yet populated (Phase 2 populates them when `sweep_self` infrastructure lands).
- Onboarding: Step 2 captures the full structured profile. AI-assisted draft from the company URL pre-populates fields. Brand aliases get explicit prompting and explanation in the UI.
- Settings -> Company Profile page (`/settings/company-profile`): admin-editable. Re-embed and rescore are stubbed (the jobs don't exist until Phase 2; for Phase 1, profile updates persist but don't trigger anything else).

Acceptance criteria for Phase 1: a user can complete onboarding with a fully populated `WorkspaceProfile`, including AI-assisted brand aliases. The profile can be edited at any time via Settings. The data is stored correctly; the AI integration is deferred.

### 10.2 Phase 2 - Ingestion Engine

The full sweep behavior lands here.

- `AIRoutingConfig` enum extended to include `sweep_self`. Operator admin shows it in the routing configuration table.
- Default prompt template for `sweep_self` shipped per vendor.
- Sweep orchestration (`runSweep` workflow) gains a `runSelfPass` step alongside the four category passes.
- `dedupItems` step runs brand-alias matching to set `is_about_self = true` on category-sweep items mentioning the workspace.
- `intelligence_item.is_about_self` field added to schema. Index added for queries.
- MIS computation extended: `self_relevance` component added; `competitor_weight = 0` when `is_about_self = true`; score floor of 65 applied when `self_relevance >= 80`.
- Re-embed and rescore Inngest jobs land (`reembed-workspace-profile`, `rescore-workspace`). Profile updates trigger them.
- Embedding columns on `workspace_profile` populated.
- Vendor health and cost dashboards in operator admin show `sweep_self` metrics.

Acceptance criteria for Phase 2: a workspace with a complete profile triggers a manual sweep; the sweep completes; `intelligence_item` rows appear with `is_about_self = true` for own-company items and `is_about_self = false` for competitor items (with cross-tagging via brand-alias matching where appropriate); MIS scores reflect the `self_relevance` component for own-company items; the existing v0 feed UI renders own-company items via the existing components without changes.

### 10.3 Phase 3 - Consumption surfaces

The user-facing surfaces specific to own-company items.

- Subject filter on the main feed (URL-based, server-rendered).
- About Us tab in primary navigation (`/about-us`) with sub-tabs by category.
- Your Company Pulse dashboard module.
- Immediate-alert notification path with burst-rate safeguard.
- Notification copy templates per channel.
- Customer Voice view's "Our company" filter is now backed by real data (no UI change; the data is what was missing).

Acceptance criteria for Phase 3: a user filtering the feed by "Our company" sees the right subset; the About Us tab renders with all sub-tabs functional; the dashboard module surfaces correct counts and trend indicators; a high-MIS own-company item with negative sentiment triggers an immediate Slack notification (or email, or in-app, per user prefs); the burst-rate safeguard rolls excessive alerts into a digest after the threshold.

---

## 11. Decisions and Open Questions

### 11.1 Decisions made

- Cadence parity: own-company sweep runs at the same cadence as category sweeps. Not separately scheduled.
- Immediate-alert path: own-company items at MIS >= 70 (or >= 60 with negative sentiment) bypass normal notification thresholds. Cannot be globally disabled.
- Brand-alias matching is permissive: substring match without word boundaries. Tighten only if false positives become a real problem post-launch.
- Own-company items use the four standard categories: no fifth category. The own-company-ness is captured in the `is_about_self` flag; categorization stays buy/sell/channel/regulatory for unified surfaces.
- Single-vendor mode is the default: multi-vendor available but expensive.

### 11.2 Open questions for post-launch

- Per-product separate sweeps: workspaces with many products (e.g., a B2B SaaS company with 5 named products) might want product-specific sweeps and product-specific dashboards. The current design folds all products into one sweep per workspace. If demand emerges, this becomes a v1.1 feature: `sweep_self_product` per product, separate metrics, separate notifications.
- Tunability of `self_relevance` heuristics: the crisis-keyword list and sentiment weighting need calibration. Operator admin exposes per-workspace tuning for Team and Business tiers, but the platform default needs iteration based on real workspace feedback. Plan a 30-day post-launch review.
- Brand-alias autocomplete from external sources: could we suggest `brand_aliases` at onboarding by querying social handles, Crunchbase, or similar? Useful but adds dependencies. Defer unless onboarding completion data shows users skipping the `brand_aliases` field.
- Own-company item exclusion in Customer Voice analytics: the workspace's own product reviews appear in both Customer Voice (filterable) and About Us. Aggregate metrics that include the workspace's own reviews when computing market sentiment patterns would be misleading. Confirm Customer Voice analytics filter to `is_about_self = false` when computing market-level trends, and to `is_about_self = true` only when explicitly viewing "Our company."

---

## 12. Engineering Estimates

Rough effort to add the feature on top of the existing DOSI.AI build (assumes the four category sweeps and core ingestion are already working):

- Phase 1 additions: 2-3 days. Schema migration, onboarding step extension, Settings page.
- Phase 2 additions: 4-6 days. Routing config, prompt template, `runSelfPass` implementation, brand-alias matching, MIS component, re-embed/rescore jobs, vendor health surfacing.
- Phase 3 additions: 3-5 days. Subject filter, About Us tab, dashboard module, immediate-alert path, burst-rate safeguard.

Total: roughly 9-14 days of focused work, distributed across the three phases. Most of the complexity is in Phase 2; the surfaces in Phase 3 are mostly composing existing components with new query parameters.

---

## 13. Verification Checklist

When the feature is complete, the following should all be true:

- [ ] A new workspace can complete onboarding with AI-drafted brand aliases populated from the company website.
- [ ] An admin can edit the `WorkspaceProfile` at any time via Settings -> Company Profile, and the changes persist.
- [ ] A profile change to `company_summary` triggers a re-embed; the workspace's items get rescored on the next sweep.
- [ ] Operators can configure `sweep_self` vendor and model independently of category purposes.
- [ ] Operators can author and version the `sweep_self` prompt template per vendor.
- [ ] A manual sweep on a workspace with a complete profile produces own-company items.
- [ ] Items from category sweeps that mention the workspace's brand identifiers get `is_about_self = true` set during dedup.
- [ ] MIS scores for own-company items use `self_relevance` instead of `competitor_weight`.
- [ ] A negative review of the workspace (3-star G2 rating, MIS 75) triggers an immediate Slack notification regardless of the user's normal threshold.
- [ ] If 4 own-company alerts fire to one user in 60 minutes, the 5th rolls into a digest.
- [ ] The Subject filter on the main feed correctly narrows to own-company items.
- [ ] The About Us tab renders own-company items, with sub-tabs by category.
- [ ] The Your Company Pulse dashboard module shows accurate mention counts and sentiment trends.
- [ ] The Customer Voice view's "Our company" subject filter is populated.
- [ ] The own-company sweep contributes to AI cost tracking and respects the workspace's cost ceiling.
- [ ] Operators can drill into a sweep's detail and see the `sweep_self` vendor call alongside the category calls.
