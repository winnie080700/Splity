-- Phase 6 settlement defense tests.
-- Run via: psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-6-settlement.sql

BEGIN;

RESET ROLE;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000006a1', 'authenticated', 'authenticated', 'phase6-a@example.test', 'not-used', now(), '{"name":"Phase6 A"}'::JSONB, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000006b2', 'authenticated', 'authenticated', 'phase6-b@example.test', 'not-used', now(), '{"name":"Phase6 B"}'::JSONB, now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.app_users
SET username = CASE id
  WHEN '00000000-0000-4000-8000-0000000006a1' THEN 'phase6_a'
  WHEN '00000000-0000-4000-8000-0000000006b2' THEN 'phase6_b'
END
WHERE id IN ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-0000000006b2');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000006a1', true);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES
  ('61000000-0000-4000-8000-000000000001', 'Phase 6 Settling', '00000000-0000-4000-8000-0000000006a1', 1),
  ('61000000-0000-4000-8000-000000000002', 'Phase 6 Unresolved', '00000000-0000-4000-8000-0000000006a1', 0),
  ('61000000-0000-4000-8000-000000000003', 'Phase 6 Settled', '00000000-0000-4000-8000-0000000006a1', 2),
  ('61000000-0000-4000-8000-000000000004', 'Phase 6 Other', '00000000-0000-4000-8000-0000000006a1', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (id, group_id, name, invited_user_id, invitation_status)
VALUES
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Payer', '00000000-0000-4000-8000-0000000006a1', 2),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'Receiver', '00000000-0000-4000-8000-0000000006b2', 1),
  ('62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000002', 'Unresolved Payer', '00000000-0000-4000-8000-0000000006a1', 2),
  ('62000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000002', 'Unresolved Receiver', '00000000-0000-4000-8000-0000000006b2', 1),
  ('62000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000003', 'Settled Payer', '00000000-0000-4000-8000-0000000006a1', 2),
  ('62000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000003', 'Settled Receiver', '00000000-0000-4000-8000-0000000006b2', 1),
  ('62000000-0000-4000-8000-000000000007', '61000000-0000-4000-8000-000000000004', 'Other', '00000000-0000-4000-8000-0000000006b2', 1)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  PERFORM public.record_settlement_action(
    'mark_paid',
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000002',
    25.00,
    NULL,
    NULL,
    '62000000-0000-4000-8000-000000000001',
    'phase6-transfer-paid',
    NULL
  );

  BEGIN
    PERFORM public.record_settlement_action(
      'mark_paid',
      '61000000-0000-4000-8000-000000000002',
      '62000000-0000-4000-8000-000000000003',
      '62000000-0000-4000-8000-000000000004',
      25.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000003',
      'phase6-unresolved',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: mark_paid accepted unresolved group';
  EXCEPTION WHEN check_violation THEN
  END;

  BEGIN
    PERFORM public.record_settlement_action(
      'mark_paid',
      '61000000-0000-4000-8000-000000000003',
      '62000000-0000-4000-8000-000000000005',
      '62000000-0000-4000-8000-000000000006',
      25.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000005',
      'phase6-settled',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: mark_paid accepted settled group';
  EXCEPTION WHEN check_violation THEN
  END;

  BEGIN
    PERFORM public.record_settlement_action(
      'mark_paid',
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      10.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000002',
      'phase6-wrong-actor',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: mark_paid accepted wrong actor';
  EXCEPTION WHEN invalid_parameter_value THEN
  END;

  BEGIN
    PERFORM public.record_settlement_action(
      'mark_received',
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      9.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000002',
      'phase6-received-before-paid',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: mark_received accepted before paid';
  EXCEPTION WHEN invalid_parameter_value THEN
  END;

  PERFORM public.record_settlement_action(
    'mark_received',
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000002',
    25.00,
    NULL,
    NULL,
    '62000000-0000-4000-8000-000000000002',
    'phase6-transfer-paid',
    NULL
  );

  BEGIN
    PERFORM public.record_settlement_action(
      'mark_paid',
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      25.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000001',
      'phase6-transfer-paid',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: mark_paid downgraded received transfer';
  EXCEPTION WHEN check_violation THEN
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000006b2', true);

DO $$
BEGIN
  BEGIN
    PERFORM public.record_settlement_action(
      'mark_paid',
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      1.00,
      NULL,
      NULL,
      '62000000-0000-4000-8000-000000000001',
      'phase6-non-creator',
      NULL
    );
    RAISE EXCEPTION 'RPC FAIL: non-creator marked paid';
  EXCEPTION WHEN insufficient_privilege THEN
  END;

  BEGIN
    INSERT INTO public.settlement_transfer_confirmations (
      group_id,
      transfer_key,
      from_participant_id,
      to_participant_id,
      amount,
      status
    )
    VALUES (
      '61000000-0000-4000-8000-000000000001',
      'phase6-direct-insert',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      1.00,
      2
    );
    RAISE EXCEPTION 'GRANT FAIL: authenticated direct insert settlement confirmation';
  EXCEPTION WHEN insufficient_privilege THEN
  END;

  BEGIN
    UPDATE public.settlement_transfer_confirmations
      SET status = 2
      WHERE transfer_key = 'phase6-transfer-paid';
    RAISE EXCEPTION 'GRANT FAIL: authenticated direct update settlement confirmation';
  EXCEPTION WHEN insufficient_privilege THEN
  END;

  BEGIN
    DELETE FROM public.settlement_transfer_confirmations
      WHERE transfer_key = 'phase6-transfer-paid';
    RAISE EXCEPTION 'GRANT FAIL: authenticated direct delete settlement confirmation';
  EXCEPTION WHEN insufficient_privilege THEN
  END;
END $$;

RESET ROLE;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.settlement_transfer_confirmations (
      group_id,
      transfer_key,
      from_participant_id,
      to_participant_id,
      amount,
      status
    )
    VALUES (
      '61000000-0000-4000-8000-000000000001',
      'phase6-postgres-cross-group',
      '62000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000007',
      1.00,
      1
    );
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct insert cross-group settlement confirmation';
  EXCEPTION WHEN check_violation THEN
  END;

  UPDATE public.groups SET status = 2 WHERE id = '61000000-0000-4000-8000-000000000001';

  BEGIN
    UPDATE public.settlement_transfer_confirmations
      SET status = 2
      WHERE transfer_key = 'phase6-transfer-paid';
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct update settlement confirmation in non-settling group';
  EXCEPTION WHEN check_violation THEN
  END;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT proname, prosecdef, array_to_string(proconfig, ',') AS cfg
    FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
    WHERE nspname = 'public'
      AND proname IN (
        'trg_bill_shares_integrity',
        'trg_payment_contributions_integrity',
        'trg_bill_item_resp_integrity',
        'trg_bills_integrity',
        'assert_bill_writable',
        'assert_settlement_writable',
        'trg_settlement_transfer_integrity',
        'record_settlement_action'
      )
  LOOP
    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'AUDIT FAIL: % must be SECURITY DEFINER', r.proname;
    END IF;
    IF position('search_path=public, pg_temp' IN COALESCE(r.cfg, '')) = 0 THEN
      RAISE EXCEPTION 'AUDIT FAIL: % missing search_path', r.proname;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = 'settlement_transfer_confirmations'
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'GRANT AUDIT FAIL: authenticated still has settlement write grants';
  END IF;
END $$;

ROLLBACK;
