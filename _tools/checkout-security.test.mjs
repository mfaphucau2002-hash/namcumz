import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import statusHandler from '../api/orders/status.js';
const source=f=>readFile(new URL('../assets/js/'+f,import.meta.url),'utf8');
test('checkout waits for auth and contract and rejects missing sessions or mismatches',async()=>{
 for(const [user,version,ok] of [[null,'production_010_credential_lifecycle',false],[{id:'alice'},'production_002_credentials_encryption',false],[{id:'alice'},'production_010_credential_lifecycle',true]]){
  const client={auth:{getUser:async()=>({data:{user}}),onAuthStateChange(){}},rpc:async()=>({data:version})};
  const ctx={window:{NAMCUMZ_CONFIG:{supabaseUrl:'https://example.invalid',supabaseAnonKey:'public',expectedDbVersion:'production_010_credential_lifecycle'},supabase:{createClient:()=>client}}};
  vm.runInNewContext(await source('checkout-session.js'),ctx);
  if(ok){assert.equal(await ctx.window.NAMCUMZ_CHECKOUT_READY,client);assert.equal(ctx.window.NAMCUMZ_DB_READY,true);}else{await assert.rejects(ctx.window.NAMCUMZ_CHECKOUT_READY);assert.equal(ctx.window.NAMCUMZ_DB_READY,false);}
 }
});
test('failed checkout lookup never creates a mock order, QR, or polling timer',async()=>{
 const callbacks={},elements={chkStatusText:{setAttribute(){},textContent:''},chkQrBox:{hidden:false},chkSpinner:{style:{}}};let renders=0,timers=0;
 const ctx={URLSearchParams,console,document:{addEventListener:(name,fn)=>callbacks[name]=fn,getElementById:id=>elements[id],querySelectorAll:()=>[]},window:{location:{search:'?order=synthetic'},addEventListener(){},NAMCUMZ_CHECKOUT_READY:Promise.resolve({}),OrderAPI:{getPaymentInfo:async()=>{throw Error('offline')}}},setInterval(){timers++;},clearInterval(){},PaymentProvider:{VietQR:{generateQuickLink(){renders++;}}}};
 vm.runInNewContext(await source('checkout.js'),ctx);await callbacks.DOMContentLoaded();
 assert.equal(renders,0);assert.equal(timers,0);assert.equal(elements.chkQrBox.hidden,true);assert.match(elements.chkStatusText.textContent,/chưa chuyển tiền/);
});
test('order status API rejects anonymous and does not cache private responses',async()=>{
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}};
 await statusHandler({method:'GET',headers:{},query:{orderCode:'synthetic'}},res);assert.equal(res.statusCode,401);assert.equal(res.headers['Cache-Control'],'private, no-store');
});
