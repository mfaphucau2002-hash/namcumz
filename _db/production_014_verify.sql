-- =====================================================================
-- NAMCUMZ READ-ONLY VERIFICATION: 014_CHECKIN_HARDENING
-- Verifies migration marker, SECURITY DEFINER, empty search_path,
-- strict EXECUTE grants, 24h age gate, rate limit, and unverified cap.
-- =====================================================================

BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE
  v_proc record;
  v_def text;
  v_sig constant text := 'public.claim_daily_checkin()';
BEGIN
  IF to_regclass('namcumz_private.migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing migration ledger';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_007_user_member_center'
  ) THEN
    RAISE EXCEPTION 'Missing 007 migration marker';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_009_launch_access'
  ) THEN
    RAISE EXCEPTION 'Missing 009 migration marker';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_014_checkin_hardening'
  ) THEN
    RAISE EXCEPTION 'Missing 014 migration marker';
  END IF;

  IF to_regprocedure(v_sig) IS NULL THEN
    RAISE EXCEPTION 'Missing RPC signature: %', v_sig;
  END IF;

  SELECT p.prosecdef, p.proconfig
  INTO v_proc
  FROM pg_proc p
  WHERE p.oid = to_regprocedure(v_sig);

  IF NOT v_proc.prosecdef THEN
    RAISE EXCEPTION 'public.claim_daily_checkin() must be SECURITY DEFINER';
  END IF;

  IF v_proc.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_proc.proconfig) setting
    WHERE setting IN ('search_path=""', 'search_path=')
  ) THEN
    RAISE EXCEPTION 'public.claim_daily_checkin() missing empty search_path';
  END IF;

  IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on %', v_sig;
  END IF;

  IF NOT has_function_privilege('authenticated', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated missing EXECUTE on %', v_sig;
  END IF;

  v_def := pg_get_functiondef(to_regprocedure(v_sig));
  IF position('interval ''24 hours''' IN v_def) = 0
     AND position('''24 hours''::interval' IN v_def) = 0 THEN
    RAISE EXCEPTION 'public.claim_daily_checkin() missing 24h account age check';
  END IF;

  IF position('namcumz_private.rate_limit' IN v_def) = 0 THEN
    RAISE EXCEPTION 'public.claim_daily_checkin() missing rate_limit guard';
  END IF;

  IF position('unverified_cap_reached' IN v_def) = 0 THEN
    RAISE EXCEPTION 'public.claim_daily_checkin() missing unverified cap guard';
  END IF;

  RAISE NOTICE 'PASS: 014 checkin hardening verified';
END $verify$;
COMMIT;
