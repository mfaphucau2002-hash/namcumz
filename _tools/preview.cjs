// Local preview serves only website pages and static assets, never source backups or SQL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const stagingProjectUrl = 'https://cnawquqkeogzmvucmjes.supabase.co';
function getStagingConfig() {
 const envPath = path.join(root,'.env.local');
 if (!fs.existsSync(envPath)) return null;
 const values = Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
  const index = line.indexOf('=');
  return index < 1 ? ['', ''] : [line.slice(0,index).trim(),line.slice(index+1).trim()];
 }));
 if (values.NAMCUMZ_STAGING_URL !== stagingProjectUrl || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(values.NAMCUMZ_STAGING_KEY || '')) return null;
 const bank = {
  bankBin: '970422',
  bankCode: 'MB',
  bankName: 'MB Bank (Ngân hàng Quân Đội)',
  accountNumber: '0763550673',
  accountName: 'NGUYEN HOANG NAM',
  expireMinutes: 15
 };
 return `window.NAMCUMZ_CONFIG = ${JSON.stringify({environment:'staging',supabaseUrl:stagingProjectUrl,supabaseAnonKey:values.NAMCUMZ_STAGING_KEY,expectedDbVersion:'staging_004_credentials_encryption',bank})};`;
}
const pages = new Set(['index.html','caythue.html','reviews.html','checkscam.html','terms.html','privacy.html','login.html','dashboard.html','admin.html','profile.html','booster.html','napgame.html','napgame-detail.html','checkout.html','faq.html','luu-y.html','robots.txt','sitemap.xml']);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.woff2':'font/woff2','.mp4':'video/mp4'};
http.createServer((req,res) => {
 if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
 let name;
 try {name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}
 catch {res.writeHead(400);return res.end();}
 if (name === 'assets/js/runtime-config.js') {
  const config = getStagingConfig();
  if (!config) {res.writeHead(503,{'Cache-Control':'no-store'});return res.end('Staging preview config missing or invalid');}
  res.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  return res.end(config);
 }
 if (!name.includes('.') && pages.has(name+'.html')) name += '.html';
 const segments = name.split('/');
 const allowed = pages.has(name) || (/^(assets|public)\//.test(name) && mime[path.extname(name)]);
 if (!allowed || name.includes('\\') || segments.some(s=>s.startsWith('.') || s.includes(':'))) {res.writeHead(404);return res.end();}
 const file = path.resolve(root,name);
 if (!file.startsWith(root+path.sep)) {res.writeHead(404);return res.end();}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 });
}).listen(Number(process.env.NAMCUMZ_PREVIEW_PORT)||4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+(Number(process.env.NAMCUMZ_PREVIEW_PORT)||4173)+' (staging configuration required)'));