// Dedicated checkout initialization; auth and version checks complete before rendering payment.
(() => {
 const c=window.NAMCUMZ_CONFIG;
 window.NAMCUMZ_DB_READY=false;
 let client=null;
 if(window.supabase && c?.supabaseUrl && c?.supabaseAnonKey) client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
 Object.defineProperty(window,'supabaseClient',{get:()=>client});
 window.NAMCUMZ_CHECKOUT_READY=(async()=>{
  if(!client) throw new Error('Chưa kết nối được hệ thống.');
  const {data:auth,error:authError}=await client.auth.getUser();
  if(authError || !auth?.user) throw new Error('Vui lòng đăng nhập đúng tài khoản để xem thanh toán.');
  const {data:version,error}=await client.rpc('app_contract_version');
  window.NAMCUMZ_DB_READY=!error && version===c.expectedDbVersion;
  if(!window.NAMCUMZ_DB_READY) throw new Error('Hệ thống đang bảo trì để đồng bộ cơ sở dữ liệu.');
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT' || !session) window.location.replace('/login.html?next='+encodeURIComponent(window.location.pathname+window.location.search));});
  return client;
 })();
 // A handler is attached immediately; checkout init still receives the rejected promise.
 window.NAMCUMZ_CHECKOUT_READY.catch(()=>{});
})();
