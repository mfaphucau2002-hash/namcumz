-- STAGING cnawquqkeogzmvucmjes only.
-- Migration 003: Login Top-up catalog, credentials isolation, and create_topup_order RPC.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $guard$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'staging_002_workflows')
  OR EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'staging_003_login_topup') THEN
    RAISE EXCEPTION 'staging_002 missing or staging_003 already applied';
  END IF;
END $guard$;

-- 1. Allow 'login' packages
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_type_check;
ALTER TABLE public.packages ADD CONSTRAINT packages_type_check CHECK(type IN ('login', 'uid'));
ALTER TABLE public.packages ALTER COLUMN type SET DEFAULT 'login';

-- 2. Isolated table for game credentials with strict RLS
CREATE TABLE public.order_credentials (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  login_method text NOT NULL DEFAULT 'Hoyoverse' CHECK(char_length(login_method) BETWEEN 1 AND 50),
  account_username text NOT NULL CHECK(char_length(account_username) BETWEEN 1 AND 200),
  account_password text NOT NULL CHECK(char_length(account_password) BETWEEN 1 AND 500),
  contact_phone text NOT NULL CHECK(char_length(contact_phone) BETWEEN 8 AND 25),
  notes text NOT NULL DEFAULT '' CHECK(char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.order_credentials TO authenticated;

-- RLS: Only the customer who owns the order, the assigned booster, or admins can read credentials
CREATE POLICY credentials_read ON public.order_credentials FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_credentials.order_id 
    AND (o.user_id = auth.uid() OR o.booster_id = auth.uid() OR namcumz_private.is_admin())
  ));

-- 3. Top-up order creation RPC
CREATE FUNCTION public.create_topup_order(
  p_request uuid,
  p_package uuid,
  p_server text,
  p_login_method text,
  p_account text,
  p_password text,
  p_phone text,
  p_notes text DEFAULT ''
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
  o public.orders;
  pkg public.packages;
  clean_acc text := trim(p_account);
  clean_pass text := trim(p_password);
  clean_phone text := trim(p_phone);
  clean_notes text := trim(coalesce(p_notes, ''));
  clean_method text := trim(coalesce(p_login_method, 'Hoyoverse'));
  order_summary text;
BEGIN
  IF p_request IS NULL OR p_package IS NULL THEN RAISE EXCEPTION 'Thiếu mã yêu cầu hoặc gói nạp'; END IF;
  IF p_server NOT IN ('Asia', 'America', 'Europe', 'TW/HK/MO') THEN RAISE EXCEPTION 'Máy chủ không hợp lệ'; END IF;
  IF char_length(clean_acc) NOT BETWEEN 1 AND 200 OR char_length(clean_pass) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Tài khoản hoặc mật khẩu không hợp lệ';
  END IF;
  IF clean_phone !~ '^[0-9+ .()\-]{8,25}$' THEN RAISE EXCEPTION 'Số điện thoại Zalo liên hệ không hợp lệ'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO o FROM public.orders WHERE user_id = uid AND request_id = p_request;
  IF FOUND THEN RETURN o; END IF;

  PERFORM namcumz_private.rate_limit('topup:' || uid::text, 10, 3600);

  SELECT * INTO pkg FROM public.packages WHERE id = p_package AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gói nạp không tồn tại hoặc đã ngừng hỗ trợ'; END IF;

  order_summary := '[' || p_server || '] [' || pkg.game || '] ' || pkg.name || 
                   E'\nPhương thức: ' || clean_method || 
                   E'\nSĐT Zalo: ' || clean_phone ||
                   CASE WHEN clean_notes <> '' THEN E'\nGhi chú: ' || left(clean_notes, 500) ELSE '' END;

  -- Insert with default price=0 to satisfy prepare_order check, then update with verified catalog price
  INSERT INTO public.orders (
    content, game_server, request_id, kind, package_id
  ) VALUES (
    order_summary, p_server, p_request, 'topup', pkg.id
  ) RETURNING * INTO o;

  UPDATE public.orders 
  SET price = pkg.price, required_amount = pkg.price, quote_accepted = true 
  WHERE id = o.id RETURNING * INTO o;

  INSERT INTO public.order_credentials (
    order_id, login_method, account_username, account_password, contact_phone, notes
  ) VALUES (
    o.id, clean_method, clean_acc, clean_pass, clean_phone, clean_notes
  );

  RETURN o;
END $fn$;

REVOKE ALL ON FUNCTION public.create_topup_order(uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_topup_order(uuid, uuid, text, text, text, text, text, text) TO authenticated;

-- 4. Seed official packages (Genshin, HSR, ZZZ, WuWa)
INSERT INTO public.packages (id, game, name, price, active, type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Genshin Impact', 'Không Nguyệt Chúc Phúc (Thẻ Tháng)', 85000, true, 'login'),
  ('10000000-0000-0000-0000-000000000002', 'Genshin Impact', '60 Đá Sáng Thế', 20000, true, 'login'),
  ('10000000-0000-0000-0000-000000000003', 'Genshin Impact', '300 + 30 Đá Sáng Thế', 90000, true, 'login'),
  ('10000000-0000-0000-0000-000000000004', 'Genshin Impact', '980 + 110 Đá Sáng Thế', 270000, true, 'login'),
  ('10000000-0000-0000-0000-000000000005', 'Genshin Impact', '1980 + 260 Đá Sáng Thế', 570000, true, 'login'),
  ('10000000-0000-0000-0000-000000000006', 'Genshin Impact', '3280 + 600 Đá Sáng Thế', 950000, true, 'login'),
  ('10000000-0000-0000-0000-000000000007', 'Genshin Impact', '6480 + 1600 Đá Sáng Thế', 1850000, true, 'login'),
  ('10000000-0000-0000-0000-000000000008', 'Genshin Impact', 'FULL PACK GENSHIN IMPACT', 3800000, true, 'login'),

  ('20000000-0000-0000-0000-000000000001', 'Honkai Star Rail', 'Thẻ Tháng Express Supply Pass', 75000, true, 'login'),
  ('20000000-0000-0000-0000-000000000002', 'Honkai Star Rail', '60 Mộng Cảnh', 17000, true, 'login'),
  ('20000000-0000-0000-0000-000000000003', 'Honkai Star Rail', '300 + 30 Mộng Cảnh', 75000, true, 'login'),
  ('20000000-0000-0000-0000-000000000004', 'Honkai Star Rail', '980 + 110 Mộng Cảnh', 218000, true, 'login'),
  ('20000000-0000-0000-0000-000000000005', 'Honkai Star Rail', '1980 + 260 Mộng Cảnh', 436000, true, 'login'),
  ('20000000-0000-0000-0000-000000000006', 'Honkai Star Rail', '3280 + 600 Mộng Cảnh', 726000, true, 'login'),
  ('20000000-0000-0000-0000-000000000007', 'Honkai Star Rail', '6480 + 1600 Mộng Cảnh', 1452000, true, 'login'),
  ('20000000-0000-0000-0000-000000000008', 'Honkai Star Rail', 'Nameless Glory (Battle Pass)', 180000, true, 'login'),

  ('30000000-0000-0000-0000-000000000001', 'Zenless Zone Zero', 'Thẻ Tháng Ổn Định (30 ngày)', 80000, true, 'login'),
  ('30000000-0000-0000-0000-000000000002', 'Zenless Zone Zero', '60 Polychrome', 18000, true, 'login'),
  ('30000000-0000-0000-0000-000000000003', 'Zenless Zone Zero', '300 + 30 Polychrome', 85000, true, 'login'),
  ('30000000-0000-0000-0000-000000000004', 'Zenless Zone Zero', '980 + 110 Polychrome', 250000, true, 'login'),
  ('30000000-0000-0000-0000-000000000005', 'Zenless Zone Zero', '1980 + 260 Polychrome', 500000, true, 'login'),
  ('30000000-0000-0000-0000-000000000006', 'Zenless Zone Zero', '3280 + 600 Polychrome', 830000, true, 'login'),
  ('30000000-0000-0000-0000-000000000007', 'Zenless Zone Zero', '6480 + 1600 Polychrome', 1660000, true, 'login'),

  ('40000000-0000-0000-0000-000000000001', 'Wuthering Waves', 'Lunite Subscription (Thẻ Tháng)', 80000, true, 'login'),
  ('40000000-0000-0000-0000-000000000002', 'Wuthering Waves', '60 Astrite', 17000, true, 'login'),
  ('40000000-0000-0000-0000-000000000003', 'Wuthering Waves', '300 + 30 Astrite', 80000, true, 'login'),
  ('40000000-0000-0000-0000-000000000004', 'Wuthering Waves', '980 + 110 Astrite', 240000, true, 'login'),
  ('40000000-0000-0000-0000-000000000005', 'Wuthering Waves', '1980 + 260 Astrite', 480000, true, 'login'),
  ('40000000-0000-0000-0000-000000000006', 'Wuthering Waves', '3280 + 600 Astrite', 800000, true, 'login'),
  ('40000000-0000-0000-0000-000000000007', 'Wuthering Waves', '6480 + 1600 Astrite', 1600000, true, 'login')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, active = EXCLUDED.active, type = EXCLUDED.type;

INSERT INTO namcumz_private.migrations(version) VALUES('staging_003_login_topup');
COMMIT;
SELECT 'staging_003_login_topup installed' AS result;
