# DOSI.AI Architecture

Stack:
- Next.js 16 (App Router), React 19, TypeScript end-to-end
- Supabase (Postgres + Auth + Realtime + Storage); RLS is the security boundary
- Inngest for background jobs (sweeps, scoring, embedding, brief drafting, battle card interview synthesis)
- Vercel for deployment
- Tailwind v4 + shadcn/ui + Lucide + Recharts + React Hook Form + Zod
- Stripe for billing (Checkout + Customer Portal + webhooks)

Patterns:
- Server Components for data-heavy reads; Client Components only for interactive surfaces
- Server Actions for mutations
- RLS policies enforce multi-tenant isolation; never filter by workspace_id only in app code
- Background jobs in Inngest, never in Vercel route handlers (serverless duration limits)
- Realtime via Supabase Realtime channels for live feed updates and sweep progress
- Stripe events received via webhooks at /api/webhooks/stripe; verified by signature
- camelCase in TypeScript; snake_case in Postgres; translation in lib/supabase/mappers.ts
