-- NAMCUMZ: fresh STAGING ONLY (cnawquqkeogzmvucmjes).
-- Run once in the NEW project's SQL Editor as postgres.
-- Not a production migration. Refuses existing application tables or Auth users.
-- No DROP, DELETE, customer data copy, demo credentials, or privileged user creation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind IN ('r','p'))
     OR EXISTS (SELECT 1 FROM auth.users)
     OR to_regnamespace('namcumz_private') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: expected an empty staging project. Do not rerun or use on production.';
  END IF;
END;
$guard$;

CREATE SCHEMA namcumz_private;
REVOKE ALL ON SCHEMA namcumz_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA namcumz_private TO authenticated;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text NOT NULL CHECK (char_length(username) BETWEEN 1 AND 100),
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name)<=100),
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','booster','admin','super_admin')),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio)<=2000),
  avatar_url text NOT NULL DEFAULT '' CHECK (char_length(avatar_url)<=2048),
  orders_completed integer NOT NULL DEFAULT 0 CHECK (orders_completed>=0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE DEFAULT ('DH-' || gen_random_uuid()::text),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  renter_name text NOT NULL DEFAULT '' CHECK (char_length(renter_name)<=100),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  price bigint NOT NULL DEFAULT 0 CHECK (price>=0),
  status text NOT NULL DEFAULT 'cho_xu_ly' CHECK (status IN ('cho_xu_ly','dang_cay','cho_nghiem_thu','hoan_thanh','tam_dung')),
  booster_id uuid REFERENCES public.user_roles(id),
  booster_name text NOT NULL DEFAULT 'Chưa nhận',
  secret_code text CHECK (secret_code IS NULL),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_comment text CHECK (char_length(review_comment)<=2000),
  ai_plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  sender_name text NOT NULL DEFAULT '',
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_roles(id),
  order_id uuid REFERENCES public.orders(id),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid REFERENCES public.user_roles(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.user_roles(id),
  order_id uuid REFERENCES public.orders(id),
  issue_type text NOT NULL CHECK (char_length(issue_type) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE namcumz_private.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO namcumz_private.migrations(version) VALUES ('staging_001_foundation');

-- Helpers are in an unexposed schema, with no caller-supplied user ID.
CREATE FUNCTION namcumz_private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE id=(SELECT auth.uid()) AND role IN ('admin','super_admin'));
$fn$;
CREATE FUNCTION namcumz_private.can_read_order(target_order uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.orders
    WHERE id=target_order AND (user_id=(SELECT auth.uid()) OR booster_id=(SELECT auth.uid())
      OR namcumz_private.is_admin()));
$fn$;

-- Never trust role from Auth metadata, username, or browser storage.
CREATE FUNCTION namcumz_private.on_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  INSERT INTO public.user_roles(id,username,display_name,role)
  VALUES (NEW.id, left(coalesce(nullif(split_part(NEW.email,'@',1),''),NEW.id::text),100),
          left(coalesce(NEW.raw_user_meta_data->>'display_name',''),100),'customer');
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER namcumz_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION namcumz_private.on_signup();

-- Canonical values are assigned by the server on the allowed customer-create path.
CREATE FUNCTION namcumz_private.prepare_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated owner required' USING ERRCODE='42501';
  END IF;
  IF NEW.price<>0 OR NEW.status<>'cho_xu_ly' OR NEW.booster_id IS NOT NULL
     OR NEW.rating IS NOT NULL OR NEW.review_comment IS NOT NULL OR NEW.ai_plan IS NOT NULL
     OR NEW.secret_code IS NOT NULL THEN
    RAISE EXCEPTION 'Client cannot assign price, status, booster, review or private fields' USING ERRCODE='42501';
  END IF;
  NEW.order_code := 'DH-' || gen_random_uuid()::text;
  NEW.created_at := now();
  NEW.booster_name := 'Chưa nhận';
  SELECT coalesce(nullif(display_name,''),username) INTO NEW.renter_name
  FROM public.user_roles WHERE id=auth.uid();
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER namcumz_prepare_order BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION namcumz_private.prepare_order();
CREATE FUNCTION namcumz_private.log_order_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  INSERT INTO public.order_logs(order_id,user_id,action) VALUES (NEW.id,auth.uid(),'Đơn hàng mới được tạo');
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER namcumz_log_order_created AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION namcumz_private.log_order_created();
CREATE FUNCTION namcumz_private.prepare_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NEW.sender_id IS DISTINCT FROM auth.uid()
     OR NOT namcumz_private.can_read_order(NEW.order_id) THEN
    RAISE EXCEPTION 'Message sender/order not permitted' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(nullif(display_name,''),username) INTO NEW.sender_name
  FROM public.user_roles WHERE id=auth.uid();
  NEW.created_at := now();
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER namcumz_prepare_message BEFORE INSERT ON public.order_messages
FOR EACH ROW EXECUTE FUNCTION namcumz_private.prepare_message();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA namcumz_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION namcumz_private.is_admin(),namcumz_private.can_read_order(uuid) TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA namcumz_private FROM PUBLIC,anon,authenticated;

-- Reset Supabase default grants on THESE new tables only; then add minimal privileges.
REVOKE ALL ON public.user_roles,public.orders,public.order_messages,public.notifications,
 public.order_logs,public.support_tickets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.user_roles,public.orders,public.order_messages,public.notifications,
 public.order_logs,public.support_tickets TO authenticated;
GRANT UPDATE(display_name,bio,avatar_url) ON public.user_roles TO authenticated;
GRANT INSERT(user_id,order_code,renter_name,content,price,status,booster_name,secret_code) ON public.orders TO authenticated;
GRANT INSERT(order_id,sender_id,sender_name,message) ON public.order_messages TO authenticated;
GRANT INSERT(user_id,order_id,issue_type,description,status) ON public.support_tickets TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_read ON public.user_roles FOR SELECT TO authenticated
 USING (id=(SELECT auth.uid()) OR namcumz_private.is_admin());
CREATE POLICY profile_update ON public.user_roles FOR UPDATE TO authenticated
 USING (id=(SELECT auth.uid())) WITH CHECK (id=(SELECT auth.uid()));
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR booster_id=(SELECT auth.uid()) OR namcumz_private.is_admin());
CREATE POLICY orders_create ON public.orders FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND price=0 AND status='cho_xu_ly' AND booster_id IS NULL
             AND secret_code IS NULL AND rating IS NULL AND review_comment IS NULL AND ai_plan IS NULL);
CREATE POLICY messages_read ON public.order_messages FOR SELECT TO authenticated
 USING (namcumz_private.can_read_order(order_id));
CREATE POLICY messages_create ON public.order_messages FOR INSERT TO authenticated
 WITH CHECK (sender_id=(SELECT auth.uid()) AND namcumz_private.can_read_order(order_id));
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE POLICY notifications_mark_read ON public.notifications FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY logs_read ON public.order_logs FOR SELECT TO authenticated
 USING (namcumz_private.can_read_order(order_id));
CREATE POLICY tickets_read ON public.support_tickets FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR namcumz_private.is_admin());
CREATE POLICY tickets_create ON public.support_tickets FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND status='open'
             AND (order_id IS NULL OR namcumz_private.can_read_order(order_id)));
CREATE INDEX orders_owner_created ON public.orders(user_id,created_at DESC);
CREATE INDEX orders_booster_created ON public.orders(booster_id,created_at DESC);
CREATE INDEX messages_order_created ON public.order_messages(order_id,created_at);
CREATE INDEX notifications_owner_created ON public.notifications(user_id,created_at DESC);
CREATE INDEX logs_order_created ON public.order_logs(order_id,created_at);
CREATE INDEX tickets_owner_created ON public.support_tickets(user_id,created_at DESC);
COMMIT;
SELECT 'staging_001_foundation installed; run staging_001_verify.sql next' AS result;
