-- =====================================================================
-- NAMCUMZ PRODUCTION RELEASE MIGRATION: 001_RELEASE
-- Target project: vqnuutdmcekqkbdvawlw (Production / namcum.io.vn)
-- Consolidates foundation, workflows, and login top-up into an
-- idempotent, non-destructive migration script.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- 1. Private schema for sensitive logic and audit logs
CREATE SCHEMA IF NOT EXISTS namcumz_private;
REVOKE ALL ON SCHEMA namcumz_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA namcumz_private TO authenticated, anon;

-- Migrations ledger
CREATE TABLE IF NOT EXISTS namcumz_private.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Core Tables & Backfills

-- 2.1 user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text NOT NULL CHECK (char_length(username) BETWEEN 1 AND 100),
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100),
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'booster', 'admin', 'super_admin')),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 2000),
  avatar_url text NOT NULL DEFAULT '' CHECK (char_length(avatar_url) <= 2048),
  orders_completed integer NOT NULL DEFAULT 0 CHECK (orders_completed >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS orders_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS username_unique ON public.user_roles(lower(username));

-- Backfill missing user_roles from auth.users (if any exist without profile)
DO $$
DECLARE
  r record;
  uname text;
BEGIN
  FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users WHERE id NOT IN (SELECT id FROM public.user_roles) LOOP
    uname := lower(regexp_replace(coalesce(nullif(split_part(r.email, '@', 1), ''), 'user'), '[^a-z0-9_]', '_', 'g'));
    IF char_length(uname) < 3 THEN uname := 'user_' || substr(r.id::text, 1, 8); END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE lower(username) = uname) THEN
      uname := substr(uname, 1, 20) || '_' || substr(r.id::text, 1, 6);
    END IF;
    INSERT INTO public.user_roles(id, username, display_name, role)
    VALUES (r.id, uname, coalesce(r.raw_user_meta_data->>'display_name', uname), 'customer')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 2.2 packages
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (char_length(game) BETWEEN 1 AND 80),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  price bigint NOT NULL CHECK (price > 0 AND price <= 1000000000),
  active boolean NOT NULL DEFAULT false,
  type text NOT NULL DEFAULT 'login',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'login';
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_type_check;
ALTER TABLE public.packages ADD CONSTRAINT packages_type_check CHECK (type IN ('login', 'uid'));

-- 2.3 orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE DEFAULT ('DH-' || gen_random_uuid()::text),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  renter_name text NOT NULL DEFAULT '' CHECK (char_length(renter_name) <= 100),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  price bigint NOT NULL DEFAULT 0 CHECK (price >= 0),
  status text NOT NULL DEFAULT 'cho_xu_ly' CHECK (status IN ('cho_xu_ly','dang_cay','cho_nghiem_thu','hoan_thanh','tam_dung')),
  booster_id uuid REFERENCES public.user_roles(id),
  booster_name text NOT NULL DEFAULT 'Chưa nhận',
  secret_code text CHECK (secret_code IS NULL),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_comment text CHECK (char_length(review_comment) <= 2000),
  ai_plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS renter_name text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS price bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'cho_xu_ly';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booster_id uuid REFERENCES public.user_roles(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booster_name text NOT NULL DEFAULT 'Chưa nhận';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS secret_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_comment text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ai_plan text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quote_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS required_amount bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS result_note text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS game_server text NOT NULL DEFAULT 'Asia';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'boost';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS package_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS game_uid text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS request_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_package_fk') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_package_fk FOREIGN KEY (package_id) REFERENCES public.packages(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS order_request_unique ON public.orders(user_id, request_id);
CREATE INDEX IF NOT EXISTS orders_owner_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_booster_created ON public.orders(booster_id, created_at DESC);

-- 2.4 order_credentials (isolated for login topup)
CREATE TABLE IF NOT EXISTS public.order_credentials (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  login_method text NOT NULL DEFAULT 'Hoyoverse' CHECK (char_length(login_method) BETWEEN 1 AND 50),
  account_username text NOT NULL CHECK (char_length(account_username) BETWEEN 1 AND 200),
  account_password text NOT NULL CHECK (char_length(account_password) BETWEEN 1 AND 500),
  contact_phone text NOT NULL CHECK (char_length(contact_phone) BETWEEN 8 AND 25),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.5 order_messages
CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 10000),
  attachment_path text,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS message_request_unique ON public.order_messages(sender_id, request_id);
CREATE INDEX IF NOT EXISTS messages_order_created ON public.order_messages(order_id, created_at);

-- 2.6 notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_roles(id),
  order_id uuid REFERENCES public.orders(id),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_owner_created ON public.notifications(user_id, created_at DESC);

-- 2.7 order_logs
CREATE TABLE IF NOT EXISTS public.order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid REFERENCES public.user_roles(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS logs_order_created ON public.order_logs(order_id, created_at);

-- 2.8 support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  order_id uuid REFERENCES public.orders(id),
  issue_type text NOT NULL CHECK (char_length(issue_type) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  response text NOT NULL DEFAULT '',
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS response text NOT NULL DEFAULT '';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS ticket_request_unique ON public.support_tickets(user_id, request_id);
CREATE INDEX IF NOT EXISTS tickets_owner_created ON public.support_tickets(user_id, created_at DESC);

-- 2.9 Private audit tables
CREATE TABLE IF NOT EXISTS namcumz_private.receipts (
  actor uuid NOT NULL, request_id uuid NOT NULL, operation text NOT NULL, fingerprint jsonb NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor, request_id)
);
CREATE TABLE IF NOT EXISTS namcumz_private.limits (
  key text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS namcumz_private.role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL, target uuid NOT NULL,
  old_role text NOT NULL, new_role text NOT NULL, active boolean NOT NULL, reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS namcumz_private.ticket_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  actor uuid NOT NULL, status text NOT NULL, response text NOT NULL, created_at timestamptz DEFAULT now()
);

-- 3. Security Definer Helper Functions (in namcumz_private)

CREATE OR REPLACE FUNCTION namcumz_private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE id = (SELECT auth.uid()) AND active AND role IN ('admin', 'super_admin'));
$fn$;

CREATE OR REPLACE FUNCTION namcumz_private.can_read_order(target_order uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE id = (SELECT auth.uid()) AND active)
  AND EXISTS (SELECT 1 FROM public.orders
    WHERE id = target_order AND (user_id = (SELECT auth.uid()) OR booster_id = (SELECT auth.uid())
      OR namcumz_private.is_admin()));
$fn$;

CREATE OR REPLACE FUNCTION namcumz_private.require_user() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE id = uid AND active) THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập bằng tài khoản đang hoạt động' USING ERRCODE = '42501';
  END IF;
  RETURN uid;
END $fn$;

CREATE OR REPLACE FUNCTION namcumz_private.rate_limit(k text, maximum integer, seconds integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE n integer;
BEGIN
  INSERT INTO namcumz_private.limits AS l(key) VALUES(k)
  ON CONFLICT(key) DO UPDATE SET
    hits = CASE WHEN l.started_at < now() - make_interval(secs => seconds) THEN 1 ELSE l.hits + 1 END,
    started_at = CASE WHEN l.started_at < now() - make_interval(secs => seconds) THEN now() ELSE l.started_at END
  RETURNING hits INTO n;
  IF n > maximum THEN RAISE EXCEPTION 'Thao tác quá nhanh, vui lòng thử lại sau' USING ERRCODE = 'P0001'; END IF;
END $fn$;

CREATE OR REPLACE FUNCTION namcumz_private.on_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uname text;
BEGIN
  uname := lower(trim(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))));
  IF uname !~ '^[a-z0-9_]{3,32}$' THEN
    uname := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  INSERT INTO public.user_roles(id, username, display_name, role) VALUES
    (NEW.id, uname, left(coalesce(NEW.raw_user_meta_data->>'display_name', uname), 100), 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS namcumz_signup ON auth.users;
CREATE TRIGGER namcumz_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION namcumz_private.on_signup();

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
  SELECT coalesce(nullif(display_name, ''), username) INTO NEW.renter_name
  FROM public.user_roles WHERE id = auth.uid();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS namcumz_prepare_order ON public.orders;
CREATE TRIGGER namcumz_prepare_order BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION namcumz_private.prepare_order();

CREATE OR REPLACE FUNCTION namcumz_private.log_order_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  INSERT INTO public.order_logs(order_id, user_id, action) VALUES (NEW.id, auth.uid(), 'Đơn hàng mới được tạo');
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS namcumz_log_order_created ON public.orders;
CREATE TRIGGER namcumz_log_order_created AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION namcumz_private.log_order_created();

CREATE OR REPLACE FUNCTION namcumz_private.prepare_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NEW.sender_id IS DISTINCT FROM auth.uid()
     OR NOT namcumz_private.can_read_order(NEW.order_id) THEN
    RAISE EXCEPTION 'Message sender/order not permitted' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(nullif(display_name, ''), username) INTO NEW.sender_name
  FROM public.user_roles WHERE id = auth.uid();
  NEW.created_at := now();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS namcumz_prepare_message ON public.order_messages;
CREATE TRIGGER namcumz_prepare_message BEFORE INSERT ON public.order_messages
FOR EACH ROW EXECUTE FUNCTION namcumz_private.prepare_message();

-- 4. Public API RPC Functions

-- 4.1 Boosting order creation
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
BEGIN
  IF p_request IS NULL OR char_length(trim(p_content)) NOT BETWEEN 1 AND 10000 OR p_server NOT IN ('Asia','Europe','America','TW/HK/MO') THEN
    RAISE EXCEPTION 'Thông tin đơn không hợp lệ';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO o FROM public.orders WHERE user_id = uid AND request_id = p_request;
  IF FOUND THEN
    IF o.content <> trim(p_content) OR o.game_server <> p_server OR o.package_id IS DISTINCT FROM p_package OR o.game_uid IS DISTINCT FROM p_uid THEN
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
  VALUES(trim(p_content), p_server, p_request, CASE WHEN p_package IS NULL THEN 'boost' ELSE 'topup' END, p_package, p_uid)
  RETURNING * INTO o;
  IF p_package IS NOT NULL THEN
    UPDATE public.orders SET price = pkg.price, required_amount = pkg.price, quote_accepted = true WHERE id = o.id RETURNING * INTO o;
  END IF;
  RETURN o;
END $fn$;

-- 4.2 Login top-up order creation
CREATE OR REPLACE FUNCTION public.create_topup_order(
  p_request uuid,
  p_package uuid,
  p_server text,
  p_login_method text,
  p_account text,
  p_password text,
  p_phone text,
  p_notes text DEFAULT ''
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
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

-- 4.3 Order action state machine
CREATE OR REPLACE FUNCTION public.order_action(
  p_order uuid,
  p_version integer,
  p_action text,
  p_data jsonb,
  p_request uuid
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
  o public.orders;
  role_name text;
  admin_ok boolean := namcumz_private.is_admin();
  receipt namcumz_private.receipts;
  fp jsonb := jsonb_build_object('order', p_order, 'version', p_version, 'action', p_action, 'data', p_data);
  amount bigint;
  needed bigint;
  why text := trim(coalesce(p_data->>'reason', ''));
  target uuid;
BEGIN
  IF p_order IS NULL OR p_version IS NULL OR p_version < 1 OR p_action IS NULL OR p_request IS NULL OR p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Yêu cầu không hợp lệ';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO receipt FROM namcumz_private.receipts WHERE actor = uid AND request_id = p_request;
  IF FOUND THEN
    IF receipt.operation <> 'order' OR receipt.fingerprint <> fp THEN RAISE EXCEPTION 'Mã yêu cầu trùng'; END IF;
    RETURN jsonb_populate_record(NULL::public.orders, receipt.result);
  END IF;
  SELECT role INTO role_name FROM public.user_roles WHERE id = uid;
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đơn'; END IF;
  IF NOT admin_ok AND o.user_id <> uid AND o.booster_id IS DISTINCT FROM uid AND p_action <> 'claim' THEN
    RAISE EXCEPTION 'Không có quyền thao tác đơn này' USING ERRCODE = '42501';
  END IF;
  IF o.version <> p_version THEN RAISE EXCEPTION 'Đơn đã thay đổi. Tải lại trước khi thao tác'; END IF;
  IF o.cancelled THEN RAISE EXCEPTION 'Đơn đã hủy'; END IF;

  CASE p_action
  WHEN 'quote' THEN
    IF NOT admin_ok OR o.status <> 'cho_xu_ly' OR o.paid_amount > 0 OR o.kind <> 'boost' THEN RAISE EXCEPTION 'Không thể báo giá đơn này'; END IF;
    amount := (p_data->>'price')::bigint; needed := (p_data->>'required_amount')::bigint;
    IF amount IS NULL OR needed IS NULL OR amount <= 0 OR amount > 1000000000 OR needed <= 0 OR needed > amount OR why = '' THEN
      RAISE EXCEPTION 'Giá, số tiền cần thu và lý do không hợp lệ';
    END IF;
    o.price := amount; o.required_amount := needed; o.quote_accepted := false;
  WHEN 'approve_quote' THEN
    IF o.user_id <> uid OR o.price <= 0 OR o.status <> 'cho_xu_ly' THEN RAISE EXCEPTION 'Không thể chấp thuận giá'; END IF;
    o.quote_accepted := true;
  WHEN 'payment' THEN
    IF NOT admin_ok OR NOT o.quote_accepted OR o.status <> 'cho_xu_ly' THEN RAISE EXCEPTION 'Chưa đủ điều kiện xác nhận tiền'; END IF;
    amount := (p_data->>'amount')::bigint;
    IF amount IS NULL OR amount <= 0 OR o.paid_amount + amount > o.price OR why = '' THEN
      RAISE EXCEPTION 'Số tiền hoặc tham chiếu không hợp lệ';
    END IF;
    o.paid_amount := o.paid_amount + amount;
  WHEN 'claim' THEN
    IF role_name <> 'booster' OR o.booster_id IS NOT NULL OR o.status <> 'cho_xu_ly' OR NOT o.quote_accepted
       OR o.required_amount <= 0 OR o.paid_amount < o.required_amount THEN
      RAISE EXCEPTION 'Đơn chưa đủ điều kiện hoặc đã có người nhận';
    END IF;
    o.booster_id := uid; o.status := 'dang_cay';
    SELECT coalesce(nullif(display_name, ''), username) INTO o.booster_name FROM public.user_roles WHERE id = uid;
  WHEN 'assign' THEN
    target := (p_data->>'booster_id')::uuid;
    IF NOT admin_ok OR o.status NOT IN ('cho_xu_ly', 'dang_cay', 'tam_dung') OR NOT o.quote_accepted
       OR o.required_amount <= 0 OR o.paid_amount < o.required_amount OR why = '' THEN
      RAISE EXCEPTION 'Chưa đủ điều kiện giao đơn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE id = target AND role = 'booster' AND active) THEN
      RAISE EXCEPTION 'Booster không hợp lệ';
    END IF;
    o.booster_id := target; o.status := 'dang_cay';
    SELECT coalesce(nullif(display_name, ''), username) INTO o.booster_name FROM public.user_roles WHERE id = target;
  WHEN 'progress' THEN
    IF NOT admin_ok AND o.booster_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Không có quyền cập nhật tiến độ'; END IF;
    IF o.status <> 'dang_cay' THEN RAISE EXCEPTION 'Đơn chưa đang thực hiện'; END IF;
    amount := (p_data->>'progress')::integer;
    IF amount IS NULL OR amount < 0 OR amount > 99 OR why = '' THEN RAISE EXCEPTION 'Tiến độ 0-99 và ghi chú là bắt buộc'; END IF;
    o.progress := amount;
  WHEN 'submit' THEN
    IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status <> 'dang_cay' OR why = '' THEN
      RAISE EXCEPTION 'Không thể gửi nghiệm thu';
    END IF;
    o.status := 'cho_nghiem_thu'; o.result_note := left(why, 5000);
  WHEN 'complete' THEN
    IF o.user_id <> uid OR o.status <> 'cho_nghiem_thu' THEN RAISE EXCEPTION 'Chỉ chủ đơn được nghiệm thu kết quả'; END IF;
    o.status := 'hoan_thanh'; o.progress := 100;
    UPDATE public.user_roles SET orders_completed = orders_completed + 1 WHERE id = o.booster_id;
  WHEN 'rework' THEN
    IF o.user_id <> uid OR o.status <> 'cho_nghiem_thu' OR why = '' THEN RAISE EXCEPTION 'Không thể yêu cầu làm lại'; END IF;
    o.status := 'dang_cay';
  WHEN 'pause' THEN
    IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status <> 'dang_cay' OR why = '' THEN
      RAISE EXCEPTION 'Không thể tạm dừng';
    END IF;
    o.status := 'tam_dung';
  WHEN 'resume' THEN
    IF NOT admin_ok OR o.status <> 'tam_dung' OR o.booster_id IS NULL OR why = '' THEN RAISE EXCEPTION 'Admin cần xác nhận tiếp tục'; END IF;
    o.status := 'dang_cay';
  WHEN 'cancel' THEN
    IF NOT admin_ok OR o.paid_amount > 0 OR o.status <> 'cho_xu_ly' OR why = '' THEN
      RAISE EXCEPTION 'Chỉ hủy đơn chưa nhận tiền; trường hợp khác cần đối soát hỗ trợ';
    END IF;
    o.cancelled := true;
  WHEN 'review' THEN
    amount := (p_data->>'rating')::integer;
    IF o.user_id <> uid OR o.status <> 'hoan_thanh' OR o.rating IS NOT NULL OR amount IS NULL OR amount NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Không thể đánh giá';
    END IF;
    o.rating := amount; o.review_comment := left(coalesce(p_data->>'comment', ''), 2000);
  ELSE
    RAISE EXCEPTION 'Thao tác không hỗ trợ';
  END CASE;

  UPDATE public.orders SET
    price = o.price, required_amount = o.required_amount, paid_amount = o.paid_amount,
    quote_accepted = o.quote_accepted, booster_id = o.booster_id, booster_name = o.booster_name, status = o.status,
    progress = o.progress, result_note = o.result_note, cancelled = o.cancelled, rating = o.rating, review_comment = o.review_comment,
    version = version + 1, updated_at = now()
  WHERE id = o.id RETURNING * INTO o;

  INSERT INTO public.order_logs(order_id, user_id, action) VALUES(
    o.id, uid, p_action || ': ' || left(CASE
      WHEN p_action = 'payment' THEN amount::text || ' VND; ' || why
      WHEN p_action = 'quote' THEN o.price::text || ' VND; minimum ' || o.required_amount::text || '; ' || why
      ELSE why END, 2000)
  );

  INSERT INTO public.notifications(user_id, order_id, title, content)
  SELECT target_user, o.id, 'Cập nhật đơn hàng', p_action
  FROM (SELECT o.user_id AS target_user UNION SELECT o.booster_id) a
  WHERE target_user IS NOT NULL AND target_user <> uid;

  INSERT INTO namcumz_private.receipts(actor, request_id, operation, fingerprint, result)
  VALUES(uid, p_request, 'order', fp, to_jsonb(o));

  RETURN o;
END $fn$;

-- 4.4 Claim queue for boosters
CREATE OR REPLACE FUNCTION public.claim_queue()
RETURNS TABLE(id uuid, order_code text, kind text, game_server text, created_at timestamptz, version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.id = uid AND role = 'booster') THEN
    RAISE EXCEPTION 'Booster only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.order_code, o.kind, o.game_server, o.created_at, o.version FROM public.orders o
  WHERE o.status = 'cho_xu_ly' AND NOT o.cancelled AND o.booster_id IS NULL AND o.quote_accepted AND o.required_amount > 0 AND o.paid_amount >= o.required_amount
  ORDER BY o.created_at LIMIT 50;
END $fn$;

-- 4.5 Booster profiles list
CREATE OR REPLACE FUNCTION public.booster_profiles()
RETURNS TABLE(id uuid, display_name text, bio text, orders_completed integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT id, coalesce(nullif(display_name, ''), username), bio, orders_completed FROM public.user_roles
  WHERE role = 'booster' AND active ORDER BY orders_completed DESC LIMIT 100;
$fn$;

-- 4.6 Super admin set user role
CREATE OR REPLACE FUNCTION public.set_user_role(p_target uuid, p_role text, p_active boolean, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user(); old text;
BEGIN
  PERFORM pg_advisory_xact_lock(8346902);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE id = uid AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('customer', 'booster', 'admin', 'super_admin') OR p_role IS NULL OR p_active IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid role change';
  END IF;
  SELECT role INTO old FROM public.user_roles WHERE id = p_target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF old = 'super_admin' AND (p_role <> 'super_admin' OR NOT p_active) AND
     (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin' AND active AND id <> p_target) = 0 THEN
    RAISE EXCEPTION 'Cannot remove last active super admin';
  END IF;
  UPDATE public.user_roles SET role = p_role, active = p_active WHERE id = p_target;
  INSERT INTO namcumz_private.role_audit(actor, target, old_role, new_role, active, reason)
  VALUES (uid, p_target, old, p_role, p_active, trim(p_reason));
END $fn$;

-- 4.7 Package management RPC
CREATE OR REPLACE FUNCTION public.save_package(p_id uuid, p_game text, p_name text, p_price bigint, p_active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE result uuid;
BEGIN
  PERFORM namcumz_private.require_user();
  IF NOT namcumz_private.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501'; END IF;
  IF p_active IS NULL OR char_length(trim(p_game)) NOT BETWEEN 1 AND 80 OR char_length(trim(p_name)) NOT BETWEEN 1 AND 120 OR p_price IS NULL OR p_price <= 0 OR p_price > 1000000000 THEN
    RAISE EXCEPTION 'Invalid package';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.packages(game, name, price, active, type) VALUES (trim(p_game), trim(p_name), p_price, p_active, 'login') RETURNING id INTO result;
  ELSE
    UPDATE public.packages SET game = trim(p_game), name = trim(p_name), price = p_price, active = p_active, updated_at = now() WHERE id = p_id RETURNING id INTO result;
    IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  END IF;
  RETURN result;
END $fn$;

-- 4.8 Order chat message RPC
CREATE OR REPLACE FUNCTION public.send_order_message(p_order uuid, p_request uuid, p_message text, p_attachment text DEFAULT NULL)
RETURNS public.order_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user(); m public.order_messages;
BEGIN
  IF NOT namcumz_private.can_read_order(p_order) THEN RAISE EXCEPTION 'Không có quyền chat' USING ERRCODE = '42501'; END IF;
  IF p_request IS NULL OR char_length(p_message) > 10000 OR (coalesce(trim(p_message), '') = '' AND p_attachment IS NULL) THEN
    RAISE EXCEPTION 'Nội dung tin nhắn không hợp lệ';
  END IF;
  IF p_attachment IS NOT NULL AND
     (split_part(p_attachment, '/', 1) <> p_order::text OR split_part(p_attachment, '/', 2) <> uid::text OR
      NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'order-files' AND name = p_attachment)) THEN
    RAISE EXCEPTION 'Tệp không hợp lệ';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO m FROM public.order_messages WHERE sender_id = uid AND request_id = p_request;
  IF FOUND THEN
    IF m.order_id <> p_order OR m.message <> coalesce(nullif(trim(p_message), ''), 'Ảnh đính kèm') OR m.attachment_path IS DISTINCT FROM p_attachment THEN
      RAISE EXCEPTION 'Mã tin nhắn đã dùng';
    END IF;
    RETURN m;
  END IF;
  PERFORM namcumz_private.rate_limit('chat:' || uid::text, 30, 60);
  INSERT INTO public.order_messages(order_id, sender_id, message, request_id, attachment_path)
  VALUES (p_order, uid, coalesce(nullif(trim(p_message), ''), 'Ảnh đính kèm'), p_request, p_attachment) RETURNING * INTO m;
  INSERT INTO public.notifications(user_id, order_id, title, content)
  SELECT recipient, p_order, 'Tin nhắn mới', 'Bạn có tin nhắn trong đơn hàng'
  FROM (SELECT user_id AS recipient FROM public.orders WHERE id = p_order UNION SELECT booster_id FROM public.orders WHERE id = p_order) a
  WHERE recipient IS NOT NULL AND recipient <> uid;
  RETURN m;
END $fn$;

-- 4.9 Support ticket creation & response RPCs
CREATE OR REPLACE FUNCTION public.create_ticket(p_request uuid, p_order uuid, p_issue text, p_description text)
RETURNS public.support_tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user(); t public.support_tickets;
BEGIN
  IF p_request IS NULL OR char_length(trim(p_issue)) NOT BETWEEN 1 AND 200 OR char_length(trim(p_description)) NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Invalid support request';
  END IF;
  IF p_order IS NOT NULL AND NOT namcumz_private.can_read_order(p_order) THEN
    RAISE EXCEPTION 'Order not accessible' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO t FROM public.support_tickets WHERE user_id = uid AND request_id = p_request;
  IF FOUND THEN
    IF t.order_id IS DISTINCT FROM p_order OR t.issue_type <> trim(p_issue) OR t.description <> trim(p_description) THEN
      RAISE EXCEPTION 'Request reused';
    END IF;
    RETURN t;
  END IF;
  PERFORM namcumz_private.rate_limit('ticket:' || uid::text, 5, 3600);
  INSERT INTO public.support_tickets(user_id, order_id, issue_type, description, request_id)
  VALUES (uid, p_order, trim(p_issue), trim(p_description), p_request) RETURNING * INTO t;
  RETURN t;
END $fn$;

CREATE OR REPLACE FUNCTION public.respond_ticket(p_id uuid, p_status text, p_response text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user(); target uuid;
BEGIN
  IF NOT namcumz_private.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('open', 'in_progress', 'resolved') OR p_status IS NULL OR char_length(trim(p_response)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;
  UPDATE public.support_tickets SET status = p_status, response = trim(p_response) WHERE id = p_id RETURNING user_id INTO target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  INSERT INTO namcumz_private.ticket_audit(ticket_id, actor, status, response) VALUES (p_id, uid, p_status, trim(p_response));
  INSERT INTO public.notifications(user_id, title, content) VALUES (target, 'Yêu cầu hỗ trợ được cập nhật', 'Mở mục hỗ trợ để xem phản hồi');
END $fn$;

CREATE OR REPLACE FUNCTION public.auth_username_email(p_username text, p_bucket text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE result text; uname text := lower(trim(p_username));
BEGIN
  IF uname !~ '^[a-z0-9_]{3,32}$' OR char_length(p_bucket) <> 64 THEN RETURN NULL; END IF;
  PERFORM namcumz_private.rate_limit('login-name:' || uname, 12, 900);
  PERFORM namcumz_private.rate_limit('login-client:' || p_bucket, 60, 900);
  SELECT a.email INTO result FROM auth.users a JOIN public.user_roles u ON u.id = a.id WHERE lower(u.username) = uname AND u.active;
  RETURN result;
END $fn$;

-- 5. Storage (order-files bucket)
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES('order-files', 'order-files', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS namcumz_file_read ON storage.objects;
CREATE POLICY namcumz_file_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'order-files' AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id::text = split_part(name, '/', 1) AND namcumz_private.can_read_order(o.id)
  ));

DROP POLICY IF EXISTS namcumz_file_insert ON storage.objects;
CREATE POLICY namcumz_file_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-files' AND split_part(name, '/', 2) = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id::text = split_part(name, '/', 1) AND namcumz_private.can_read_order(o.id)
  ));

-- 6. Row Level Security & Permissions Hardening

-- Drop old insecure policies
DROP POLICY IF EXISTS "Cho phép đọc mọi đơn hàng" ON public.orders;
DROP POLICY IF EXISTS "Cho phép tạo đơn hàng" ON public.orders;
DROP POLICY IF EXISTS "Cho phép sửa đơn hàng" ON public.orders;
DROP POLICY IF EXISTS "Cho phép đọc mọi user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Cho phép user tự sửa thông tin" ON public.user_roles;
DROP POLICY IF EXISTS "Chỉ đọc thông báo của mình" ON public.notifications;
DROP POLICY IF EXISTS "Gửi thông báo (System/Triggers)" ON public.notifications;
DROP POLICY IF EXISTS "Cập nhật thông báo của mình" ON public.notifications;

-- Drop existing new-style policies if re-running
DROP POLICY IF EXISTS profile_read ON public.user_roles;
DROP POLICY IF EXISTS profile_update ON public.user_roles;
DROP POLICY IF EXISTS orders_read ON public.orders;
DROP POLICY IF EXISTS orders_create ON public.orders;
DROP POLICY IF EXISTS orders_active ON public.orders;
DROP POLICY IF EXISTS messages_read ON public.order_messages;
DROP POLICY IF EXISTS messages_create ON public.order_messages;
DROP POLICY IF EXISTS notifications_read ON public.notifications;
DROP POLICY IF EXISTS notifications_mark_read ON public.notifications;
DROP POLICY IF EXISTS logs_read ON public.order_logs;
DROP POLICY IF EXISTS tickets_read ON public.support_tickets;
DROP POLICY IF EXISTS tickets_create ON public.support_tickets;
DROP POLICY IF EXISTS catalog_read ON public.packages;
DROP POLICY IF EXISTS credentials_read ON public.order_credentials;

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE namcumz_private.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.ticket_audit ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY profile_read ON public.user_roles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR namcumz_private.is_admin());
CREATE POLICY profile_update ON public.user_roles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR booster_id = (SELECT auth.uid()) OR namcumz_private.is_admin());
CREATE POLICY orders_active ON public.orders AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND active))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND active));

CREATE POLICY credentials_read ON public.order_credentials FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_credentials.order_id
    AND (o.user_id = auth.uid() OR o.booster_id = auth.uid() OR namcumz_private.is_admin())
  ));

CREATE POLICY messages_read ON public.order_messages FOR SELECT TO authenticated
  USING (namcumz_private.can_read_order(order_id));

CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_mark_read ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY logs_read ON public.order_logs FOR SELECT TO authenticated
  USING (namcumz_private.can_read_order(order_id));

CREATE POLICY tickets_read ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR namcumz_private.is_admin());

CREATE POLICY catalog_read ON public.packages FOR SELECT TO anon, authenticated
  USING (active OR namcumz_private.is_admin());

-- Revoke default broad grants and establish least privilege
REVOKE ALL ON public.user_roles, public.orders, public.order_credentials, public.order_messages,
  public.notifications, public.order_logs, public.support_tickets, public.packages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA namcumz_private FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.user_roles, public.orders, public.order_credentials, public.order_messages,
  public.notifications, public.order_logs, public.support_tickets TO authenticated;
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT UPDATE(display_name, bio, avatar_url) ON public.user_roles TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;

-- Function grants
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA namcumz_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION namcumz_private.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION namcumz_private.can_read_order(uuid) TO authenticated;

DO $grants$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
    'create_order','create_topup_order','order_action','claim_queue','booster_profiles','set_user_role',
    'save_package','send_order_message','create_ticket','respond_ticket','auth_username_email'
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated', f.signature);
  END LOOP;
END $grants$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_topup_order(uuid, uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_action(uuid, integer, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_package(uuid, text, text, bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_order_message(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ticket(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_ticket(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booster_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_username_email(text, text) TO service_role;

-- 7. Seed Official Login Packages
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

-- 8. Record Migration
INSERT INTO namcumz_private.migrations(version) VALUES ('production_001_release')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

COMMIT;
SELECT 'production_001_release successfully installed' AS result;
