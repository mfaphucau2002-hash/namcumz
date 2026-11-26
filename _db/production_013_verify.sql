-- =====================================================================
-- NAMCUMZ READ-ONLY VERIFICATION: 013_SEPAY_SACOMBANK
-- Verifies migration marker, Sacombank 79202012546 destination guards,
-- SECURITY DEFINER/INVOKER attributes, empty search_path, and strict
-- service_role-only EXECUTE grants on both confirm_payment_transaction RPCs.
-- =====================================================================

BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE
  v_priv_sig constant text := 'namcumz_private.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb)';
  v_pub_sig  constant text := 'public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb)';
  v_proc record;
  v_def text;
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
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_013_sepay_sacombank'
  ) THEN
    RAISE EXCEPTION 'Missing 013 migration marker';
  END IF;

  -- 1. Verify private confirm_payment_transaction
  IF to_regprocedure(v_priv_sig) IS NULL THEN
    RAISE EXCEPTION 'Missing function: %', v_priv_sig;
  END IF;

  SELECT p.prosecdef, p.proconfig INTO v_proc
  FROM pg_proc p WHERE p.oid = to_regprocedure(v_priv_sig);

  IF NOT v_proc.prosecdef THEN
    RAISE EXCEPTION '% must be SECURITY DEFINER', v_priv_sig;
  END IF;

  IF v_proc.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_proc.proconfig) setting
    WHERE setting IN ('search_path=""', 'search_path=')
  ) THEN
    RAISE EXCEPTION '% missing empty search_path', v_priv_sig;
  END IF;

  IF has_function_privilege('anon', v_priv_sig, 'EXECUTE')
     OR has_function_privilege('authenticated', v_priv_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon/authenticated must not have EXECUTE on %', v_priv_sig;
  END IF;

  IF NOT has_function_privilege('service_role', v_priv_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role missing EXECUTE on %', v_priv_sig;
  END IF;

  v_def := pg_get_functiondef(to_regprocedure(v_priv_sig));
  IF position('79202012546' IN v_def) = 0 OR position('sacombank' IN lower(v_def)) = 0 THEN
    RAISE EXCEPTION '% missing Sacombank 79202012546 guard', v_priv_sig;
  END IF;
  IF position('0763550673' IN v_def) > 0 THEN
    RAISE EXCEPTION '% still references legacy MB account 0763550673', v_priv_sig;
  END IF;

  -- 2. Verify public confirm_payment_transaction wrapper
  IF to_regprocedure(v_pub_sig) IS NULL THEN
    RAISE EXCEPTION 'Missing function: %', v_pub_sig;
  END IF;

  SELECT p.prosecdef, p.proconfig INTO v_proc
  FROM pg_proc p WHERE p.oid = to_regprocedure(v_pub_sig);

  IF v_proc.prosecdef THEN
    RAISE EXCEPTION '% must remain SECURITY INVOKER', v_pub_sig;
  END IF;

  IF v_proc.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_proc.proconfig) setting
    WHERE setting IN ('search_path=""', 'search_path=')
  ) THEN
    RAISE EXCEPTION '% missing empty search_path', v_pub_sig;
  END IF;

  IF has_function_privilege('anon', v_pub_sig, 'EXECUTE')
     OR has_function_privilege('authenticated', v_pub_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon/authenticated must not have EXECUTE on %', v_pub_sig;
  END IF;

  IF NOT has_function_privilege('service_role', v_pub_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role missing EXECUTE on %', v_pub_sig;
  END IF;

  v_def := pg_get_functiondef(to_regprocedure(v_pub_sig));
  IF position('79202012546' IN v_def) = 0 OR position('sacombank' IN lower(v_def)) = 0 THEN
    RAISE EXCEPTION '% missing Sacombank 79202012546 guard', v_pub_sig;
  END IF;
  IF position('0763550673' IN v_def) > 0 THEN
    RAISE EXCEPTION '% still references legacy MB account 0763550673', v_pub_sig;
  END IF;

  RAISE NOTICE 'PASS: 013 SePay Sacombank 79202012546 metadata & grants verified';
END $verify$;
COMMIT;
