# Phase 5 Review Checklist

- [ ] `apps/web/lib/calculations/bill-calculator.ts` keeps C# rounding points explicit and does not merge intermediate `RoundToCurrency` calls.
- [ ] `pnpm --filter splity-web test -- lib/calculations` passes with 10 happy fixtures and 4 validation fixtures.
- [ ] `create_bill_with_items` / `update_bill_with_items` reject cross-group participants and responsibilities whose `bill_item_id` is not in the current payload.
- [ ] `0008_bill_integrity_db_defense.sql` creates 4 `SECURITY DEFINER` trigger functions with `search_path = public, pg_temp`.
- [ ] Six bill write policies include `groups.status = 0`; SELECT policies still allow reading historical settled bills.
- [ ] Bills UI hides create/edit/delete affordances outside unresolved groups, and service actions still enforce the same lock.
- [ ] `pnpm --filter splity-web typecheck` passes.
- [ ] `grep -rn "auth.getSession()" apps/web/ --include='*.ts'` returns no matches.
- [ ] `grep -rn "createAdminClient(" apps/web/ --include='*.ts' | grep -v 'lib/supabase/admin.ts'` returns no business-path matches.
