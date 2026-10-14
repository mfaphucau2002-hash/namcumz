// Read-only public probes; no private rows or keys are printed or persisted.
const fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('assets/js/runtime-config.js','utf8'),context);
const c=context.window.NAMCUMZ_CONFIG;
async function probe(name,url,db=false){
 try{
  const r=await fetch(url,{headers:db?{apikey:c.supabaseAnonKey,Authorization:'Bearer '+c.supabaseAnonKey}:{},signal:AbortSignal.timeout(15000)});
  const body=await r.text();let p;try{p=JSON.parse(body)}catch{}
  const out={name,status:r.status,bytes:Buffer.byteLength(body)};
  if(db){if(Array.isArray(p))out.rowCount=p.length;else if(name==='contract')out.version=p;else out.errorCode=p?.code||null;}
  else out.headers={nosniff:r.headers.get('x-content-type-options'),frame:r.headers.get('x-frame-options'),csp:r.headers.get('content-security-policy')};
  console.log(JSON.stringify(out));
 }catch(e){console.log(JSON.stringify({name,status:'BLOCKED',reason:e.name}));process.exitCode=1;}
}
(async()=>{
 await probe('contract',c.supabaseUrl+'/rest/v1/rpc/app_contract_version',true);
 for(const t of ['orders','order_messages','order_logs','support_tickets','user_roles','notifications','order_credentials','user_wallets','wallet_transactions','user_check_ins','user_game_accounts'])await probe('anon:'+t,c.supabaseUrl+'/rest/v1/'+t+'?select='+(t==='order_credentials'?'order_id':t==='user_wallets'?'user_id':'id')+'&limit=1',true);
 await probe('catalog',c.supabaseUrl+'/rest/v1/packages?select=id&active=eq.true&limit=1',true);
 for(const p of ['/','/robots.txt','/sitemap.xml','/login','/dashboard','/admin','/profile','/checkout','/api/orders/status?orderCode=00000000-0000-0000-0000-000000000000'])await probe('web:'+p,'https://namcumz.io.vn'+p);
})();
