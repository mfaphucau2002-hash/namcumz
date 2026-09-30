-- STAGING ONLY: metadata assertions, no mutation. Run after foundation.
BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version='staging_001_foundation') THEN
    RAISE EXCEPTION 'Foundation marker missing';
  END IF;
  FOREACH t IN ARRAY ARRAY['user_roles','orders','order_messages','notifications','order_logs','support_tickets'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                   WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'RLS not enabled on %',t;
    END IF;
    IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('anon','public.'||t,'INSERT')
       OR has_table_privilege('anon','public.'||t,'UPDATE') OR has_table_privilege('anon','public.'||t,'DELETE') THEN
      RAISE EXCEPTION 'Unexpected anonymous grant on %',t;
    END IF;
    IF has_table_privilege('authenticated','public.'||t,'DELETE') THEN
      RAISE EXCEPTION 'Unexpected authenticated DELETE on %',t;
    END IF;
  END LOOP;
  IF has_column_privilege('authenticated','public.user_roles','role','UPDATE')
     OR has_table_privilege('authenticated','public.user_roles','INSERT')
     OR has_column_privilege('authenticated','public.orders','price','UPDATE')
     OR has_column_privilege('authenticated','public.orders','user_id','UPDATE')
     OR has_column_privilege('authenticated','public.order_messages','sender_id','UPDATE')
     OR has_table_privilege('authenticated','public.notifications','INSERT')
     OR has_table_privilege('authenticated','public.order_logs','INSERT') THEN
    RAISE EXCEPTION 'Forbidden direct write grant found';
  END IF;
  IF NOT has_column_privilege('authenticated','public.user_roles','bio','UPDATE')
     OR NOT has_column_privilege('authenticated','public.orders','content','INSERT') THEN
    RAISE EXCEPTION 'Required grant missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname IN ('inspect_auth_user','claim_order_by_secret')) THEN
    RAISE EXCEPTION 'Legacy sensitive RPC found';
  END IF;
END;
$verify$;
COMMIT;
SELECT 'PASS: foundation metadata checks. Role A/B runtime tests still required.' AS result;
