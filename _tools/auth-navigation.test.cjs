const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('assets/js/app.js','utf8');
const topup = fs.readFileSync('assets/js/napgame.js','utf8');
function slice(source,start,end){ return source.slice(source.indexOf(start), source.indexOf(end,source.indexOf(start))); }
function harness(){
  const storage = new Map(); const timers=[]; const pending=[]; const events=[]; let callback;
  const context = {console, Event:class {constructor(type){this.type=type;}}, URLSearchParams, currentUser:null, verifiedRole:'guest',
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{getElementById:()=>null},
    supabaseClient:{auth:{onAuthStateChange:fn=>{callback=fn;}},from:()=>({select:()=>({eq:()=>({single:()=>new Promise(resolve=>pending.push(resolve))})})})},
    injectDynamicModals:()=>{},bindEvents:()=>{context.bound=true;},initDynamicSlogan:()=>{},verifyDatabaseContract:async()=>false,
    continueAfterAuthentication:()=>{context.redirected=true;}};
  context.window={location:{pathname:'/napgame.html',search:''},dispatchEvent:e=>events.push(e.type),setTimeout:fn=>timers.push(fn),fetchOrders:()=>{},fetchLeaderboard:()=>{}};
  vm.createContext(context);
  vm.runInContext(slice(app,'function setupNavbar() {','function injectDynamicModals() {') + slice(app,'async function initSupabaseLogic() {',"document.addEventListener('DOMContentLoaded'"), context);
  return {context,storage,timers,pending,events,emit:(event,session)=>callback(event,session)};
}
test('auth listener and login binding survive a failed order database contract',async()=>{
 const h=harness(); await h.context.initSupabaseLogic(); assert.equal(h.context.bound,true);
 const returned=h.emit('SIGNED_IN',{user:{id:'user-a'}}); assert.equal(returned,undefined); assert.equal(h.pending.length,0);
 const task=h.timers.shift()(); assert.equal(h.context.currentUser.id,'user-a'); assert.ok(h.events.includes('namcumz-auth-updated'));
 h.pending.shift()({data:{username:'Alice',role:'customer'}}); await task; assert.equal(h.storage.get('username'),'Alice');
});
test('signout wins over an outstanding profile response',async()=>{
 const h=harness(); await h.context.initSupabaseLogic(); h.emit('SIGNED_IN',{user:{id:'user-a'}}); const old=h.timers.shift()();
 h.emit('SIGNED_OUT',null); await h.timers.shift()(); h.pending.shift()({data:{username:'Old',role:'admin'}}); await old;
 assert.equal(h.context.currentUser,null); assert.equal(h.context.verifiedRole,'guest'); assert.equal(h.storage.has('username'),false);
});
test('outdated queued auth event cannot restore a signed-out session',async()=>{
 const h=harness(); await h.context.initSupabaseLogic(); h.emit('SIGNED_IN',{user:{id:'user-a'}}); h.emit('SIGNED_OUT',null);
 await h.timers.shift()(); await h.timers.shift()(); assert.equal(h.context.currentUser,null); assert.equal(h.pending.length,0);
});
test('catalog desktop and mobile links use session and preserve return route',()=>{
 const links={ngAccountLink:{},lpMobileAccount:{}}; const ctx={window:{currentUser:null,location:{pathname:'/napgame.html',search:''}},document:{getElementById:id=>links[id]},localStorage:{getItem:()=>'<Alice>'},currentSelectedPackage:null,encodeURIComponent};
 vm.createContext(ctx); vm.runInContext(slice(topup,'function syncTopupAccountLink() {',"window.addEventListener('namcumz-auth-updated'"),ctx);
 ctx.syncTopupAccountLink(); assert.equal(links.ngAccountLink.href,'/login.html?form=login&next=%2Fnapgame.html'); assert.equal(links.lpMobileAccount.href,links.ngAccountLink.href);
 ctx.window.currentUser={id:'user-a'}; ctx.syncTopupAccountLink(); assert.equal(links.lpMobileAccount.href,'/dashboard.html'); assert.equal(links.ngAccountLink.textContent,'<Alice> / Đơn hàng');
 ctx.window.currentUser=null; ctx.syncTopupAccountLink(); assert.match(links.ngAccountLink.href,/form=login/);
});
test('detail return validation accepts a game with or without selected package and rejects unsafe URLs',()=>{
 const login=fs.readFileSync('login.html','utf8'); const code=slice(login,'            const authQuery =',"        });\n    </script>").split(/\r?\n/).filter(line=>!line.includes('switchCustomerForm')).join('\n');
 for(const [path,allowed] of [['/napgame.html',true],['/napgame',true],['/dashboard?action=create-order',true],['/profile',true],['/napgame-detail?game=genshin',true],['/napgame-detail.html?game=genshin',true],['/napgame-detail.html?game=hsr&package=20000000-0000-0000-0000-000000000001',true],['//evil.example',false],['/napgame-detail.html?game=unknown',false],['/napgame-detail.html?game=genshin&package=bad',false],['/napgame-detail.html?game=genshin&game=hsr',false]]){
  const context={URL,URLSearchParams,window:{location:{origin:'https://namcumz.io.vn',search:'?next='+encodeURIComponent(path)}}}; vm.createContext(context); vm.runInContext(code,context); assert.equal(Boolean(context.window.NAMCUMZ_AUTH_NEXT),allowed,path);
 }
});
test('public pages receive actual session changes without trusting cached login markers',()=>{
 const callbacks=[]; const events=[]; const context={Event:class{constructor(type){this.type=type;}},window:{NAMCUMZ_CONFIG:{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'mock'},supabase:{createClient:()=>({auth:{onAuthStateChange:fn=>callbacks.push(fn)}})},dispatchEvent:e=>events.push(e.type)}};
 vm.createContext(context); vm.runInContext(fs.readFileSync('assets/js/public-auth.js','utf8'),context);
 callbacks[0]('INITIAL_SESSION',{user:{id:'session-user'}}); assert.equal(context.window.NAMCUMZ_PUBLIC_USER.id,'session-user');
 callbacks[0]('SIGNED_OUT',null); assert.equal(context.window.NAMCUMZ_PUBLIC_USER,null); assert.equal(events.length,2);
});
test('all public header routes load shared auth and versioned navigation',()=>{
 for(const page of ['index','reviews','faq','luu-y','checkscam','terms','privacy']){
  const html=fs.readFileSync(page+'.html','utf8'); assert.ok(html.includes('public-auth.js?v='),page); assert.ok(html.includes('landing.js?v='),page);
 }
 for(const page of ['napgame','napgame-detail']){
  const html=fs.readFileSync(page+'.html','utf8'); assert.ok(html.includes('id="lpMobileAccount"'),page); assert.ok(html.includes('id="lpAuthOverlay"'),page);
 }
});
test('selected package survives the desktop and mobile login link',()=>{
 const links={ngAccountLink:{},lpMobileAccount:{}}; const context={window:{currentUser:null,location:{pathname:'/napgame-detail.html',search:'?game=genshin'}},document:{getElementById:id=>links[id]},localStorage:{getItem:()=>null},currentSelectedPackage:{id:'10000000-0000-0000-0000-000000000001'},encodeURIComponent,buildTopupReturnPath:id=>'/napgame-detail.html?game=genshin&package='+id};
 vm.createContext(context); vm.runInContext(slice(topup,'function syncTopupAccountLink() {',"window.addEventListener('namcumz-auth-updated'"),context); context.syncTopupAccountLink();
 assert.equal(new URL('https://local.test'+links.ngAccountLink.href).searchParams.get('next'),context.buildTopupReturnPath(context.currentSelectedPackage.id)); assert.equal(links.ngAccountLink.href,links.lpMobileAccount.href);
});

test('login errors restore submit button; successful login keeps requested destination',async()=>{
 const handlerCode=slice(app,"    const loginForm = document.getElementById('loginForm');","    const googleLoginBtn =");
 for(const kind of ['credentials','network','success']){
  let submit; const alerts=[]; const redirects=[]; const button={innerHTML:'Đăng nhập',disabled:false};
  const form={checkValidity:()=>true,querySelector:()=>button,addEventListener:(_name,fn)=>submit=fn};
  const context={document:{getElementById:id=>id==='loginForm'?form:{value:id==='username'?'fixtureuser':'fixturepassword'}},supabaseClient:{auth:{signInWithPassword:async()=>{if(kind==='network')throw Error('offline');return {error:kind==='credentials'?Error('invalid'):null};}}},window:{NAMCUMZ_AUTH_NEXT:'/napgame.html'},alert:message=>alerts.push(message),continueAfterAuthentication:path=>redirects.push(path)};
  vm.createContext(context); vm.runInContext(handlerCode,context); await submit({defaultPrevented:false,preventDefault:()=>{}});
  assert.equal(button.disabled,false,kind); assert.equal(button.innerHTML,'ĐĂNG NHẬP',kind);
  if(kind==='success') assert.deepEqual(redirects,['/napgame.html']); else {assert.equal(alerts.length,1);assert.equal(redirects.length,0);}
 }
});

test('top-up header uses dashboard account state for customer, booster and admin',()=>{
 const h=harness();const nodes={navUserProfile:{style:{}},ngAccountLink:{style:{}},navUsername:{},navRole:{},navAvatarInitials:{}};
 h.context.document.getElementById=id=>nodes[id]||null;
 for(const role of ['customer','booster','admin']){h.context.currentUser={id:'account-a',user_metadata:{display_name:'User Name'}};h.storage.set('userRole',role);h.context.setupNavbar();assert.equal(nodes.navUserProfile.style.display,'flex');assert.equal(nodes.ngAccountLink.style.display,'none');assert.equal(nodes.navUsername.innerText,'User Name');}
 h.context.currentUser=null;h.storage.set('isLoggedIn','true');h.context.setupNavbar();assert.equal(nodes.navUserProfile.style.display,'none');assert.equal(nodes.ngAccountLink.style.display,'block');
});
test('dashboard top-up filter recognizes server kind without requiring a legacy content marker',()=>{
 const elements={filterService:{value:'[Nạp Game]'},filterSort:{value:'newest'},searchInput:{value:''}};let shown;
 const context={window:{renderOrders:rows=>shown=rows},document:{getElementById:id=>elements[id]},allOrders:[{id:'topup',kind:'topup',content:'[Asia] [Genshin Impact] 60 Đá',status:'cho_xu_ly'},{id:'farm',kind:'service',content:'Cày nhiệm vụ Genshin',status:'cho_xu_ly'},{id:'old',content:'[Nạp Game] Genshin',status:'cho_xu_ly'}],currentTab:'all',currentSearch:'',currentService:'all',currentSort:''};
 vm.createContext(context);vm.runInContext(slice(app,'window.applyFilters = function()', 'window.filterByTab = function'),context);context.window.applyFilters();assert.deepEqual(Array.from(shown,row=>row.id),['topup','old']);
});
