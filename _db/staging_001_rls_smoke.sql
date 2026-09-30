-- STAGING ONLY. Synthetic users/orders are rolled back, never committed.
-- Run as postgres AFTER foundation and metadata verification.
-- If an assertion fails, transaction aborts; nothing is persisted.
BEGIN;
SET LOCAL statement_timeout='30s';
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version='staging_001_foundation') THEN
    RAISE EXCEPTION 'Foundation missing';
  END IF;
END;
$guard$;
SELECT set_config('test.customer_a',gen_random_uuid()::text,true);
SELECT set_config('test.customer_b',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (current_setting('test.customer_a')::uuid,current_setting('test.customer_a')||'@example.invalid','{"role":"super_admin","display_name":"Test A"}'::jsonb),
 (current_setting('test.customer_b')::uuid,current_setting('test.customer_b')||'@example.invalid','{"role":"admin","display_name":"Test B"}'::jsonb);
DO $test$
BEGIN
  IF (SELECT count(*) FROM public.user_roles WHERE id IN (current_setting('test.customer_a')::uuid,current_setting('test.customer_b')::uuid) AND role='customer') <> 2 THEN
    RAISE EXCEPTION 'FAIL: role metadata elevated a user';
  END IF;
END;
$test$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.customer_a'),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.customer_a'),'role','authenticated')::text,true);
WITH created AS (
 INSERT INTO public.orders(content) VALUES ('Synthetic staging test, no personal data') RETURNING id
) SELECT set_config('test.order',id::text,true) FROM created;
INSERT INTO public.order_messages(order_id,message) VALUES (current_setting('test.order')::uuid,'Test A message');
DO $test$
BEGIN
  IF (SELECT count(*) FROM public.orders WHERE id=current_setting('test.order')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL: owner cannot read own order';
  END IF;
  IF (SELECT count(*) FROM public.order_logs WHERE order_id=current_setting('test.order')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL: server creation audit missing';
  END IF;
  BEGIN
    UPDATE public.user_roles SET role='super_admin' WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL: role update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.orders(content,price) VALUES ('forged price',123);
    RAISE EXCEPTION 'FAIL: price injection succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.orders(content,user_id) VALUES ('forged owner',current_setting('test.customer_b')::uuid);
    RAISE EXCEPTION 'FAIL: owner injection succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.order_messages(order_id,sender_id,message)
    VALUES (current_setting('test.order')::uuid,current_setting('test.customer_b')::uuid,'forged sender');
    RAISE EXCEPTION 'FAIL: sender injection succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.customer_b'),true);
SELECT set_config('request.jwt.claims',json_build_object('sub',current_setting('test.customer_b'),'role','authenticated')::text,true);
DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE id=current_setting('test.order')::uuid)
     OR EXISTS (SELECT 1 FROM public.order_messages WHERE order_id=current_setting('test.order')::uuid)
     OR EXISTS (SELECT 1 FROM public.order_logs WHERE order_id=current_setting('test.order')::uuid) THEN
    RAISE EXCEPTION 'FAIL: B can read A private data';
  END IF;
  BEGIN
    INSERT INTO public.order_messages(order_id,message) VALUES (current_setting('test.order')::uuid,'cross-order message');
    RAISE EXCEPTION 'FAIL: cross-order message succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
SET LOCAL ROLE anon;
DO $test$
BEGIN
  BEGIN
    PERFORM id FROM public.orders;
    RAISE EXCEPTION 'FAIL: anon SELECT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: customer A/B, spoof prevention and anonymous access; all synthetic data rolled back' AS result;
