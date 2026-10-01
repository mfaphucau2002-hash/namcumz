-- =====================================================================
-- NAMCUMZ P0 SECURITY CONTAINMENT
-- Apply before production_001_release when production still has legacy
-- permissive policies/functions. This migration changes metadata only:
-- it does not delete tables or business data.
-- The frontend remains in maintenance mode until production_001_release
-- installs and verifies the complete RPC contract.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

CREATE SCHEMA IF NOT EXISTS namcumz_private;
REVOKE ALL ON SCHEMA namcumz_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS namcumz_private.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $containment_tables$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS relation
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname = ANY (ARRAY[
        'user_roles', 'orders', 'order_credentials', 'order_messages',
        'notifications', 'order_logs', 'support_tickets', 'packages'
      ])
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.relation);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', r.relation);
  END LOOP;
END $containment_tables$;

DO $containment_policies$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'user_roles', 'orders', 'order_credentials', 'order_messages',
        'notifications', 'order_logs', 'support_tickets', 'packages'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $containment_policies$;

DO $containment_functions$
BEGIN
  IF to_regprocedure('public.inspect_auth_user(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.inspect_auth_user(text) FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.inspect_auth_user(text);
  END IF;
  IF to_regprocedure('public.claim_order_by_secret(text,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.claim_order_by_secret(text, uuid) FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.claim_order_by_secret(text, uuid);
  END IF;
END $containment_functions$;

DO $containment_triggers$
DECLARE t record;
BEGIN
  IF to_regclass('auth.users') IS NULL THEN RETURN; END IF;
  FOR t IN
    SELECT quote_ident(n.nspname) AS schema_name,
           quote_ident(c.relname) AS table_name,
           quote_ident(g.tgname) AS trigger_name
    FROM pg_trigger g JOIN pg_class c ON c.oid = g.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc f ON f.oid = g.tgfoid
    WHERE g.tgisinternal = false AND c.oid = 'auth.users'::regclass
      AND f.proname IN ('handle_new_user', 'on_signup')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %s ON %s.%s',
      t.trigger_name, t.schema_name, t.table_name);
  END LOOP;
END $containment_triggers$;

DO $legacy_signup_function$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.handle_new_user();
  END IF;
END $legacy_signup_function$;

CREATE OR REPLACE FUNCTION namcumz_private.on_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE uname text;
BEGIN
  uname := lower(trim(coalesce(NEW.raw_user_meta_data->>'username',
    split_part(coalesce(NEW.email, ''), '@', 1))));
  IF uname !~ '^[a-z0-9_]{3,32}$' THEN
    uname := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  INSERT INTO public.user_roles(id, username, display_name, role)
  VALUES (
    NEW.id,
    uname,
    left(coalesce(NEW.raw_user_meta_data->>'display_name', uname), 100),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $fn$;

REVOKE ALL ON FUNCTION namcumz_private.on_signup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS namcumz_signup ON auth.users;
CREATE TRIGGER namcumz_signup AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION namcumz_private.on_signup();

INSERT INTO namcumz_private.migrations(version)
VALUES ('production_000_p0_containment')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

COMMIT;
