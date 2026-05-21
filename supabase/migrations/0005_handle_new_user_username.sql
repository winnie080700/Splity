CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, username, created_at_utc)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    now()
  );

  RETURN NEW;
END;
$$;
