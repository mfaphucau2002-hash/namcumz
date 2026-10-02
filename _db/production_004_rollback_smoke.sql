-- Runs the real top-up RPC with synthetic credentials. An inner exception rolls all writes back.
DO $test$
DECLARE
  actor uuid;
  chosen_package uuid;
  made_order public.orders;
  cipher text;
BEGIN
  SELECT id INTO actor FROM public.user_roles WHERE active ORDER BY id LIMIT 1;
  SELECT id INTO chosen_package FROM public.packages WHERE active AND game = 'Genshin Impact' AND name = 'FULL PACK GENSHIN IMPACT' LIMIT 1;
  IF actor IS NULL OR chosen_package IS NULL THEN RAISE EXCEPTION 'Missing active test actor or package'; END IF;
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', actor::text, true);
    SELECT * INTO made_order FROM public.create_topup_order(
      gen_random_uuid(), chosen_package, 'Asia', 'Hoyoverse',
      'codex-test@example.invalid', 'codex-test-placeholder', '0000000000', 'Rollback smoke test'
    );
    IF made_order.id IS NULL OR made_order.status <> 'cho_xu_ly' OR made_order.price <> 3800000
       OR made_order.kind <> 'topup' OR made_order.user_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'Top-up order fields are invalid';
    END IF;
    SELECT account_password_ciphertext INTO cipher FROM public.order_credentials WHERE order_id = made_order.id;
    IF cipher IS NULL OR cipher = 'codex-test-placeholder' THEN
      RAISE EXCEPTION 'Credential encryption failed';
    END IF;
    RAISE EXCEPTION 'ROLLBACK_TEST_ORDER';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ROLLBACK_TEST_ORDER' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: top-up RPC, owner, status, price, encryption; all writes rolled back';
END $test$;