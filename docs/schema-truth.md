# Schema Truth (Source-of-Truth for 0001_schema.sql)

> Scope: 11 tables from `SplityDbContext.OnModelCreating` plus runtime backfills in `DatabaseInitializer`. This file is the Phase 2 input for `supabase/migrations/0001_schema.sql`.
> Current source of truth is EF Core + entity classes, not `database/init.mysql.sql`.

## Common Mappings

| C# / EF Core | Current MySQL shape | Postgres target | Notes |
|---|---|---|---|
| `Guid` | `CHAR(36)` / provider default | `UUID` | New rows should use `gen_random_uuid()` unless the id mirrors `auth.users.id`. |
| `DateTime` UTC | `DATETIME(6)` | `TIMESTAMPTZ` | Keep UTC semantics. |
| `HasMaxLength(N)` | `VARCHAR(N)` | `VARCHAR(N)` | Keep existing limits. |
| `HasPrecision(18, 2)` | `DECIMAL(18,2)` | `NUMERIC(18,2)` | Money values. |
| `HasPrecision(18, 4)` | `DECIMAL(18,4)` | `NUMERIC(18,4)` | Weight values only. |
| `HasColumnType("longtext")` | `LONGTEXT` | `TEXT` | Data URLs / JSON blobs; storage migration is out of Phase 2 scope. |
| enum stored as int | `INT` | `SMALLINT + CHECK` | See enum section. |
| `bool` with default | `BIT` / provider default | `BOOLEAN` | `settlement_share_links.is_active` defaults true. |

## T1. `app_users`

Sources: `SplityDbContext.cs:50-76`, `AppUser.cs`, `DatabaseInitializer.cs` user-column backfills.

Migration note: in the Supabase target, `app_users.id` mirrors `auth.users.id`. Password, Clerk, and local email-verification columns are deleted per PRD §3.4.

| Column | Type | NULL | Default | Index / FK | Source | Migration action |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | `auth.users.id` | PK; target FK `auth.users(id) ON DELETE CASCADE` | `DbContext:54` | Keep, but id source changes. |
| `clerk_user_id` | `VARCHAR(100)` | YES | - | UNIQUE | `DbContext:55,73` | Delete. |
| `name` | `VARCHAR(150)` | NO | - | - | `DbContext:56` | Keep. |
| `username` | `VARCHAR(50)` | YES | - | UNIQUE | `DbContext:57,75` | Keep. |
| `email` | `VARCHAR(200)` | NO | - | UNIQUE | `DbContext:58,74` | Keep; sync from `auth.users.email`. |
| `password_hash` | `VARCHAR(200)` | NO | - | - | `DbContext:59` | Delete; Supabase Auth owns credentials. |
| `password_salt` | `VARCHAR(200)` | NO | - | - | `DbContext:60` | Delete. |
| `default_payment_payee_name` | `VARCHAR(150)` | YES | - | - | `DbContext:61` | Keep. |
| `default_payment_method` | `VARCHAR(120)` | YES | - | - | `DbContext:62` | Keep. |
| `default_payment_account_name` | `VARCHAR(150)` | YES | - | - | `DbContext:63` | Keep. |
| `default_payment_account_number` | `VARCHAR(120)` | YES | - | - | `DbContext:64` | Keep. |
| `default_payment_notes` | `VARCHAR(2000)` | YES | - | - | `DbContext:65` | Keep. |
| `default_payment_qr_data_url` | `TEXT` | YES | - | - | `DbContext:66` | Keep. |
| `email_verified_at_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:67` | Delete; use `auth.users.email_confirmed_at`. |
| `pending_email_verification_code_hash` | `VARCHAR(128)` | YES | - | - | `DbContext:68` | Delete. |
| `pending_email_verification_expires_at_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:71` | Delete. |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:72` | Keep; target default `now()` is acceptable. |

## T2. `groups`

Sources: `SplityDbContext.cs:30-48`, `Group.cs`, `DatabaseInitializer.cs` status backfill.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:34` | |
| `name` | `VARCHAR(200)` | NO | - | - | `DbContext:35` | |
| `created_by_user_id` | `UUID` | YES | - | FK `app_users(id) ON DELETE SET NULL` | `DbContext:36,44-47` | Creator owns edit rights. |
| `status` | `SMALLINT` | NO | `0` | CHECK `0,1,2` | `DbContext:37` | `GroupStatus`. |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:42` | |

## T3. `participants`

Sources: `SplityDbContext.cs:78-104`, `Participant.cs`, `DatabaseInitializer.cs` participant backfills.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:82` | |
| `group_id` | `UUID` | NO | - | FK `groups(id) ON DELETE CASCADE`; UNIQUE with `name` | `DbContext:83,93,95-98` | |
| `name` | `VARCHAR(150)` | NO | - | UNIQUE with `group_id` | `DbContext:84,93` | Display name inside group. |
| `username` | `VARCHAR(50)` | YES | - | - | `DbContext:85` | Used to invite registered users. |
| `invited_user_id` | `UUID` | YES | - | FK `app_users(id) ON DELETE SET NULL` | `DbContext:86,100-103` | |
| `invitation_status` | `SMALLINT` | NO | `0` | CHECK `0,1,2,3` | `DbContext:87` | `ParticipantInvitationStatus`. |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:92` | |

## T4. `bills`

Sources: `SplityDbContext.cs:106-127`, `Bill.cs`, `DatabaseInitializer.cs` bill image backfill.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:110` | |
| `group_id` | `UUID` | NO | - | FK `groups(id) ON DELETE CASCADE`; index with `transaction_date_utc` and `store_name` | `DbContext:111,120-124` | |
| `store_name` | `VARCHAR(200)` | NO | - | index with `group_id` | `DbContext:112,121` | |
| `reference_image_data_url` | `TEXT` | YES | - | - | `DbContext:113` | Receipt/reference image. |
| `transaction_date_utc` | `TIMESTAMPTZ` | NO | - | index with `group_id` | `DbContext:114,120` | |
| `currency_code` | `VARCHAR(3)` | NO | `MYR` in entity | - | `DbContext:115` | Current app uses MYR. |
| `split_mode` | `SMALLINT` | NO | - | CHECK `1,2` | `DbContext:116` | `SplitMode`. |
| `primary_payer_participant_id` | `UUID` | NO | - | logical FK to `participants(id)` | `DbContext:117` | EF does not configure explicit FK. |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:118` | |
| `updated_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:119` | |

## T5. `bill_items`

Sources: `SplityDbContext.cs:129-143`, `BillItem.cs`.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:133` | |
| `bill_id` | `UUID` | NO | - | FK `bills(id) ON DELETE CASCADE`; index | `DbContext:134,137,139-142` | |
| `description` | `VARCHAR(200)` | NO | - | - | `DbContext:135` | |
| `amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:136` | |

## T6. `bill_item_responsibilities`

Sources: `SplityDbContext.cs:145-163`, `BillItemResponsibility.cs`.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:149` | |
| `bill_item_id` | `UUID` | NO | - | FK `bill_items(id) ON DELETE CASCADE`; UNIQUE with `participant_id` | `DbContext:150,152,154-157` | |
| `participant_id` | `UUID` | NO | - | FK `participants(id) ON DELETE RESTRICT`; UNIQUE with `bill_item_id` | `DbContext:151,152,159-162` | |

## T7. `bill_fees`

Sources: `SplityDbContext.cs:165-179`, `BillFee.cs`.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:169` | |
| `bill_id` | `UUID` | NO | - | FK `bills(id) ON DELETE CASCADE` | `DbContext:170,175-178` | |
| `name` | `VARCHAR(120)` | NO | - | - | `DbContext:171` | |
| `fee_type` | `SMALLINT` | NO | - | CHECK `1,2` | `DbContext:172` | `FeeType`. |
| `value` | `NUMERIC(18,2)` | NO | - | - | `DbContext:173` | Percentage or fixed amount depending on `fee_type`. |

## T8. `bill_shares`

Sources: `SplityDbContext.cs:181-203`, `BillShare.cs`.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:185` | |
| `bill_id` | `UUID` | NO | - | FK `bills(id) ON DELETE CASCADE`; UNIQUE with `participant_id` | `DbContext:186,192,194-197` | |
| `participant_id` | `UUID` | NO | - | FK `participants(id) ON DELETE RESTRICT`; UNIQUE with `bill_id` | `DbContext:187,192,199-202` | |
| `weight` | `NUMERIC(18,4)` | NO | - | - | `DbContext:188` | |
| `pre_fee_amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:189` | |
| `fee_amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:190` | |
| `total_share_amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:191` | |

## T9. `payment_contributions`

Sources: `SplityDbContext.cs:205-225`, `PaymentContribution.cs`.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:209` | |
| `bill_id` | `UUID` | NO | - | FK `bills(id) ON DELETE CASCADE`; index with `participant_id` | `DbContext:210,214,216-219` | |
| `participant_id` | `UUID` | NO | - | FK `participants(id) ON DELETE RESTRICT`; index with `bill_id` | `DbContext:211,214,221-224` | |
| `amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:212` | |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:213` | |

## T10. `settlement_transfer_confirmations`

Sources: `SplityDbContext.cs:227-252`, `SettlementTransferConfirmation.cs`, `DatabaseInitializer.cs` proof-image backfill.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:231` | |
| `group_id` | `UUID` | NO | - | UNIQUE with `transfer_key`; index with `from_participant_id`,`to_participant_id` | `DbContext:232,250-251` | EF does not configure explicit FK. Target should FK `groups(id) ON DELETE CASCADE`. |
| `transfer_key` | `VARCHAR(250)` | NO | - | UNIQUE with `group_id` | `DbContext:233,250` | Snapshot transfer identity. |
| `from_participant_id` | `UUID` | NO | - | index with `group_id`,`to_participant_id` | `DbContext:234,251` | Target should FK `participants(id)`. |
| `to_participant_id` | `UUID` | NO | - | index with `group_id`,`from_participant_id` | `DbContext:235,251` | Target should FK `participants(id)`. |
| `amount` | `NUMERIC(18,2)` | NO | - | - | `DbContext:236` | |
| `from_date_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:237` | Filter window. |
| `to_date_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:238` | Filter window. |
| `status` | `SMALLINT` | NO | `0` | CHECK `0,1,2` | `DbContext:239` | `SettlementTransferStatus`. |
| `proof_screenshot_data_url` | `TEXT` | YES | - | - | `DbContext:244` | Transfer proof screenshot. |
| `marked_paid_at_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:247` | |
| `marked_received_at_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:248` | |
| `updated_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:249` | |

## T11. `settlement_share_links`

Sources: `SplityDbContext.cs:254-280`, `SettlementShareLink.cs`, `DatabaseInitializer.cs` table / column backfills.

| Column | Type | NULL | Default | Index / FK | Source | Notes |
|---|---|---:|---|---|---|---|
| `id` | `UUID` | NO | app-set | PK | `DbContext:258` | |
| `group_id` | `UUID` | NO | - | FK `groups(id) ON DELETE CASCADE`; index | `DbContext:259,274,276-279` | |
| `share_token` | `VARCHAR(80)` | NO | - | UNIQUE | `DbContext:260,273` | Public lookup token. |
| `from_date_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:261` | |
| `to_date_utc` | `TIMESTAMPTZ` | YES | - | - | `DbContext:262` | |
| `creator_name` | `VARCHAR(150)` | YES | - | - | `DbContext:263` | |
| `payee_name` | `VARCHAR(150)` | YES | - | - | `DbContext:264` | Current top-level payee field; public RPC must whitelist/mask as needed. |
| `payment_method` | `VARCHAR(120)` | YES | - | - | `DbContext:265` | |
| `account_name` | `VARCHAR(150)` | YES | - | - | `DbContext:266` | |
| `account_number` | `VARCHAR(120)` | YES | - | - | `DbContext:267` | |
| `notes` | `VARCHAR(2000)` | YES | - | - | `DbContext:268` | |
| `payment_qr_data_url` | `TEXT` | YES | - | - | `DbContext:269` | |
| `receiver_payment_infos_json` | `TEXT` | YES | - | - | `DbContext:270` | Per receiver payment data JSON. |
| `is_active` | `BOOLEAN` | NO | `true` | - | `DbContext:271` | Inactive tokens return 404/null. |
| `created_at_utc` | `TIMESTAMPTZ` | NO | app-set | - | `DbContext:272` | |

## Enum Mappings

| Enum | Name | Value | Source |
|---|---|---:|---|
| `FeeType` | `Percentage` | 1 | `FeeType.cs` |
| `FeeType` | `Fixed` | 2 | `FeeType.cs` |
| `GroupStatus` | `Unresolved` | 0 | `GroupStatus.cs` |
| `GroupStatus` | `Settling` | 1 | `GroupStatus.cs` |
| `GroupStatus` | `Settled` | 2 | `GroupStatus.cs` |
| `ParticipantInvitationStatus` | `None` | 0 | `ParticipantInvitationStatus.cs` |
| `ParticipantInvitationStatus` | `Pending` | 1 | `ParticipantInvitationStatus.cs` |
| `ParticipantInvitationStatus` | `Accepted` | 2 | `ParticipantInvitationStatus.cs` |
| `ParticipantInvitationStatus` | `Declined` | 3 | `ParticipantInvitationStatus.cs` |
| `SettlementTransferStatus` | `Pending` | 0 | `SettlementTransferStatus.cs` |
| `SettlementTransferStatus` | `MarkedPaid` | 1 | `SettlementTransferStatus.cs` |
| `SettlementTransferStatus` | `Received` | 2 | `SettlementTransferStatus.cs` |
| `SplitMode` | `Equal` | 1 | `SplitMode.cs` |
| `SplitMode` | `Weighted` | 2 | `SplitMode.cs` |

## Phase 2 DDL Checklist

- Create exactly 11 public tables above.
- Enable RLS on every public table.
- Keep anon table access closed, including `settlement_share_links`.
- Add unique constraints: `app_users.email`, `app_users.username`, `participants(group_id,name)`, `bill_item_responsibilities(bill_item_id,participant_id)`, `bill_shares(bill_id,participant_id)`, `settlement_transfer_confirmations(group_id,transfer_key)`, `settlement_share_links.share_token`.
- Do not carry `password_hash`, `password_salt`, `clerk_user_id`, or local email-verification pending columns into Supabase.
