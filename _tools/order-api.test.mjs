import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
// Exercise request behavior without network or a real authenticated account.
function api() {
 const context={window:{},crypto:webcrypto,setTimeout,clearTimeout};
 vm.runInNewContext(readFileSync(new URL('../assets/js/order-api.js',import.meta.url),'utf8'),context);
 return context.window.OrderAPI;
}
test('concurrent duplicate creates share one request and omit caller-controlled owner/price',async()=>{
 const service=api();let calls=0;let args;
 const client={rpc:async(name,payload)=>{calls++;args=payload;assert.equal(name,'create_order');await new Promise(r=>setTimeout(r,5));return {data:{id:'order'}};}};
 const results=await Promise.all([service.create(client,'alice','goal','Asia'),service.create(client,'alice','goal','Asia')]);
 assert.equal(calls,1);assert.equal(results[0].id,results[1].id);
 assert.deepEqual(Object.keys(args).sort(),['p_content','p_request','p_server']);
});
test('uncertain outcome retries same request; confirmed success permits a new request',async()=>{
 const service=api();const requests=[];let failed=true;
 const client={rpc:async(_,p)=>{requests.push(p.p_request);if(failed){failed=false;throw Error('network');}return {data:{id:'order'}};}};
 await assert.rejects(service.create(client,'alice','goal','Asia'));
 await service.create(client,'alice','goal','Asia');
 await service.create(client,'alice','goal','Asia');
 assert.equal(requests[0],requests[1]);assert.notEqual(requests[1],requests[2]);
});
test('empty response is not success and retains retry identity',async()=>{
 const service=api();const requests=[];
 const client={rpc:async(_,p)=>{requests.push(p.p_request);return {data:requests.length===1?[]:{id:'order'}};}};
 await assert.rejects(service.create(client,'alice','goal','Asia'));
 await service.create(client,'alice','goal','Asia');assert.equal(requests[0],requests[1]);
});
test('version and authentication are required; action sends server version',async()=>{
 const service=api();let calls=0;
 const client={rpc:async(_,p)=>{calls++;assert.equal(p.p_version,7);assert.equal(p.p_action,'payment');return {data:{id:'order'}};}};
 await assert.rejects(service.action(client,'alice',{id:'order'},'payment'));
 await assert.rejects(service.action(client,null,{id:'order',version:7},'payment'));
 await service.action(client,'alice',{id:'order',version:7},'payment',{amount:100});assert.equal(calls,1);
});
test('actor identities never share a retry key',async()=>{
 const service=api();const requests=[];
 const client={rpc:async(_,p)=>{requests.push(p.p_request);return {error:{message:'offline'}};}};
 await assert.rejects(service.create(client,'alice','goal','Asia'));
 await assert.rejects(service.create(client,'bob','goal','Asia'));
 assert.notEqual(requests[0],requests[1]);
});

test('chat and support RPCs never send a client-selected sender or owner',async()=>{
 const service=api();const calls=[];
 const client={rpc:async(name,p)=>{calls.push({name,p});return {data:{id:'record'}};}};
 await service.message(client,'alice','order','hello','order/alice/photo.png');
 await service.ticket(client,'alice','order','issue','description');
 assert.equal(calls[0].name,'send_order_message');
 assert.equal(calls[0].p.p_attachment,'order/alice/photo.png');
 assert.equal(calls[1].name,'create_ticket');
 for(const call of calls){assert.equal('sender_id' in call.p,false);assert.equal('user_id' in call.p,false);}
});

test('topup RPC validates arguments and transmits parameters',async()=>{
 const service=api();let called=false;
 const client={rpc:async(name,p)=>{
  called=true;
  assert.equal(name,'create_topup_order');
  assert.equal(p.p_package,'pkg-uuid');
  assert.equal(p.p_server,'Asia');
  assert.equal(p.p_login_method,'Hoyoverse');
  assert.equal(p.p_account,'player1');
  assert.equal(p.p_password,'secret123');
  assert.equal(p.p_phone,'0987654321');
  assert.equal(p.p_notes,'note');
  assert.ok(p.p_request);
  return {data:{id:'topup-order-1'}};
 }};
 await assert.rejects(service.topup(client,'alice','','Asia','Hoyoverse','acc','pass','0987'));
 await assert.rejects(service.topup(client,'alice','pkg-uuid','InvalidServer','Hoyoverse','acc','pass','0987'));
 const res = await service.topup(client,'alice','pkg-uuid','Asia','Hoyoverse','player1','secret123','0987654321','note');
 assert.equal(called,true);
 assert.equal(res.id,'topup-order-1');
});
