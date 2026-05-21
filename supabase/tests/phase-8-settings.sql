-- Phase 8 settings write-path smoke test.
-- Run via: psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-8-settings.sql
-- Or: supabase db query --local --file supabase/tests/phase-8-settings.sql

BEGIN;

RESET ROLE;

DELETE FROM auth.users
WHERE id IN (
  '00000000-0000-4000-8000-0000000008a1',
  '00000000-0000-4000-8000-0000000008b2'
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
    '00000000-0000-4000-8000-0000000008a1',
    'authenticated',
    'authenticated',
    'phase8-a@example.test',
    'not-used',
    now(),
    '{"name":"Phase8 A","username":"phase8_a"}'::JSONB,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000008b2',
    'authenticated',
    'authenticated',
    'phase8-b@example.test',
    'not-used',
    now(),
    '{"name":"Phase8 B","username":"phase8_b"}'::JSONB,
    now(),
    now()
  );

UPDATE public.app_users
SET
  name = CASE id
    WHEN '00000000-0000-4000-8000-0000000008a1' THEN 'Phase8 A'
    WHEN '00000000-0000-4000-8000-0000000008b2' THEN 'Phase8 B'
  END,
  username = CASE id
    WHEN '00000000-0000-4000-8000-0000000008a1' THEN 'phase8_a'
    WHEN '00000000-0000-4000-8000-0000000008b2' THEN 'phase8_b'
  END
WHERE id IN (
  '00000000-0000-4000-8000-0000000008a1',
  '00000000-0000-4000-8000-0000000008b2'
);

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000008a1', true);

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.app_users
  SET
    name = 'Phase8 Alice',
    username = 'phase8_alice',
    default_payment_payee_name = 'Alice Payee',
    default_payment_method = 'DuitNow',
    default_payment_account_name = 'Alice Account',
    default_payment_account_number = '1234567890',
    default_payment_notes = 'Phase 8 settings smoke',
    default_payment_qr_data_url = 'data:image/png;base64,AAAA'
  WHERE id = current_setting('request.jwt.claim.sub')::UUID;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: user A could not update own settings row';
  END IF;
END $$;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.app_users
  SET default_payment_payee_name = 'Hacked'
  WHERE id = '00000000-0000-4000-8000-0000000008b2';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: user A updated user B payment profile';
  END IF;
END $$;

DO $$
BEGIN
  UPDATE public.app_users
  SET username = 'phase8_b'
  WHERE id = current_setting('request.jwt.claim.sub')::UUID;

  RAISE EXCEPTION 'UNIQUE FAIL: duplicate username update unexpectedly succeeded';
EXCEPTION
  WHEN unique_violation THEN
    NULL;
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000008b2', true);

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.app_users
  SET username = 'phase8_intruder'
  WHERE id = '00000000-0000-4000-8000-0000000008a1';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: user B updated user A username';
  END IF;
END $$;

ROLLBACK;
SELECT 'phase-8 settings smoke passed' AS result;
