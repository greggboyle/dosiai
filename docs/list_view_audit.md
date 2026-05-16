# List view audit — eight target surfaces

**Sources:** [.cursor/rules/00-product.md](../.cursor/rules/00-product.md), [.cursor/rules/02-conventions.md](../.cursor/rules/02-conventions.md). Product spec path cited in the task is not present in-repo.

## Design memo: A / B / C

### (A) Universal patterns (all eight)

- **Read-state spine:** Left accent border when unread; optional top rose bar when priority is critical; read + older than ~7d = muted “stale” title/meta.
- **Page shell:** H1 + **stateful subtitle** (counts, last sweep / filtered counts where data exists).
- **Control row:** Search debounced to URL `q`, sort/filter/density/view toggles where applicable, clear-filters affordance when params active.
- **Card chrome:** Top metadata row (attribution / primary badge), title + clamped preview, bottom row (relative time + hover actions: save, share, dismiss, mark read).
- **Empty states:** Distinguish “workspace has no records” vs “filters hide everything” with CTA to clear filters.
- **URL as source of truth** for list controls (Server Components read `searchParams`).

### (B) Surface-specific (encode as props / slots, not forked layouts)

- **Primary/secondary badges** and **score slot** (MIS vs ACV vs authority bar vs star rating).
- **`customLeft` / `customRight`** on cards (logos, sparklines).
- **`layout: 'list' | 'grid'`** (Battle Cards default grid).
- **Bulk actions** opt-in (`enableBulkActions`).

### (C) Genuine outliers

- **Battle Cards:** Lower volume, grid-first, status + freshness + owner attribution.
- **Customer Voice / All Intel:** Review-shaped rows need platform + sentiment; MIS + confidence still apply on intel-shaped rows.
- **Channels (current):** Entire page is **client-only mock data** (`app/(app)/channels/page.tsx`); not wired to Postgres — list system applied to **UI structure** only until API exists.
- **Win/Loss Outcomes tab:** Historically a **table**, not cards; migrating to list cards without adding a new detail route (rows may link to `/win-loss/log` where appropriate).

---

## 1. All Intel — `/intel`

| Field | Detail |
|--------|--------|
| **Files** | [app/(app)/intel/page.tsx](../app/(app)/intel/page.tsx) (RSC), [app/(app)/intel/feed-client.tsx](../app/(app)/intel/feed-client.tsx) (large CC), [components/feed/feed-list.tsx](../components/feed/feed-list.tsx), [components/feed/feed-detail.tsx](../components/feed/feed-detail.tsx), [lib/feed/queries.ts](../lib/feed/queries.ts) |
| **SC/CC** | Mixed: page loads workspace + paged items; **FeedClient** holds filters, sheet, mock date helpers, subject toggle. |
| **Types** | `IntelligenceItem`, `Category`, feed subject type in queries. |
| **Filters** | Many in client (category, competitor, topic, MIS slider, watching, review queue, etc.); server passes `subject` as **`competitors` \| `our-company'`** only — **no `all`**. |
| **Sort** | Implicit via query ordering in `listFeedItemsPage` (not exposed as URL sort dropdown). |
| **Per-row actions** | Bookmark, Share, Dismiss, Mark read, Watch (see [feed-list.tsx](../components/feed/feed-list.tsx)); not all wired to persisted `user_record_state` in this pass where already covered by `item_user_state` / item flags — **intel read state** remains item-level until extended. |
| **Read state** | `item.isRead` on `IntelligenceItem` (from feed mapping / review state). |
| **Empty state** | Inline in `FeedList` (“All caught up!”). |
| **Pagination** | Server: `page` + `pageSize` (10) in `listFeedItemsPage`. |
| **Known issues** | Vendor consensus shown as **`{confirmed}/{total}`** in [MISBadgeExtended](../components/mis-badge.tsx) — task replaces with **dot indicator**. Summaries can exceed 35-word guidance; **DB check** `char_length(summary) <= 300` added in migration `0045`. |

---

## 2. Briefs — `/my-briefs`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/my-briefs/page.tsx) (RSC), [my-market-client.tsx](../app/(app)/my-briefs/my-market-client.tsx) (CC), [my-brief-card.tsx](../components/feature/brief/my-brief-card.tsx), [my-market-queries.ts](../lib/brief/my-market-queries.ts), [my-market-actions.ts](../lib/brief/my-market-actions.ts) |
| **SC/CC** | Mixed: URL `searchParams` on server; client shell for controls + sections. |
| **Types** | `Brief`, `BriefCardData`, `MyBriefsPagePayload`, `BriefReadStatus`. |
| **Filters** | URL: `view`, `q`, `types`, `audience`, `status`, `from`, offsets. |
| **Sort** | View modes (importance / by type / chronological) rather than classic sort dropdown. |
| **Per-row** | Save, share, dismiss, open brief (see MyBriefCard). |
| **Read state** | **`brief_user_state`** → migrating to **`user_record_state`** (`record_type = 'brief'`) with **dual-write** to `brief_user_state` for rollback window. |
| **Empty** | Header copy + preferences sheet; section empty messages. |
| **Pagination** | Section caps + `roffset` / `coffset` URL params. |
| **Known issues** | None blocking; reference implementation for shared `ListCard`. |

---

## 3. Competitors — `/competitors`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/competitors/page.tsx) (RSC), [competitors-page-client.tsx](../app/(app)/competitors/competitors-page-client.tsx) (CC) |
| **SC/CC** | Mixed. |
| **Types** | `CompetitorTableRow`, `CompetitorTier`, table + cards hybrid UI. |
| **Filters** | Client: search string, status `active` / `archived`. |
| **Sort** | None explicit. |
| **Per-row** | Dropdown: open site, profile, archive, etc. |
| **Read state** | **None** today. |
| **Empty** | Implicit via filtered empty table. |
| **Pagination** | None — full list in memory. |
| **Known issues** | Table-first layout; sparklines were **simulated** in task spec — Topics already has Recharts mock; Competitors need **optional `customRight`** sparkline when metrics exist. |

---

## 4. Topics — `/topics`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/topics/page.tsx) (RSC), [topics-page-client.tsx](../app/(app)/topics/topics-page-client.tsx) (CC) |
| **SC/CC** | Mixed. |
| **Types** | `Topic`, `TopicImportance`. |
| **Filters** | Search / archive flows in client dialogs. |
| **Sort** | None URL-driven. |
| **Per-row** | Edit, archive, external links. |
| **Read state** | **None**. |
| **Empty** | Card empty state in client. |
| **Pagination** | None. |
| **Known issues** | `computeSparklineForTopic` uses **stub data** by topic id — document as placeholder until query exists. |

---

## 5. Win/Loss — `/win-loss`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/win-loss/page.tsx) (RSC), [win-loss-hub-client.tsx](../app/(app)/win-loss/win-loss-hub-client.tsx) (CC) |
| **SC/CC** | Mixed. |
| **Types** | `WinLossRow` + aggregates from [lib/win-loss/queries.ts](../lib/win-loss/queries.ts). |
| **Filters** | None on outcomes table. |
| **Sort** | None. |
| **Per-row** | Table only — **no row link** to detail today. |
| **Read state** | **None**. |
| **Empty** | Copy for no outcomes / viewer message. |
| **Pagination** | None — loads `allRows`. |
| **Known issues** | **Outcomes tab is `<Table>`**, not list cards; aggregation tabs out of scope for list-view pass. |

---

## 6. Customer Voice — `/customer-voice`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/customer-voice/page.tsx) (RSC), [customer-voice-client.tsx](../app/(app)/customer-voice/customer-voice-client.tsx) |
| **SC/CC** | Mixed. |
| **Types** | `IntelligenceItem` with `reviewMetadata` via [listCustomerVoiceItems](../lib/customer-voice/queries.ts). |
| **Filters** | Client subject map from items. |
| **Sort** | None URL-driven. |
| **Per-row** | Depends on client implementation. |
| **Read state** | Inherits item read flags if mapped like feed. |
| **Empty** | Client. |
| **Pagination** | None in page — full `listCustomerVoiceItems` result. |
| **Known issues** | Align subject control with **three-value** subject pattern when unified with Intel. |

---

## 7. Channels — `/channels`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/channels/page.tsx) — **entire file `'use client'`** with **mock channels** and mock `ChannelItem` detail sheet. |
| **SC/CC** | All client; **no server data fetch**. |
| **Types** | `Channel`, `ChannelItem`, `ChannelType`, `MISScore`. |
| **Filters** | Type chips, competitor chips, date range, search — all local state. |
| **Sort** | Authority score desc in `useMemo`. |
| **Per-row** | Row opens sheet with nested items. |
| **Read state** | N/A (not content items). |
| **Empty** | “No channels match your filters”. |
| **Pagination** | N/A. |
| **Known issues** | **Not wired to DB** — refactor is **presentational** alignment to list-view layout/cards only. |

---

## 8. Battle Cards — `/battle-cards`

| Field | Detail |
|--------|--------|
| **Files** | [page.tsx](../app/(app)/battle-cards/page.tsx) (RSC), [battle-cards-list-client.tsx](../app/(app)/battle-cards/battle-cards-list-client.tsx) |
| **SC/CC** | Mixed. |
| **Types** | Rows from `listBattleCardsWithCompetitor` mapped to lightweight card props. |
| **Filters** | Client-side (if any) in list client. |
| **Sort** | Default list order from query. |
| **Per-row** | Links to edit / interview flows. |
| **Read state** | **None**. |
| **Empty** | In list client. |
| **Pagination** | None. |
| **Known issues** | Should default to **`layout="grid"`** in shared layout. |

---

## Post-extraction notes (initial)

- **`user_record_state`** includes **`workspace_id`** for RLS aligned with `workspace_member` (stricter than user-id-only policies).
- **`ListCard`** implemented as a **Client Component** for hover, keyboard focus, and bulk checkboxes.
- **`app/(app)/_dev/list-view-fixtures`:** gated with `NODE_ENV === 'development'`.
- Operator “vendor health dashboard” for constraint violations: **not implemented** — violations surface as insert/update errors + server logs; follow-up if needed.

### Implementation status (2026-05-16)

- **Shared:** `ListCard`, `ListViewLayout`, control primitives (`ListSearch`, `ListViewToggle` with `clearParams`, `ListDensityToggle`, `ListClearFilters`, `ListBulkActions`, `ListKeyboardShortcuts`), `user_record_state` + `app/actions/list-view.ts`, realtime hook on **Briefs** and **Intel**.
- **Migrated:** `/my-briefs` (cards + URL search/filters + view toggle), `/intel` (`IntelFeedList` + bulk + density), `/battle-cards` (grid + `ListCard`), `/competitors` (list cards), `/topics` (`ListViewLayout` shell + search; rich `TopicCard` retained), `/customer-voice` (item list uses `ListCard`), Win/Loss **Outcomes** tab.
- **Also done (remainder pass):** `/channels` list-view UI (mock data; `channels-page-client.tsx`), Briefs `ListViewLayout` + `ListViewSection` + `ListFilters`, `ListSort` + `ListFilters` primitives.
- **Not migrated:** `/channels` backend (still mock), Intel sort still mostly client-state, operator health dashboard.
- **DB:** Run migrations `0044_user_record_state.sql` and `0045_intelligence_item_summary_length.sql` in each environment.
