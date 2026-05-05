# Current Phase: Phase 2 — Ingestion Engine

In scope for this phase:
- Inngest workflows for sweep orchestration and AI vendor calls
- AI vendor abstraction layer (OpenAI, Anthropic, xAI)
- AIRoutingConfig and operator UI for managing it
- PromptTemplate management with draft/active split, versioning, A/B testing
- IntelligenceItem schema and ingestion pipeline
- pgvector setup and embedding generation
- MIS computation (deterministic + LLM-assisted explanation)
- Confidence as first-class field on items
- Cross-vendor and cross-sweep deduplication
- Review Queue filter (items below threshold)
- Competitor auto-discovery and AI-assisted profile population
- AI cost tracking with transactional increment and ceiling enforcement
- Vendor health and cost monitoring (operator admin)
- Manual and scheduled sweeps
- Wire feed, dashboard top-of-feed, review queue, and competitor profile to real ingested data

Out of scope (deferred to Phase 3):
- Brief authoring (AI drafting model is configured, but UI is Phase 3)
- Battle card authoring and rep view (the recent_activity section needs sweep data, hence Phase 2 prereq, but the rest of the surface is Phase 3)
- Win/loss outcome logging form
- Customer Voice dedicated tab
- Channels view
- Notifications (email, Slack, Teams, webhook)
- Real-time subscriptions for live feed updates as sweeps complete
- Trial warning modal sequence
- Polished limit-hit upgrade prompts (Phase 1 stub toasts remain)

Read docs/spec/dosi_ai_design_prompt.md §3, §4, §5, §6, §7, §11, §12 for the full context relevant to this phase.
