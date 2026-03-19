CREATE DATABASE IF NOT EXISTS splity_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE splity_dev;

CREATE TABLE IF NOT EXISTS app_users (
  id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  password_salt VARCHAR(200) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_app_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `groups` (
  id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_by_user_id CHAR(36) NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_groups_created_by_user_id (created_by_user_id),
  CONSTRAINT fk_groups_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS participants (
  id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_participants_group_name (group_id, name),
  CONSTRAINT fk_participants_group
    FOREIGN KEY (group_id) REFERENCES `groups`(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bills (
  id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  store_name VARCHAR(200) NOT NULL,
  transaction_date_utc DATETIME(6) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  split_mode INT NOT NULL,
  primary_payer_participant_id CHAR(36) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  updated_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_bills_group_date (group_id, transaction_date_utc),
  KEY ix_bills_group_store (group_id, store_name),
  CONSTRAINT fk_bills_group
    FOREIGN KEY (group_id) REFERENCES `groups`(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_items (
  id CHAR(36) NOT NULL,
  bill_id CHAR(36) NOT NULL,
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_bill_items_bill_id (bill_id),
  CONSTRAINT fk_bill_items_bill
    FOREIGN KEY (bill_id) REFERENCES bills(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_item_responsibilities (
  id CHAR(36) NOT NULL,
  bill_item_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_bill_item_responsibility (bill_item_id, participant_id),
  KEY ix_bill_item_responsibility_participant (participant_id),
  CONSTRAINT fk_bill_item_responsibility_item
    FOREIGN KEY (bill_item_id) REFERENCES bill_items(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bill_item_responsibility_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_fees (
  id CHAR(36) NOT NULL,
  bill_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  fee_type INT NOT NULL,
  value DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_bill_fees_bill_id (bill_id),
  CONSTRAINT fk_bill_fees_bill
    FOREIGN KEY (bill_id) REFERENCES bills(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_shares (
  id CHAR(36) NOT NULL,
  bill_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  weight DECIMAL(18,4) NOT NULL,
  pre_fee_amount DECIMAL(18,2) NOT NULL,
  fee_amount DECIMAL(18,2) NOT NULL,
  total_share_amount DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_bill_shares_bill_participant (bill_id, participant_id),
  CONSTRAINT fk_bill_shares_bill
    FOREIGN KEY (bill_id) REFERENCES bills(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bill_shares_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_contributions (
  id CHAR(36) NOT NULL,
  bill_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_payment_contributions_bill_participant (bill_id, participant_id),
  CONSTRAINT fk_payment_contributions_bill
    FOREIGN KEY (bill_id) REFERENCES bills(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_payment_contributions_participant
    FOREIGN KEY (participant_id) REFERENCES participants(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_transfer_confirmations (
  id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  transfer_key VARCHAR(250) NOT NULL,
  from_participant_id CHAR(36) NOT NULL,
  to_participant_id CHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  from_date_utc DATETIME(6) NULL,
  to_date_utc DATETIME(6) NULL,
  status INT NOT NULL DEFAULT 0,
  marked_paid_at_utc DATETIME(6) NULL,
  marked_received_at_utc DATETIME(6) NULL,
  updated_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ux_settlement_transfer_key (group_id, transfer_key),
  KEY ix_settlement_from_to (group_id, from_participant_id, to_participant_id),
  CONSTRAINT fk_settlement_group
    FOREIGN KEY (group_id) REFERENCES `groups`(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
