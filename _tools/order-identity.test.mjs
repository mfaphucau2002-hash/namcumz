import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('legacy nullable account names reproduce renter_name error and migration fixes identity without weakening guards',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA namcumz_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
 CREATE TABLE public.user_roles(id uuid PRIMARY KEY,username text,display_name text);
 CREATE TABLE public.orders(id uuid DEFAULT gen_random_uuid(),user_id uuid DEFAULT auth.uid(),renter_name text NOT NULL,price bigint DEFAULT 0,status text DEFAULT 'cho_xu_ly',booster_id uuid,rating integer,review_comment text,ai_plan text,secret_code text,order_code text,created_at timestamptz,booster_name text);`);
 const original=await readFile(new URL('../_db/production_001_release.sql',import.meta.url),'utf8'); const start=original.indexOf('CREATE OR REPLACE FUNCTION namcumz_private.prepare_order()');const end=original.indexOf('DROP TRIGGER',start);
 await db.exec(original.slice(start,end));await db.exec('CREATE TRIGGER prepare BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION namcumz_private.prepare_order()');
 const id=crypto.randomUUID();await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);
 await db.query('INSERT INTO auth.users VALUES ($1,$2,$3)',[id,'legacy@namcumz.com',{display_name:'Legacy Customer'}]);await db.query('INSERT INTO public.user_roles VALUES ($1,NULL,NULL)',[id]);
 await assert.rejects(db.query('INSERT INTO public.orders DEFAULT VALUES'),/renter_name/);
 await db.exec(await readFile(new URL('../_db/production_005_order_identity.sql',import.meta.url),'utf8'));
 let row=(await db.query('INSERT INTO public.orders DEFAULT VALUES RETURNING *')).rows[0];assert.equal(row.renter_name,'Legacy Customer');assert.equal(row.user_id,id);
 await db.query("UPDATE auth.users SET raw_user_meta_data='{}'");row=(await db.query('INSERT INTO public.orders DEFAULT VALUES RETURNING *')).rows[0];assert.equal(row.renter_name,'legacy');
 await db.query("UPDATE public.user_roles SET username='accountname',display_name=' Display Name '");row=(await db.query('INSERT INTO public.orders DEFAULT VALUES RETURNING *')).rows[0];assert.equal(row.renter_name,'Display Name');
 await assert.rejects(db.query('INSERT INTO public.orders(price) VALUES(100)'),/Client cannot/);
 await assert.rejects(db.query('INSERT INTO public.orders(user_id) VALUES($1)',[crypto.randomUUID()]),/Authenticated owner/);
 assert.equal((await db.query('SELECT count(*) FROM namcumz_private.order_identity_function_backup')).rows[0].count,1);
 }finally{await db.close();}
});