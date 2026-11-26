-- =====================================================================
-- NAMCUMZ READ-ONLY VERIFICATION: 012_SECURITY_HARDENING
-- Verifies migration marker, R4 quote_requests RLS/grants/policies,
-- and R5 create_order signature, search_path, grants, and guard.
-- =====================================================================

BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE
  v_priv text;
  v_proc record;
  v_def text;
  v_sig constant text := 'public.create_order(uuid,text,text,uuid,text)';
BEGIN
  IF to_regclass('namcumz_private.migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing migration ledger';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_009_launch_access'
  ) THEN
    RAISE EXCEPTION 'Missing 009 migration marker';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_012_security_hardening'
  ) THEN
    RAISE EXCEPTION 'Missing 012 migration marker';
  END IF;

  -- R4: Verify public.quote_requests lockdown when table exists
  IF to_regclass('public.quote_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE oid = 'public.quote_requests'::regclass AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS disabled on public.quote_requests';
    END IF;

    FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF has_table_privilege('anon', 'public.quote_requests', v_priv) THEN
        RAISE EXCEPTION 'anon unexpectedly has % privilege on public.quote_requests', v_priv;
      END IF;
    END LOOP;

    IF has_any_column_privilege('anon', 'public.quote_requests', 'SELECT') THEN
      RAISE EXCEPTION 'anon unexpectedly has column SELECT privilege on public.quote_requests';
    END IF;

    IF NOT has_table_privilege('authenticated', 'public.quote_requests', 'SELECT') THEN
      RAISE EXCEPTION 'authenticated missing SELECT privilege on public.quote_requests';
    END IF;

    FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      IF has_table_privilege('authenticated', 'public.quote_requests', v_priv) THEN
        RAISE EXCEPTION 'authenticated unexpectedly has % privilege on public.quote_requests', v_priv;
      END IF;
    END LOOP;

    IF has_any_column_privilege('authenticated', 'public.quote_requests', 'INSERT')
       OR has_any_column_privilege('authenticated', 'public.quote_requests', 'UPDATE') THEN
      RAISE EXCEPTION 'authenticated unexpectedly has column write privilege on public.quote_requests';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'quote_requests'
        AND policyname = 'quote_requests_admin_read'
        AND cmd = 'SELECT'
        AND 'authenticated' = ANY(roles)
        AND qual LIKE '%is_admin%'
    ) THEN
      RAISE EXCEPTION 'quote_requests_admin_read policy missing or misconfigured';
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'quote_requests'
        AND policyname <> 'quote_requests_admin_read'
    ) THEN
      RAISE EXCEPTION 'Unexpected extra policy remains on public.quote_requests';
    END IF;
  END IF;

  -- R5: Verify public.create_order(uuid,text,text,uuid,text)
  IF to_regprocedure(v_sig) IS NULL THEN
    RAISE EXCEPTION 'Missing RPC signature: %', v_sig;
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO v_proc
  FROM pg_proc p
  WHERE p.oid = to_regprocedure(v_sig);

  IF NOT v_proc.prosecdef THEN
    RAISE EXCEPTION 'public.create_order must be SECURITY DEFINER';
  END IF;

  IF v_proc.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_proc.proconfig) setting
    WHERE setting IN ('search_path=""', 'search_path=')
  ) THEN
    RAISE EXCEPTION 'public.create_order missing empty search_path';
  END IF;

  IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on %', v_sig;
  END IF;

  IF NOT has_function_privilege('authenticated', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated missing EXECUTE on %', v_sig;
  END IF;

  v_def := pg_get_functiondef(to_regprocedure(v_sig));
  IF position('Không nhập mật khẩu tài khoản game vào nội dung ghi chú đơn hàng.' IN v_def) = 0 THEN
    RAISE EXCEPTION 'public.create_order missing R5 plaintext password guard';
  END IF;

  RAISE NOTICE 'PASS: 012 security hardening metadata verified; runtime RLS/RPC tests verified separately';
END $verify$;
COMMIT;
