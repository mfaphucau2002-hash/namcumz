-- =====================================================================
-- NAMCUMZ PRODUCTION SECURITY HARDENING MIGRATION: 012_SECURITY_HARDENING
-- Fixes:
--   - R4: Lock down legacy public.quote_requests (RLS + admin-only SELECT)
--   - R5: Reject plaintext password indicators in public.create_order notes
-- Non-destructive (NO DROP TABLE / DELETE / TRUNCATE), idempotent,
-- preserves public.app_contract_version() for zero-downtime live frontend.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- 1. Preflight: require 009 launch access foundation
DO $preflight$
BEGIN
  IF to_regclass('namcumz_private.migrations') IS NULL THEN
    RAISE EXCEPTION 'Migration ledger namcumz_private.migrations missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_009_launch_access'
  ) THEN
    RAISE EXCEPTION 'Migration production_009_launch_access required before production_012_security_hardening';
  END IF;
END $preflight$;

-- 2. R4: Lock down legacy public.quote_requests if present
DO $r4_quote_requests$
DECLARE
  policy_row record;
BEGIN
  IF to_regclass('public.quote_requests') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY';

    FOR policy_row IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'quote_requests'
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I.%I',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename
      );
    END LOOP;

    EXECUTE 'REVOKE ALL ON public.quote_requests FROM PUBLIC, anon, authenticated';

    EXECUTE 'CREATE POLICY quote_requests_admin_read ON public.quote_requests FOR SELECT TO authenticated USING (namcumz_private.is_admin())';

    EXECUTE 'GRANT SELECT ON public.quote_requests TO authenticated';
  END IF;
END $r4_quote_requests$;

-- 3. R5: Guard public.create_order against plaintext password leaks in order notes
-- Preserves exact signature, SECURITY DEFINER SET search_path = '', rate limit,
-- idempotency, grants, and existing behavior for all valid orders.
CREATE OR REPLACE FUNCTION public.create_order(
  p_request uuid,
  p_content text,
  p_server text,
  p_package uuid DEFAULT NULL,
  p_uid text DEFAULT NULL
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
  o public.orders;
  pkg public.packages;
  clean_content text;
  sanitized_for_pass_check text;
BEGIN
  IF p_request IS NULL OR p_content IS NULL OR char_length(trim(p_content)) NOT BETWEEN 1 AND 10000 OR p_server NOT IN ('Asia','Europe','America','TW/HK/MO') THEN
    RAISE EXCEPTION 'Thông tin đơn không hợp lệ';
  END IF;

  clean_content := trim(p_content);

  -- Strip known legitimate gaming pass terms before checking password indicators
  -- so requests mentioning "Battle Pass" or "Express Supply Pass" never false-positive.
  sanitized_for_pass_check := regexp_replace(
    clean_content,
    '(battle|supply|season|monthly|event)\s+pass',
    '',
    'gi'
  );

  IF sanitized_for_pass_check ~* '(^|[\s,;|/(\[])(mk|m[ậẬa]t\s*kh[ẩẨa]u|pass|password|pw)\s*[:=]' THEN
    RAISE EXCEPTION 'Không nhập mật khẩu tài khoản game vào nội dung ghi chú đơn hàng.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO o FROM public.orders WHERE user_id = uid AND request_id = p_request;
  IF FOUND THEN
    IF o.content <> clean_content OR o.game_server <> p_server OR o.package_id IS DISTINCT FROM p_package OR o.game_uid IS DISTINCT FROM p_uid THEN
      RAISE EXCEPTION 'Mã yêu cầu đã dùng cho nội dung khác';
    END IF;
    RETURN o;
  END IF;

  PERFORM namcumz_private.rate_limit('order:' || uid::text, 10, 3600);
  IF p_package IS NOT NULL THEN
    SELECT * INTO pkg FROM public.packages WHERE id = p_package AND active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Gói nạp không hợp lệ'; END IF;
  END IF;

  INSERT INTO public.orders(content, game_server, request_id, kind, package_id, game_uid)
  VALUES(clean_content, p_server, p_request, CASE WHEN p_package IS NULL THEN 'boost' ELSE 'topup' END, p_package, p_uid)
  RETURNING * INTO o;

  IF p_package IS NOT NULL THEN
    UPDATE public.orders SET price = pkg.price, required_amount = pkg.price, quote_accepted = true WHERE id = o.id RETURNING * INTO o;
  END IF;
  RETURN o;
END $fn$;

REVOKE ALL ON FUNCTION public.create_order(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, text, uuid, text) TO authenticated;

-- 4. Record migration (keep app_contract_version() unchanged for zero-downtime rollout)
INSERT INTO namcumz_private.migrations(version)
VALUES ('production_012_security_hardening')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
