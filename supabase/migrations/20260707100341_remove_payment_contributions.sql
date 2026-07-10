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
  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.status = 0
  ) THEN
    RAISE EXCEPTION 'group is not writable' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.id = (p_input->>'primary_payer_participant_id')::UUID
      AND p.group_id = p_group_id
  ) THEN
    RAISE EXCEPTION 'primary payer participant is not in group %', p_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'shares', '[]'::JSONB)) AS x(participant_id UUID)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.participants p WHERE p.id = x.participant_id AND p.group_id = p_group_id
    )
  ) THEN
    RAISE EXCEPTION 'bill share participant is not in group %', p_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB)) AS x(participant_id UUID)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.participants p WHERE p.id = x.participant_id AND p.group_id = p_group_id
    )
  ) THEN
    RAISE EXCEPTION 'bill item responsibility participant is not in group %', p_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB)) AS r(bill_item_id UUID)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_input->'items', '[]'::JSONB)) AS i(id UUID)
      WHERE i.id = r.bill_item_id
    )
  ) THEN
    RAISE EXCEPTION 'responsibility bill_item_id must reference an item in this payload' USING ERRCODE = '23514';
  END IF;

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
  v_target_group_id UUID;
BEGIN
  SELECT b.group_id INTO v_target_group_id
  FROM public.bills b
  WHERE b.id = p_bill_id;

  IF v_target_group_id IS NULL THEN
    RAISE EXCEPTION 'bill not found' USING ERRCODE = '02000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = v_target_group_id
      AND g.status = 0
  ) THEN
    RAISE EXCEPTION 'group is not writable' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.id = (p_input->>'primary_payer_participant_id')::UUID
      AND p.group_id = v_target_group_id
  ) THEN
    RAISE EXCEPTION 'primary payer participant is not in group %', v_target_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'shares', '[]'::JSONB)) AS x(participant_id UUID)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.participants p WHERE p.id = x.participant_id AND p.group_id = v_target_group_id
    )
  ) THEN
    RAISE EXCEPTION 'bill share participant is not in group %', v_target_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB)) AS x(participant_id UUID)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.participants p WHERE p.id = x.participant_id AND p.group_id = v_target_group_id
    )
  ) THEN
    RAISE EXCEPTION 'bill item responsibility participant is not in group %', v_target_group_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB)) AS r(bill_item_id UUID)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_input->'items', '[]'::JSONB)) AS i(id UUID)
      WHERE i.id = r.bill_item_id
    )
  ) THEN
    RAISE EXCEPTION 'responsibility bill_item_id must reference an item in this payload' USING ERRCODE = '23514';
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

  INSERT INTO public.bill_item_responsibilities (id, bill_item_id, participant_id)
  SELECT COALESCE(x.id, gen_random_uuid()), x.bill_item_id, x.participant_id
  FROM jsonb_to_recordset(COALESCE(p_input->'responsibilities', '[]'::JSONB))
    AS x(id UUID, bill_item_id UUID, participant_id UUID);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_bill_with_items(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_bill_with_items(UUID, JSONB) TO authenticated;

DROP TABLE IF EXISTS public.payment_contributions CASCADE;
DROP FUNCTION IF EXISTS public.trg_payment_contributions_integrity() CASCADE;
