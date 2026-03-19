# Splity MySQL Database Flow

This schema supports local authentication, group ownership, split-bill records, and settlement confirmation.

```mermaid
erDiagram
    app_users ||--o{ groups : creates
    groups ||--o{ participants : contains
    groups ||--o{ bills : contains
    bills ||--o{ bill_items : contains
    bill_items ||--o{ bill_item_responsibilities : assigns
    participants ||--o{ bill_item_responsibilities : responsible_for
    bills ||--o{ bill_fees : contains
    bills ||--o{ bill_shares : computes
    participants ||--o{ bill_shares : receives_share
    bills ||--o{ payment_contributions : records
    participants ||--o{ payment_contributions : contributes
    groups ||--o{ settlement_transfer_confirmations : tracks

    app_users {
      char_36 id PK
      varchar name
      varchar email UK
      varchar password_hash
      varchar password_salt
      datetime created_at_utc
    }

    groups {
      char_36 id PK
      varchar name
      char_36 created_by_user_id FK
      datetime created_at_utc
    }

    participants {
      char_36 id PK
      char_36 group_id FK
      varchar name
      datetime created_at_utc
    }

    bills {
      char_36 id PK
      char_36 group_id FK
      varchar store_name
      datetime transaction_date_utc
      varchar currency_code
      int split_mode
      char_36 primary_payer_participant_id
      datetime created_at_utc
      datetime updated_at_utc
    }

    bill_items {
      char_36 id PK
      char_36 bill_id FK
      varchar description
      decimal amount
    }

    bill_item_responsibilities {
      char_36 id PK
      char_36 bill_item_id FK
      char_36 participant_id FK
    }

    bill_fees {
      char_36 id PK
      char_36 bill_id FK
      varchar name
      int fee_type
      decimal value
    }

    bill_shares {
      char_36 id PK
      char_36 bill_id FK
      char_36 participant_id FK
      decimal weight
      decimal pre_fee_amount
      decimal fee_amount
      decimal total_share_amount
    }

    payment_contributions {
      char_36 id PK
      char_36 bill_id FK
      char_36 participant_id FK
      decimal amount
      datetime created_at_utc
    }

    settlement_transfer_confirmations {
      char_36 id PK
      char_36 group_id FK
      varchar transfer_key UK
      char_36 from_participant_id
      char_36 to_participant_id
      decimal amount
      datetime from_date_utc
      datetime to_date_utc
      int status
      datetime marked_paid_at_utc
      datetime marked_received_at_utc
      datetime updated_at_utc
    }
```

## Runtime flow

1. `app_users` stores local development accounts and JWT identity source.
2. `groups` optionally points to the authenticated creator.
3. `participants` belong to exactly one group.
4. `bills` belong to a group and track the primary payer plus split mode.
5. `bill_items` capture line items; `bill_item_responsibilities` stores one-or-many responsible participants per item.
6. `bill_fees`, `bill_shares`, and `payment_contributions` store computed split results and payer coverage.
7. `settlement_transfer_confirmations` records the paid/received status for transfer-plan items.
