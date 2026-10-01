// Offline regression checks: no credentials, network, or production writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
for (const file of fs.readdirSync(path.join(root, 'assets/js')).filter(f => f.endsWith('.js'))) {
 check('JS syntax: ' + file, () => {
  const r = spawnSync(process.execPath, ['--check', path.join(root, 'assets/js', file)], {encoding:'utf8'});
  assert.equal(r.status, 0, r.error?.message || r.stderr);

 });
}
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
 const html = fs.readFileSync(path.join(root, file), 'utf8');
 check('inline scripts: ' + file, () => {
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
   if (!/\bsrc\s*=|application\/ld\+json|type\s*=\s*["']module/i.test(m[1])) new vm.Script(m[2], {filename:file});
  }
 });
 if (html.includes('assets/js/app.js')) check('config before app: ' + file, () => {
  assert.ok(html.indexOf('assets/js/runtime-config.js') >= 0);
  assert.ok(html.indexOf('assets/js/runtime-config.js') < html.indexOf('assets/js/app.js'));
 });
}
for (const file of fs.readdirSync(path.join(root,'assets/css')).filter(f => f.endsWith('.css'))) {
 check('no NUL: '+file, () => assert.ok(!fs.readFileSync(path.join(root,'assets/css',file)).includes(0)));
}
const source = fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');
const elements = {};
const callbacks = {};
const storage = new Map();
const context = vm.createContext({
 window: {}, location:{hostname:'localhost'}, console,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 document:{getElementById:id=>elements[id]||null,addEventListener:(name,fn)=>callbacks[name]=fn,
 createElement:()=>({setAttribute(){}}),body:{prepend(){}},querySelectorAll:()=>[]},
 IntersectionObserver: class { observe(){} disconnect(){} },
 setTimeout(){},setInterval(){},alert(){},requestAnimationFrame(){},performance:{now:()=>0}
});
vm.runInContext(source,context);
check('guest cannot own a null-ID order or rate it',()=>{
 elements.grid = {innerHTML:'',insertAdjacentHTML(_,html){this.innerHTML+=html;},querySelectorAll:()=>[]};
 storage.set('isLoggedIn','true'); storage.set('userRole','super_admin');
 context.window.renderOrders([{id:'test',user_id:null,booster_id:null,status:'hoan_thanh',price:12345}], 'grid');
 assert.ok(!elements.grid.innerHTML.includes('data-val="12345"'));
 assert.ok(!elements.grid.innerHTML.includes('openRatingModal'));
});
check('chat HTML and attribute payloads are encoded',()=>{
 elements.chatMessages={insertAdjacentHTML(_,html){this.html=html;}};
 vm.runInContext(`appendMessage({sender_name:'<svg onload=alert(1)>',message:'<img src=x onerror=alert(1)> IMAGE:https://example.com/a" onerror="alert(2)'})`,context);
 const html=elements.chatMessages.html;
 assert.ok(!html.includes('<svg'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes(' onerror="alert(2)'));
});
check('local preview without staging never creates a DB client',()=>{
 context.window.supabase={createClient(){throw new Error('Unexpected database connection');}};
 callbacks.DOMContentLoaded();
});
check('public auth bridge cannot be overwritten',()=>{
 context.window.currentUser={id:'forged'};
 assert.equal(context.window.currentUser,null);
});
check('login cannot promote the admin username',()=>assert.ok(!source.includes("user.toLowerCase() === 'admin'")));
check('top-up checkout cannot write plaintext credentials',()=>{
 const topup=fs.readFileSync(path.join(root,'assets/js/napgame.js'),'utf8');
 assert.ok(!topup.includes("from('orders').insert"));
});
check('staging customer sees approval and actual progress without legacy actions',()=>{
 context.window.NAMCUMZ_CONFIG={environment:'staging'};
 vm.runInContext("currentUser={id:'alice'}; verifiedRole='customer';",context);
 context.window.renderOrders([{id:'test',user_id:'alice',status:'cho_xu_ly',price:12000,version:1,progress:17,quote_accepted:false}], 'grid');
 assert.ok(elements.grid.innerHTML.includes('approve_quote'));
 assert.ok(elements.grid.innerHTML.includes('17%'));
 assert.ok(!elements.grid.innerHTML.includes('changeOrderStatus'));
});
check('staging admin actions replace direct edit/delete and escape result notes',()=>{
 vm.runInContext("currentUser={id:'admin'}; verifiedRole='admin';",context);
 context.window.renderOrders([{id:'test',user_id:'alice',kind:'boost',status:'cho_xu_ly',price:12000,version:1,paid_amount:0,quote_accepted:true,result_note:'<img src=x onerror=alert(1)>'}], 'grid');
 assert.ok(elements.grid.innerHTML.includes('&quot;quote&quot;'));
 assert.ok(elements.grid.innerHTML.includes('&quot;payment&quot;'));
 assert.ok(!elements.grid.innerHTML.includes('openEditOrderModal'));
 assert.ok(!elements.grid.innerHTML.includes('deleteOrder'));
 assert.ok(!elements.grid.innerHTML.includes('<img src=x'));
});
check('staging cancelled order has no workflow controls',()=>{
 context.window.renderOrders([{id:'test',user_id:'alice',kind:'boost',status:'cho_xu_ly',cancelled:true}], 'grid');
 assert.ok(elements.grid.innerHTML.includes('Đã hủy'));
 assert.ok(!elements.grid.innerHTML.includes('runOrderAction'));
});
check('credential fields never enter inline JavaScript',()=>{
 const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 assert.ok(!admin.includes("onclick=\"navigator.clipboard.writeText('${esc(data.account_"));
 assert.ok(admin.includes('data-copy-value="${esc(data.account_username)}"'));
 assert.ok(admin.includes('data-toggle-password="credPass"'));
 assert.ok(!source.includes("onclick=\"navigator.clipboard.writeText('${escapeHtml(data.account_"));
 assert.ok(source.includes('data-copy-value="${escapeHtml(data.account_username)}"'));
 assert.ok(source.includes('data-toggle-password="viewCredPassField"'));
});
check('credential viewer uses encrypted RPC only',()=>{
 const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 const app=source;
 const migration=fs.readFileSync(path.join(root,'_db/production_002_credentials_encryption.sql'),'utf8');
 assert.ok(admin.includes("rpc('get_order_credentials'"));
 assert.ok(app.includes("rpc('get_order_credentials'"));
 assert.ok(!admin.includes("from('order_credentials')"));
 assert.ok(!app.includes("from('order_credentials')"));
 assert.ok(migration.includes('account_password_ciphertext'));
 assert.ok(migration.includes('DROP COLUMN account_password'));
 assert.ok(migration.includes("vault.decrypted_secrets"));
});check('game passwords preserve intentional whitespace',()=>{
 const napgame=fs.readFileSync(path.join(root,'assets/js/napgame.js'),'utf8');
 const release=fs.readFileSync(path.join(root,'_db/production_001_release.sql'),'utf8');
 assert.ok(napgame.includes("const password = document.getElementById('formPassword')?.value || '';"));
 assert.ok(release.includes('clean_pass text := p_password;'));
 assert.ok(!release.includes('clean_pass text := trim(p_password);'));
});
check('unsupported game packages never fall back to another game',()=>{
 const napgame=fs.readFileSync(path.join(root,'assets/js/napgame.js'),'utf8');
 assert.ok(napgame.includes("'default': []"));
 assert.ok(napgame.includes('if (!packages.length) {'));
 assert.ok(napgame.includes('renderUnsupportedGame(gameInfo);'));
});
check('profile review and claim inputs are encoded and server-owned',()=>{
 const profile=fs.readFileSync(path.join(root,'profile.html'),'utf8');
 assert.ok(profile.includes('${esc(order.review_comment || \'\')}'));
 assert.ok(!profile.includes('p_user_id: currentUserId'));
});check('cancelled orders move to a separate tab and leave active counts',()=>{
 const dashboard=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
 const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 assert.ok(source.includes("if (currentTab === 'cancelled')"));
 assert.ok(source.includes('if (order.cancelled) return false;'));
 assert.ok(source.includes('counts.cancelled++'));
 assert.ok(dashboard.includes("window.filterByTab('cancelled')"));
 assert.ok(admin.includes('if (!order.cancelled) {'));
});
check('order workflow and cancellation use the custom dialog',()=>{
 const actionStart=source.indexOf('window.runOrderAction = async function');
 const actionEnd=source.indexOf('// Encode untrusted text before inserting into HTML templates.',actionStart);
 const action=source.slice(actionStart,actionEnd);
 const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 assert.ok(action.includes('window.showOrderDialog'));
 assert.ok(!/\b(prompt|confirm|alert)\s*\(/.test(action));
 assert.ok(action.includes("title:'Cập nhật tiến độ'"));
 assert.ok(admin.includes("variant:'prompt', title:'Lý do hủy đơn'"));
 assert.ok(admin.includes('await loadAdminTable();'));
});
console.log(`${checks} checks passed; browser/staging/DB permissions are NOT covered.`);


