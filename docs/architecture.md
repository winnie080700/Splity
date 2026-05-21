# Splity Architecture

## Stack

- App: Next.js App Router, React, TypeScript, Tailwind CSS
- Auth: Supabase Auth through `@supabase/ssr`
- Data: Supabase Postgres with Row Level Security
- Mutations: Server Actions plus typed service helpers in `apps/web/lib/services`
- Shared package: `packages/api-client` contains DTO types only

## Web App Layers

- `apps/web/app`: routes, layouts, Server Components, Server Actions, and small client forms
- `apps/web/components/ui`: reusable UI primitives
- `apps/web/lib/auth`: authenticated user helpers and auth actions
- `apps/web/lib/supabase`: server, browser, middleware, anon, and admin Supabase clients
- `apps/web/lib/services`: data access helpers that rely on Supabase RLS
- `apps/web/lib/calculations`: deterministic bill and settlement calculations

## Supabase Layout

- `supabase/migrations/0001_schema.sql`: base tables and indexes
- `supabase/migrations/0002_rls_policies.sql`: RLS policies and membership helpers
- `supabase/migrations/0003_rpc_functions.sql`: aggregate/read RPCs
- Later migrations add username signup, username lookup, bill integrity defenses, settlement locking, and invitation/share hardening
- `supabase/tests`: SQL fixtures that verify RLS, integrity checks, and migration behavior

## Security Model

- `app_users.id` mirrors `auth.users.id`.
- `app_users` is self-readable/self-updatable only.
- Group creators can edit their groups and related entities.
- Accepted invitees can read group data through membership policies.
- Public settlement share reads are handled through whitelisted code paths, not broad table access.
- The service-role/admin client must stay isolated to server-only helper files.

## Calculation Rules

- Monetary values are normalized to two decimals.
- Split calculations use deterministic largest-remainder cent allocation.
- Settlement matching is deterministic so repeated reads produce stable transfer keys.

## Runtime

- Local app entrypoint: `pnpm dev`
- Production build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Environment variables are scoped to `apps/web/.env.local`; public Supabase values use `NEXT_PUBLIC_*`.
