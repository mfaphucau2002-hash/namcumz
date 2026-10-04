// Publish only approved pages and static assets, excluding source and backups.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['index.html','reviews.html','checkscam.html','terms.html','privacy.html','login.html','dashboard.html','admin.html','profile.html','booster.html','napgame.html','napgame-detail.html','faq.html','luu-y.html','robots.txt','sitemap.xml'];
const types = new Set(['.js','.css','.jpg','.jpeg','.png','.webp','.gif','.svg','.ico','.woff','.woff2','.ttf','.mp4','.webm','.mp3','.ogg']);
// Collect static inputs without following symlinks or hidden paths.
function collect(directory) {
 const absolute = path.join(root,directory);
 if (!fs.existsSync(absolute)) return;
 if (fs.lstatSync(absolute).isSymbolicLink()) throw Error('Linked directory: '+directory);
 for (const entry of fs.readdirSync(absolute,{withFileTypes:true})) {
  if (entry.name.startsWith('.')) continue;
  const relative = path.join(directory,entry.name);
  if (entry.isSymbolicLink()) throw Error('Linked asset: '+relative);
  if (entry.isDirectory()) collect(relative);
  else if (entry.isFile() && types.has(path.extname(entry.name).toLowerCase())) files.push(relative);
 }
}
collect('assets');
collect('public/media');
for (const file of files) {
 if (!fs.lstatSync(path.join(root,file)).isFile()) throw Error('Invalid input: '+file);
}
const output = path.resolve(root,'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw Error('Invalid output');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Linked output');
fs.rmSync(output,{recursive:true,force:true});
for (const file of files) {
 const destination = path.join(output,file);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.copyFileSync(path.join(root,file),destination);
}
console.log('Built '+files.length+' website files in dist/');
