-- Repair legacy profiles that have no usable display_name/username.
-- Only replaces the existing insert trigger function; no role grants or customer-row updates.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE IF NOT EXISTS namcumz_private.order_identity_function_backup (
  function_name text PRIMARY KEY,
  definition text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE namcumz_private.order_identity_function_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON namcumz_private.order_identity_function_backup FROM PUBLIC, anon, authenticated;
INSERT INTO namcumz_private.order_identity_function_backup(function_name, definition)
SELECT 'namcumz_private.prepare_order()', pg_get_functiondef('namcumz_private.prepare_order()'::regprocedure)
ON CONFLICT (function_name) DO NOTHING;
CREATE OR REPLACE FUNCTION namcumz_private.prepare_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated owner required' USING ERRCODE = '42501';
  END IF;
  IF NEW.price <> 0 OR NEW.status <> 'cho_xu_ly' OR NEW.booster_id IS NOT NULL
     OR NEW.rating IS NOT NULL OR NEW.review_comment IS NOT NULL OR NEW.ai_plan IS NOT NULL
     OR NEW.secret_code IS NOT NULL THEN
    RAISE EXCEPTION 'Client cannot assign price, status, booster, review or private fields' USING ERRCODE = '42501';
  END IF;
  NEW.order_code := 'DH-' || gen_random_uuid()::text;
  NEW.created_at := now();
  NEW.booster_name := 'Chưa nhận';
  SELECT coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), '')) INTO NEW.renter_name
  FROM public.user_roles WHERE id = auth.uid();
  IF NEW.renter_name IS NULL THEN
    SELECT left(coalesce(nullif(btrim(raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(email, '@', 1), ''), 'Khách hàng'), 100)
    INTO NEW.renter_name FROM auth.users WHERE id = auth.uid();
  END IF;
  IF NEW.renter_name IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ tài khoản chưa hoàn tất. Vui lòng liên hệ hỗ trợ.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $fn$;
NOTIFY pgrst, 'reload schema';
COMMIT;