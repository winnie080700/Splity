CREATE OR REPLACE FUNCTION public.list_my_invitations()
RETURNS TABLE (
  participant_id UUID,
  group_id UUID,
  group_name TEXT,
  invited_by_name TEXT,
  created_at_utc TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id AS participant_id,
    p.group_id,
    g.name::TEXT AS group_name,
    COALESCE(u.name, 'Unknown')::TEXT AS invited_by_name,
    p.created_at_utc
  FROM public.participants p
  JOIN public.groups g ON g.id = p.group_id
  LEFT JOIN public.app_users u ON u.id = g.created_by_user_id
  WHERE p.invited_user_id = (select auth.uid())
    AND p.invitation_status = 1
  ORDER BY p.created_at_utc DESC, p.id;
$$;

REVOKE EXECUTE ON FUNCTION public.list_my_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_invitations() TO authenticated;

DROP POLICY IF EXISTS settlement_share_links_write_creator ON public.settlement_share_links;
DROP POLICY IF EXISTS settlement_share_links_insert_creator ON public.settlement_share_links;
DROP POLICY IF EXISTS settlement_share_links_update_creator ON public.settlement_share_links;

CREATE POLICY settlement_share_links_insert_creator ON public.settlement_share_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by_user_id = (select auth.uid())
        AND g.status = 1
    )
  );

CREATE POLICY settlement_share_links_update_creator ON public.settlement_share_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.trg_settlement_share_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_status SMALLINT;
BEGIN
  SELECT g.status INTO v_group_status
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'settlement share group does not exist' USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.group_id IS DISTINCT FROM OLD.group_id
      OR NEW.share_token IS DISTINCT FROM OLD.share_token
      OR NEW.created_at_utc IS DISTINCT FROM OLD.created_at_utc
    THEN
      RAISE EXCEPTION 'settlement share immutable fields cannot be changed' USING ERRCODE = '23514';
    END IF;

    IF OLD.is_active = TRUE
      AND NEW.is_active = FALSE
      AND NEW.from_date_utc IS NOT DISTINCT FROM OLD.from_date_utc
      AND NEW.to_date_utc IS NOT DISTINCT FROM OLD.to_date_utc
      AND NEW.creator_name IS NOT DISTINCT FROM OLD.creator_name
      AND NEW.payee_name IS NOT DISTINCT FROM OLD.payee_name
      AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method
      AND NEW.account_name IS NOT DISTINCT FROM OLD.account_name
      AND NEW.account_number IS NOT DISTINCT FROM OLD.account_number
      AND NEW.notes IS NOT DISTINCT FROM OLD.notes
      AND NEW.payment_qr_data_url IS NOT DISTINCT FROM OLD.payment_qr_data_url
      AND NEW.receiver_payment_infos_json IS NOT DISTINCT FROM OLD.receiver_payment_infos_json
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_group_status <> 1 THEN
    RAISE EXCEPTION 'settlement share is writable only while group is settling' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlement_share_integrity_check ON public.settlement_share_links;
CREATE TRIGGER settlement_share_integrity_check
BEFORE INSERT OR UPDATE ON public.settlement_share_links
FOR EACH ROW EXECUTE FUNCTION public.trg_settlement_share_integrity();

CREATE OR REPLACE FUNCTION public.regenerate_settlement_share(
  p_group_id UUID,
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_attempt INTEGER := 0;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'p_payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.created_by_user_id = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.status = 1
  ) THEN
    RAISE EXCEPTION 'group is not in settling state' USING ERRCODE = '23514';
  END IF;

  UPDATE public.settlement_share_links
  SET is_active = FALSE
  WHERE group_id = p_group_id
    AND is_active = TRUE;

  WHILE v_attempt < 5 LOOP
    v_attempt := v_attempt + 1;
    v_token := replace(gen_random_uuid()::TEXT, '-', '');

    BEGIN
      INSERT INTO public.settlement_share_links (
        group_id,
        share_token,
        from_date_utc,
        to_date_utc,
        creator_name,
        payee_name,
        payment_method,
        account_name,
        account_number,
        notes,
        payment_qr_data_url,
        receiver_payment_infos_json,
        is_active
      )
      VALUES (
        p_group_id,
        v_token,
        NULLIF(p_payload->>'from_date_utc', '')::TIMESTAMPTZ,
        NULLIF(p_payload->>'to_date_utc', '')::TIMESTAMPTZ,
        NULLIF(p_payload->>'creator_name', ''),
        NULLIF(p_payload->>'payee_name', ''),
        NULLIF(p_payload->>'payment_method', ''),
        NULLIF(p_payload->>'account_name', ''),
        NULLIF(p_payload->>'account_number', ''),
        NULLIF(p_payload->>'notes', ''),
        NULLIF(p_payload->>'payment_qr_data_url', ''),
        NULLIF(p_payload->>'receiver_payment_infos_json', ''),
        TRUE
      );

      RETURN v_token;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RAISE EXCEPTION 'could not generate unique share token' USING ERRCODE = '23505';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_settlement_share(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_settlement_share(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.deactivate_settlement_share(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.created_by_user_id = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.settlement_share_links
  SET is_active = FALSE
  WHERE group_id = p_group_id
    AND is_active = TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deactivate_settlement_share(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_settlement_share(UUID) TO authenticated;
