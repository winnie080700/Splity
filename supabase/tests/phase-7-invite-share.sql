-- Phase 7 invitation and public share hardening tests.
-- Run via: psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-7-invite-share.sql

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
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000007a1', 'authenticated', 'authenticated', 'phase7-a@example.test', 'not-used', now(), '{"name":"Phase7 A"}'::JSONB, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000007b2', 'authenticated', 'authenticated', 'phase7-b@example.test', 'not-used', now(), '{"name":"Phase7 B"}'::JSONB, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000007c3', 'authenticated', 'authenticated', 'phase7-c@example.test', 'not-used', now(), '{"name":"Phase7 C"}'::JSONB, now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.app_users
SET username = CASE id
  WHEN '00000000-0000-4000-8000-0000000007a1' THEN 'phase7_a'
  WHEN '00000000-0000-4000-8000-0000000007b2' THEN 'phase7_b'
  WHEN '00000000-0000-4000-8000-0000000007c3' THEN 'phase7_c'
END
WHERE id IN (
  '00000000-0000-4000-8000-0000000007a1',
  '00000000-0000-4000-8000-0000000007b2',
  '00000000-0000-4000-8000-0000000007c3'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000007a1', true);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'Phase 7 Settling', '00000000-0000-4000-8000-0000000007a1', 1),
  ('71000000-0000-4000-8000-000000000002', 'Phase 7 Unresolved', '00000000-0000-4000-8000-0000000007a1', 0),
  ('71000000-0000-4000-8000-000000000003', 'Phase 7 Settled', '00000000-0000-4000-8000-0000000007a1', 2),
  ('71000000-0000-4000-8000-000000000004', 'Phase 7 Invitation', '00000000-0000-4000-8000-0000000007a1', 0),
  ('71000000-0000-4000-8000-000000000005', 'Phase 7 Decline', '00000000-0000-4000-8000-0000000007a1', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (id, group_id, name, username, invited_user_id, invitation_status)
VALUES
  ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Payer', 'phase7_a', '00000000-0000-4000-8000-0000000007a1', 2),
  ('72000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'Receiver', 'phase7_b', '00000000-0000-4000-8000-0000000007b2', 2),
  ('72000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000004', 'Invite Accept', 'phase7_b', '00000000-0000-4000-8000-0000000007b2', 1),
  ('72000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000005', 'Invite Decline', 'phase7_c', '00000000-0000-4000-8000-0000000007c3', 1)
ON CONFLICT (id) DO NOTHING;

RESET ROLE;

INSERT INTO public.settlement_transfer_confirmations (
  group_id,
  transfer_key,
  from_participant_id,
  to_participant_id,
  amount,
  status,
  marked_paid_at_utc,
  marked_received_at_utc
)
VALUES (
  '71000000-0000-4000-8000-000000000001',
  'phase7-transfer',
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002',
  42.50,
  2,
  now(),
  now()
)
ON CONFLICT (group_id, transfer_key) DO NOTHING;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000007b2', true);

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.list_my_invitations();
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RPC FAIL: list_my_invitations expected one pending invite for B, got %', v_count;
  END IF;

  PERFORM public.accept_invitation('72000000-0000-4000-8000-000000000003');

  BEGIN
    PERFORM public.accept_invitation('72000000-0000-4000-8000-000000000003');
    RAISE EXCEPTION 'RPC FAIL: accept_invitation accepted non-pending invitation';
  EXCEPTION WHEN insufficient_privilege THEN
  END;

  BEGIN
    PERFORM public.accept_invitation('72000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'RPC FAIL: accept_invitation accepted wrong invitee';
  EXCEPTION WHEN insufficient_privilege THEN
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000007c3', true);

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.list_my_invitations();
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RPC FAIL: list_my_invitations expected one pending invite for C, got %', v_count;
  END IF;

  PERFORM public.decline_invitation('72000000-0000-4000-8000-000000000004');

  SELECT count(*) INTO v_count FROM public.list_my_invitations();
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RPC FAIL: declined invitation remained pending';
  END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000007a1', true);

DO $$
DECLARE
  v_token_one TEXT;
  v_token_two TEXT;
  v_payload JSONB := jsonb_build_object(
    'creator_name', 'Phase7 A',
    'payee_name', 'Phase7 A',
    'payment_method', 'Bank transfer',
    'account_name', 'Phase7 A',
    'account_number', '123456789',
    'notes', 'Phase 7 notes',
    'payment_qr_data_url', NULL,
    'receiver_payment_infos_json', '[{"name":"Phase7 A","method":"Bank transfer"}]'
  );
  v_count INTEGER;
BEGIN
  BEGIN
    PERFORM public.regenerate_settlement_share('71000000-0000-4000-8000-000000000002', v_payload);
    RAISE EXCEPTION 'RPC FAIL: created share in unresolved group';
  EXCEPTION WHEN check_violation THEN
  END;

  BEGIN
    PERFORM public.regenerate_settlement_share('71000000-0000-4000-8000-000000000003', v_payload);
    RAISE EXCEPTION 'RPC FAIL: created share in settled group';
  EXCEPTION WHEN check_violation THEN
  END;

  v_token_one := public.regenerate_settlement_share('71000000-0000-4000-8000-000000000001', v_payload);
  v_token_two := public.regenerate_settlement_share('71000000-0000-4000-8000-000000000001', v_payload || jsonb_build_object('notes', 'Phase 7 new notes'));

  IF v_token_one = v_token_two THEN
    RAISE EXCEPTION 'RPC FAIL: regenerate returned duplicate token';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.settlement_share_links
  WHERE group_id = '71000000-0000-4000-8000-000000000001'
    AND share_token = v_token_one
    AND is_active = FALSE;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RPC FAIL: regenerate did not deactivate old token';
  END IF;

  UPDATE public.groups SET status = 2 WHERE id = '71000000-0000-4000-8000-000000000001';

  PERFORM public.deactivate_settlement_share('71000000-0000-4000-8000-000000000001');

  SELECT count(*) INTO v_count
  FROM public.settlement_share_links
  WHERE group_id = '71000000-0000-4000-8000-000000000001'
    AND is_active = TRUE;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RPC FAIL: deactivate_settlement_share left active links';
  END IF;

  BEGIN
    UPDATE public.settlement_share_links
    SET payee_name = 'Changed'
    WHERE share_token = v_token_two;
    RAISE EXCEPTION 'TRIGGER FAIL: updated share fields in settled group';
  EXCEPTION WHEN check_violation THEN
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000007b2', true);

DO $$
BEGIN
  BEGIN
    PERFORM public.deactivate_settlement_share('71000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'RPC FAIL: non-creator deactivated share';
  EXCEPTION WHEN insufficient_privilege THEN
  END;
END $$;

RESET ROLE;

DO $$
DECLARE
  v_token TEXT := 'phase7-valid-token';
BEGIN
  UPDATE public.groups SET status = 1 WHERE id = '71000000-0000-4000-8000-000000000001';

  INSERT INTO public.settlement_share_links (
    group_id,
    share_token,
    creator_name,
    payee_name,
    payment_method,
    account_name,
    account_number,
    notes,
    is_active
  )
  VALUES (
    '71000000-0000-4000-8000-000000000001',
    v_token,
    'Phase7 A',
    'Phase7 A',
    'Bank transfer',
    'Phase7 A',
    '123456789',
    'Visible note',
    TRUE
  );

  UPDATE public.groups SET status = 2 WHERE id = '71000000-0000-4000-8000-000000000001';
END $$;

SET LOCAL ROLE anon;

DO $$
DECLARE
  v_count INTEGER;
  v_payload JSONB;
  v_keys TEXT[];
  v_expected TEXT[] := ARRAY[
    'account_name',
    'account_number',
    'created_at_utc',
    'creator_name',
    'from_date_utc',
    'notes',
    'payee_name',
    'payment_method',
    'payment_qr_data_url',
    'receiver_payment_infos_json',
    'share_token',
    'to_date_utc',
    'transfers'
  ];
BEGIN
  SELECT count(*) INTO v_count FROM public.settlement_share_links;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: anon can read settlement_share_links directly';
  END IF;

  SELECT public.resolve_share_token('phase7-valid-token') INTO v_payload;
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'RPC FAIL: anon could not resolve valid share token';
  END IF;

  SELECT array_agg(key ORDER BY key) INTO v_keys
  FROM jsonb_object_keys(v_payload) AS key;

  IF v_keys <> v_expected THEN
    RAISE EXCEPTION 'RPC FAIL: resolve_share_token keys mismatch: %', v_keys;
  END IF;

  IF v_payload ? 'group_id'
    OR v_payload ? 'id'
    OR v_payload ? 'participant_id'
    OR v_payload ? 'invited_user_id'
    OR v_payload ? 'bill_id'
  THEN
    RAISE EXCEPTION 'RPC FAIL: resolve_share_token leaked internal identifiers';
  END IF;

  IF public.resolve_share_token('phase7-missing-token') IS NOT NULL THEN
    RAISE EXCEPTION 'RPC FAIL: invalid token should return null';
  END IF;
END $$;

RESET ROLE;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT proname, prosecdef, array_to_string(proconfig, ',') AS cfg
    FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
    WHERE nspname = 'public'
      AND proname IN (
        'list_my_invitations',
        'regenerate_settlement_share',
        'deactivate_settlement_share',
        'trg_settlement_share_integrity'
      )
  LOOP
    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'AUDIT FAIL: % must be SECURITY DEFINER', r.proname;
    END IF;
    IF position('search_path=public, pg_temp' IN COALESCE(r.cfg, '')) = 0 THEN
      RAISE EXCEPTION 'AUDIT FAIL: % missing search_path', r.proname;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
    WHERE nspname = 'public'
      AND proname = 'assert_settlement_share_writable'
  ) THEN
    SELECT proname, prosecdef, array_to_string(proconfig, ',') AS cfg INTO r
    FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
    WHERE nspname = 'public'
      AND proname = 'assert_settlement_share_writable';

    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'AUDIT FAIL: % must be SECURITY DEFINER', r.proname;
    END IF;
    IF position('search_path=public, pg_temp' IN COALESCE(r.cfg, '')) = 0 THEN
      RAISE EXCEPTION 'AUDIT FAIL: % missing search_path', r.proname;
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  v_insert_check TEXT;
  v_update_using TEXT;
  v_legacy_count INTEGER;
BEGIN
  SELECT with_check INTO v_insert_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'settlement_share_links'
    AND policyname = 'settlement_share_links_insert_creator'
    AND cmd = 'INSERT';

  IF v_insert_check IS NULL OR position('status = 1' IN v_insert_check) = 0 THEN
    RAISE EXCEPTION 'RLS AUDIT FAIL: insert policy missing status=1 check';
  END IF;

  SELECT qual INTO v_update_using
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'settlement_share_links'
    AND policyname = 'settlement_share_links_update_creator'
    AND cmd = 'UPDATE';

  IF v_update_using IS NULL THEN
    RAISE EXCEPTION 'RLS AUDIT FAIL: update policy missing';
  END IF;

  IF position('status = 1' IN v_update_using) > 0 THEN
    RAISE EXCEPTION 'RLS AUDIT FAIL: update policy must not include status=1';
  END IF;

  SELECT count(*) INTO v_legacy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'settlement_share_links'
    AND policyname = 'settlement_share_links_write_creator';

  IF v_legacy_count <> 0 THEN
    RAISE EXCEPTION 'RLS AUDIT FAIL: legacy write policy remains';
  END IF;
END $$;

ROLLBACK;
