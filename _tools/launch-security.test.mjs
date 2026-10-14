import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('all wallet mutations reject incompatible database before RPC; password whitespace survives',async()=>{
 const ctx={window:{NAMCUMZ_CONFIG:{environment:'production'},NAMCUMZ_DB_READY:false},crypto:webcrypto,setTimeout,clearTimeout};
 vm.runInNewContext(await read('assets/js/order-api.js'),ctx);let calls=0;
 const client={rpc:async(name,p)=>{calls++;return {data:{id:'order',success:true,password:p?.p_password}};}};
 const api=ctx.window.OrderAPI;
 for(const promise of [api.payByWallet(client,'a','o'),api.cancelPayment(client,'a','o'),api.createDeposit(client,'a',20000),api.claimDailyCheckin(client,'a')])await assert.rejects(promise,/bảo trì/);
 assert.equal(calls,0);ctx.window.NAMCUMZ_DB_READY=true;
 const row=await api.topup(client,'a','pkg','Asia','Hoyoverse','name',' pass ','0987654321');assert.equal(row.password,' pass ');
 const failed={rpc:async()=>({data:{success:false}})};
 await assert.rejects(api.payByWallet(failed,'a','o'));await assert.rejects(api.cancelPayment(failed,'a','o'));
});
test('009 closes legacy anonymous/cross-user payment reads, makes read side-effect free, and verifier fails on drift',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,phone text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT ON storage.objects TO authenticated;`);
 for(const file of ['production_001_release.sql','production_005_order_identity.sql','production_006_vietqr_payment.sql','production_007_user_member_center.sql'])await db.exec(await read('_db/'+file));
 const alice=crypto.randomUUID(),bob=crypto.randomUUID();
 for(const [id,name] of [[alice,'alice'],[bob,'bob']])await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3::jsonb)',[id,name+'@example.invalid',JSON.stringify({username:name})]);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[alice]);
 const order=(await db.query("SELECT public.create_deposit_order(20000) AS data")).rows[0].data;
 const as=async(id,fn)=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('SET ROLE '+(id?'authenticated':'anon'));try{return await fn();}finally{await db.exec('RESET ROLE');}};
 const query=()=>db.query('SELECT public.get_order_payment_info($1) AS data',[order.id]);
 assert.equal((await as(null,query)).rows[0].data.id,order.id,'Reproduce legacy anonymous leak using synthetic data');
 assert.equal((await as(bob,query)).rows[0].data.id,order.id,'Reproduce legacy cross-user leak');
 // Explicit encryption METADATA fixture; not an encryption implementation or crypto verification.
 await assert.rejects(db.exec(await read('_db/production_009_launch_access.sql')),/Encryption migration/);await db.exec('ROLLBACK');
 await db.exec(`ALTER TABLE public.order_credentials RENAME COLUMN account_password TO account_password_ciphertext;
 CREATE FUNCTION namcumz_private.credential_key() RETURNS text LANGUAGE sql AS $fixture$ SELECT repeat('x',32) $fixture$;
 REVOKE ALL ON FUNCTION namcumz_private.credential_key() FROM PUBLIC,anon,authenticated;
 CREATE FUNCTION public.get_order_credentials(uuid) RETURNS text LANGUAGE sql AS $fixture$ SELECT NULL::text $fixture$;
 REVOKE ALL ON FUNCTION public.get_order_credentials(uuid) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.get_order_credentials(uuid) TO authenticated;
 INSERT INTO namcumz_private.migrations(version) VALUES('production_002_credentials_encryption');`);
 await db.exec('REVOKE ALL ON public.order_credentials FROM authenticated;');
 await db.exec(await read('_db/production_009_launch_access.sql'));
 await assert.rejects(as(null,query));await assert.rejects(as(bob,query));
 assert.equal((await as(alice,query)).rows[0].data.id,order.id);
 await db.query("UPDATE public.orders SET expires_at=now()-interval '1 minute' WHERE id=$1",[order.id]);
 assert.equal((await as(alice,query)).rows[0].data.payment_status,'EXPIRED');
 assert.equal((await db.query('SELECT payment_status FROM public.orders WHERE id=$1',[order.id])).rows[0].payment_status,'PENDING');
 // Isolated fixture lacks encrypted credentials; test the verifier after supplying metadata only.
 await db.exec('REVOKE ALL ON public.order_credentials FROM authenticated;');
 // Actual PostgREST wrapper path executed under service_role, with no fixture owner privileges.
 await db.exec('SET ROLE service_role');
 await assert.rejects(db.query('SELECT public.confirm_payment_transaction($1,$2,$3,$4,$5,$6,$7::jsonb)',['sepay','invalid-bank','MB','wrong',20000,order.payment_reference,JSON.stringify({transferType:'in'})]));
 const settled=(await db.query('SELECT public.confirm_payment_transaction($1,$2,$3,$4,$5,$6,$7::jsonb)',['sepay','service-wrapper-1','MB','0763550673',20000,order.payment_reference,JSON.stringify({transferType:'in'})])).rows[0];
 // The fixture order is expired: wrapper still records the rejection atomically.
 assert.equal(Object.values(settled)[0].success,false);await db.exec('RESET ROLE');
 assert.equal((await db.query("SELECT count(*)::int AS n FROM namcumz_private.payment_webhook_events WHERE event_id='service-wrapper-1'")).rows[0].n,1);
 const depositRequest=crypto.randomUUID();
 const depositCall=(amount)=>as(alice,()=>db.query('SELECT public.create_deposit_order($1,$2) AS data',[amount,depositRequest]));
 const depositA=(await depositCall(20000)).rows[0].data,depositB=(await depositCall(20000)).rows[0].data;assert.equal(depositA.id,depositB.id);
 await assert.rejects(depositCall(30000),/does not match/);
 await assert.rejects(as(alice,()=>db.query('SELECT public.create_deposit_order(20000)')),/permission denied/);
 // Exercise wallet/deposit, late quotes and outstanding bank payment on synthetic orders.
 await assert.rejects(as(alice,()=>db.query('SELECT public.pay_order_by_wallet($1)',[order.id])),/Deposit|expired/);
 const admin=crypto.randomUUID();await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3::jsonb)',[admin,'admin@example.invalid',JSON.stringify({username:'admin'})]);await db.query("UPDATE public.user_roles SET role='admin' WHERE id=$1",[admin]);
 const action=async(id,o,name,data={})=>(await as(id,()=>db.query('SELECT * FROM public.order_action($1,$2,$3,$4::jsonb,$5)',[o.id,o.version,name,JSON.stringify(data),crypto.randomUUID()]))).rows[0];
 const newBoost=async()=>{
  let o=(await as(alice,()=>db.query("SELECT * FROM public.create_order($1,'synthetic boost','Asia')",[crypto.randomUUID()]))).rows[0];
  o=await action(admin,o,'quote',{price:100000,required_amount:50000,reason:'synthetic quote'});
  await db.query("UPDATE public.orders SET expires_at=now()-interval '1 hour' WHERE id=$1",[o.id]);
  o=await action(alice,o,'approve_quote');assert.ok(new Date(o.expires_at)>new Date());
  await assert.rejects(action(alice,o,'approve_quote'),/already accepted/);return o;
 };
 const walletOrder=await newBoost();await db.query('UPDATE public.orders SET paid_amount=30000 WHERE id=$1',[walletOrder.id]);
 await db.query('INSERT INTO public.user_wallets(user_id,balance) VALUES($1,100000) ON CONFLICT(user_id) DO UPDATE SET balance=100000',[alice]);
 await as(alice,()=>db.query('SELECT public.pay_order_by_wallet($1)',[walletOrder.id]));
 assert.equal((await db.query('SELECT balance FROM public.user_wallets WHERE user_id=$1',[alice])).rows[0].balance,30000);
 assert.equal((await db.query('SELECT paid_amount FROM public.orders WHERE id=$1',[walletOrder.id])).rows[0].paid_amount,100000);
 const bankOrder=await newBoost();await db.query('UPDATE public.orders SET paid_amount=30000 WHERE id=$1',[bankOrder.id]);
 await db.exec('SET ROLE service_role');
 const confirmed=(await db.query('SELECT public.confirm_payment_transaction($1,$2,$3,$4,$5,$6,$7::jsonb) AS data',['sepay','remaining-bank-1','MB','0763550673',70000,bankOrder.payment_reference,JSON.stringify({transferType:'in'})])).rows[0].data;
 assert.equal(confirmed.success,true);
 const replay=(await db.query('SELECT public.confirm_payment_transaction($1,$2,$3,$4,$5,$6,$7::jsonb) AS data',['sepay','remaining-bank-1','MB','0763550673',70000,bankOrder.payment_reference,JSON.stringify({transferType:'in'})])).rows[0].data;assert.equal(replay.is_idempotent_replay,true);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT paid_amount FROM public.orders WHERE id=$1',[bankOrder.id])).rows[0].paid_amount,100000);
 const verify=await read('_db/production_009_verify.sql');await db.exec(verify);
 for(const mutation of ["REVOKE EXECUTE ON FUNCTION public.pay_order_by_wallet(uuid) FROM authenticated",'ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY',"CREATE POLICY unexpected ON public.orders FOR SELECT TO authenticated USING (true)","UPDATE namcumz_private.migrations SET version='missing' WHERE version='production_009_launch_access'",'ALTER FUNCTION public.create_deposit_order(bigint,uuid) RENAME TO missing_deposit','ALTER TABLE public.order_credentials RENAME COLUMN account_password_ciphertext TO account_password']){
  await db.exec('BEGIN');await db.exec(mutation);
  // Strip transaction boundaries because each fault is injected inside this rollback fixture.
  const body=verify.slice(verify.indexOf('DO $verify$'),verify.lastIndexOf('COMMIT;'));
  await assert.rejects(db.exec(body));await db.exec('ROLLBACK');
 }
 assert.equal((await db.query("SELECT has_function_privilege('anon','public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb)','EXECUTE') AS allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});



