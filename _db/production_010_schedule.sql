-- Separate activation gate: creates a job that permanently purges expired credentials.
-- Requires action-time confirmation and verified backup/recovery before executing in production.
-- Enable pg_cron through Supabase Integrations > Cron first; no paid plan upgrade authorized.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN RAISE EXCEPTION 'pg_cron is not installed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_010_credential_lifecycle') THEN RAISE EXCEPTION '010 lifecycle migration required'; END IF;
END $preflight$;
SELECT cron.schedule('namcumz-credential-cleanup','0 * * * *','SELECT namcumz_private.purge_expired_credentials();');
COMMIT;
