-- STAGING cnawquqkeogzmvucmjes only. Additive upgrade after staging_001.
-- Run once; the transaction rolls back on any error. Not a production migration.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version='staging_001_foundation')
 OR EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version='staging_002_workflows') THEN
 RAISE EXCEPTION 'Foundation missing or migration already applied'; END IF;
END $guard$;
ALTER TABLE public.user_roles ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.orders ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN quote_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN required_amount bigint NOT NULL DEFAULT 0 CHECK(required_amount>=0);
ALTER TABLE public.orders ADD COLUMN paid_amount bigint NOT NULL DEFAULT 0 CHECK(paid_amount>=0);
ALTER TABLE public.orders ADD COLUMN cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN result_note text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100);
ALTER TABLE public.orders ADD COLUMN game_server text NOT NULL DEFAULT 'Asia';
ALTER TABLE public.orders ADD COLUMN kind text NOT NULL DEFAULT 'boost' CHECK(kind IN ('boost','topup'));
ALTER TABLE public.orders ADD COLUMN package_id uuid;
ALTER TABLE public.orders ADD COLUMN game_uid text;
ALTER TABLE public.orders ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX order_request_unique ON public.orders(user_id,request_id);
CREATE UNIQUE INDEX username_unique ON public.user_roles(lower(username));
CREATE TABLE public.packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game text NOT NULL CHECK(char_length(game) BETWEEN 1 AND 80),
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 120), price bigint NOT NULL CHECK(price>0 AND price<=1000000000),
 active boolean NOT NULL DEFAULT false, type text NOT NULL DEFAULT 'uid' CHECK(type='uid'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ADD CONSTRAINT orders_package_fk FOREIGN KEY(package_id) REFERENCES public.packages(id);
CREATE TABLE namcumz_private.receipts (
 actor uuid NOT NULL, request_id uuid NOT NULL, operation text NOT NULL, fingerprint jsonb NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor,request_id)
);
CREATE TABLE namcumz_private.limits (
 key text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 1
);
CREATE TABLE namcumz_private.role_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL, target uuid NOT NULL,
 old_role text NOT NULL,new_role text NOT NULL,active boolean NOT NULL, reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_messages ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX message_request_unique ON public.order_messages(sender_id,request_id);
ALTER TABLE public.support_tickets ADD COLUMN response text NOT NULL DEFAULT '';
ALTER TABLE public.support_tickets ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX ticket_request_unique ON public.support_tickets(user_id,request_id);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON public.packages FOR SELECT TO anon,authenticated USING(active OR namcumz_private.is_admin());
REVOKE ALL ON public.packages FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.packages TO anon,authenticated;
-- Anon must evaluate the false admin helper for inactive rows without gaining table access.
GRANT USAGE ON SCHEMA namcumz_private TO anon;
GRANT EXECUTE ON FUNCTION namcumz_private.is_admin() TO anon;
REVOKE ALL ON ALL TABLES IN SCHEMA namcumz_private FROM PUBLIC,anon,authenticated;
REVOKE INSERT ON public.orders,public.order_messages,public.support_tickets FROM authenticated;
REVOKE INSERT(user_id,order_code,renter_name,content,price,status,booster_name,secret_code) ON public.orders FROM authenticated;
REVOKE INSERT(order_id,sender_id,sender_name,message) ON public.order_messages FROM authenticated;
REVOKE INSERT(user_id,order_id,issue_type,description,status) ON public.support_tickets FROM authenticated;

-- Account identity stays username; verified recovery email belongs only to Auth.
CREATE OR REPLACE FUNCTION namcumz_private.on_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uname text;
BEGIN
 uname:=lower(trim(coalesce(NEW.raw_user_meta_data->>'username',split_part(NEW.email,'@',1))));
 IF uname !~ '^[a-z0-9_]{3,32}$' THEN RAISE EXCEPTION 'Username requires 3-32 lowercase letters, digits or underscore'; END IF;
 INSERT INTO public.user_roles(id,username,display_name,role) VALUES
 (NEW.id,uname,left(coalesce(NEW.raw_user_meta_data->>'display_name',uname),100),'customer');
 RETURN NEW;
END $fn$;

CREATE FUNCTION namcumz_private.require_user() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE id=uid AND active) THEN
 RAISE EXCEPTION 'Vui lòng đăng nhập bằng tài khoản đang hoạt động' USING ERRCODE='42501'; END IF;
 RETURN uid;
END $fn$;
CREATE FUNCTION namcumz_private.rate_limit(k text,maximum integer,seconds integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE n integer;
BEGIN
 INSERT INTO namcumz_private.limits AS l(key) VALUES(k)
 ON CONFLICT(key) DO UPDATE SET
 hits=CASE WHEN l.started_at<now()-make_interval(secs=>seconds) THEN 1 ELSE l.hits+1 END,
 started_at=CASE WHEN l.started_at<now()-make_interval(secs=>seconds) THEN now() ELSE l.started_at END
 RETURNING hits INTO n;
 IF n>maximum THEN RAISE EXCEPTION 'Thao tác quá nhanh, vui lòng thử lại sau' USING ERRCODE='P0001'; END IF;
END $fn$;
CREATE OR REPLACE FUNCTION namcumz_private.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE id=auth.uid() AND active AND role IN ('admin','super_admin'));
$fn$;
CREATE OR REPLACE FUNCTION namcumz_private.can_read_order(target_order uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE id=auth.uid() AND active)
 AND EXISTS(SELECT 1 FROM public.orders WHERE id=target_order AND (user_id=auth.uid() OR booster_id=auth.uid() OR namcumz_private.is_admin()));
$fn$;
-- Existing orders_read policy uses actor IDs; inactive accounts are also gated by a restrictive policy.
CREATE POLICY orders_active ON public.orders AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.user_roles WHERE id=auth.uid() AND active))
 WITH CHECK(EXISTS(SELECT 1 FROM public.user_roles WHERE id=auth.uid() AND active));

CREATE FUNCTION public.create_order(p_request uuid,p_content text,p_server text,p_package uuid DEFAULT NULL,p_uid text DEFAULT NULL)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); o public.orders; pkg public.packages;
BEGIN
 IF p_request IS NULL OR char_length(trim(p_content)) NOT BETWEEN 1 AND 10000 OR p_server NOT IN ('Asia','Europe','America','TW/HK/MO') THEN
 RAISE EXCEPTION 'Thông tin đơn không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,0));
 SELECT * INTO o FROM public.orders WHERE user_id=uid AND request_id=p_request;
 IF FOUND THEN
 IF o.content<>trim(p_content) OR o.game_server<>p_server OR o.package_id IS DISTINCT FROM p_package OR o.game_uid IS DISTINCT FROM p_uid THEN
 RAISE EXCEPTION 'Mã yêu cầu đã dùng cho nội dung khác'; END IF; RETURN o; END IF;
 PERFORM namcumz_private.rate_limit('order:'||uid::text,10,3600);
 IF p_package IS NOT NULL THEN
 SELECT * INTO pkg FROM public.packages WHERE id=p_package AND active FOR SHARE;
 IF NOT FOUND OR p_uid IS NULL OR p_uid !~ '^[0-9]{6,20}$' THEN RAISE EXCEPTION 'Gói nạp hoặc UID không hợp lệ'; END IF;
 END IF;
 INSERT INTO public.orders(content,game_server,request_id,kind,package_id,game_uid)
 VALUES(trim(p_content),p_server,p_request,CASE WHEN p_package IS NULL THEN 'boost' ELSE 'topup' END,p_package,p_uid) RETURNING * INTO o;
 IF p_package IS NOT NULL THEN
 UPDATE public.orders SET price=pkg.price,required_amount=pkg.price,quote_accepted=true WHERE id=o.id RETURNING * INTO o;
 END IF;
 RETURN o;
END $fn$;

CREATE FUNCTION public.order_action(p_order uuid,p_version integer,p_action text,p_data jsonb,p_request uuid)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); o public.orders; role_name text; admin_ok boolean:=namcumz_private.is_admin();
 receipt namcumz_private.receipts; fp jsonb:=jsonb_build_object('order',p_order,'version',p_version,'action',p_action,'data',p_data);
 amount bigint; needed bigint; why text:=trim(coalesce(p_data->>'reason','')); target uuid;
BEGIN
 IF p_order IS NULL OR p_version IS NULL OR p_version<1 OR p_action IS NULL OR p_request IS NULL OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'Yêu cầu không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,0));
 SELECT * INTO receipt FROM namcumz_private.receipts WHERE actor=uid AND request_id=p_request;
 IF FOUND THEN
 IF receipt.operation<>'order' OR receipt.fingerprint<>fp THEN RAISE EXCEPTION 'Mã yêu cầu trùng'; END IF;
 RETURN jsonb_populate_record(NULL::public.orders,receipt.result); END IF;
 SELECT role INTO role_name FROM public.user_roles WHERE id=uid;
 SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đơn'; END IF;
 -- Claim is restricted to a minimum-information queue, never an arbitrary full-order read.
 IF NOT admin_ok AND o.user_id<>uid AND o.booster_id IS DISTINCT FROM uid AND p_action<>'claim' THEN
 RAISE EXCEPTION 'Không có quyền thao tác đơn này' USING ERRCODE='42501'; END IF;
 IF o.version<>p_version THEN RAISE EXCEPTION 'Đơn đã thay đổi. Tải lại trước khi thao tác'; END IF;
 IF o.cancelled THEN RAISE EXCEPTION 'Đơn đã hủy'; END IF;
 CASE p_action
 WHEN 'quote' THEN
 IF NOT admin_ok OR o.status<>'cho_xu_ly' OR o.paid_amount>0 OR o.kind<>'boost' THEN RAISE EXCEPTION 'Không thể báo giá đơn này'; END IF;
 amount:=(p_data->>'price')::bigint; needed:=(p_data->>'required_amount')::bigint;
 IF amount IS NULL OR needed IS NULL OR amount<=0 OR amount>1000000000 OR needed<=0 OR needed>amount OR why='' THEN RAISE EXCEPTION 'Giá, số tiền cần thu và lý do không hợp lệ'; END IF;
 o.price:=amount; o.required_amount:=needed; o.quote_accepted:=false;
 WHEN 'approve_quote' THEN
 IF o.user_id<>uid OR o.price<=0 OR o.status<>'cho_xu_ly' THEN RAISE EXCEPTION 'Không thể chấp thuận giá'; END IF;
 o.quote_accepted:=true;
 WHEN 'payment' THEN
 IF NOT admin_ok OR NOT o.quote_accepted OR o.status<>'cho_xu_ly' THEN RAISE EXCEPTION 'Chưa đủ điều kiện xác nhận tiền'; END IF;
 amount:=(p_data->>'amount')::bigint;
 IF amount IS NULL OR amount<=0 OR o.paid_amount+amount>o.price OR why='' THEN RAISE EXCEPTION 'Số tiền hoặc tham chiếu không hợp lệ'; END IF;
 o.paid_amount:=o.paid_amount+amount;
 WHEN 'claim' THEN
 IF role_name<>'booster' OR o.booster_id IS NOT NULL OR o.status<>'cho_xu_ly' OR NOT o.quote_accepted
 OR o.required_amount<=0 OR o.paid_amount<o.required_amount THEN RAISE EXCEPTION 'Đơn chưa đủ điều kiện hoặc đã có người nhận'; END IF;
 o.booster_id:=uid; o.status:='dang_cay';
 SELECT coalesce(nullif(display_name,''),username) INTO o.booster_name FROM public.user_roles WHERE id=uid;
 WHEN 'assign' THEN
 target:=(p_data->>'booster_id')::uuid;
 IF NOT admin_ok OR o.status NOT IN ('cho_xu_ly','dang_cay','tam_dung') OR NOT o.quote_accepted
 OR o.required_amount<=0 OR o.paid_amount<o.required_amount OR why='' THEN RAISE EXCEPTION 'Chưa đủ điều kiện giao đơn'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE id=target AND role='booster' AND active) THEN RAISE EXCEPTION 'Booster không hợp lệ'; END IF;
 o.booster_id:=target; o.status:='dang_cay';
 SELECT coalesce(nullif(display_name,''),username) INTO o.booster_name FROM public.user_roles WHERE id=target;
 WHEN 'progress' THEN
 IF NOT admin_ok AND o.booster_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Không có quyền cập nhật tiến độ'; END IF;
 IF o.status<>'dang_cay' THEN RAISE EXCEPTION 'Đơn chưa đang thực hiện'; END IF;
 amount:=(p_data->>'progress')::integer;
 IF amount IS NULL OR amount<0 OR amount>99 OR why='' THEN RAISE EXCEPTION 'Tiến độ 0-99 và ghi chú là bắt buộc'; END IF;
 o.progress:=amount;
 WHEN 'submit' THEN
 IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status<>'dang_cay' OR why='' THEN RAISE EXCEPTION 'Không thể gửi nghiệm thu'; END IF;
 o.status:='cho_nghiem_thu'; o.result_note:=left(why,5000);
 WHEN 'complete' THEN
 IF o.user_id<>uid OR o.status<>'cho_nghiem_thu' THEN RAISE EXCEPTION 'Chỉ chủ đơn được nghiệm thu kết quả'; END IF;
 o.status:='hoan_thanh'; o.progress:=100;
 UPDATE public.user_roles SET orders_completed=orders_completed+1 WHERE id=o.booster_id;
 WHEN 'rework' THEN
 IF o.user_id<>uid OR o.status<>'cho_nghiem_thu' OR why='' THEN RAISE EXCEPTION 'Không thể yêu cầu làm lại'; END IF;
 o.status:='dang_cay';
 WHEN 'pause' THEN
 IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status<>'dang_cay' OR why='' THEN RAISE EXCEPTION 'Không thể tạm dừng'; END IF;
 o.status:='tam_dung';
 WHEN 'resume' THEN
 IF NOT admin_ok OR o.status<>'tam_dung' OR o.booster_id IS NULL OR why='' THEN RAISE EXCEPTION 'Admin cần xác nhận tiếp tục'; END IF;
 o.status:='dang_cay';
 WHEN 'cancel' THEN
 IF NOT admin_ok OR o.paid_amount>0 OR o.status<>'cho_xu_ly' OR why='' THEN RAISE EXCEPTION 'Chỉ hủy đơn chưa nhận tiền; trường hợp khác cần đối soát hỗ trợ'; END IF;
 o.cancelled:=true;
 WHEN 'review' THEN
 amount:=(p_data->>'rating')::integer;
 IF o.user_id<>uid OR o.status<>'hoan_thanh' OR o.rating IS NOT NULL OR amount IS NULL OR amount NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Không thể đánh giá'; END IF;
 o.rating:=amount; o.review_comment:=left(coalesce(p_data->>'comment',''),2000);
 ELSE RAISE EXCEPTION 'Thao tác không hỗ trợ';
 END CASE;
 UPDATE public.orders SET price=o.price,required_amount=o.required_amount,paid_amount=o.paid_amount,
 quote_accepted=o.quote_accepted,booster_id=o.booster_id,booster_name=o.booster_name,status=o.status,
 progress=o.progress,result_note=o.result_note,cancelled=o.cancelled,rating=o.rating,review_comment=o.review_comment,
 version=version+1,updated_at=now() WHERE id=o.id RETURNING * INTO o;
 INSERT INTO public.order_logs(order_id,user_id,action) VALUES(o.id,uid,p_action||': '||left(
 CASE WHEN p_action='payment' THEN amount::text||' VND; '||why WHEN p_action='quote' THEN o.price::text||' VND; minimum '||o.required_amount::text||'; '||why ELSE why END,2000));
 INSERT INTO public.notifications(user_id,order_id,title,content)
 SELECT target_user,o.id,'Cập nhật đơn hàng',p_action FROM (SELECT o.user_id AS target_user UNION SELECT o.booster_id) a
 WHERE target_user IS NOT NULL AND target_user<>uid;
 INSERT INTO namcumz_private.receipts(actor,request_id,operation,fingerprint,result) VALUES(uid,p_request,'order',fp,to_jsonb(o));
 RETURN o;
END $fn$;

CREATE FUNCTION public.claim_queue() RETURNS TABLE(id uuid,order_code text,kind text,game_server text,created_at timestamptz,version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_roles.id=uid AND role='booster') THEN RAISE EXCEPTION 'Booster only' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT o.id,o.order_code,o.kind,o.game_server,o.created_at,o.version FROM public.orders o
 WHERE o.status='cho_xu_ly' AND NOT o.cancelled AND o.booster_id IS NULL AND o.quote_accepted AND o.required_amount>0 AND o.paid_amount>=o.required_amount
 ORDER BY o.created_at LIMIT 50;
END $fn$;
CREATE FUNCTION public.booster_profiles() RETURNS TABLE(id uuid,display_name text,bio text,orders_completed integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT id,coalesce(nullif(display_name,''),username),bio,orders_completed FROM public.user_roles
 WHERE role='booster' AND active ORDER BY orders_completed DESC LIMIT 100;
$fn$;
CREATE FUNCTION public.set_user_role(p_target uuid,p_role text,p_active boolean,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); old text;
BEGIN
 PERFORM pg_advisory_xact_lock(8346902);
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE id=uid AND role='super_admin') THEN RAISE EXCEPTION 'Super admin only' USING ERRCODE='42501'; END IF;
 IF p_role NOT IN ('customer','booster','admin','super_admin') OR p_role IS NULL OR p_active IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid role change'; END IF;
 SELECT role INTO old FROM public.user_roles WHERE id=p_target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF old='super_admin' AND (p_role<>'super_admin' OR NOT p_active) AND
 (SELECT count(*) FROM public.user_roles WHERE role='super_admin' AND active AND id<>p_target)=0 THEN RAISE EXCEPTION 'Cannot remove last active super admin'; END IF;
 UPDATE public.user_roles SET role=p_role,active=p_active WHERE id=p_target;
 INSERT INTO namcumz_private.role_audit(actor,target,old_role,new_role,active,reason) VALUES(uid,p_target,old,p_role,p_active,trim(p_reason));
END $fn$;
CREATE FUNCTION public.save_package(p_id uuid,p_game text,p_name text,p_price bigint,p_active boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE result uuid;
BEGIN
 PERFORM namcumz_private.require_user();
 IF NOT namcumz_private.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 IF p_active IS NULL OR char_length(trim(p_game)) NOT BETWEEN 1 AND 80 OR char_length(trim(p_name)) NOT BETWEEN 1 AND 120 OR p_price IS NULL OR p_price<=0 OR p_price>1000000000 THEN RAISE EXCEPTION 'Invalid package'; END IF;
 IF p_id IS NULL THEN
 INSERT INTO public.packages(game,name,price,active) VALUES(trim(p_game),trim(p_name),p_price,p_active) RETURNING id INTO result;
 ELSE
 UPDATE public.packages SET game=trim(p_game),name=trim(p_name),price=p_price,active=p_active,updated_at=now() WHERE id=p_id RETURNING id INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
 END IF;
 RETURN result;
END $fn$;
ALTER TABLE public.order_messages ADD COLUMN attachment_path text;
CREATE FUNCTION public.send_order_message(p_order uuid,p_request uuid,p_message text,p_attachment text DEFAULT NULL)
RETURNS public.order_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); m public.order_messages;
BEGIN
 IF NOT namcumz_private.can_read_order(p_order) THEN RAISE EXCEPTION 'Không có quyền chat' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR char_length(p_message)>10000 OR (coalesce(trim(p_message),'')='' AND p_attachment IS NULL) THEN RAISE EXCEPTION 'Nội dung tin nhắn không hợp lệ'; END IF;
 IF p_attachment IS NOT NULL AND
 (split_part(p_attachment,'/',1)<>p_order::text OR split_part(p_attachment,'/',2)<>uid::text OR
 NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='order-files' AND name=p_attachment)) THEN RAISE EXCEPTION 'Tệp không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,0));
 SELECT * INTO m FROM public.order_messages WHERE sender_id=uid AND request_id=p_request;
 IF FOUND THEN
 IF m.order_id<>p_order OR m.message<>coalesce(nullif(trim(p_message),''),'Ảnh đính kèm') OR m.attachment_path IS DISTINCT FROM p_attachment THEN RAISE EXCEPTION 'Mã tin nhắn đã dùng'; END IF;
 RETURN m; END IF;
 PERFORM namcumz_private.rate_limit('chat:'||uid::text,30,60);
 INSERT INTO public.order_messages(order_id,sender_id,message,request_id,attachment_path)
 VALUES(p_order,uid,coalesce(nullif(trim(p_message),''),'Ảnh đính kèm'),p_request,p_attachment) RETURNING * INTO m;
 INSERT INTO public.notifications(user_id,order_id,title,content)
 SELECT recipient,p_order,'Tin nhắn mới','Bạn có tin nhắn trong đơn hàng'
 FROM (SELECT user_id AS recipient FROM public.orders WHERE id=p_order UNION SELECT booster_id FROM public.orders WHERE id=p_order) a
 WHERE recipient IS NOT NULL AND recipient<>uid;
 RETURN m;
END $fn$;
CREATE FUNCTION public.create_ticket(p_request uuid,p_order uuid,p_issue text,p_description text) RETURNS public.support_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); t public.support_tickets;
BEGIN
 IF p_request IS NULL OR char_length(trim(p_issue)) NOT BETWEEN 1 AND 200 OR char_length(trim(p_description)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid support request'; END IF;
 IF p_order IS NOT NULL AND NOT namcumz_private.can_read_order(p_order) THEN RAISE EXCEPTION 'Order not accessible' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,0));
 SELECT * INTO t FROM public.support_tickets WHERE user_id=uid AND request_id=p_request;
 IF FOUND THEN
 IF t.order_id IS DISTINCT FROM p_order OR t.issue_type<>trim(p_issue) OR t.description<>trim(p_description) THEN RAISE EXCEPTION 'Request reused'; END IF; RETURN t; END IF;
 PERFORM namcumz_private.rate_limit('ticket:'||uid::text,5,3600);
 INSERT INTO public.support_tickets(user_id,order_id,issue_type,description,request_id)
 VALUES(uid,p_order,trim(p_issue),trim(p_description),p_request) RETURNING * INTO t;
 RETURN t;
END $fn$;
CREATE TABLE namcumz_private.ticket_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
 actor uuid NOT NULL, status text NOT NULL,response text NOT NULL,created_at timestamptz DEFAULT now());
CREATE FUNCTION public.respond_ticket(p_id uuid,p_status text,p_response text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); target uuid;
BEGIN
 IF NOT namcumz_private.is_admin() THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('open','in_progress','resolved') OR p_status IS NULL OR char_length(trim(p_response)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Invalid response'; END IF;
 UPDATE public.support_tickets SET status=p_status,response=trim(p_response) WHERE id=p_id RETURNING user_id INTO target;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;
 INSERT INTO namcumz_private.ticket_audit(ticket_id,actor,status,response) VALUES(p_id,uid,p_status,trim(p_response));
 INSERT INTO public.notifications(user_id,title,content) VALUES(target,'Yêu cầu hỗ trợ được cập nhật','Mở mục hỗ trợ để xem phản hồi');
END $fn$;

-- Server-only username lookup. No email lookup is granted to browsers.
-- A separate successful call consumes the allowance even if the following login fails.
CREATE FUNCTION public.auth_username_email(p_username text,p_bucket text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE result text; uname text:=lower(trim(p_username));
BEGIN
 IF uname !~ '^[a-z0-9_]{3,32}$' OR char_length(p_bucket)<>64 THEN RETURN NULL; END IF;
 PERFORM namcumz_private.rate_limit('login-name:'||uname,12,900);
 PERFORM namcumz_private.rate_limit('login-client:'||p_bucket,60,900);
 SELECT a.email INTO result FROM auth.users a JOIN public.user_roles u ON u.id=a.id WHERE lower(u.username)=uname AND u.active;
 RETURN result;
END $fn$;

-- Private attachments only; no public URLs, owner chosen by path and verified order membership.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('order-files','order-files',false,5242880,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY namcumz_file_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='order-files' AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id::text=split_part(name,'/',1) AND namcumz_private.can_read_order(o.id)));
CREATE POLICY namcumz_file_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='order-files' AND split_part(name,'/',2)=auth.uid()::text AND
 EXISTS(SELECT 1 FROM public.orders o WHERE o.id::text=split_part(name,'/',1) AND namcumz_private.can_read_order(o.id)));
-- No browser delete/update grants are added; attachments remain available for audit.

REVOKE ALL ON ALL TABLES IN SCHEMA namcumz_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION namcumz_private.require_user(),namcumz_private.rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
DO $grants$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('create_order','order_action','claim_queue','booster_profiles','set_user_role','save_package',
 'send_order_message','create_ticket','respond_ticket','auth_username_email') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 END LOOP;
END $grants$;
GRANT EXECUTE ON FUNCTION public.create_order(uuid,text,text,uuid,text),public.order_action(uuid,integer,text,jsonb,uuid),
 public.claim_queue(),public.set_user_role(uuid,text,boolean,text),public.save_package(uuid,text,text,bigint,boolean),
 public.send_order_message(uuid,uuid,text,text),public.create_ticket(uuid,uuid,text,text),public.respond_ticket(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booster_profiles() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auth_username_email(text,text) TO service_role;
ALTER TABLE namcumz_private.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.ticket_audit ENABLE ROW LEVEL SECURITY;
INSERT INTO namcumz_private.migrations(version) VALUES('staging_002_workflows');
COMMIT;
SELECT 'staging_002_workflows installed' AS result;
