-- Run only on namcumz-staging after staging_002. Metadata only; no user rows.
BEGIN TRANSACTION READ ONLY;
DO $verify$
DECLARE signature text; t text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='staging_002_workflows') THEN
  RAISE EXCEPTION 'staging_002 marker missing';
 END IF;
 FOREACH signature IN ARRAY ARRAY['public.create_order(uuid,text,text,uuid,text)','public.order_action(uuid,integer,text,jsonb,uuid)','public.claim_queue()','public.send_order_message(uuid,uuid,text,text)'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing RPC: %',signature; END IF;
  IF has_function_privilege('anon',signature,'EXECUTE') OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Incorrect RPC grants: %',signature;
  END IF;
 END LOOP;
 IF has_function_privilege('anon','public.auth_username_email(text,text)','EXECUTE') OR has_function_privilege('authenticated','public.auth_username_email(text,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Username lookup exposed to browser';
 END IF;
 FOREACH t IN ARRAY ARRAY['orders','order_messages','support_tickets'] LOOP
  IF has_any_column_privilege('authenticated','public.'||t,'INSERT') OR has_table_privilege('authenticated','public.'||t,'DELETE') THEN
   RAISE EXCEPTION 'Unexpected direct write: %',t;
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='order-files' AND NOT public AND file_size_limit=5242880) THEN
  RAISE EXCEPTION 'Private attachment bucket missing or misconfigured';
 END IF;
 IF position('p_version IS NULL' IN pg_get_functiondef('public.order_action(uuid,integer,text,jsonb,uuid)'::regprocedure))=0 THEN
  RAISE EXCEPTION 'Version validation patch missing';
 END IF;
END $verify$;
ROLLBACK;
SELECT 'staging_002 metadata PASS; Auth/API/E2E not covered' AS result;
