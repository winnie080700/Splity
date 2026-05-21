-- Run after applying supabase/migrations/0001_schema.sql..0004_auth_triggers.sql.
-- This script is intentionally plain SQL/PLpgSQL so it can run in CI without pgTAP.

RESET ROLE;

DO $$
DECLARE
  v_table_count INTEGER;
  v_rls_count INTEGER;
  v_deprecated_count INTEGER;
BEGIN
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'app_users',
      'groups',
      'participants',
      'bills',
      'bill_items',
      'bill_item_responsibilities',
      'bill_fees',
      'bill_shares',
      'payment_contributions',
      'settlement_transfer_confirmations',
      'settlement_share_links'
    );

  IF v_table_count <> 11 THEN
    RAISE EXCEPTION 'SCHEMA FAIL: expected 11 public app tables, got %', v_table_count;
  END IF;

  SELECT count(*) INTO v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'app_users',
      'groups',
      'participants',
      'bills',
      'bill_items',
      'bill_item_responsibilities',
      'bill_fees',
      'bill_shares',
      'payment_contributions',
      'settlement_transfer_confirmations',
      'settlement_share_links'
    )
    AND c.relrowsecurity;

  IF v_rls_count <> 11 THEN
    RAISE EXCEPTION 'RLS FAIL: expected RLS enabled on 11 tables, got %', v_rls_count;
  END IF;

  SELECT count(*) INTO v_deprecated_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'app_users'
    AND column_name IN (
      'password_hash',
      'password_salt',
      'clerk_user_id',
      'email_verified_at_utc',
      'pending_email_verification_code_hash',
      'pending_email_verification_expires_at_utc'
    );

  IF v_deprecated_count <> 0 THEN
    RAISE EXCEPTION 'SCHEMA FAIL: deprecated app_users columns still exist';
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      p.proname,
      p.prosecdef,
      p.provolatile,
      p.pronargs,
      array_to_string(p.proconfig, ',') AS cfg,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_group_member',
        'handle_new_user',
        'record_settlement_action',
        'accept_invitation',
        'decline_invitation',
        'get_group_members',
        'resolve_share_token'
      )
  LOOP
    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'AUDIT FAIL: % is not SECURITY DEFINER', r.proname;
    END IF;

    IF position('search_path=public, pg_temp' IN COALESCE(r.cfg, '')) = 0 THEN
      RAISE EXCEPTION 'AUDIT FAIL: % missing search_path=public, pg_temp', r.proname;
    END IF;

    IF r.proname = 'is_group_member' AND r.provolatile <> 's' THEN
      RAISE EXCEPTION 'AUDIT FAIL: is_group_member must be STABLE';
    END IF;

    IF r.proname = 'record_settlement_action' THEN
      IF r.pronargs <> 10 THEN
        RAISE EXCEPTION 'AUDIT FAIL: record_settlement_action expected 10 SQL args, got %', r.pronargs;
      END IF;

      IF position('p_transfer_key text' IN lower(r.args)) = 0 THEN
        RAISE EXCEPTION 'AUDIT FAIL: record_settlement_action missing p_transfer_key text';
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  v_anon_policy_count INTEGER;
BEGIN
  SELECT count(*) INTO v_anon_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'settlement_share_links'
    AND 'anon' = ANY(roles);

  IF v_anon_policy_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: settlement_share_links must not have anon policies';
  END IF;
END $$;

DELETE FROM auth.users
WHERE id IN (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000b2'
);

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
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a1',
    'authenticated',
    'authenticated',
    'phase2-a@example.test',
    'not-used',
    now(),
    '{"name":"Phase2 A"}'::JSONB,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000b2',
    'authenticated',
    'authenticated',
    'phase2-b@example.test',
    'not-used',
    now(),
    '{"name":"Phase2 B"}'::JSONB,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.app_users
SET username = CASE id
  WHEN '00000000-0000-4000-8000-0000000000a1' THEN 'phase2_a'
  WHEN '00000000-0000-4000-8000-0000000000b2' THEN 'phase2_b'
END
WHERE id IN (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000b2'
);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'Phase 2 Group',
  '00000000-0000-4000-8000-0000000000a1',
  1
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  created_by_user_id = EXCLUDED.created_by_user_id,
  status = EXCLUDED.status;

INSERT INTO public.participants (id, group_id, name, invited_user_id, invitation_status)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'From Participant',
    '00000000-0000-4000-8000-0000000000a1',
    2
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'To Participant',
    '00000000-0000-4000-8000-0000000000b2',
    1
  )
ON CONFLICT (id) DO UPDATE
SET
  group_id = EXCLUDED.group_id,
  name = EXCLUDED.name,
  invited_user_id = EXCLUDED.invited_user_id,
  invitation_status = EXCLUDED.invitation_status;

INSERT INTO public.settlement_share_links (
  id,
  group_id,
  share_token,
  creator_name,
  payee_name,
  payment_method,
  account_name,
  account_number,
  is_active
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'phase2-valid-token',
  'Phase2 A',
  'Phase2 A',
  'Bank transfer',
  'Phase2 A',
  '123456789',
  true
)
ON CONFLICT (share_token) DO NOTHING;

BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  DECLARE
    v_count INTEGER;
    v_payload JSONB;
  BEGIN
    SELECT count(*) INTO v_count FROM public.groups;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'RLS FAIL: anon can read groups';
    END IF;

    SELECT count(*) INTO v_count FROM public.settlement_share_links;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'RLS FAIL: anon can read settlement_share_links directly';
    END IF;

    SELECT public.resolve_share_token('phase2-valid-token') INTO v_payload;
    IF v_payload IS NULL OR v_payload ? 'group_id' OR v_payload ? 'id' THEN
      RAISE EXCEPTION 'RPC FAIL: resolve_share_token did not return whitelisted public payload';
    END IF;

    SELECT public.resolve_share_token('phase2-invalid-token') INTO v_payload;
    IF v_payload IS NOT NULL THEN
      RAISE EXCEPTION 'RPC FAIL: resolve_share_token invalid token should return null';
    END IF;
  END $$;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
  DO $$
  DECLARE
    v_count INTEGER;
  BEGIN
    SELECT count(*) INTO v_count
    FROM public.groups
    WHERE id = '10000000-0000-4000-8000-000000000001';

    IF v_count <> 1 THEN
      RAISE EXCEPTION 'RLS FAIL: creator cannot read own group';
    END IF;

    PERFORM public.record_settlement_action(
      'mark_paid',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      12.34,
      NULL,
      NULL,
      '20000000-0000-4000-8000-000000000001',
      'phase2-transfer-key',
      NULL
    );

    BEGIN
      PERFORM public.record_settlement_action(
        'mark_paid',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        12.34,
        NULL,
        NULL,
        '20000000-0000-4000-8000-000000000001',
        NULL,
        NULL
      );
      RAISE EXCEPTION 'RPC FAIL: record_settlement_action accepted null transfer key';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'RPC FAIL: record_settlement_action accepted null transfer key' THEN
        RAISE;
      END IF;
    END;
  END $$;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
  DO $$
  DECLARE
    v_count INTEGER;
  BEGIN
    SELECT count(*) INTO v_count
    FROM public.groups
    WHERE id = '10000000-0000-4000-8000-000000000001';

    IF v_count <> 0 THEN
      RAISE EXCEPTION 'RLS FAIL: pending invitee can read group before acceptance';
    END IF;

    BEGIN
      PERFORM public.record_settlement_action(
        'mark_paid',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        12.34,
        NULL,
        NULL,
        '20000000-0000-4000-8000-000000000001',
        'phase2-transfer-key-bad',
        NULL
      );
      RAISE EXCEPTION 'RPC FAIL: non-creator marked settlement action';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'RPC FAIL: non-creator marked settlement action' THEN
        RAISE;
      END IF;
    END;

    PERFORM public.accept_invitation('20000000-0000-4000-8000-000000000002');

    SELECT count(*) INTO v_count
    FROM public.groups
    WHERE id = '10000000-0000-4000-8000-000000000001';

    IF v_count <> 1 THEN
      RAISE EXCEPTION 'RLS FAIL: accepted invitee cannot read group';
    END IF;
  END $$;
ROLLBACK;

SELECT 'phase-2 rls tests passed' AS result;
