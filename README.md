# Splity

Splity is a shared-expense workspace for real bill-splitting workflows.  
It connects `create group -> add participants -> add bills -> settle -> share payment link -> confirm payment` in one flow, and now also supports invitation-based read-only collaboration.

## Project Overview

This repository contains:

- `apps/frontend`: React + TypeScript + Vite frontend
- `apps/backend`: ASP.NET Core 10 Minimal API + EF Core backend
- `packages/api-client`: shared typed API client used by frontend and backend

## Core Features

### Authentication and Access

- Clerk-based authentication (email/password, email verification code, social login)
- Continue as Guest mode for quick local usage
- Settings page for account profile, payment profile, language, and sign-out
- Quick logout icon in the sidebar profile card

### Groups and Collaboration

- Create, rename, delete groups (owner only)
- Group status lifecycle: `unresolved -> settling -> settled`
- Invitation flow via participant `@username`
- New `Invitations` tab to accept/decline pending invitations
- Accepted invitees can view groups in read-only mode (`canEdit: false`)
- Declined invitations do not break the group; participant status is shown as `declined`
- Participant invitation statuses: `none / pending / accepted / declined`
- Participant removal is blocked if that participant is still referenced by bills

### Bills and Settlement

- Bill create/edit/preview in guided modal flows
- Bill items support multiple responsible participants
- Settlement page supports date range filtering and transfer status updates
- In `unresolved`, settlement shows next-step guidance before full settlement flow

### Settlement Share Page (`/s/:shareToken`)

- 3-step flow: identity -> payment view -> completion
- Payer view optimized for fast payment actions:
  - amount summary
  - status card
  - separate payment proof screenshot card
- Receiver view optimized as table:
  - `Name | Amount | Status | Proof | Actions`
  - proof column shows `View` button when available, otherwise `-`
  - action supports `Mark as received`
- Receipt details are collapsible (default collapsed) with smooth expand/collapse

### Image Export

- Settlement summary and receipt image export support
- Export filename format: `{uuid}-summary.png`
- Participant headers include right-side net amount:
  - receive amount in cyan
  - pay amount in red
- For payers, a payment-status pill (`Paid` / `Unpaid`) is shown near amount
- Receiver payment details are appended once at the end of the image
- If payment details are missing, fallback text is:
  - `Not provided. Ask receiver.`

### UI and Responsive Design

- Unified light theme across pages
- Responsive behavior optimized for desktop, tablet, and mobile
- Key pages tuned for responsive clarity:
  - app shell / navigation
  - dashboard activity
  - groups list / group detail
  - invitations
  - settlement share page

## Main Pages

1. Home

- Public landing page for unauthenticated users
- Product overview and workflow explanation

2. Auth

- Login / register with Clerk
- Optional social login
- Forgot password via Clerk email code flow

3. Dashboard

- Range-based financial overview (`month` / `year`)
- Group, bills, and activity insights

4. Groups

- Group list with status and action controls
- Group detail, overview, participants, bills, settlements
- Read-only badges and guardrails for invited non-owner members

5. Invitations

- View pending invitations
- Accept or decline invitation directly

6. Settlement Share

- Owner generates and shares settlement link
- Payer and receiver complete payment confirmation flow

7. Settings

- Account profile updates
- Payment receiving details (for share page prefill)
- Language and sign-out

## Group Status Rules

- `unresolved`
  - editable (owner)
  - participants and bills can be managed
- `settling`
  - read-only for data edits
  - settlement transfer actions available
- `settled`
  - read-only
  - share page remains viewable, no new payment actions

## Language Support

- Supported languages: `en`, `zh`
- Language choice persists across refresh
- Main app pages use the same i18n setup

## Environment Variables

### Frontend (`apps/frontend/.env`)

Main frontend variables:

- `VITE_CLERK_PUBLISHABLE_KEY` (required for Clerk auth)
- `VITE_API_BASE_URL` (optional)
- `VITE_DEV_API_PROXY_TARGET`
- `VITE_DEV_ALLOWED_HOSTS` (optional)

Example:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_DEV_API_PROXY_TARGET=http://localhost:5204
# VITE_API_BASE_URL=https://api.example.com
# VITE_DEV_ALLOWED_HOSTS=.trycloudflare.com
```

### Backend (`apps/backend/src/Splity.Api/appsettings*.json` or env vars)

Common backend settings:

Database:

- `ConnectionStrings__DefaultConnection`
- `Database__Provider`

Clerk:

- `Clerk__Authority`
- `Clerk__SecretKey`
- `Clerk__ApiUrl`
- `Clerk__JwksUrl` (optional; defaults to `<Authority>/.well-known/jwks.json`)
- `Clerk__AuthorizedParties__0`
- `Clerk__AuthorizedParties__1`

Frontend CORS:

- `Frontend__AllowedOrigins__0`
- `Frontend__AllowedOrigins__1`

## Local Development

### Requirements

- Node.js + npm
- .NET SDK 10
- MySQL

### Install frontend dependencies

```powershell
npm run install:frontend
```

### Start frontend

```powershell
npm run dev:frontend
```

Default URL:

- `http://localhost:5173`

### Start backend

```powershell
npm run dev:backend
```

Default URLs:

- API: `http://localhost:5204`
- Health: `http://localhost:5204/health`

### Start frontend + backend together

```powershell
npm run dev
```

## Cloudflare Tunnel (Local Sharing)

Current setup uses a single frontend tunnel:

- browser calls same-origin `/api`
- Vite proxies `/api` and `/health` to backend
- only frontend `5173` needs to be exposed

### 1. Install cloudflared

```powershell
winget install --id Cloudflare.cloudflared
cloudflared --version
```

### 2. Start Splity

```powershell
npm run dev
```

Check:

- `http://localhost:5173`
- `http://localhost:5173/health`

### 3. Start tunnel

```powershell
cloudflared tunnel --url http://localhost:5173
```

### 4. Common issues

- frontend not running on `5173`
- backend not running (UI loads, API fails)
- Vite host not allowed (`Blocked request. This host is not allowed.`)
- stale `VITE_API_BASE_URL=http://localhost:5204` in `.env`
- Clerk/backend authorized parties or allowed origins not including your public origin

## Build Commands

```powershell
# frontend build
npm run build:frontend

# backend build
npm run build:backend

# full build
npm run build
```
