-- =====================================================================
-- STAGING 004 CREDENTIAL ENCRYPTION SMOKE TEST
-- Runs only on staging; all test orders/rate-limit changes are rolled back.
-- Uses existing active customer IDs but synthetic game credentials.
-- Never returns the test password or Vault key.
-- =====================================================================
BEGIN;
DO $smoke$
DECLARE
  customer_a uuid;
  customer_b uuid;
  package_id uuid;
  request_id uuid := gen_random_uuid();
  created_order public.orders;
  duplicate_order public.orders;
  actual_username text;
  actual_password text;
  credential_rows integer;
  other_customer_denied boolean := false;
BEGIN
  SELECT id INTO customer_a FROM public.user_roles
  WHERE role = 'customer' AND active ORDER BY id LIMIT 1;
  SELECT id INTO customer_b FROM public.user_roles
  WHERE role = 'customer' AND active ORDER BY id OFFSET 1 LIMIT 1;
  SELECT id INTO package_id FROM public.packages
  WHERE active AND type = 'login' ORDER BY price, id LIMIT 1;
  IF customer_a IS NULL OR customer_b IS NULL OR package_id IS NULL THEN
    RAISE EXCEPTION 'Smoke test requires two active customers and one active login package';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', customer_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', customer_a::text, 'role', 'authenticated'
  )::text, true);

  created_order := public.create_topup_order(
    request_id, package_id, 'Asia', 'Hoyoverse',
    'staging-only@example.invalid', 'staging-only-password-5482',
    '+84900000000', 'Rollback smoke test'
  );
  duplicate_order := public.create_topup_order(
    request_id, package_id, 'Asia', 'Hoyoverse',
    'staging-only@example.invalid', 'staging-only-password-5482',
    '+84900000000', 'Rollback smoke test'
  );
  IF created_order.id IS NULL OR duplicate_order.id IS DISTINCT FROM created_order.id THEN
    RAISE EXCEPTION 'Top-up creation or idempotent retry failed';
  END IF;
  IF position('staging-only-password-5482' IN created_order.content) > 0 THEN
    RAISE EXCEPTION 'Password leaked into order summary';
  END IF;

  SELECT g.account_username, g.account_password
  INTO actual_username, actual_password
  FROM public.get_order_credentials(created_order.id) AS g;
  IF actual_username IS DISTINCT FROM 'staging-only@example.invalid'
     OR actual_password IS DISTINCT FROM 'staging-only-password-5482' THEN
    RAISE EXCEPTION 'Owner credential RPC round-trip failed';
  END IF;
  SELECT count(*) INTO credential_rows FROM public.order_credentials
  WHERE order_id = created_order.id;
  IF credential_rows <> 1 THEN
    RAISE EXCEPTION 'Idempotent retry created duplicate credential rows';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', customer_b::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', customer_b::text, 'role', 'authenticated'
  )::text, true);
  BEGIN
    PERFORM 1 FROM public.get_order_credentials(created_order.id);
    other_customer_denied := false;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    other_customer_denied := true;
  END;
  IF NOT other_customer_denied THEN
    RAISE EXCEPTION 'Unrelated customer could read credentials';
  END IF;

  IF public.app_contract_version() <> 'staging_004_credentials_encryption' THEN
    RAISE EXCEPTION 'Unexpected staging contract version';
  END IF;
END $smoke$;
ROLLBACK;
SELECT 'PASS: top-up encryption, idempotency, owner access, cross-customer denial (rolled back)' AS result;
