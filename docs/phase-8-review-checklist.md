# Phase 8 Review Checklist

- [ ] Settings route exists at `/settings` and covers profile, payment profile, password, and email verification.
- [ ] Profile update normalizes username, rejects invalid usernames, and handles duplicate username errors.
- [ ] Payment profile update writes only the current user's `app_users.default_payment_*` fields under RLS.
- [ ] QR upload accepts PNG/JPEG/WebP up to 5MB client-side and `next.config.ts` has `serverActions.bodySizeLimit: "8mb"`.
- [ ] Password change validates current password through Supabase Auth before `updateUser({ password })`.
- [ ] Verification resend passes current user email and `emailRedirectTo`.
- [ ] `packages/api-client` exports types only; no fetch client, `http.ts`, `errors.ts`, or `config.ts`.
- [ ] `apps/web` depends on `@splity/api-client` with `workspace:*` and uses only `import type`.
- [ ] Legacy `apps/frontend`, `apps/backend`, `database`, .NET solution files, and legacy scripts are gone.
- [ ] README and architecture docs describe Next.js + Supabase, not Clerk/.NET/MySQL.
- [ ] `pnpm install`, `pnpm typecheck`, and `pnpm build` pass.
- [ ] Security grep checks for `auth.getSession()`, `createAdminClient(`, Clerk, `@clerk`, `/api/auth/sync`, and legacy fetch paths pass.
