# Phase 2 Review Checklist

## Schema

- [ ] `0001_schema.sql` creates exactly 11 public app tables.
- [ ] `app_users.id` references `auth.users(id) ON DELETE CASCADE`.
- [ ] Removed legacy auth columns are absent: `password_hash`, `password_salt`, `clerk_user_id`, `email_verified_at_utc`, `pending_email_verification_*`.
- [ ] Money columns use `NUMERIC(18,2)` and `bill_shares.weight` uses `NUMERIC(18,4)`.
- [ ] Required unique constraints exist: `app_users.email`, `app_users.username`, `participants(group_id,name)`, `bill_item_responsibilities(bill_item_id,participant_id)`, `bill_shares(bill_id,participant_id)`, `settlement_transfer_confirmations(group_id,transfer_key)`, `settlement_share_links.share_token`.

## RLS

- [ ] Every public app table has RLS enabled.
- [ ] Policies that call `is_group_member` are `TO authenticated`, never omitted / `TO public`.
- [ ] `settlement_share_links` has no anon policy.
- [ ] UPDATE paths have SELECT policies so updates do not silently affect 0 rows.
- [ ] Account A can read its own group; Account B cannot until accepted as an invited participant.

## RPC / Functions

- [ ] `is_group_member(uuid)` is both `SECURITY DEFINER` and `STABLE`.
- [ ] `record_settlement_action` has the full 10-argument SQL signature: `p_action` plus 9 transfer payload fields.
- [ ] `record_settlement_action` includes `p_transfer_key text`, requires it to be non-empty, and does not recompute it in SQL.
- [ ] `create_bill_with_items` and `update_bill_with_items` are `SECURITY INVOKER`, not DEFINER.
- [ ] Every DEFINER function has `SET search_path = public, pg_temp`.
- [ ] Every DEFINER function has precise `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE` statements.
- [ ] `resolve_share_token` returns only whitelisted public fields and never returns internal ids, usernames, invited user ids, bill ids, or bill details.

## Automated Acceptance

- [ ] `supabase/tests/phase-2-rls.sql` passes locally or against the linked dev project.
- [ ] The DEFINER audit block in `phase-2-rls.sql` remains in CI through Phase 9.
- [ ] Supabase Studio shows 11 tables, Auth trigger, and expected RPC/helper functions.
