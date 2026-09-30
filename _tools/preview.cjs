// Local preview serves only website pages and static assets, never source backups or SQL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = new Set(['index.html','login.html','dashboard.html','admin.html','profile.html','booster.html','napgame.html','napgame-detail.html']);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.mp4':'video/mp4'};
http.createServer((req,res) => {
 if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
 let name;
 try {name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}
 catch {res.writeHead(400);return res.end();}
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
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173 (staging configuration required)'));
