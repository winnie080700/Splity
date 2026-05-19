# API Inventory (Source-of-Truth for Migration)

> Scope: 35 .NET Minimal API endpoints. This file is the Phase 4-7 checklist for recreating behavior in Next.js / Supabase.
> Sources: `apps/backend/src/Splity.Api/Endpoints/*.cs`, `Contracts/*.cs`, `Application/Services/*.cs`.

## A. Auth (11)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| A1 | `POST /api/auth/register` | anon | `RegisterRequest { name, username, email, password }` | `AuthResultDto { accessToken, user }` | Inserts `app_users`; hashes password; issues local JWT. | `AuthEndpoints.cs:16` -> `AuthService.RegisterAsync` | Supabase Auth `signUp` with metadata `{ name, username }` + `handle_new_user` trigger. Session/cookie replaces local `accessToken`. |
| A2 | `POST /api/auth/login` | anon | `LoginRequest { email, password }` | `AuthResultDto` | Validates password; issues local JWT. | `AuthEndpoints.cs:24` -> `AuthService.LoginAsync` | Supabase Auth `signInWithPassword`. |
| A3 | `POST /api/auth/forgot-password` | anon | `ForgotPasswordRequest { email }` | empty `204` | Generates temporary password, updates `app_users.password_*`, sends reset email. | `AuthEndpoints.cs:32` -> `AuthService.ForgotPasswordAsync` | Supabase Auth `resetPasswordForEmail`; no app table password writes. |
| A4 | `GET /api/auth/me` | authenticated | bearer user id | `AuthUserDto` | Reads `app_users`. | `AuthEndpoints.cs:43` -> `AuthService.GetCurrentUserAsync` | Server helper `getUser()` + `app_users` profile read under RLS. |
| A5 | `GET /api/auth/users/search?username=` | authenticated | query `username` | `UserLookupDto? { id, name, username }` | Reads `app_users` by username. | `AuthEndpoints.cs:52` -> `AuthService.FindUserByUsernameAsync` | Route handler or RPC for invite lookup; return only id/name/username. |
| A6 | `POST /api/auth/sync` | authenticated | `SyncCurrentUserRequest { email, username?, name?, isEmailVerified }` | `AuthUserDto` | Creates/updates `app_users` from external identity claims. | `AuthEndpoints.cs:60` -> `AppUserIdentityService` / `AuthService` | Retire after Clerk removal; replaced by Supabase trigger and profile update route. |
| A7 | `PUT /api/auth/profile` | authenticated | `UpdateProfileRequest { name }` | `AuthUserDto` | Updates `app_users.name`. | `AuthEndpoints.cs:76` -> `AuthService.UpdateProfileAsync` | `PATCH /api/profile` or server action updating `app_users`. |
| A8 | `PUT /api/auth/payment-profile` | authenticated | `UpdatePaymentProfileRequest { payeeName?, paymentMethod?, accountName?, accountNumber?, notes?, paymentQrDataUrl? }` | `AuthUserDto` | Updates six `app_users.default_payment_*` columns. | `AuthEndpoints.cs:85` -> `AuthService.UpdatePaymentProfileAsync` | `PATCH /api/payment-profile` under user RLS. |
| A9 | `POST /api/auth/change-password` | authenticated | `ChangePasswordRequest { currentPassword, newPassword, confirmNewPassword }` | empty `204` | Validates current password, updates `app_users.password_*`. | `AuthEndpoints.cs:103` -> `AuthService.ChangePasswordAsync` | Supabase Auth `updateUser({ password })`; no app table password columns. |
| A10 | `POST /api/auth/email-verification/send` | authenticated | none | `AuthUserDto` | Writes pending verification hash/expires columns; sends email code. | `AuthEndpoints.cs:119` -> `AuthService.SendEmailVerificationAsync` | Supabase Auth email verification / resend flow; local pending columns deleted. |
| A11 | `POST /api/auth/email-verification/verify` | authenticated | `VerifyEmailRequest { code }` | `AuthUserDto` | Validates pending code, sets `email_verified_at_utc`, clears pending fields. | `AuthEndpoints.cs:128` -> `AuthService.VerifyEmailAsync` | Supabase Auth callback / `exchangeCodeForSession`; use `auth.users.email_confirmed_at`. |

## B. Groups (6)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| B1 | `GET /api/groups` | authenticated | bearer user id | `GroupSummaryDto[]` | Reads groups created by user plus accepted invited groups; computes `canEdit`. | `GroupEndpoints.cs:16` -> `GroupsService.ListAccessibleAsync` | RLS-backed group list; include creator-owned and accepted memberships. |
| B2 | `POST /api/groups` | authenticated | `CreateGroupRequest { name }` | `GroupDto` | Inserts `groups` with `created_by_user_id`, `status=Unresolved`. | `GroupEndpoints.cs:25` -> `GroupsService.CreateAsync` | Route handler insert under RLS creator policy. |
| B3 | `GET /api/groups/{groupId}` | authenticated + can-view | route `groupId` | `GroupDto` | Reads one group; visible to creator or accepted invitee. | `GroupEndpoints.cs:34` -> `GroupsService.GetAsync` | RLS read policy via `is_group_member(group_id)`. |
| B4 | `PUT /api/groups/{groupId}` | creator-only | `UpdateGroupRequest { name }` | `GroupDto` | Updates `groups.name`. | `GroupEndpoints.cs:50` -> `GroupsService.UpdateAsync` | Creator-only update under RLS. |
| B5 | `PUT /api/groups/{groupId}/status` | creator-only | `UpdateGroupStatusRequest { status }` where `unresolved|settling|settled` | `GroupDto` | Updates `groups.status`. | `GroupEndpoints.cs:67` -> `GroupsService.UpdateStatusAsync` | Creator-only update; status drives bill edit and settlement/share eligibility. |
| B6 | `DELETE /api/groups/{groupId}` | creator-only | route `groupId` | empty `204` | Deletes group; cascades bills/items/shares/participants/share links via FK; service also removes settlement confirmations. | `GroupEndpoints.cs:84` -> `GroupsService.DeleteAsync` | Creator-only delete under RLS / service transaction. |

## C. Bills (5)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| C1 | `POST /api/groups/{groupId}/bills` | creator-only; group must be `Unresolved` | `CreateBillRequest { storeName, referenceImageDataUrl?, transactionDateUtc, splitMode, primaryPayerParticipantId, items, fees, participants, extraContributions }` | `BillDetailDto` | Inserts `bills`, `bill_items`, `bill_item_responsibilities`, `bill_fees`, `bill_shares`, `payment_contributions` after `BillCalculator`. | `BillEndpoints.cs:16` -> `BillsService.CreateAsync` | `create_bill_with_items` transaction/RPC or route handler wrapping RPC; calculator port must match C#. |
| C2 | `GET /api/groups/{groupId}/bills` | authenticated + can-view | optional `fromDateUtc`, `toDateUtc`, `search` | `BillSummaryDto[]` | Reads bills and calculated totals for group. | `BillEndpoints.cs:33` -> `BillsService.ListAsync` | RLS-backed list query with same filters. |
| C3 | `GET /api/groups/{groupId}/bills/{billId}` | authenticated + can-view | route ids | `BillDetailDto` | Reads bill with items, fees, shares, contributions. | `BillEndpoints.cs:52` -> `BillsService.GetAsync` | RLS-backed detail query. |
| C4 | `PUT /api/groups/{groupId}/bills/{billId}` | creator-only; group must be `Unresolved` | `UpdateBillRequest` same shape as create | `BillDetailDto` | Replaces bill details: updates `bills`, deletes/reinserts child rows, recomputes shares/contributions. | `BillEndpoints.cs:69` -> `BillsService.UpdateAsync` | `update_bill_with_items` transaction/RPC. |
| C5 | `DELETE /api/groups/{groupId}/bills/{billId}` | creator-only; group must be `Unresolved` | route ids | empty `204` | Deletes bill and cascaded child rows. | `BillEndpoints.cs:87` -> `BillsService.DeleteAsync` | Creator-only delete under RLS. |

## D. Participants (4)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| D1 | `POST /api/groups/{groupId}/participants` | creator-only; group must be `Unresolved` | `CreateParticipantRequest { name, username? }` | `ParticipantDto` | Inserts `participants`; if username resolves, sets `invited_user_id` and `invitation_status` (`Accepted` for self, else `Pending`). | `ParticipantEndpoints.cs:16` -> `ParticipantsService.CreateAsync` | Creator-only insert; username lookup via A5; invitation status persisted. |
| D2 | `GET /api/groups/{groupId}/participants` | authenticated + can-view | route `groupId` | `ParticipantDto[]` | Reads participants for group. | `ParticipantEndpoints.cs:33` -> `ParticipantsService.ListAsync` | RLS-backed group member list; PRD also defines `get_group_members(p_group_id)` RPC for safe reads. |
| D3 | `PUT /api/groups/{groupId}/participants/{participantId}` | creator-only; group must be `Unresolved` | `UpdateParticipantRequest { name, username? }` | `ParticipantDto` | Updates participant name/username; may change invite target/status. | `ParticipantEndpoints.cs:49` -> `ParticipantsService.UpdateAsync` | Creator-only update. |
| D4 | `DELETE /api/groups/{groupId}/participants/{participantId}` | creator-only; group must be `Unresolved`; participant must not be referenced by bills | route ids | empty `204` | Deletes `participants` row if unreferenced. | `ParticipantEndpoints.cs:67` -> `ParticipantsService.DeleteAsync` | Creator-only delete with reference validation. |

## E. Settlements (3)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| E1 | `GET /api/groups/{groupId}/settlements` | authenticated + can-view | optional `fromDateUtc`, `toDateUtc` | `SettlementResultDto { groupId, fromDateUtc?, toDateUtc?, netBalances, transfers }` | Reads participants, bills, bill shares, payment contributions, confirmations; computes settlement snapshot. | `SettlementEndpoints.cs:16` -> `SettlementsService.GetAsync` | Node route reads via RLS and TS `SettlementCalculator`; no writes. |
| E2 | `POST /api/groups/{groupId}/settlements/mark-paid` | creator-only; group must be `Settling`; actor must equal `fromParticipantId` | `UpdateSettlementTransferStatusRequest { fromParticipantId, toParticipantId, amount, fromDateUtc?, toDateUtc?, actorParticipantId, proofScreenshotDataUrl? }` | `SettlementTransferDto` | Upserts/updates `settlement_transfer_confirmations` to `MarkedPaid`, saves proof and timestamp. | `SettlementEndpoints.cs:34` -> `SettlementsService.MarkPaidAsync` | Node recomputes snapshot, validates transfer, then calls single `record_settlement_action('mark_paid', ...)` DEFINER RPC with user JWT. |
| E3 | `POST /api/groups/{groupId}/settlements/mark-received` | creator-only; group must be `Settling`; actor must equal `toParticipantId`; existing status must be `MarkedPaid` | same as E2 | `SettlementTransferDto` | Updates `settlement_transfer_confirmations.status` to `Received`, sets received timestamp. | `SettlementEndpoints.cs:51` -> `SettlementsService.MarkReceivedAsync` | Same RPC with `p_action='mark_received'`; no `service_role`. |

## F. Settlement Shares (3)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| F1 | `GET /api/groups/{groupId}/settlement-shares` | authenticated + can-view | route `groupId` | `SettlementShareRecordDto?` | Reads active `settlement_share_links` for group and deserializes receiver payment info. | `SettlementShareEndpoints.cs:16` -> `SettlementSharesService.GetActiveAsync` | Authenticated route under RLS; do not expose raw table to anon. |
| F2 | `POST /api/groups/{groupId}/settlement-shares` | creator-only; group must be `Settling` | `CreateSettlementShareRequest { fromDateUtc?, toDateUtc?, creatorName?, receiverPaymentInfos?, regenerate }` | `SettlementShareRecordDto` | Inserts new `settlement_share_links`; if regenerating, deactivates previous active link; stores receiver payment info JSON. | `SettlementShareEndpoints.cs:32` -> `SettlementSharesService.CreateAsync` | Creator-only route; transaction updates `is_active=false` for old tokens and creates a new token. |
| F3 | `GET /api/settlement-shares/{shareToken}` | anon | route `shareToken` | `SettlementSharePublicDto` | Reads active share by token; returns public payment info only. | `SettlementShareEndpoints.cs:49` -> `SettlementSharesService.GetByTokenAsync` | Anonymous route must call `resolve_share_token(token)` DEFINER RPC; no anon `SELECT` policy on `settlement_share_links`. |

## G. Invitations (3)

| ID | Endpoint | Auth | Request | Response | Side effects | C# source | Migration mapping |
|---|---|---|---|---|---|---|---|
| G1 | `GET /api/invitations` | authenticated | bearer user id | `InvitationDto[]` | Reads pending `participants` where `invited_user_id=userId`. | `InvitationEndpoints.cs:14` -> `InvitationsService.ListPendingAsync` | RLS-backed query or safe route handler. |
| G2 | `POST /api/invitations/{participantId}/accept` | authenticated invited user | route `participantId` | empty `204` | Updates `participants.invitation_status` to `Accepted`. | `InvitationEndpoints.cs:27` -> `InvitationsService.AcceptAsync` | `accept_invitation(participant_id)` DEFINER RPC; function checks `auth.uid() = invited_user_id`. |
| G3 | `POST /api/invitations/{participantId}/decline` | authenticated invited user | route `participantId` | empty `204` | Updates `participants.invitation_status` to `Declined`. | `InvitationEndpoints.cs:41` -> `InvitationsService.DeclineAsync` | `decline_invitation(participant_id)` DEFINER RPC; function checks `auth.uid() = invited_user_id`. |

## Index

Method counts: `GET` x 11, `POST` x 15, `PUT` x 6, `DELETE` x 3. Total: 35.

Group counts: Auth 11, Groups 6, Bills 5, Participants 4, Settlements 3, SettlementShares 3, Invitations 3.

Endpoints with anonymous access: A1, A2, A3, F3.

Endpoints with creator-only behavior enforced in service layer or target RLS/RPC: B4, B5, B6, C1, C4, C5, D1, D3, D4, E2, E3, F2.

Write-side table coverage:

| Table | Endpoint IDs |
|---|---|
| `app_users` | A1, A3, A6, A7, A8, A9, A10, A11 |
| `groups` | B2, B4, B5, B6 |
| `participants` | D1, D3, D4, G2, G3 |
| `bills` | C1, C4, C5 |
| `bill_items` | C1, C4, C5 |
| `bill_item_responsibilities` | C1, C4, C5 |
| `bill_fees` | C1, C4, C5 |
| `bill_shares` | C1, C4, C5 |
| `payment_contributions` | C1, C4, C5 |
| `settlement_transfer_confirmations` | B6, E2, E3 |
| `settlement_share_links` | B6, F2 |

Migration decisions to preserve:

- A6 is a Clerk-era compatibility endpoint and should not become a permanent Supabase Auth path.
- E2 and E3 must not use `service_role`; the PRD-approved write path is Node snapshot validation plus `record_settlement_action` under the user's JWT.
- F3 must not read `settlement_share_links` directly as anon. The only public data path is `resolve_share_token`.
