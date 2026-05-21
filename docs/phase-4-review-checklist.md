# Phase 4 Review Checklist

- [ ] `search_user_by_username` returns only `id`, `name`, and `username`.
- [ ] `search_user_by_username` rejects anon callers with `42501`.
- [ ] No web code reads `app_users.email` or payment profile fields for username lookup.
- [ ] `listAccessibleGroups` relies on RLS, not service-role access.
- [ ] `getGroup` returns `null` for missing or RLS-denied groups and page uses `notFound()`.
- [ ] Group mutations are creator-only through existing RLS policies.
- [ ] Participant create/update/delete reject groups whose status is not `unresolved`.
- [ ] Participant creation maps creator username to `accepted`, other registered users to `pending`, and unknown usernames to `none`.
- [ ] Participant update preserves invitation status when the invitee is unchanged.
- [ ] Participant delete maps FK `23503` to a user-facing error.
- [ ] Server Actions revalidate `/dashboard` and/or `/groups/{id}` after mutations.
- [ ] `pnpm --filter splity-web typecheck` passes.
- [ ] `supabase/tests/phase-4-rls.sql` passes with two real Phase 3 users.
