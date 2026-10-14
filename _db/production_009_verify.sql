BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE signature text; t text; f record;
BEGIN
 IF to_regclass('namcumz_private.migrations') IS NULL THEN RAISE EXCEPTION 'Missing migration ledger'; END IF;
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_009_launch_access') THEN RAISE EXCEPTION 'Missing 009 migration marker'; END IF;
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_002_credentials_encryption') THEN RAISE EXCEPTION 'Missing encryption migration'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='account_password') THEN RAISE EXCEPTION 'Plaintext credential column remains'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='account_password_ciphertext' AND data_type='text' AND is_nullable='NO') THEN RAISE EXCEPTION 'Ciphertext schema incorrect'; END IF;
 IF has_any_column_privilege('authenticated','public.order_credentials','SELECT') THEN RAISE EXCEPTION 'Direct credential column access'; END IF;
 IF to_regprocedure('public.get_order_credentials(uuid)') IS NULL OR to_regprocedure('namcumz_private.credential_key()') IS NULL THEN RAISE EXCEPTION 'Missing credential RPC/helper'; END IF;
 IF has_function_privilege('anon','public.get_order_credentials(uuid)','EXECUTE') OR NOT has_function_privilege('authenticated','public.get_order_credentials(uuid)','EXECUTE') OR has_function_privilege('anon','namcumz_private.credential_key()','EXECUTE') OR has_function_privilege('authenticated','namcumz_private.credential_key()','EXECUTE') THEN RAISE EXCEPTION 'Credential grants incorrect'; END IF;
 IF public.app_contract_version() IS DISTINCT FROM 'production_009_launch_access' THEN RAISE EXCEPTION 'Contract version mismatch'; END IF;
 FOREACH signature IN ARRAY ARRAY['public.create_order(uuid,text,text,uuid,text)','public.create_topup_order(uuid,uuid,text,text,text,text,text,text)','public.order_action(uuid,integer,text,jsonb,uuid)','public.claim_queue()','public.claim_order_by_secret(text)','public.send_order_message(uuid,uuid,text,text)','public.create_ticket(uuid,uuid,text,text)','public.respond_ticket(uuid,text,text)','public.set_user_role(uuid,text,boolean,text)','public.save_package(uuid,text,text,bigint,boolean)','public.get_order_payment_info(text)','public.pay_order_by_wallet(uuid)','public.cancel_order_payment(uuid)','public.create_deposit_order(bigint,uuid)','public.claim_daily_checkin()','public.get_user_profile_summary()'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing RPC signature: %',signature; END IF;
  IF has_function_privilege('anon',signature,'EXECUTE') OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN RAISE EXCEPTION 'Bad RPC grant: %',signature; END IF;
 END LOOP;
 signature := 'public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb)';
 IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing settlement RPC'; END IF;
 IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('authenticated',signature,'EXECUTE') OR NOT has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'Bad settlement grant'; END IF;
 FOREACH t IN ARRAY ARRAY['orders','order_messages','order_logs','support_tickets','user_roles','notifications','order_credentials','user_wallets','wallet_transactions','user_check_ins','user_game_accounts','payment_transactions'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'Missing table: %',t; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t) AND relrowsecurity) THEN RAISE EXCEPTION 'RLS disabled: %',t; END IF;
  IF has_any_column_privilege('anon','public.'||t,'SELECT') THEN RAISE EXCEPTION 'Anonymous private column grant: %',t; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_read' AND qual LIKE '%user_id%' AND qual LIKE '%auth.uid()%') THEN RAISE EXCEPTION 'Order ownership policy missing or changed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND permissive='PERMISSIVE' AND policyname <> 'orders_read') THEN RAISE EXCEPTION 'Unexpected permissive order policy'; END IF;
 FOR f IN SELECT n.nspname,p.proname,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','namcumz_private') AND p.prosecdef LOOP
  IF f.proconfig IS NULL OR NOT EXISTS(SELECT 1 FROM unnest(f.proconfig) setting WHERE setting IN ('search_path=""','search_path=')) THEN RAISE EXCEPTION 'Unsafe definer search_path: %.%',f.nspname,f.proname; END IF;
 END LOOP;
 RAISE NOTICE 'PASS: 009 metadata verified; runtime security, credentials, E2E and backup NOT VERIFIED';
END $verify$;
COMMIT;
