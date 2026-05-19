CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
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
      AND g.created_by_user_id = (select auth.uid())
  ) OR EXISTS (
    SELECT 1
    FROM public.participants p
    WHERE p.group_id = p_group_id
      AND p.invited_user_id = (select auth.uid())
      AND p.invitation_status = 2
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_item_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_transfer_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_share_links ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON
  public.app_users,
  public.groups,
  public.participants,
  public.bills,
  public.bill_items,
  public.bill_item_responsibilities,
  public.bill_fees,
  public.bill_shares,
  public.payment_contributions,
  public.settlement_transfer_confirmations,
  public.settlement_share_links
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.app_users,
  public.groups,
  public.participants,
  public.bills,
  public.bill_items,
  public.bill_item_responsibilities,
  public.bill_fees,
  public.bill_shares,
  public.payment_contributions,
  public.settlement_transfer_confirmations,
  public.settlement_share_links
TO authenticated;

CREATE POLICY app_users_select_self ON public.app_users
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY app_users_update_self ON public.app_users
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY groups_select_member ON public.groups
  FOR SELECT TO authenticated
  USING (created_by_user_id = (select auth.uid()) OR public.is_group_member(id));

CREATE POLICY groups_insert_creator ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = (select auth.uid()));

CREATE POLICY groups_update_creator ON public.groups
  FOR UPDATE TO authenticated
  USING (created_by_user_id = (select auth.uid()))
  WITH CHECK (created_by_user_id = (select auth.uid()));

CREATE POLICY groups_delete_creator ON public.groups
  FOR DELETE TO authenticated
  USING (created_by_user_id = (select auth.uid()));

CREATE POLICY participants_select_member ON public.participants
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY participants_insert_creator ON public.participants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY participants_update_creator ON public.participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY participants_delete_creator ON public.participants
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY bills_select_member ON public.bills
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY bills_write_creator ON public.bills
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY bill_items_select_member ON public.bill_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND public.is_group_member(b.group_id))
  );

CREATE POLICY bill_items_write_creator ON public.bill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE POLICY bill_item_responsibilities_select_member ON public.bill_item_responsibilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bill_items bi JOIN public.bills b ON b.id = bi.bill_id
      WHERE bi.id = bill_item_id AND public.is_group_member(b.group_id)
    )
  );

CREATE POLICY bill_item_responsibilities_write_creator ON public.bill_item_responsibilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      JOIN public.groups g ON g.id = b.group_id
      WHERE bi.id = bill_item_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bill_items bi
      JOIN public.bills b ON b.id = bi.bill_id
      JOIN public.groups g ON g.id = b.group_id
      WHERE bi.id = bill_item_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE POLICY bill_fees_select_member ON public.bill_fees
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND public.is_group_member(b.group_id))
  );

CREATE POLICY bill_fees_write_creator ON public.bill_fees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE POLICY bill_shares_select_member ON public.bill_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND public.is_group_member(b.group_id))
  );

CREATE POLICY bill_shares_write_creator ON public.bill_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE POLICY payment_contributions_select_member ON public.payment_contributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bills b WHERE b.id = bill_id AND public.is_group_member(b.group_id))
  );

CREATE POLICY payment_contributions_write_creator ON public.payment_contributions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b JOIN public.groups g ON g.id = b.group_id
      WHERE b.id = bill_id AND g.created_by_user_id = (select auth.uid())
    )
  );

CREATE POLICY settlement_transfer_confirmations_select_member ON public.settlement_transfer_confirmations
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));

CREATE POLICY settlement_transfer_confirmations_write_creator ON public.settlement_transfer_confirmations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY settlement_share_links_select_creator ON public.settlement_share_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );

CREATE POLICY settlement_share_links_write_creator ON public.settlement_share_links
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by_user_id = (select auth.uid()))
  );
