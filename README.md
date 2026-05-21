# Splity

Splity is a shared-expense workspace for real bill-splitting workflows. It connects:

`create group -> add participants -> add bills -> settle -> share payment link -> confirm payment`

The current app is a Next.js + Supabase implementation. The legacy frontend, backend, and database bootstrap have been removed.

## Project Overview

- `apps/web`: Next.js App Router app with Server Actions and Tailwind CSS
- `supabase/migrations`: Supabase Postgres schema, RLS policies, triggers, and RPCs
- `supabase/tests`: SQL fixtures for RLS and migration behavior
- `packages/api-client`: shared DTO type definitions only

## Core Features

- Supabase Auth email/password sign-up, sign-in, reset password, and email verification
- Account settings for display name, username, password, email verification, and default payment profile
- Group creation and status lifecycle: `unresolved -> settling -> settled`
- Participant management, including registered-user invitations by username
- Bill creation/editing with deterministic split calculations
- Settlement transfer status tracking
- Public settlement share links with payment details and QR data URL support
- Invitation inbox for accepting or declining pending invitations

## Local Development

### Requirements

- Node.js
- pnpm
- Supabase project or local Supabase stack configured for the migrations

### Environment

Copy the web env example and fill in Supabase values:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Expected public variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Install

```powershell
pnpm install
```

### Run

```powershell
pnpm dev
```

Default URL:

- `http://localhost:3000`

### Build And Check

```powershell
pnpm typecheck
pnpm build
```

## Data And Security

- All app data lives in Supabase Postgres.
- RLS is enabled on public tables.
- User-facing writes go through Server Actions and Supabase clients with the current user session.
- Username lookup uses a whitelisted RPC that returns only `id`, `name`, and `username`.
- The app must not call the removed legacy HTTP API.

## Package Notes

`packages/api-client` is intentionally types-only. Runtime data access belongs in `apps/web/lib/services/*` and Server Actions.
