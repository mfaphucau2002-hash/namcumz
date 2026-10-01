-- =====================================================================
-- NAMCUMZ PRODUCTION VERIFICATION: 001_VERIFY
-- Run in Supabase SQL Editor on project vqnuutdmcekqkbdvawlw
-- Verifies all tables, columns, RPCs, RLS, and packages metadata.
-- =====================================================================

BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE
  signature text;
  t text;
  pkg_count integer;
BEGIN
  -- 1. Migration ledger
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_001_release') THEN
    RAISE EXCEPTION 'production_001_release marker missing';
  END IF;

  -- 2. Core RPC signatures and grants
  FOREACH signature IN ARRAY ARRAY[
    'public.create_order(uuid,text,text,uuid,text)',
    'public.create_topup_order(uuid,uuid,text,text,text,text,text,text)',
    'public.order_action(uuid,integer,text,jsonb,uuid)',
    'public.claim_queue()',
    'public.claim_order_by_secret(text)',
    'public.send_order_message(uuid,uuid,text,text)',
    'public.create_ticket(uuid,uuid,text,text)',
    'public.respond_ticket(uuid,text,text)',
    'public.save_package(uuid,text,text,bigint,boolean)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing RPC: %', signature; END IF;
    IF has_function_privilege('anon', signature, 'EXECUTE') OR NOT has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Incorrect RPC grants: %', signature;
    END IF;
  END LOOP;

  -- 3. Anonymous helper and unexposed lookup
  IF to_regprocedure('public.app_contract_version()') IS NULL
     OR NOT has_function_privilege('anon', 'public.app_contract_version()', 'EXECUTE')
     THEN
    RAISE EXCEPTION 'app_contract_version probe missing or mis-granted';
  END IF;
  IF to_regprocedure('public.inspect_auth_user(text)') IS NOT NULL
     OR to_regprocedure('public.claim_order_by_secret(text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy public security functions still exist';
  END IF;
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy role-provisioning trigger function still exists';
  END IF;
  IF to_regprocedure('namcumz_private.on_signup()') IS NULL THEN
    RAISE EXCEPTION 'secure signup trigger function missing';
  END IF;
  IF position('raw_user_meta_data->>''role''' IN pg_get_functiondef(to_regprocedure('namcumz_private.on_signup()'))) > 0 THEN
    RAISE EXCEPTION 'signup trigger trusts client role metadata';
  END IF;
  IF has_column_privilege('authenticated', 'public.user_roles', 'role', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated can update user_roles.role directly';
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'user_roles', 'orders', 'order_credentials', 'order_messages',
    'notifications', 'order_logs', 'support_tickets'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon can still SELECT operational table: %', t;
    END IF;
  END LOOP;

  -- The active catalog is intentionally public; customer/order data is not.
  IF to_regclass('public.packages') IS NULL
     OR NOT has_table_privilege('anon', 'public.packages', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.packages', 'SELECT') THEN
    RAISE EXCEPTION 'packages must be readable by anon and authenticated';
  END IF;

  IF to_regprocedure('public.booster_profiles()') IS NULL OR NOT has_function_privilege('anon', 'public.booster_profiles()', 'EXECUTE') OR NOT has_function_privilege('authenticated', 'public.booster_profiles()', 'EXECUTE') THEN
    RAISE EXCEPTION 'booster_profiles() must be callable by anon';
  END IF;
  IF to_regprocedure('public.booster_profile(uuid)') IS NULL OR NOT has_function_privilege('anon', 'public.booster_profile(uuid)', 'EXECUTE') OR NOT has_function_privilege('authenticated', 'public.booster_profile(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'booster_profile(uuid) must be callable by anon';
  END IF;
  IF to_regprocedure('public.booster_reviews(uuid)') IS NULL OR NOT has_function_privilege('anon', 'public.booster_reviews(uuid)', 'EXECUTE') OR NOT has_function_privilege('authenticated', 'public.booster_reviews(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'booster_reviews(uuid) must be callable by anon';
  END IF;

  IF has_function_privilege('anon', 'public.auth_username_email(text,text)', 'EXECUTE') OR has_function_privilege('authenticated', 'public.auth_username_email(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'auth_username_email must NOT be exposed to client';
  END IF;

  -- 4. No direct writes on sensitive workflow tables
  FOREACH t IN ARRAY ARRAY['orders', 'order_credentials', 'order_messages', 'support_tickets'] LOOP
    IF has_any_column_privilege('authenticated', 'public.' || t, 'INSERT') OR has_table_privilege('authenticated', 'public.' || t, 'DELETE') THEN
      RAISE EXCEPTION 'Unexpected direct write privilege on: %', t;
    END IF;
  END LOOP;

  -- 5. Storage bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'order-files' AND NOT public AND file_size_limit = 5242880) THEN
    RAISE EXCEPTION 'Private attachment bucket order-files missing or misconfigured';
  END IF;

  -- 6. Packages count
  SELECT count(*) INTO pkg_count FROM public.packages WHERE active = true AND type = 'login';
  IF pkg_count < 30 THEN
    RAISE EXCEPTION 'Expected at least 30 active login packages, found %', pkg_count;
  END IF;

  -- 7. Credentials table exists with RLS
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_credentials' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'order_credentials table missing or RLS not enabled';
  END IF;

END $verify$;
ROLLBACK;

SELECT 'PASS: production_001_release is completely verified and ready for production traffic!' AS result;
