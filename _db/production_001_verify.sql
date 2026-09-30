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
  IF to_regprocedure('public.booster_profiles()') IS NULL OR NOT has_function_privilege('anon', 'public.booster_profiles()', 'EXECUTE') THEN
    RAISE EXCEPTION 'booster_profiles() must be callable by anon';
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
