# Phase 7 Review Checklist

- [ ] `list_my_invitations()` is `SECURITY DEFINER`, has `search_path = public, pg_temp`, and returns only `participant_id`, `group_id`, `group_name`, `invited_by_name`, `created_at_utc`.
- [ ] `settlement_share_links_write_creator` is gone; INSERT requires creator + `groups.status = 1`, while UPDATE is creator-only and leaves status checks to the trigger.
- [ ] `trg_settlement_share_integrity` allows non-settling UPDATE only for deactivate-only changes: `is_active` true to false and every other column unchanged.
- [ ] `regenerate_settlement_share()` atomically deactivates old active links and inserts a new active token.
- [ ] `deactivate_settlement_share()` is a separate RPC and works after the group becomes settled.
- [ ] `/share/[token]` does not import `@/lib/supabase/server` and uses `createAnonServerClient()`.
- [ ] Middleware is not changed to redirect `/share/*`.
- [ ] Public share responses expose only the approved payload fields and do not include internal IDs or bill details.
- [ ] Invalid and inactive tokens render the same 404 state.
- [ ] `pnpm --filter splity-web typecheck` and `supabase/tests/phase-7-invite-share.sql` pass.
