ALTER TABLE public.bills
  ALTER CONSTRAINT bills_primary_payer_participant_id_fkey
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.bill_item_responsibilities
  ALTER CONSTRAINT bill_item_responsibilities_participant_id_fkey
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.bill_shares
  ALTER CONSTRAINT bill_shares_participant_id_fkey
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.settlement_transfer_confirmations
  ALTER CONSTRAINT settlement_transfer_confirmations_from_participant_id_fkey
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.settlement_transfer_confirmations
  ALTER CONSTRAINT settlement_transfer_confirmations_to_participant_id_fkey
  DEFERRABLE INITIALLY DEFERRED;
