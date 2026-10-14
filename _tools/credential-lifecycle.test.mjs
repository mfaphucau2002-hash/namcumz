import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const read=f=>readFile(new URL('../_db/'+f,import.meta.url),'utf8');
// Authorization/expiry/audit test only: decrypt is a synthetic stub, not crypto verification.
// Real crypto roundtrip is independently measured on production without customer credential reads.
test('credential lifecycle isolates actors, audits reads, revokes terminal/expired access, purges credentials only',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT ON storage.objects TO authenticated;`);
 await db.exec(await read('production_001_release.sql'));
 await db.exec(`ALTER TABLE public.order_credentials RENAME COLUMN account_password TO account_password_ciphertext;
 CREATE FUNCTION extensions.pgp_sym_decrypt(bytea,text) RETURNS text LANGUAGE sql AS $$ SELECT 'synthetic-credential'::text $$;
 CREATE FUNCTION namcumz_private.credential_key() RETURNS text LANGUAGE sql AS $$ SELECT 'synthetic-key'::text $$;
 REVOKE ALL ON FUNCTION namcumz_private.credential_key() FROM PUBLIC,anon,authenticated;
 REVOKE ALL ON public.order_credentials FROM PUBLIC,anon,authenticated;
 INSERT INTO namcumz_private.migrations(version) VALUES('production_009_launch_access');`);
 await db.exec(await read('production_010_credential_lifecycle.sql'));
 const actors={};for(const [name,role] of [['alice','customer'],['bob','customer'],['booster','booster'],['otherbooster','booster'],['admin','admin']]){
  const id=crypto.randomUUID();actors[name]=id;await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3::jsonb)',[id,name+'@example.invalid',JSON.stringify({username:name})]);await db.query('UPDATE public.user_roles SET role=$1 WHERE id=$2',[role,id]);
 }
 const as=async(name,fn)=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actors[name]||'']);await db.exec('SET ROLE '+(name==='anon'?'anon':'authenticated'));try{return await fn();}finally{await db.exec('RESET ROLE');}};
 const o=(await as('alice',()=>db.query("SELECT * FROM public.create_order($1,'synthetic credential test','Asia')",[crypto.randomUUID()]))).rows[0];
 await db.query('INSERT INTO public.order_credentials(order_id,login_method,account_username,account_password_ciphertext,contact_phone,notes) VALUES($1,$2,$3,$4,$5,$6)',[o.id,'synthetic','synthetic',Buffer.from('not-a-real-cipher').toString('base64'),'00000000','']);
 const get=()=>db.query('SELECT * FROM public.get_order_credentials($1)',[o.id]);
 assert.equal((await as('alice',get)).rows[0].account_password,'synthetic-credential');
 await assert.rejects(as('anon',get));await assert.rejects(as('bob',get));await assert.rejects(as('booster',get));await assert.rejects(as('admin',get));
 await db.query("UPDATE public.orders SET price=10000,required_amount=10000,paid_amount=10000,quote_accepted=true,status='dang_cay' WHERE id=$1",[o.id]);
 await assert.rejects(as('booster',get),'NULL assignment must not authorize any booster');
 await db.query('UPDATE public.orders SET booster_id=$1 WHERE id=$2',[actors.booster,o.id]);
 await as('booster',get);await as('admin',get);await assert.rejects(as('otherbooster',get));
 const events=(await db.query('SELECT actor,actor_role FROM namcumz_private.credential_access_events')).rows;assert.equal(events.length,3);assert.ok(events.some(e=>e.actor===actors.booster));
 await assert.rejects(as('alice',()=>db.query('SELECT * FROM namcumz_private.credential_access_events')));
 await assert.rejects(as('alice',()=>db.query('SELECT namcumz_private.purge_expired_credentials()')));
 await db.query('UPDATE public.user_roles SET active=false WHERE id=$1',[actors.booster]);await assert.rejects(as('booster',get));
 await db.query("UPDATE public.orders SET status='hoan_thanh' WHERE id=$1",[o.id]);await assert.rejects(as('alice',get));await assert.rejects(as('admin',get));
 assert.ok((await db.query('SELECT expires_at<=now() AS expired FROM public.order_credentials WHERE order_id=$1',[o.id])).rows[0].expired);
 assert.equal((await db.query('SELECT namcumz_private.purge_expired_credentials() AS n')).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.orders WHERE id=$1',[o.id])).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM namcumz_private.credential_access_events')).rows[0].n,3);
 assert.equal((await db.query('SELECT public.app_contract_version() AS version')).rows[0].version,'production_010_maintenance');
 await assert.rejects(db.exec(await read('production_010_verify.sql')),/Cron extension/);await db.exec('ROLLBACK');
 // A modeled job tests the compatibility selector only; pg_cron is not installed in PGlite.
 await db.exec(`CREATE SCHEMA cron;CREATE TABLE cron.job(jobname text,command text,schedule text,active boolean,username text,database text);
 INSERT INTO cron.job VALUES('namcumz-credential-cleanup','SELECT namcumz_private.purge_expired_credentials();','0 * * * *',true,current_user,current_database());`);
 assert.equal((await db.query('SELECT public.app_contract_version() AS version')).rows[0].version,'production_010_credential_lifecycle');
 await db.exec("UPDATE cron.job SET active=false");assert.equal((await db.query('SELECT public.app_contract_version() AS version')).rows[0].version,'production_010_maintenance');
 }finally{await db.close();}
});
