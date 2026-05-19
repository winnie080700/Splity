# User Journeys (Acceptance Source for Phase 8)

> Scope: end-to-end product behavior to preserve during the Supabase + Next.js migration.
> Each journey references API IDs from `docs/api-inventory.md` and table IDs/names from `docs/schema-truth.md`.

## J1. New User Creates First Bill

- Role: new user U1.
- Steps:
  1. Register with name, username, email, password. API: A1.
  2. Complete email verification. API: A10, A11.
  3. Open dashboard and see no groups yet. API: B1.
  4. Create a group. API: B2.
  5. Add two local participants. API: D1 x2.
  6. Create one equal-split bill with items, payer, participants, and no extra contribution. API: C1.
  7. Confirm the bill appears in the group bill list. API: C2.
- Tables: `app_users`, `groups`, `participants`, `bills`, `bill_items`, `bill_item_responsibilities`, `bill_shares`, `payment_contributions`.
- Acceptance checks: username is persisted; group status starts `unresolved`; bill totals match `BillCalculator`; no settlement confirmations are created during bill creation.

## J2. Returning User Opens Dashboard And Group Detail

- Role: existing creator U1.
- Steps:
  1. Sign in with email and password. API: A2.
  2. Fetch current user profile. API: A4.
  3. Load dashboard group cards. API: B1.
  4. Open a group detail page. API: B3.
  5. Rename the group from its edit control. API: B4.
  6. Load participants and bill summaries. APIs: D2, C2.
  7. Open a single bill detail. API: C3.
- Tables: `app_users`, `groups`, `participants`, `bills`, `bill_items`, `bill_fees`, `bill_shares`, `payment_contributions`.
- Acceptance checks: creator sees `canEdit=true`; group member data and bill data are scoped to accessible groups only.

## J3. Invite Registered User And Accept

- Roles: creator U1, invited user U2.
- Steps:
  1. U1 searches U2 by username while adding a participant. API: A5.
  2. U1 creates a participant with U2's username. API: D1.
  3. U2 signs in. API: A2.
  4. U2 opens invitations and sees the pending invite. API: G1.
  5. U2 accepts the invite. API: G2.
  6. U2 opens the group in read-only mode. APIs: B1, B3, D2, C2.
- Tables: `app_users`, `groups`, `participants`, `bills`.
- Acceptance checks: `participants.invited_user_id` equals U2; `invitation_status` moves `Pending -> Accepted`; U2 can view but cannot use creator-only operations.

## J4. Invite Registered User And Decline

- Roles: creator U1, invited user U2.
- Steps:
  1. U1 searches U2 by username. API: A5.
  2. U1 creates a participant invite. API: D1.
  3. U2 lists invitations. API: G1.
  4. U2 declines. API: G3.
  5. U1 updates that participant to a different local display name or clears username. API: D3.
- Tables: `app_users`, `groups`, `participants`.
- Acceptance checks: decline only works for the invited user; `invitation_status` moves `Pending -> Declined`; creator can repair or repurpose the participant while the group is still `unresolved`.

## J5. Edit And Delete Bills Before Settlement

- Role: creator U1.
- Steps:
  1. Open an unresolved group. API: B3.
  2. Create a weighted bill with percentage fee, fixed fee, receipt data URL, and extra contribution. API: C1.
  3. Open bill detail and verify shares. API: C3.
  4. Edit the bill by changing items, fees, weights, primary payer, and reference image. API: C4.
  5. Delete a different draft bill. API: C5.
  6. Reload bill list. API: C2.
- Tables: `groups`, `participants`, `bills`, `bill_items`, `bill_item_responsibilities`, `bill_fees`, `bill_shares`, `payment_contributions`.
- Acceptance checks: edit replaces child rows transactionally; weighted split uses `SplitMode.Weighted = 2`; delete removes child rows through cascade.

## J6. Compute Settlement Snapshot With Date Filters

- Role: creator or accepted viewer.
- Steps:
  1. Open a group with multiple bills. API: B3.
  2. Load all settlements. API: E1.
  3. Apply `fromDateUtc` / `toDateUtc` filters and reload settlements. API: E1.
  4. Compare net balances and transfer list with bill totals. APIs: C2, E1.
- Tables: `groups`, `participants`, `bills`, `bill_shares`, `payment_contributions`, `settlement_transfer_confirmations`.
- Acceptance checks: snapshot is computed, not persisted; existing confirmations merge into current transfers by transfer key; date window changes transfer keys.

## J7. Mark Paid And Mark Received

- Role: creator U1 acting on behalf of transfer participants.
- Steps:
  1. Move group status from `unresolved` to `settling`. API: B5.
  2. Load settlement transfers. API: E1.
  3. Mark one transfer as paid with `actorParticipantId = fromParticipantId` and optional proof screenshot. API: E2.
  4. Reload settlement and see status `MarkedPaid`. API: E1.
  5. Mark the same transfer as received with `actorParticipantId = toParticipantId`. API: E3.
  6. Reload settlement and see status `Received`. API: E1.
- Tables: `groups`, `participants`, `bills`, `bill_shares`, `payment_contributions`, `settlement_transfer_confirmations`.
- Acceptance checks: group must be `settling`; non-creator cannot mark; mark-received requires prior marked-paid; write path is Node snapshot validation plus `record_settlement_action`, not `service_role`.

## J8. Create, View, And Regenerate Public Settlement Share

- Roles: creator U1, anonymous visitor V.
- Steps:
  1. Ensure group is `settling`. API: B5.
  2. Creator checks current active share. API: F1.
  3. Creator creates a public settlement share with receiver payment info. API: F2.
  4. Anonymous visitor opens the token URL. API: F3.
  5. Creator regenerates the share token. API: F2.
  6. Old token returns not found; new token returns public data. API: F3.
- Tables: `groups`, `participants`, `settlement_share_links`, `settlement_transfer_confirmations`, `app_users`.
- Acceptance checks: `settlement_share_links.is_active=false` for old token; anon never gets direct table SELECT; public payload is whitelisted and excludes `username`, `invited_user_id`, bill ids, and bill item details.

## J9. Update Account Settings

- Role: authenticated user U1.
- Steps:
  1. Open settings and fetch current profile. API: A4.
  2. Update display name. API: A7.
  3. Update default payment profile including QR data URL. API: A8.
  4. Change password. API: A9.
  5. Sign in again with the new password. API: A2.
- Tables: `app_users`.
- Acceptance checks: default payment fields update on `app_users`; future settlement-share creation can use the new payment profile; password change does not touch any business table in the Supabase target.

## J10. Forgot Password Recovery

- Role: existing user U1.
- Steps:
  1. Start forgot-password flow from sign-in page. API: A3.
  2. Complete password recovery with the provider flow.
  3. Sign in with the new password. API: A2.
  4. Load dashboard to prove business access remains intact. API: B1.
- Tables: `app_users`, `groups`, `participants`.
- Acceptance checks: old .NET implementation mutates `app_users.password_*`; Supabase target must not carry those columns and should rely on Supabase Auth recovery.

## J11. Delete Participant And Group

- Role: creator U1.
- Steps:
  1. Create a temporary group. API: B2.
  2. Add an unreferenced participant. API: D1.
  3. Delete that participant. API: D4.
  4. Delete the group. API: B6.
  5. Reload dashboard and confirm the group is gone. API: B1.
- Tables: `groups`, `participants`, `bills`, `settlement_transfer_confirmations`, `settlement_share_links`.
- Acceptance checks: referenced participants cannot be deleted; group deletion cascades dependent rows and removes settlement confirmation/share state.

## J12. Legacy External Identity Sync Compatibility

- Role: authenticated user coming from the old Clerk-era frontend while migration is in progress.
- Steps:
  1. Existing authenticated session calls sync with email, username, name, and verification flag. API: A6.
  2. User opens profile. API: A4.
  3. User updates profile normally. API: A7.
- Tables: `app_users`, `groups`.
- Acceptance checks: A6 is documented for parity only; the Supabase target should replace it with `handle_new_user` plus explicit profile update and should not keep Clerk-specific behavior.

## Coverage Matrix

| API group | Covered IDs | Journeys |
|---|---|---|
| Auth | A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11 | J1, J2, J3, J4, J9, J10, J12 |
| Groups | B1, B2, B3, B4, B5, B6 | J1, J2, J3, J5, J7, J8, J10, J11 |
| Bills | C1, C2, C3, C4, C5 | J1, J2, J5, J6 |
| Participants | D1, D2, D3, D4 | J1, J2, J3, J4, J11 |
| Settlements | E1, E2, E3 | J6, J7 |
| Settlement shares | F1, F2, F3 | J8 |
| Invitations | G1, G2, G3 | J3, J4 |

Additional endpoint coverage notes:

- B4 (`PUT /api/groups/{groupId}`) is a simple creator-only rename flow covered by group settings/edit UI inside J2/J5 implementation scope; Phase 8 should include it even if not a standalone journey.
- B5 appears in both settlement and share journeys because settlement actions and public shares require `settling`.
- A6 is intentionally isolated as a compatibility journey; it should disappear from the long-term Supabase surface.

## Table Coverage

| Table | Covered by journeys |
|---|---|
| `app_users` | J1, J2, J3, J4, J8, J9, J10, J12 |
| `groups` | J1, J2, J3, J4, J5, J6, J7, J8, J10, J11, J12 |
| `participants` | J1, J2, J3, J4, J5, J6, J7, J8, J10, J11 |
| `bills` | J1, J2, J5, J6, J7, J11 |
| `bill_items` | J1, J2, J5 |
| `bill_item_responsibilities` | J1, J5 |
| `bill_fees` | J2, J5 |
| `bill_shares` | J1, J2, J5, J6, J7 |
| `payment_contributions` | J1, J2, J5, J6, J7 |
| `settlement_transfer_confirmations` | J6, J7, J8, J11 |
| `settlement_share_links` | J8, J11 |

## Phase 8 Acceptance Checklist

- Run all 12 journeys locally before removing old `apps/frontend`.
- Production Phase 9 must run at least J1, J3, J7, and J8 because they cover auth, invitation, settlement state, and anonymous sharing.
- Any new route or page must reference at least one API ID from `api-inventory.md` and one table from `schema-truth.md`.
