-- Credential lifecycle hardening. Prepared locally; do not run before backup/restore gate.
-- Proposed access lifetime: seven days; revoke on completion/cancellation.
-- Physical deletion is hourly in bounded batches; retention includes scheduler/backlog delay.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_009_launch_access') THEN RAISE EXCEPTION '009 required before credential lifecycle'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='account_password') THEN RAISE EXCEPTION 'Plaintext credentials remain'; END IF;
END $preflight$;
ALTER TABLE public.order_credentials ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.order_credentials SET expires_at=created_at+interval '7 days' WHERE expires_at IS NULL;
ALTER TABLE public.order_credentials ALTER COLUMN expires_at SET DEFAULT (now()+interval '7 days');
ALTER TABLE public.order_credentials ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS order_credentials_expiry_idx ON public.order_credentials(expires_at);
CREATE TABLE IF NOT EXISTS namcumz_private.credential_access_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL,
 actor uuid NOT NULL,
 actor_role text NOT NULL CHECK(actor_role IN ('customer','booster','admin','super_admin')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS namcumz_private.credential_cleanup_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deleted_count integer NOT NULL CHECK(deleted_count>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE namcumz_private.credential_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE namcumz_private.credential_cleanup_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON namcumz_private.credential_access_events,namcumz_private.credential_cleanup_runs FROM PUBLIC,anon,authenticated,service_role;

-- Audit successful reads without storing passwords, decrypted values, usernames or tokens.
CREATE OR REPLACE FUNCTION public.get_order_credentials(p_order_id uuid)
RETURNS TABLE(order_id uuid,login_method text,account_username text,account_password text,contact_phone text,notes text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=namcumz_private.require_user(); o public.orders; credential public.order_credentials; actor_role text;
BEGIN
 -- Keep lock order compatible with order_action completion: order -> role -> credential.
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR SHARE;
 IF NOT FOUND OR o.cancelled OR o.status='hoan_thanh' THEN RAISE EXCEPTION 'Credential unavailable or expired' USING ERRCODE='42501'; END IF;
 SELECT r.role INTO actor_role FROM public.user_roles r WHERE r.id=uid AND r.active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inactive actor' USING ERRCODE='42501'; END IF;
 SELECT c.* INTO credential FROM public.order_credentials c WHERE c.order_id=p_order_id FOR SHARE;
 IF NOT FOUND OR credential.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Credential unavailable or expired' USING ERRCODE='42501'; END IF;
 IF o.user_id IS DISTINCT FROM uid AND NOT coalesce((
  o.quote_accepted AND o.required_amount>0 AND o.paid_amount>=o.required_amount
  AND (actor_role IN ('admin','super_admin') OR (actor_role='booster' AND o.booster_id=uid AND o.status IN ('dang_cay','tam_dung')))
 ),false) THEN RAISE EXCEPTION 'Credential access denied' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT credential.order_id,credential.login_method,credential.account_username,
  extensions.pgp_sym_decrypt(decode(credential.account_password_ciphertext,'base64'),namcumz_private.credential_key()),credential.contact_phone,credential.notes,credential.created_at;
 IF FOUND THEN INSERT INTO namcumz_private.credential_access_events(order_id,actor,actor_role) VALUES(p_order_id,uid,actor_role); END IF;
END $fn$;
REVOKE ALL ON FUNCTION public.get_order_credentials(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_credentials(uuid) TO authenticated;

-- Ending an order revokes credential access immediately; physical purge follows on schedule.
CREATE OR REPLACE FUNCTION namcumz_private.expire_terminal_credentials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 UPDATE public.order_credentials SET expires_at=least(expires_at,now()) WHERE order_id=NEW.id;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION namcumz_private.expire_terminal_credentials() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS namcumz_expire_credentials ON public.orders;
CREATE TRIGGER namcumz_expire_credentials AFTER UPDATE OF status,cancelled ON public.orders
FOR EACH ROW WHEN(NEW.cancelled OR NEW.status='hoan_thanh') EXECUTE FUNCTION namcumz_private.expire_terminal_credentials();

-- Owner-only cleanup; never deletes orders, messages, payments or audit history.
CREATE OR REPLACE FUNCTION namcumz_private.purge_expired_credentials()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE removed integer;
BEGIN
 WITH victims AS (
  SELECT c.order_id FROM public.order_credentials c JOIN public.orders o ON o.id=c.order_id
  WHERE c.expires_at<=now() OR o.cancelled OR o.status='hoan_thanh'
  ORDER BY c.expires_at LIMIT 500 FOR UPDATE OF c SKIP LOCKED
 ), deleted AS (
  DELETE FROM public.order_credentials c USING victims v WHERE c.order_id=v.order_id RETURNING c.order_id
 ) SELECT count(*) INTO removed FROM deleted;
 INSERT INTO namcumz_private.credential_cleanup_runs(deleted_count) VALUES(removed);
 RETURN removed;
END $fn$;
REVOKE ALL ON FUNCTION namcumz_private.purge_expired_credentials() FROM PUBLIC,anon,authenticated,service_role;

-- Compatibility is fail-closed until the exact cleanup job is active on this database.
CREATE OR REPLACE FUNCTION public.app_contract_version()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF to_regclass('cron.job') IS NULL THEN RETURN 'production_010_maintenance'; END IF;
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='namcumz-credential-cleanup' AND active AND schedule='0 * * * *' AND username=current_user AND database=current_database() AND command='SELECT namcumz_private.purge_expired_credentials();') THEN
  RETURN 'production_010_credential_lifecycle';
 END IF;
 RETURN 'production_010_maintenance';
END $fn$;
REVOKE ALL ON FUNCTION public.app_contract_version() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_contract_version() TO anon,authenticated;
INSERT INTO namcumz_private.migrations(version) VALUES('production_010_credential_lifecycle') ON CONFLICT(version) DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
