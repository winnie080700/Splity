CREATE OR REPLACE FUNCTION public.search_user_by_username(p_username TEXT)
RETURNS TABLE(id UUID, name TEXT, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_username IS NULL OR btrim(p_username) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.name::TEXT, u.username::TEXT
  FROM public.app_users u
  WHERE u.username IS NOT NULL
    AND lower(u.username) = lower(btrim(p_username))
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_user_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_by_username(TEXT) TO authenticated;
