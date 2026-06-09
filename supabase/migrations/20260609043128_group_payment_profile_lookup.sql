CREATE OR REPLACE FUNCTION public.list_group_payment_profiles(
  p_group_id UUID,
  p_user_ids UUID[]
)
RETURNS TABLE (
  user_id UUID,
  payee_name TEXT,
  payment_method TEXT,
  account_name TEXT,
  account_number TEXT,
  notes TEXT,
  payment_qr_data_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id AS user_id,
    u.default_payment_payee_name::TEXT AS payee_name,
    u.default_payment_method::TEXT AS payment_method,
    u.default_payment_account_name::TEXT AS account_name,
    u.default_payment_account_number::TEXT AS account_number,
    u.default_payment_notes::TEXT AS notes,
    u.default_payment_qr_data_url::TEXT AS payment_qr_data_url
  FROM public.app_users u
  WHERE u.id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = p_group_id
        AND (
          g.created_by_user_id = (SELECT auth.uid())
          OR public.is_group_member(g.id)
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.participants p
      WHERE p.group_id = p_group_id
        AND p.invited_user_id = u.id
        AND p.invitation_status IN (1, 2)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.list_group_payment_profiles(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_group_payment_profiles(UUID, UUID[]) TO authenticated;

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
      'from_participant_id', c.from_participant_id,
      'to_participant_id', c.to_participant_id,
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
