# Phase 6 Review Checklist

- [ ] `SettlementCalculator.cs` behavior is mirrored in `settlement-calculator.ts`, including cents rounding, deterministic ordering, and out-of-range cents rejection.
- [ ] `settlement-snapshot.ts` is pure: no Supabase client, no service-role access, and date filtering matches `BillRepository.ListByGroupAsync`.
- [ ] `record_settlement_action` is the only authenticated write path for `settlement_transfer_confirmations`.
- [ ] `authenticated` has no INSERT/UPDATE/DELETE grants on `settlement_transfer_confirmations`; SELECT history still works for group members.
- [ ] `record_settlement_action` rejects non-creators, non-settling groups, wrong actors, mark-received-before-paid, and mark-paid-after-received.
- [ ] `trg_settlement_transfer_integrity` fires on every INSERT/UPDATE and rejects cross-group participants or non-settling groups.
- [ ] Settlements UI is read-only outside `Settling` and non-creators cannot submit mark actions.
- [ ] Proof screenshot handling accepts only PNG/JPEG/WebP data URLs under 5MB.
- [ ] `pnpm --filter splity-web test` and `pnpm --filter splity-web typecheck` pass.
- [ ] `supabase/tests/phase-6-settlement.sql` passes against a local Supabase database.
