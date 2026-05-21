-- Phase 4 cross-account RLS smoke test.
-- Prereqs: replace USER_A and USER_B with real auth.users ids from Phase 3.
-- Run via: psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-4-rls.sql

\set USER_A '00000000-0000-4000-8000-aaaaaaaaaaaa'
\set USER_B '00000000-0000-4000-8000-bbbbbbbbbbbb'
\set USER_A_USERNAME 'phase4_alice'
\set USER_B_USERNAME 'phase4_bob'

BEGIN;

RESET ROLE;

UPDATE public.app_users SET username = :'USER_A_USERNAME' WHERE id = :'USER_A';
UPDATE public.app_users SET username = :'USER_B_USERNAME' WHERE id = :'USER_B';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'USER_A', true);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES ('40000000-0000-4000-8000-000000000001', 'Phase 4 Group', :'USER_A', 0);

INSERT INTO public.participants (id, group_id, name, username, invited_user_id, invitation_status)
VALUES
  (
    '50000000-0000-4000-8000-aaaaaaaaaaaa',
    '40000000-0000-4000-8000-000000000001',
    'Alice',
    :'USER_A_USERNAME',
    :'USER_A',
    2
  ),
  (
    '50000000-0000-4000-8000-bbbbbbbbbbbb',
    '40000000-0000-4000-8000-000000000001',
    'Bob',
    :'USER_B_USERNAME',
    :'USER_B',
    1
  );

SELECT set_config('request.jwt.claim.sub', :'USER_B', true);

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: pending invitee sees group'; END IF;

  SELECT count(*) INTO n FROM public.participants
    WHERE group_id = '40000000-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: pending invitee sees participants'; END IF;

  UPDATE public.groups SET name = 'hacked'
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: non-creator updated group'; END IF;

  DELETE FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: non-creator deleted group'; END IF;
END $$;

SELECT public.accept_invitation('50000000-0000-4000-8000-bbbbbbbbbbbb'::UUID);

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: accepted invitee cannot SELECT group'; END IF;

  UPDATE public.groups SET name = 'hacked-after-accept'
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: accepted invitee updated group'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', :'USER_A', true);
SELECT set_config('test.expected_user_b', :'USER_B', true);
SELECT set_config('test.expected_username', :'USER_B_USERNAME', true);

DO $$
DECLARE
  r RECORD;
  cnt INT := 0;
  expected_user_b UUID := current_setting('test.expected_user_b')::UUID;
  expected_username TEXT := current_setting('test.expected_username');
BEGIN
  FOR r IN SELECT * FROM public.search_user_by_username(expected_username) LOOP
    cnt := cnt + 1;
    IF r.id <> expected_user_b THEN
      RAISE EXCEPTION 'RPC FAIL: wrong user id (got %)', r.id;
    END IF;
  END LOOP;

  IF cnt <> 1 THEN
    RAISE EXCEPTION 'RPC FAIL: expected exactly 1 match, got %', cnt;
  END IF;
END $$;

DO $$
DECLARE col_count INT;
BEGIN
  SELECT count(*) INTO col_count
  FROM information_schema.parameters
  WHERE specific_schema = 'public'
    AND specific_name LIKE 'search_user_by_username%'
    AND parameter_mode = 'OUT';

  IF col_count <> 3 THEN
    RAISE EXCEPTION 'AUDIT FAIL: search_user_by_username must return exactly 3 OUT columns, got %', col_count;
  END IF;
END $$;

ROLLBACK;
SELECT 'phase-4 rls smoke passed' AS result;
