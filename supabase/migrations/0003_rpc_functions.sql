CREATE OR REPLACE FUNCTION public.create_bill_with_items(
  p_group_id UUID,
  p_input JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill_id UUID := COALESCE((p_input->>'id')::UUID, gen_random_uuid());
BEGIN
  INSERT INTO public.bills (
    id,
    group_id,
    store_name,
    reference_image_data_url,
    transaction_date_utc,
    currency_code,
    split_mode,
    primary_payer_participant_id,
    created_at_utc,
    updated_at_utc
  )
  VALUES (
    v_bill_id,
    p_group_id,
    p_input->>'store_name',
    p_input->>'reference_image_data_url',
    (p_input->>'transaction_date_utc')::TIMESTAMPTZ,
    COALESCE(p_input->>'currency_code', 'MYR'),
    (p_input->>'split_mode')::SMALLINT,
    (p_input->>'primary_payer_participant_id')::UUID,
    COALESCE((p_input->>'created_at_utc')::TIMESTAMPTZ, now()),
    COALESCE((p_input->>'updated_at_utc')::TIMESTAMPTZ, now())
  );

  INSERT INTO public.bill_items (id, bill_id, description, amount)
  SELECT COALESCE(x.id, gen_random_uuid()), v_bill_id, x.description, x.amount
  FROM jsonb_to_recordset(COALESCE(p_input->'items', '[]'::JSONB))
    AS x(id UUID, description TEXT, amount NUMERIC);

  INSERT INTO public.bill_fees (id, bill_id, name, fee_type, value)
  SELECT COALESCE(x.id, gen_random_uuid()), v_bill_id, x.name, x.fee_type, x.value
  FROM jsonb_to_recordset(COALESCE(p_input->'fees', '[]'::JSONB))
    AS x(id UUID, name TEXT, fee_type SMALLINT, value NUMERIC);

  INSERT INTO public.bill_shares (
    id,
    bill_id,
    participant_id,
    weight,
    pre_fee_amount,
    fee_amount,
    total_share_amount
  )
  SELECT
    COALESCE(x.id, gen_random_uuid()),
    v_bill_id,
    x.participant_id,
    x.weight,
    x.pre_fee_amount,
    x.fee_amount,
    x.total_share_amount
  FROM jsonb_to_recordset(COALESCE(p_input->'shares', '[]'::JSONB))
    AS x(
      id UUID,
      participant_id UUID,
      weight NUMERIC,
      pre_fee_amount NUMERIC,
      fee_amount NUMERIC,
      total_share_amount NUMERIC
    );

  INSERT INTO public.payment_contributions (id, bill_id, participant_id, amount, created_at_utc)
  SELECT COALESCE(x.id, gen_random_uuid()), v_bill_id, x.participant_id, x.amount, COALESCE(x.created_at_utc, now())
  FROM jsonb_to_recordset(COALESCE(p_input->'payment_contributions', '[]'::JSONB))
    AS x(id UUID, participant_id UUID, amount NUMERIC, created_at_utc TIMESTAMPTZ);

  INSERT INTO public.bill_item_responsibilities (id, bill_item_id, participant_id)
  SELECT COALESCE(x.id, gen_random_uuid()), x.bill_item_id, x.participant_id
  FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB))
    AS x(id UUID, bill_item_id UUID, participant_id UUID);

  RETURN v_bill_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_bill_with_items(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bill_with_items(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_bill_with_items(
  p_bill_id UUID,
  p_input JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT b.group_id INTO v_group_id
  FROM public.bills b
  WHERE b.id = p_bill_id;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'bill not found' USING ERRCODE = '02000';
  END IF;

  UPDATE public.bills
  SET store_name = COALESCE(p_input->>'store_name', store_name),
      reference_image_data_url = p_input->>'reference_image_data_url',
      transaction_date_utc = COALESCE((p_input->>'transaction_date_utc')::TIMESTAMPTZ, transaction_date_utc),
      currency_code = COALESCE(p_input->>'currency_code', currency_code),
      split_mode = COALESCE((p_input->>'split_mode')::SMALLINT, split_mode),
      primary_payer_participant_id = COALESCE((p_input->>'primary_payer_participant_id')::UUID, primary_payer_participant_id),
      updated_at_utc = now()
  WHERE id = p_bill_id;

  DELETE FROM public.bill_item_responsibilities
  WHERE bill_item_id IN (SELECT id FROM public.bill_items WHERE bill_id = p_bill_id);
  DELETE FROM public.bill_fees WHERE bill_id = p_bill_id;
  DELETE FROM public.bill_shares WHERE bill_id = p_bill_id;
  DELETE FROM public.payment_contributions WHERE bill_id = p_bill_id;
  DELETE FROM public.bill_items WHERE bill_id = p_bill_id;

  INSERT INTO public.bill_items (id, bill_id, description, amount)
  SELECT COALESCE(x.id, gen_random_uuid()), p_bill_id, x.description, x.amount
  FROM jsonb_to_recordset(COALESCE(p_input->'items', '[]'::JSONB))
    AS x(id UUID, description TEXT, amount NUMERIC);

  INSERT INTO public.bill_fees (id, bill_id, name, fee_type, value)
  SELECT COALESCE(x.id, gen_random_uuid()), p_bill_id, x.name, x.fee_type, x.value
  FROM jsonb_to_recordset(COALESCE(p_input->'fees', '[]'::JSONB))
    AS x(id UUID, name TEXT, fee_type SMALLINT, value NUMERIC);

  INSERT INTO public.bill_shares (id, bill_id, participant_id, weight, pre_fee_amount, fee_amount, total_share_amount)
  SELECT COALESCE(x.id, gen_random_uuid()), p_bill_id, x.participant_id, x.weight, x.pre_fee_amount, x.fee_amount, x.total_share_amount
  FROM jsonb_to_recordset(COALESCE(p_input->'shares', '[]'::JSONB))
    AS x(id UUID, participant_id UUID, weight NUMERIC, pre_fee_amount NUMERIC, fee_amount NUMERIC, total_share_amount NUMERIC);

  INSERT INTO public.payment_contributions (id, bill_id, participant_id, amount, created_at_utc)
  SELECT COALESCE(x.id, gen_random_uuid()), p_bill_id, x.participant_id, x.amount, COALESCE(x.created_at_utc, now())
  FROM jsonb_to_recordset(COALESCE(p_input->'payment_contributions', '[]'::JSONB))
    AS x(id UUID, participant_id UUID, amount NUMERIC, created_at_utc TIMESTAMPTZ);

  INSERT INTO public.bill_item_responsibilities (id, bill_item_id, participant_id)
  SELECT COALESCE(x.id, gen_random_uuid()), x.bill_item_id, x.participant_id
  FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB))
    AS x(id UUID, bill_item_id UUID, participant_id UUID);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_bill_with_items(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_bill_with_items(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE(user_id UUID, name TEXT, username TEXT, is_creator BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.name::TEXT, u.username::TEXT, true
  FROM public.groups g
  JOIN public.app_users u ON u.id = g.created_by_user_id
  WHERE g.id = p_group_id
    AND public.is_group_member(p_group_id)
  UNION
  SELECT u.id, u.name::TEXT, u.username::TEXT, false
  FROM public.participants p
  JOIN public.app_users u ON u.id = p.invited_user_id
  WHERE p.group_id = p_group_id
    AND p.invitation_status = 2
    AND public.is_group_member(p_group_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_group_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_participant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.participants
  SET invitation_status = 2
  WHERE id = p_participant_id
    AND invited_user_id = (select auth.uid())
    AND invitation_status = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_invitation(p_participant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.participants
  SET invitation_status = 3
  WHERE id = p_participant_id
    AND invited_user_id = (select auth.uid())
    AND invitation_status = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decline_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_invitation(UUID) TO authenticated;

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.participants p_from
    JOIN public.participants p_to ON p_to.group_id = p_from.group_id
    WHERE p_from.id = p_from_participant_id
      AND p_to.id = p_to_participant_id
      AND p_from.group_id = p_group_id
  ) THEN
    RAISE EXCEPTION 'transfer participants are not in group' USING ERRCODE = '22023';
  END IF;

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

    IF p_action = 'mark_received' AND v_existing.status < 1 THEN
      RAISE EXCEPTION 'must mark paid first' USING ERRCODE = '22023';
    END IF;

    UPDATE public.settlement_transfer_confirmations
    SET status = CASE p_action WHEN 'mark_paid' THEN 1 ELSE 2 END,
        proof_screenshot_data_url = COALESCE(p_proof_screenshot_data_url, proof_screenshot_data_url),
        marked_paid_at_utc = CASE
          WHEN p_action = 'mark_paid' AND marked_paid_at_utc IS NULL THEN v_now
          ELSE marked_paid_at_utc
        END,
        marked_received_at_utc = CASE
          WHEN p_action = 'mark_received' THEN v_now
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

CREATE OR REPLACE FUNCTION public.resolve_share_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link public.settlement_share_links%ROWTYPE;
  v_transfers JSONB;
BEGIN
  SELECT * INTO v_link
  FROM public.settlement_share_links
  WHERE share_token = p_token AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'from_name', p_from.name,
      'to_name', p_to.name,
      'amount', c.amount::TEXT,
      'status', c.status,
      'marked_paid_at_utc', c.marked_paid_at_utc,
      'marked_received_at_utc', c.marked_received_at_utc
    )
    ORDER BY c.updated_at_utc, c.transfer_key
  )
  INTO v_transfers
  FROM public.settlement_transfer_confirmations c
  JOIN public.participants p_from ON p_from.id = c.from_participant_id
  JOIN public.participants p_to ON p_to.id = c.to_participant_id
  WHERE c.group_id = v_link.group_id
    AND (v_link.from_date_utc IS NULL OR c.from_date_utc IS NOT DISTINCT FROM v_link.from_date_utc)
    AND (v_link.to_date_utc IS NULL OR c.to_date_utc IS NOT DISTINCT FROM v_link.to_date_utc);

  RETURN jsonb_build_object(
    'share_token', v_link.share_token,
    'from_date_utc', v_link.from_date_utc,
    'to_date_utc', v_link.to_date_utc,
    'creator_name', v_link.creator_name,
    'payee_name', v_link.payee_name,
    'payment_method', v_link.payment_method,
    'account_name', v_link.account_name,
    'account_number', v_link.account_number,
    'notes', v_link.notes,
    'payment_qr_data_url', v_link.payment_qr_data_url,
    'receiver_payment_infos_json', v_link.receiver_payment_infos_json,
    'created_at_utc', v_link.created_at_utc,
    'transfers', COALESCE(v_transfers, '[]'::JSONB)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_share_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(TEXT) TO anon, authenticated;
