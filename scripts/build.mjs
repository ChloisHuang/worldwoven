import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('source'),out=path.resolve('dist/client'),prior=[];
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,16);
// Keep the previous complete immutable graph so already-open documents remain valid.
if(fs.existsSync('cache-baseline.json')&&fs.existsSync(path.join(out,'build.json'))){
 const m=JSON.parse(fs.readFileSync('cache-baseline.json','utf8'));
 for(const url of m.assets){
  if(!/^\/assets\/[\w.-]+$/.test(url))throw Error('Invalid previous asset URL');
  // Existing deployment graph must be complete; a fresh source-only build
  // has no previous build.json and legitimately starts with no retained graph.
  const body=fs.readFileSync(path.join(out,url));
  if(!url.includes('.'+hash(body)+'.'))throw Error('Retained published asset hash mismatch');
  prior.push([url,body]);
 }
}
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync(path.join(out,'assets'),{recursive:true});
for(const[url,body]of prior)fs.writeFileSync(path.join(out,url),body);
const assets={},busy=new Set();
function emit(rel){if(assets[rel])return assets[rel];if(busy.has(rel))throw Error('Cyclic module graph '+rel);busy.add(rel);let body=fs.readFileSync(path.join(root,rel),rel.endsWith('.webp')?undefined:'utf8');if(rel.endsWith('.js')){
 const dependency=specifier=>emit(path.posix.normalize(path.posix.join(path.posix.dirname(rel),specifier.split('?')[0])));
 body=body.replace(/((?:from\s*|import\s*)['"])(\.\.?\/[^'"]+)(['"])/g,(_,a,s,b)=>a+dependency(s)+b);
 // Only literal relative import() expressions are supported. No bundler,
 // expression evaluation or eager browser fetch is introduced by emitting them.
 body=body.replace(/(\bimport\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g,(_,a,s,b)=>a+dependency(s)+b);
 // Wallet art stays as URL strings until the panel creates its images. Keep
 // this narrowly scoped: no generic CSS parser, glob loader or eager preload.
 body=body.replace(/(\bnew URL\(\s*['"])(\.\/[^'"]+)(['"]\s*,\s*import\.meta\.url\s*\))/g,(_,a,s,b)=>{
  const asset=path.posix.normalize(path.posix.join(path.posix.dirname(rel),s));
  if(!['game/wallet.css','game/travel-passport.css'].includes(asset)&&!/^game\/assets\/currency\/(?:china|japan|egypt|france)\.webp$/.test(asset))throw Error('Unsupported URL asset '+asset);
  return a+emit(asset)+b;
 });
 }const ext=path.extname(rel),stem=path.basename(rel,ext),url='/assets/'+stem+'.'+hash(body)+ext;fs.writeFileSync(path.join(out,url),body);assets[rel]=url;busy.delete(rel);return url;}
const main=emit('game/main.js'),entry=emit('game/entry.js'),css=emit('game/game.css'),three=emit('vendor/three/build/three.module.js');
let html=fs.readFileSync('source/game/index.html','utf8').replace('./game.css?rev=R7-20261002',css).replace('./entry.js',entry).replace('../vendor/three/build/three.module.js',three);
if(html.includes('../tools/')||html.includes('?rev='))throw Error('Private links or blanket cache version remain');
fs.mkdirSync(path.join(out,'game'),{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'game/index.html'),html);
fs.writeFileSync(path.join(out,'three-LICENSE.txt'),fs.readFileSync('source/vendor/three/LICENSE'));
fs.cpSync('source/licenses',path.join(out,'licenses'),{recursive:true});
const releaseVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version.replace(/^0\./,'');
const manifest={release:'R'+releaseVersion+'-public',date:'2026-10-06',baseGameCommit:JSON.parse(fs.readFileSync('cache-baseline.json','utf8')).publishedSourceCommit,assets};fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(manifest,null,2)+'\n');
// No overlapping Cache-Control rules: Cloudflare concatenates matching values.
fs.writeFileSync(path.join(out,'_headers'),`/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/\n  Cache-Control: public, max-age=0, must-revalidate\n/index.html\n  Cache-Control: public, max-age=0, must-revalidate\n/game/\n  Cache-Control: public, max-age=0, must-revalidate\n/game/index.html\n  Cache-Control: public, max-age=0, must-revalidate\n/build.json\n  Cache-Control: public, max-age=0, must-revalidate\n`);
fs.mkdirSync('dist/server',{recursive:true});fs.copyFileSync('worker/index.mjs','dist/server/index.js');fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log(JSON.stringify({assets:Object.keys(assets).length,bytes:Object.values(assets).reduce((n,u)=>n+fs.statSync(path.join(out,u)).size,0),previousAssetsRetained:prior.length,main,entry,css,three}));
