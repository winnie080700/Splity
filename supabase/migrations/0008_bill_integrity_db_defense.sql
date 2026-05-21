CREATE OR REPLACE FUNCTION public.assert_bill_writable(p_bill_id UUID, p_participant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.bills b
    JOIN public.groups g ON g.id = b.group_id
    JOIN public.participants p ON p.id = p_participant_id
    WHERE b.id = p_bill_id
      AND p.group_id = b.group_id
      AND g.status = 0
  ) THEN
    RAISE EXCEPTION 'bill participant is not writable for this bill' USING ERRCODE = '23514';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_bill_writable(UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.trg_bills_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    JOIN public.participants p ON p.id = NEW.primary_payer_participant_id
    WHERE g.id = NEW.group_id
      AND p.group_id = NEW.group_id
      AND g.status = 0
  ) THEN
    RAISE EXCEPTION 'bill primary payer is not writable for this group' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_bill_shares_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_bill_writable(NEW.bill_id, NEW.participant_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_payment_contributions_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_bill_writable(NEW.bill_id, NEW.participant_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_bill_item_resp_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill_id UUID;
BEGIN
  SELECT bi.bill_id INTO v_bill_id
  FROM public.bill_items bi
  WHERE bi.id = NEW.bill_item_id;

  IF v_bill_id IS NULL THEN
    RAISE EXCEPTION 'bill item not found' USING ERRCODE = '23514';
  END IF;

  PERFORM public.assert_bill_writable(v_bill_id, NEW.participant_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_integrity_check ON public.bills;
CREATE TRIGGER bills_integrity_check
BEFORE INSERT OR UPDATE OF group_id, primary_payer_participant_id ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.trg_bills_integrity();

DROP TRIGGER IF EXISTS bill_shares_integrity_check ON public.bill_shares;
CREATE TRIGGER bill_shares_integrity_check
BEFORE INSERT OR UPDATE OF bill_id, participant_id ON public.bill_shares
FOR EACH ROW EXECUTE FUNCTION public.trg_bill_shares_integrity();

DROP TRIGGER IF EXISTS payment_contributions_integrity_check ON public.payment_contributions;
CREATE TRIGGER payment_contributions_integrity_check
BEFORE INSERT OR UPDATE OF bill_id, participant_id ON public.payment_contributions
FOR EACH ROW EXECUTE FUNCTION public.trg_payment_contributions_integrity();

DROP TRIGGER IF EXISTS bill_item_responsibilities_integrity_check ON public.bill_item_responsibilities;
CREATE TRIGGER bill_item_responsibilities_integrity_check
BEFORE INSERT OR UPDATE OF bill_item_id, participant_id ON public.bill_item_responsibilities
FOR EACH ROW EXECUTE FUNCTION public.trg_bill_item_resp_integrity();

DROP POLICY IF EXISTS bills_write_creator ON public.bills;
CREATE POLICY bills_write_creator ON public.bills
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by_user_id = (select auth.uid())
        AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by_user_id = (select auth.uid())
        AND g.status = 0
    )
  );

DROP POLICY IF EXISTS bill_items_write_creator ON public.bill_items;
CREATE POLICY bill_items_write_creator ON public.bill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  );

DROP POLICY IF EXISTS bill_item_responsibilities_write_creator ON public.bill_item_responsibilities;
CREATE POLICY bill_item_responsibilities_write_creator ON public.bill_item_responsibilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      JOIN public.groups g ON g.id = b.group_id
      WHERE bi.id = bill_item_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      JOIN public.groups g ON g.id = b.group_id
      WHERE bi.id = bill_item_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  );

DROP POLICY IF EXISTS bill_fees_write_creator ON public.bill_fees;
CREATE POLICY bill_fees_write_creator ON public.bill_fees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  );

DROP POLICY IF EXISTS bill_shares_write_creator ON public.bill_shares;
CREATE POLICY bill_shares_write_creator ON public.bill_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  );

DROP POLICY IF EXISTS payment_contributions_write_creator ON public.payment_contributions;
CREATE POLICY payment_contributions_write_creator ON public.payment_contributions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid()) AND g.status = 0
    )
  );
