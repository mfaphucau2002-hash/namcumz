-- G0.2: metadata only. Run with an authorized database administrator in staging first.
-- No customer rows, auth.users rows, JWTs or stored credentials are selected.
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p') ORDER BY 1,2;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3;
SELECT table_schema,table_name,grantee,privilege_type
FROM information_schema.table_privileges
WHERE table_schema IN ('public','storage') AND grantee IN ('anon','authenticated','PUBLIC') ORDER BY 1,2,3,4;
SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 p.prosecdef AS security_definer,p.proconfig,p.proacl,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY 1,2;
SELECT n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth') ORDER BY 1,2,3;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 2,3;
SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY 1,2;
COMMIT;
