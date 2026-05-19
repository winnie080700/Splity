CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(50),
  email VARCHAR(200) NOT NULL,
  default_payment_payee_name VARCHAR(150),
  default_payment_method VARCHAR(120),
  default_payment_account_name VARCHAR(150),
  default_payment_account_number VARCHAR(120),
  default_payment_notes VARCHAR(2000),
  default_payment_qr_data_url TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_users_email_unique UNIQUE (email),
  CONSTRAINT app_users_username_unique UNIQUE (username)
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  created_by_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  status SMALLINT NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT groups_status_check CHECK (status IN (0, 1, 2))
);

CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(50),
  invited_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  invitation_status SMALLINT NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT participants_invitation_status_check CHECK (invitation_status IN (0, 1, 2, 3)),
  CONSTRAINT participants_group_name_unique UNIQUE (group_id, name)
);

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  store_name VARCHAR(200) NOT NULL,
  reference_image_data_url TEXT,
  transaction_date_utc TIMESTAMPTZ NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'MYR',
  split_mode SMALLINT NOT NULL,
  primary_payer_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bills_split_mode_check CHECK (split_mode IN (1, 2))
);

CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  description VARCHAR(200) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL
);

CREATE TABLE public.bill_item_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_item_id UUID NOT NULL REFERENCES public.bill_items(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  CONSTRAINT bill_item_responsibilities_item_participant_unique UNIQUE (bill_item_id, participant_id)
);

CREATE TABLE public.bill_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  fee_type SMALLINT NOT NULL,
  value NUMERIC(18, 2) NOT NULL,
  CONSTRAINT bill_fees_fee_type_check CHECK (fee_type IN (1, 2))
);

CREATE TABLE public.bill_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  weight NUMERIC(18, 4) NOT NULL,
  pre_fee_amount NUMERIC(18, 2) NOT NULL,
  fee_amount NUMERIC(18, 2) NOT NULL,
  total_share_amount NUMERIC(18, 2) NOT NULL,
  CONSTRAINT bill_shares_bill_participant_unique UNIQUE (bill_id, participant_id)
);

CREATE TABLE public.payment_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  amount NUMERIC(18, 2) NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.settlement_transfer_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  transfer_key VARCHAR(250) NOT NULL,
  from_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  to_participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE NO ACTION,
  amount NUMERIC(18, 2) NOT NULL,
  from_date_utc TIMESTAMPTZ,
  to_date_utc TIMESTAMPTZ,
  status SMALLINT NOT NULL DEFAULT 0,
  proof_screenshot_data_url TEXT,
  marked_paid_at_utc TIMESTAMPTZ,
  marked_received_at_utc TIMESTAMPTZ,
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settlement_transfer_confirmations_status_check CHECK (status IN (0, 1, 2)),
  CONSTRAINT settlement_transfer_confirmations_group_key_unique UNIQUE (group_id, transfer_key)
);

CREATE TABLE public.settlement_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  share_token VARCHAR(80) NOT NULL,
  from_date_utc TIMESTAMPTZ,
  to_date_utc TIMESTAMPTZ,
  creator_name VARCHAR(150),
  payee_name VARCHAR(150),
  payment_method VARCHAR(120),
  account_name VARCHAR(150),
  account_number VARCHAR(120),
  notes VARCHAR(2000),
  payment_qr_data_url TEXT,
  receiver_payment_infos_json TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settlement_share_links_share_token_unique UNIQUE (share_token)
);

CREATE INDEX groups_created_by_user_id_idx ON public.groups(created_by_user_id);
CREATE INDEX participants_group_id_idx ON public.participants(group_id);
CREATE INDEX participants_invited_user_id_idx ON public.participants(invited_user_id);
CREATE INDEX bills_group_transaction_store_idx ON public.bills(group_id, transaction_date_utc, store_name);
CREATE INDEX bills_primary_payer_participant_id_idx ON public.bills(primary_payer_participant_id);
CREATE INDEX bill_items_bill_id_idx ON public.bill_items(bill_id);
CREATE INDEX bill_item_responsibilities_participant_id_idx ON public.bill_item_responsibilities(participant_id);
CREATE INDEX bill_fees_bill_id_idx ON public.bill_fees(bill_id);
CREATE INDEX bill_shares_participant_id_idx ON public.bill_shares(participant_id);
CREATE INDEX payment_contributions_bill_participant_idx ON public.payment_contributions(bill_id, participant_id);
CREATE INDEX payment_contributions_participant_id_idx ON public.payment_contributions(participant_id);
CREATE INDEX settlement_transfer_confirmations_group_participants_idx
  ON public.settlement_transfer_confirmations(group_id, from_participant_id, to_participant_id);
CREATE INDEX settlement_share_links_group_id_idx ON public.settlement_share_links(group_id);
CREATE INDEX settlement_share_links_active_token_idx
  ON public.settlement_share_links(share_token)
  WHERE is_active = true;
