CREATE OR REPLACE FUNCTION public.assert_settlement_writable(
  p_group_id UUID,
  p_from_participant_id UUID,
  p_to_participant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.participants p_from ON p_from.group_id = g.id
    JOIN public.participants p_to ON p_to.group_id = g.id
    WHERE g.id = p_group_id
      AND p_from.id = p_from_participant_id
      AND p_to.id = p_to_participant_id
      AND g.status = 1
  ) THEN
    RAISE EXCEPTION 'settlement transfer is not writable for this group' USING ERRCODE = '23514';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_settlement_writable(UUID, UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.trg_settlement_transfer_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_settlement_writable(
    NEW.group_id,
    NEW.from_participant_id,
    NEW.to_participant_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlement_transfer_integrity_check ON public.settlement_transfer_confirmations;
CREATE TRIGGER settlement_transfer_integrity_check
BEFORE INSERT OR UPDATE ON public.settlement_transfer_confirmations
FOR EACH ROW EXECUTE FUNCTION public.trg_settlement_transfer_integrity();

DROP POLICY IF EXISTS settlement_transfer_confirmations_write_creator ON public.settlement_transfer_confirmations;
REVOKE INSERT, UPDATE, DELETE ON public.settlement_transfer_confirmations FROM authenticated;

CREATE OR REPLACE FUNCTION public.record_settlement_action(
  p_action TEXT,
  p_group_id UUID,
  p_from_participant_id UUID,
  p_to_participant_id UUID,
  p_amount NUMERIC,
  p_from_date_utc TIMESTAMPTZ,
  p_to_date_utc TIMESTAMPTZ,
  p_actor_participant_id UUID,
  p_transfer_key TEXT,
  p_proof_screenshot_data_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.settlement_transfer_confirmations%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by_user_id = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.status = 1
  ) THEN
    RAISE EXCEPTION 'group is not in settling state' USING ERRCODE = '23514';
  END IF;

  IF p_transfer_key IS NULL OR btrim(p_transfer_key) = '' THEN
    RAISE EXCEPTION 'p_transfer_key is required' USING ERRCODE = '22023';
  END IF;

  IF p_action NOT IN ('mark_paid', 'mark_received') THEN
    RAISE EXCEPTION 'invalid action %', p_action USING ERRCODE = '22023';
  END IF;

  IF p_action = 'mark_paid' AND p_actor_participant_id <> p_from_participant_id THEN
    RAISE EXCEPTION 'actor must equal from_participant' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'mark_received' AND p_actor_participant_id <> p_to_participant_id THEN
    RAISE EXCEPTION 'actor must equal to_participant' USING ERRCODE = '22023';
  END IF;

  PERFORM public.assert_settlement_writable(
    p_group_id,
    p_from_participant_id,
    p_to_participant_id
  );

  SELECT * INTO v_existing
  FROM public.settlement_transfer_confirmations
  WHERE group_id = p_group_id AND transfer_key = p_transfer_key;

  IF NOT FOUND THEN
    IF p_action = 'mark_received' THEN
      RAISE EXCEPTION 'cannot mark received before paid' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.settlement_transfer_confirmations (
      group_id,
      transfer_key,
      from_participant_id,
      to_participant_id,
      amount,
      from_date_utc,
      to_date_utc,
      status,
      proof_screenshot_data_url,
      marked_paid_at_utc,
      updated_at_utc
    )
    VALUES (
      p_group_id,
      p_transfer_key,
      p_from_participant_id,
      p_to_participant_id,
      p_amount,
      p_from_date_utc,
      p_to_date_utc,
      1,
      p_proof_screenshot_data_url,
      v_now,
      v_now
    )
    RETURNING * INTO v_existing;
  ELSE
    IF v_existing.from_participant_id <> p_from_participant_id
      OR v_existing.to_participant_id <> p_to_participant_id
      OR v_existing.amount <> p_amount
      OR v_existing.from_date_utc IS DISTINCT FROM p_from_date_utc
      OR v_existing.to_date_utc IS DISTINCT FROM p_to_date_utc THEN
      RAISE EXCEPTION 'transfer tuple does not match existing transfer_key' USING ERRCODE = '22023';
    END IF;

    IF p_action = 'mark_paid' AND v_existing.status = 2 THEN
      RAISE EXCEPTION 'transfer already received' USING ERRCODE = '23514';
    END IF;

    IF p_action = 'mark_received' AND v_existing.status < 1 THEN
      RAISE EXCEPTION 'must mark paid first' USING ERRCODE = '22023';
    END IF;

    UPDATE public.settlement_transfer_confirmations
    SET status = CASE p_action WHEN 'mark_paid' THEN 1 ELSE 2 END,
        proof_screenshot_data_url = COALESCE(p_proof_screenshot_data_url, proof_screenshot_data_url),
        marked_paid_at_utc = CASE
          WHEN p_action = 'mark_paid' AND marked_paid_at_utc IS NULL THEN v_now
          WHEN p_action = 'mark_received' AND marked_paid_at_utc IS NULL THEN v_now
          ELSE marked_paid_at_utc
        END,
        marked_received_at_utc = CASE
          WHEN p_action = 'mark_received' AND marked_received_at_utc IS NULL THEN v_now
          ELSE marked_received_at_utc
        END,
        updated_at_utc = v_now
    WHERE group_id = p_group_id AND transfer_key = p_transfer_key
    RETURNING * INTO v_existing;
  END IF;

  RETURN to_jsonb(v_existing);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_settlement_action(TEXT, UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_settlement_action(TEXT, UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT) TO authenticated;
