# Current Phase: Phase 1 — Foundation

In scope for this phase:
- Supabase project setup, schema migrations for foundational entities
- RLS policies on every workspace-scoped table
- Supabase Auth (email + Google + Microsoft SSO)
- Workspace, WorkspaceMember, WorkspaceInvite entities and full lifecycle
- Trial state machine (active → read_only on expiration)
- Plan tier definitions and enforcement (analyst seat caps, competitor caps, topic caps, battle card caps; AI cost ceiling structure exists but isn't enforced yet — that's Phase 2)
- Stripe integration: Checkout for upgrades, Customer Portal for billing management, webhooks for plan transitions
- Operator admin scaffold: separate auth, workspace list, workspace detail, override management, impersonation, audit log viewer
- Audit log infrastructure
- Wire existing v0 UI shell (sidebar, top bar, layout) to real auth and workspace context
- Stub list views for competitors, topics, briefs, battle cards, win/loss (empty states only)

Out of scope for this phase (deferred to Phase 2):
- Any AI vendor integration
- Sweep orchestration
- IntelligenceItem ingestion
- MIS computation
- Embeddings and pgvector
- AIRoutingConfig and PromptTemplate (entity exists in schema but no operator UI yet)

Out of scope for this phase (deferred to Phase 3):
- Brief authoring
- Battle card authoring (rep view and author view)
- Win/loss outcome logging form (the data model exists, but the form is Phase 3)
- Customer Voice view
- Channels view
- Notifications (email, Slack, Teams, webhook)
- Real-time subscriptions for live feed updates
- Trial warning modal sequence (T-7, T-3, T-1) — the trial state machine is in scope; the modal UX is Phase 3

Read docs/spec/dosi_ai_design_prompt.md §1, §2, §4, §10, §11, §12, §15, §16 for the full context relevant to this phase.
