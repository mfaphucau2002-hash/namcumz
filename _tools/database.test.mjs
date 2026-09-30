import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const read=name=>readFile(new URL('../_db/'+name,import.meta.url),'utf8');
test('PostgreSQL workflow, role isolation, retry and stale-version regression',async t=>{
 const db=new PGlite();
 try {
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT ON storage.objects TO authenticated;
 `);
 await db.exec(await read('staging_001_foundation.sql'));
 await db.exec(await read('staging_001_verify.sql'));
 await db.exec(await read('staging_001_rls_smoke.sql'));
 await db.exec(await read('staging_002_workflows.sql'));
 await db.exec(await read('staging_002_verify.sql'));
 await db.exec(await read('staging_003_login_topup.sql'));
 const ids={}; for(const name of ['alice','bob','booster','admin','superadmin','secondbooster']){
 const id=crypto.randomUUID();ids[name]=id;
 await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3::jsonb)",[id,name+'@example.invalid',JSON.stringify({username:name,display_name:name,role:'super_admin'})]);
 }
 await db.query("UPDATE public.user_roles SET role='booster' WHERE id IN ($1,$2)",[ids.booster,ids.secondbooster]);
 await db.query("UPDATE public.user_roles SET role='admin' WHERE id=$1",[ids.admin]);
 await db.query("UPDATE public.user_roles SET role='super_admin' WHERE id=$1",[ids.superadmin]);
 const as=async(name,fn)=>{await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[ids[name]||'']);await db.exec('SET ROLE '+(name==='anon'?'anon':'authenticated'));try{return await fn();}finally{await db.exec('RESET ROLE');}};
 const rpc=async(fn,args)=>{const keys=Object.keys(args);return (await db.query('SELECT * FROM public.'+fn+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+')',Object.values(args))).rows;};
 let order;
 await t.test('metadata cannot grant admin; customer creates idempotent order',async()=>{
 assert.equal((await db.query('SELECT role FROM public.user_roles WHERE id=$1',[ids.alice])).rows[0].role,'customer');
 const req=crypto.randomUUID();const args={p_request:req,p_content:'Genshin daily quests',p_server:'Asia'};
 const a=await as('alice',()=>rpc('create_order',args));const b=await as('alice',()=>rpc('create_order',args));assert.equal(a[0].id,b[0].id);order=a[0];
 await assert.rejects(as('alice',()=>rpc('create_order',{...args,p_content:'changed retry'})));
 });
 await t.test('anonymous and unrelated customer cannot read private orders',async()=>{
 await assert.rejects(as('anon',()=>db.query('SELECT * FROM public.orders')));
 assert.equal((await as('bob',()=>db.query('SELECT * FROM public.orders'))).rows.length,0);
 await assert.rejects(as('alice',()=>db.query("UPDATE public.user_roles SET role='super_admin'")));
 await assert.rejects(as('alice',()=>db.query("UPDATE public.orders SET price=1")));
 });
 const act=async(name,action,data={},version=order.version,req=crypto.randomUUID())=>{
 const r=await as(name,()=>rpc('order_action',{p_order:order.id,p_version:version,p_action:action,p_data:JSON.stringify(data),p_request:req}));return r[0];};
 await t.test('quote approval, partial payment threshold and retry',async()=>{
 await assert.rejects(act('alice','quote',{price:100000,required_amount:50000,reason:'test'}));
 order=await act('admin','quote',{price:100000,required_amount:50000,reason:'Customer deposit terms'});
 await assert.rejects(act('admin','payment',{amount:50000,reason:'bank test'}));
 order=await act('alice','approve_quote');
 const version=order.version;const request=crypto.randomUUID();
 const a=await act('admin','payment',{amount:50000,reason:'bank test'},version,request);
 const b=await act('admin','payment',{amount:50000,reason:'bank test'},version,request);
 assert.equal(a.paid_amount,50000);assert.equal(b.paid_amount,50000);order=a;
 });
 await t.test('queue excludes private fields; stale competing claim fails',async()=>{
 const queue=await as('booster',()=>rpc('claim_queue',{}));assert.equal(queue[0].id,order.id);
 assert.ok(!('content' in queue[0]));assert.ok(!('user_id' in queue[0]));
 const version=order.version;order=await act('booster','claim');
 await assert.rejects(act('secondbooster','claim',{},version));
 assert.equal(order.booster_id,ids.booster);
 });
 await t.test('chat ownership, deduplication and server sender identity',async()=>{
 const request=crypto.randomUUID(); const args={p_order:order.id,p_request:request,p_message:'hello'};
 const a=await as('alice',()=>rpc('send_order_message',args));const b=await as('alice',()=>rpc('send_order_message',args));
 assert.equal(a[0].id,b[0].id);assert.equal(a[0].sender_id,ids.alice);
 await assert.rejects(as('bob',()=>rpc('send_order_message',{...args,p_request:crypto.randomUUID()})));
 await assert.rejects(as('alice',()=>db.query("INSERT INTO public.order_messages(order_id,sender_id,message) VALUES($1,$2,'forged')",[order.id,ids.bob])));
 });
 await t.test('private attachments reject unrelated reader and forged uploader path',async()=>{
 const attachment=order.id+'/'+ids.alice+'/test.png';
 await as('alice',()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('order-files',$1)",[attachment]));
 const visible=await as('bob',()=>db.query("SELECT name FROM storage.objects WHERE name=$1",[attachment]));
 assert.equal(visible.rows.length,0);
 await assert.rejects(as('bob',()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('order-files',$1)",[order.id+'/'+ids.bob+'/forged.png'])));
 const sent=await as('alice',()=>rpc('send_order_message',{p_order:order.id,p_request:crypto.randomUUID(),p_message:'',p_attachment:attachment}));
 assert.equal(sent[0].attachment_path,attachment);
 await assert.rejects(as('booster',()=>rpc('send_order_message',{p_order:order.id,p_request:crypto.randomUUID(),p_message:'',p_attachment:attachment})));
 });
 await t.test('missing version cannot bypass optimistic concurrency',async()=>{
 await assert.rejects(as('booster',()=>rpc('order_action',{p_order:order.id,p_version:null,p_action:'progress',p_data:{progress:10,reason:'Invalid version'},p_request:crypto.randomUUID()})));
 });
 await t.test('progress -> rework -> acceptance -> one review',async()=>{
 order=await act('booster','progress',{progress:60,reason:'Checklist stage one complete'});
 order=await act('booster','submit',{reason:'Result summary'});
 await assert.rejects(act('booster','complete'));
 order=await act('alice','rework',{reason:'Need one more task'});
 order=await act('booster','submit',{reason:'All tasks done'});
 order=await act('alice','complete');assert.equal(order.progress,100);
 order=await act('alice','review',{rating:5,comment:'Good'});
 await assert.rejects(act('alice','review',{rating:1}));
 });
 await t.test('roles require superadmin and last superadmin is protected',async()=>{
 const args={p_target:ids.bob,p_role:'booster',p_active:true,p_reason:'Approved for testing'};
 await assert.rejects(as('admin',()=>rpc('set_user_role',args)));
 await as('superadmin',()=>rpc('set_user_role',args));
 await assert.rejects(as('superadmin',()=>rpc('set_user_role',{...args,p_target:ids.superadmin,p_role:'customer'})));
 });
 await t.test('server catalog price and UID validation',async()=>{
 const pkg=(await as('admin',()=>rpc('save_package',{p_id:null,p_game:'Genshin test',p_name:'Test only',p_price:25000,p_active:true})))[0].save_package;
 const a={p_request:crypto.randomUUID(),p_content:'Test package',p_server:'Asia',p_package:pkg,p_uid:'123456789'};
 const row=(await as('alice',()=>rpc('create_order',a)))[0];assert.equal(row.price,25000);assert.equal(row.quote_accepted,true);
 await assert.rejects(as('alice',()=>rpc('create_order',{...a,p_request:crypto.randomUUID(),p_uid:'invalid'})));
 });
 await t.test('login topup order creation and credentials isolation',async()=>{
  const pkg=(await db.query("SELECT id,price FROM public.packages WHERE game='Genshin Impact' AND active LIMIT 1")).rows[0];
  const req=crypto.randomUUID();
  const topupArgs={
   p_request:req,
   p_package:pkg.id,
   p_server:'Asia',
   p_login_method:'Hoyoverse',
   p_account:'alice_game_account',
   p_password:'SecretPassword123',
   p_phone:'0987654321',
   p_notes:'Mã 2FA gửi Zalo'
  };
  const topupOrder=(await as('alice',()=>rpc('create_topup_order',topupArgs)))[0];
  assert.equal(topupOrder.kind,'topup');
  assert.equal(topupOrder.price,pkg.price);
  assert.equal(topupOrder.quote_accepted,true);
  assert.ok(!topupOrder.content.includes('SecretPassword123'));

  // Credential reading permissions
  const credsAlice=(await as('alice',()=>db.query('SELECT * FROM public.order_credentials WHERE order_id=$1',[topupOrder.id]))).rows;
  assert.equal(credsAlice.length,1);
  assert.equal(credsAlice[0].account_password,'SecretPassword123');

  const credsBob=(await as('bob',()=>db.query('SELECT * FROM public.order_credentials WHERE order_id=$1',[topupOrder.id]))).rows;
  assert.equal(credsBob.length,0);

  const credsAdmin=(await as('admin',()=>db.query('SELECT * FROM public.order_credentials WHERE order_id=$1',[topupOrder.id]))).rows;
  assert.equal(credsAdmin.length,1);

  // Direct writes to credentials blocked
  await assert.rejects(as('alice',()=>db.query("INSERT INTO public.order_credentials(order_id,account_username,account_password,contact_phone) VALUES($1,'a','b','0123456789')",[topupOrder.id])));
 });
 await t.test('support ticket isolation and reply; private Auth RPC not callable',async()=>{
 const ticket=(await as('alice',()=>rpc('create_ticket',{p_request:crypto.randomUUID(),p_order:order.id,p_issue:'Support',p_description:'Test ticket'})))[0];
 assert.equal((await as('bob',()=>db.query('SELECT * FROM public.support_tickets WHERE id=$1',[ticket.id]))).rows.length,0);
 await as('admin',()=>rpc('respond_ticket',{p_id:ticket.id,p_status:'resolved',p_response:'Resolved in test'}));
 await assert.rejects(as('alice',()=>rpc('auth_username_email',{p_username:'alice',p_bucket:'0'.repeat(64)})));
 });
 } finally {await db.close();}
});