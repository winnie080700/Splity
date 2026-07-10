CREATE OR REPLACE FUNCTION public.can_edit_group_bills(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.status = 0
      AND public.is_group_member(g.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_group_bills(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_group_bills(UUID) TO authenticated;

DROP POLICY IF EXISTS bills_write_creator ON public.bills;
CREATE POLICY bills_write_member ON public.bills
  FOR ALL TO authenticated
  USING (public.can_edit_group_bills(group_id))
  WITH CHECK (public.can_edit_group_bills(group_id));

DROP POLICY IF EXISTS bill_items_write_creator ON public.bill_items;
CREATE POLICY bill_items_write_member ON public.bill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  );

DROP POLICY IF EXISTS bill_item_responsibilities_write_creator ON public.bill_item_responsibilities;
CREATE POLICY bill_item_responsibilities_write_member ON public.bill_item_responsibilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      WHERE bi.id = bill_item_id AND public.can_edit_group_bills(b.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      WHERE bi.id = bill_item_id AND public.can_edit_group_bills(b.group_id)
    )
  );

DROP POLICY IF EXISTS bill_fees_write_creator ON public.bill_fees;
CREATE POLICY bill_fees_write_member ON public.bill_fees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  );

DROP POLICY IF EXISTS bill_shares_write_creator ON public.bill_shares;
CREATE POLICY bill_shares_write_member ON public.bill_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id AND public.can_edit_group_bills(b.group_id)
    )
  );

CREATE TABLE public.group_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  expires_at_utc TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  max_uses INTEGER NOT NULL DEFAULT 50 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  revoked_at_utc TIMESTAMPTZ,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_invite_links_group_id_idx ON public.group_invite_links(group_id);
CREATE UNIQUE INDEX participants_group_invited_user_unique
  ON public.participants(group_id, invited_user_id)
  WHERE invited_user_id IS NOT NULL;
ALTER TABLE public.group_invite_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.group_invite_links TO authenticated;

CREATE POLICY group_invite_links_creator_access ON public.group_invite_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    created_by_user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE TABLE public.group_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  summary_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_activity_logs_group_created_idx
  ON public.group_activity_logs(group_id, created_at_utc DESC);
ALTER TABLE public.group_activity_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.group_activity_logs TO authenticated;
CREATE POLICY group_activity_logs_select_member ON public.group_activity_logs
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.log_group_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_group_id UUID;
  v_event_type TEXT;
  v_summary JSONB := '{}'::JSONB;
BEGIN
  IF TG_TABLE_NAME = 'bills' THEN
    v_group_id := COALESCE(NEW.group_id, OLD.group_id);
    v_event_type := 'bill_' || lower(TG_OP);
    v_summary := jsonb_build_object('storeName', COALESCE(NEW.store_name, OLD.store_name));
  ELSIF TG_TABLE_NAME = 'participants' THEN
    v_group_id := COALESCE(NEW.group_id, OLD.group_id);
    v_event_type := CASE
      WHEN TG_OP = 'INSERT' AND NEW.invited_user_id IS NOT NULL THEN 'participant_invited'
      WHEN TG_OP = 'INSERT' THEN 'participant_added'
      WHEN TG_OP = 'DELETE' THEN 'participant_removed'
      WHEN OLD.invitation_status IS DISTINCT FROM NEW.invitation_status AND NEW.invitation_status = 2 THEN 'participant_joined'
      ELSE 'participant_updated'
    END;
    v_summary := jsonb_build_object('participantName', COALESCE(NEW.name, OLD.name));
  ELSIF TG_TABLE_NAME = 'groups' THEN
    v_group_id := NEW.id;
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
    v_event_type := 'group_status_updated';
    v_summary := jsonb_build_object('status', NEW.status);
  ELSE
    v_group_id := COALESCE(NEW.group_id, OLD.group_id);
    v_event_type := 'transfer_status_updated';
    v_summary := jsonb_build_object(
      'fromParticipantId', COALESCE(NEW.from_participant_id, OLD.from_participant_id),
      'toParticipantId', COALESCE(NEW.to_participant_id, OLD.to_participant_id),
      'status', COALESCE(NEW.status, OLD.status)
    );
  END IF;

  v_summary := v_summary || jsonb_build_object(
    'actorName',
    COALESCE((SELECT name FROM public.app_users WHERE id = (select auth.uid())), 'Splity')
  );
  INSERT INTO public.group_activity_logs(group_id, actor_user_id, event_type, summary_data)
  VALUES (v_group_id, (select auth.uid()), v_event_type, v_summary);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.log_group_activity() FROM PUBLIC;

CREATE TRIGGER log_bill_activity
AFTER INSERT OR UPDATE OR DELETE ON public.bills
FOR EACH ROW EXECUTE FUNCTION private.log_group_activity();

CREATE TRIGGER log_participant_activity
AFTER INSERT OR UPDATE OR DELETE ON public.participants
FOR EACH ROW EXECUTE FUNCTION private.log_group_activity();

CREATE TRIGGER log_group_status_activity
AFTER UPDATE OF status ON public.groups
FOR EACH ROW EXECUTE FUNCTION private.log_group_activity();

CREATE TRIGGER log_transfer_activity
AFTER INSERT OR UPDATE OF status ON public.settlement_transfer_confirmations
FOR EACH ROW EXECUTE FUNCTION private.log_group_activity();

CREATE OR REPLACE FUNCTION public.accept_group_invite_link(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link public.group_invite_links%ROWTYPE;
  v_user public.app_users%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_link
  FROM public.group_invite_links
  WHERE code = p_code
    AND revoked_at_utc IS NULL
    AND expires_at_utc > now()
    AND used_count < max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid invite link' USING ERRCODE = '22023';
  END IF;

  IF public.is_group_member(v_link.group_id) THEN
    RETURN v_link.group_id;
  END IF;

  SELECT * INTO v_user FROM public.app_users WHERE id = (select auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = '02000';
  END IF;

  INSERT INTO public.participants(group_id, name, username, invited_user_id, invitation_status)
  VALUES (v_link.group_id, v_user.name, v_user.username, v_user.id, 2)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    UPDATE public.group_invite_links
    SET used_count = used_count + 1
    WHERE id = v_link.id;
  END IF;

  RETURN v_link.group_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_group_invite_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_group_invite_link(TEXT) TO authenticated;
