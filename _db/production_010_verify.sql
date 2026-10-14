BEGIN TRANSACTION READ ONLY;
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_010_credential_lifecycle') THEN RAISE EXCEPTION '010 marker missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='expires_at' AND is_nullable='NO') THEN RAISE EXCEPTION 'Credential expiry missing'; END IF;
 IF to_regclass('namcumz_private.credential_access_events') IS NULL OR to_regclass('namcumz_private.credential_cleanup_runs') IS NULL THEN RAISE EXCEPTION 'Credential audit missing'; END IF;
 IF to_regprocedure('namcumz_private.purge_expired_credentials()') IS NULL THEN RAISE EXCEPTION 'Purge function missing'; END IF;
 IF has_function_privilege('anon','namcumz_private.purge_expired_credentials()','EXECUTE') OR has_function_privilege('authenticated','namcumz_private.purge_expired_credentials()','EXECUTE') OR has_function_privilege('service_role','namcumz_private.purge_expired_credentials()','EXECUTE') THEN RAISE EXCEPTION 'Cleanup function exposed'; END IF;
 IF has_any_column_privilege('authenticated','public.order_credentials','SELECT') OR has_any_column_privilege('anon','public.order_credentials','SELECT') THEN RAISE EXCEPTION 'Direct credential access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='namcumz_expire_credentials' AND tgenabled='O') THEN RAISE EXCEPTION 'Credential revocation trigger missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN RAISE EXCEPTION 'Cron extension not installed'; END IF;
 IF public.app_contract_version() IS DISTINCT FROM 'production_010_credential_lifecycle' THEN RAISE EXCEPTION 'Credential cleanup job inactive or version mismatch'; END IF;
 RAISE NOTICE 'PASS: 010 lifecycle metadata; actual cron run, retention, logs and restore NOT VERIFIED';
END $verify$;
COMMIT;
