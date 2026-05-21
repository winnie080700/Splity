-- Phase 5 bill integrity smoke tests.
-- Run via: psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-5-fk.sql

\set USER_A '00000000-0000-4000-8000-0000000005a1'
\set USER_B '00000000-0000-4000-8000-0000000005b2'

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
  ('00000000-0000-0000-0000-000000000000', :'USER_A', 'authenticated', 'authenticated', 'phase5-a@example.test', 'not-used', now(), '{"name":"Phase5 A"}'::JSONB, now(), now()),
  ('00000000-0000-0000-0000-000000000000', :'USER_B', 'authenticated', 'authenticated', 'phase5-b@example.test', 'not-used', now(), '{"name":"Phase5 B"}'::JSONB, now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.app_users
SET username = CASE id
  WHEN :'USER_A' THEN 'phase5_a'
  WHEN :'USER_B' THEN 'phase5_b'
END
WHERE id IN (:'USER_A', :'USER_B');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'USER_A', true);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES
  ('51000000-0000-4000-8000-000000000001', 'Phase 5 A', :'USER_A', 0),
  ('51000000-0000-4000-8000-000000000002', 'Phase 5 B', :'USER_A', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (id, group_id, name, invited_user_id, invitation_status)
VALUES
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'Alice', :'USER_A', 2),
  ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000001', 'Bob', :'USER_B', 1),
  ('52000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000002', 'Mallory', :'USER_B', 1)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_payload JSONB;
  v_bill_id UUID;
BEGIN
  v_payload := jsonb_build_object(
    'store_name', 'Phase 5 Bill',
    'transaction_date_utc', now(),
    'currency_code', 'MYR',
    'split_mode', 1,
    'primary_payer_participant_id', '52000000-0000-4000-8000-000000000001',
    'items', jsonb_build_array(jsonb_build_object('id', '53000000-0000-4000-8000-000000000001', 'description', 'Food', 'amount', '10.00')),
    'fees', '[]'::JSONB,
    'shares', jsonb_build_array(
      jsonb_build_object('participant_id', '52000000-0000-4000-8000-000000000001', 'weight', '1.0000', 'pre_fee_amount', '10.00', 'fee_amount', '0.00', 'total_share_amount', '10.00')
    ),
    'payment_contributions', jsonb_build_array(jsonb_build_object('participant_id', '52000000-0000-4000-8000-000000000001', 'amount', '10.00')),
    'responsibilities', jsonb_build_array(jsonb_build_object('bill_item_id', '53000000-0000-4000-8000-000000000001', 'participant_id', '52000000-0000-4000-8000-000000000001'))
  );

  v_bill_id := public.create_bill_with_items('51000000-0000-4000-8000-000000000001', v_payload);

  BEGIN
    DELETE FROM public.participants WHERE id = '52000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FK FAIL: deleted participant referenced by bill';
  EXCEPTION WHEN foreign_key_violation THEN
  END;

  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      jsonb_set(v_payload, '{primary_payer_participant_id}', '"52000000-0000-4000-8000-000000000003"')
    );
    RAISE EXCEPTION 'RPC FAIL: accepted cross-group primary payer';
  EXCEPTION WHEN check_violation THEN
  END;

  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      jsonb_set(v_payload, '{responsibilities,0,bill_item_id}', '"53000000-0000-4000-8000-999999999999"')
    );
    RAISE EXCEPTION 'RPC FAIL: accepted cross-payload bill item responsibility';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ②: RPC cross-group share participant (Mallory in GroupB)
  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      jsonb_set(v_payload, '{shares,0,participant_id}', '"52000000-0000-4000-8000-000000000003"')
    );
    RAISE EXCEPTION 'RPC FAIL: accepted cross-group share participant';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ②: RPC cross-group contribution participant
  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      jsonb_set(v_payload, '{payment_contributions,0,participant_id}', '"52000000-0000-4000-8000-000000000003"')
    );
    RAISE EXCEPTION 'RPC FAIL: accepted cross-group contribution participant';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ②: RPC cross-group responsibility participant
  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      jsonb_set(v_payload, '{responsibilities,0,participant_id}', '"52000000-0000-4000-8000-000000000003"')
    );
    RAISE EXCEPTION 'RPC FAIL: accepted cross-group responsibility participant';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ④(a): authenticated direct INSERT bill_shares with cross-group participant.
  -- GroupA still unresolved → trigger 拒 23514 (cross-group condition fires).
  BEGIN
    INSERT INTO public.bill_shares (bill_id, participant_id, weight, pre_fee_amount, fee_amount, total_share_amount)
    VALUES (v_bill_id, '52000000-0000-4000-8000-000000000003', 1.0000, 1.00, 0.00, 1.00);
    RAISE EXCEPTION 'TRIGGER FAIL: authenticated direct insert bill_shares cross-group not blocked';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ④(a): authenticated direct UPDATE bills.primary_payer to cross-group participant.
  -- Trigger fires on UPDATE OF primary_payer_participant_id; trigger 拒 23514.
  BEGIN
    UPDATE public.bills
      SET primary_payer_participant_id = '52000000-0000-4000-8000-000000000003'
      WHERE id = v_bill_id;
    RAISE EXCEPTION 'TRIGGER FAIL: authenticated update bills cross-group primary_payer not blocked';
  EXCEPTION WHEN check_violation THEN
  END;

  UPDATE public.groups SET status = 1 WHERE id = '51000000-0000-4000-8000-000000000001';

  -- v1.5 §10.2.5 ⑥: RPC create_bill_with_items in settling group (counter to existing update test).
  BEGIN
    PERFORM public.create_bill_with_items(
      '51000000-0000-4000-8000-000000000001',
      v_payload
    );
    RAISE EXCEPTION 'RPC FAIL: created bill in settling group';
  EXCEPTION WHEN check_violation THEN
  END;

  -- v1.5 §10.2.5 ④(b): authenticated direct INSERT bill_shares same-group in settling group.
  -- Cross-group condition does not fire (participant in group), but status check does → trigger 拒 23514.
  -- Or RLS WITH CHECK rejects with 42501 (insufficient_privilege). Either is acceptable per plan ④(b).
  BEGIN
    INSERT INTO public.bill_shares (bill_id, participant_id, weight, pre_fee_amount, fee_amount, total_share_amount)
    VALUES (v_bill_id, '52000000-0000-4000-8000-000000000001', 1.0000, 1.00, 0.00, 1.00);
    RAISE EXCEPTION 'DEFENSE FAIL: authenticated direct insert bill_shares in settling group not blocked';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
  END;

  -- v1.5 §10.2.5 ④(b) (bill_items has no trigger; only RLS WITH CHECK with status=0 protects it).
  -- Expect 42501 (insufficient_privilege).
  BEGIN
    INSERT INTO public.bill_items (bill_id, description, amount)
    VALUES (v_bill_id, 'Sneaky', 1.00);
    RAISE EXCEPTION 'RLS FAIL: authenticated direct insert bill_items in settling group not blocked';
  EXCEPTION WHEN insufficient_privilege THEN
  END;

  BEGIN
    PERFORM public.update_bill_with_items(v_bill_id, v_payload);
    RAISE EXCEPTION 'RPC FAIL: updated bill in settling group';
  EXCEPTION WHEN check_violation THEN
  END;

  DELETE FROM public.bills WHERE id = v_bill_id;
  IF FOUND THEN
    RAISE EXCEPTION 'RLS FAIL: deleted bill in settling group';
  END IF;
END $$;

RESET ROLE;

-- v1.5 §10.2.5 ⑤: postgres role direct-write tests (bypass RLS, prove trigger 是最后防线).
-- Build a clean bill in GroupB (still unresolved) so cross-group signature is unambiguous
-- (avoids GroupA's settling状态 confounding the failure source).
DO $$
DECLARE
  v_b_bill_id UUID := gen_random_uuid();
  v_b_item_id UUID := gen_random_uuid();
BEGIN
  -- Legitimate bill in GroupB (Mallory is GroupB participant → trigger passes happy-path)
  INSERT INTO public.bills (id, group_id, store_name, transaction_date_utc, currency_code, split_mode, primary_payer_participant_id)
  VALUES (v_b_bill_id, '51000000-0000-4000-8000-000000000002', 'GroupB Bill', now(), 'MYR', 1, '52000000-0000-4000-8000-000000000003');

  INSERT INTO public.bill_items (id, bill_id, description, amount)
  VALUES (v_b_item_id, v_b_bill_id, 'GroupB Item', '5.00');

  -- Attack J: postgres direct INSERT bill_shares with Alice (GroupA) on GroupB bill → cross-group
  BEGIN
    INSERT INTO public.bill_shares (bill_id, participant_id, weight, pre_fee_amount, fee_amount, total_share_amount)
    VALUES (v_b_bill_id, '52000000-0000-4000-8000-000000000001', 1.0000, 5.00, 0.00, 5.00);
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct insert bill_shares cross-group not blocked';
  EXCEPTION WHEN check_violation THEN
  END;

  -- Attack K: postgres direct UPDATE bills.primary_payer to cross-group Alice
  BEGIN
    UPDATE public.bills
      SET primary_payer_participant_id = '52000000-0000-4000-8000-000000000001'
      WHERE id = v_b_bill_id;
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct update bills cross-group primary_payer not blocked';
  EXCEPTION WHEN check_violation THEN
  END;

  -- Attack L: postgres direct INSERT payment_contributions cross-group
  BEGIN
    INSERT INTO public.payment_contributions (bill_id, participant_id, amount)
    VALUES (v_b_bill_id, '52000000-0000-4000-8000-000000000001', 1.00);
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct insert payment_contributions cross-group not blocked';
  EXCEPTION WHEN check_violation THEN
  END;

  -- Attack M: postgres direct INSERT bill_item_responsibilities cross-group
  BEGIN
    INSERT INTO public.bill_item_responsibilities (bill_item_id, participant_id)
    VALUES (v_b_item_id, '52000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'TRIGGER FAIL: postgres direct insert bill_item_responsibilities cross-group not blocked';
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
        'assert_bill_writable'
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
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT count(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('bills','bill_items','bill_item_responsibilities','bill_fees','bill_shares','payment_contributions')
    AND cmd <> 'SELECT'
    AND qual LIKE '%status = 0%'
    AND with_check LIKE '%status = 0%';

  IF v_policy_count <> 6 THEN
    RAISE EXCEPTION 'RLS FAIL: expected 6 bill write policies with status lock, got %', v_policy_count;
  END IF;
END $$;

ROLLBACK;
SELECT 'phase-5 bill integrity smoke passed' AS result;
