// Reproducible QA-only graph. A small, hashed override snapshot is overlaid in
// memory; unchanged dependencies come from normal source. No production source,
// HTML, manifest, old QA page or existing immutable asset may be changed.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function buildMobileQa({root=path.resolve('source'),out=path.resolve('dist/client')}={}){
 const snapshot=path.join(root,'qa/mobile-candidate');
 const manifest=JSON.parse(fs.readFileSync(path.join(snapshot,'manifest.json'),'utf8'));
 const digest=body=>createHash('sha256').update(body).digest('hex');
 const assets={},inputs={},busy=new Set(),protectedFiles=new Map();
 const protect=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())protect(file);else if(!path.relative(out,file).startsWith('qa/mobile'))protectedFiles.set(file,digest(fs.readFileSync(file)));}};
 protect(out);
 function read(rel){
  if(rel.startsWith('/')||rel.split('/').includes('..'))throw Error('Invalid QA source '+rel);
  const override=Object.hasOwn(manifest.overrides,rel),file=path.join(override?snapshot:root,rel),body=fs.readFileSync(file),sha=digest(body);
  if(override&&sha!==manifest.overrides[rel])throw Error('QA snapshot hash mismatch '+rel);
  inputs[rel]={sha256:sha,source:override?'candidate-override':'production-source'};return body;
 }
 function writeAsset(rel,body){
  const ext=path.extname(rel),stem=path.basename(rel,ext),url='/assets/'+stem+'.'+digest(body).slice(0,16)+ext;
  const target=path.join(out,url);
  if(fs.existsSync(target)&&!fs.readFileSync(target).equals(Buffer.from(body)))throw Error('Immutable collision '+url);
  fs.writeFileSync(target,body);assets[rel]=url;return url;
 }
 function emit(rel){
  if(assets[rel])return assets[rel];if(busy.has(rel))throw Error('Cyclic QA graph '+rel);busy.add(rel);
  let body=read(rel);
  if(rel.endsWith('.js')){
   body=body.toString('utf8');
   const dependency=specifier=>emit(path.posix.normalize(path.posix.join(path.posix.dirname(rel),specifier.split('?')[0])));
   body=body.replace(/((?:from\s*|import\s*)['"])(\.\.?\/[^'"]+)(['"])/g,(_,a,s,b)=>a+dependency(s)+b);
   body=body.replace(/(\bimport\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g,(_,a,s,b)=>a+dependency(s)+b);
   body=body.replace(/(\bnew URL\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*,\s*import\.meta\.url\s*\))/g,(_,a,s,b)=>a+dependency(s)+b);
  }
  const result=writeAsset(rel,body);busy.delete(rel);return result;
 }
 const entry=emit('qa/mobile-qa-entry.js'),css=emit('game/game.css'),three=emit('vendor/three/build/three.module.js');
 const coarseCss=writeAsset('qa/mobile-qa.css',read('game/game.css').toString('utf8').replace(/\(pointer:\s*coarse\)/g,'(min-width:0px)'));
 fs.mkdirSync(path.join(out,'qa'),{recursive:true});
 for(const name of ['mobile.html','mobile-shell.html','mobile-inner.html']){
  const html=read('qa/'+name).toString('utf8').replace('./mobile-qa-entry.js',entry).replace('../game/game.css',name==='mobile-inner.html'?coarseCss:css).replace('../vendor/three/build/three.module.js',three);
  fs.writeFileSync(path.join(out,'qa',name),html);
 }
 const product=read('game/index.html').toString('utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('./game.css?rev=R7-20261002',css);
 fs.writeFileSync(path.join(out,'qa/mobile-product.html'),product);
 const report={schema:1,candidateCommit:manifest.candidateCommit,snapshotBaseCommit:manifest.baseCommit,scope:manifest.scope,assets,inputs};
 fs.writeFileSync(path.join(out,'qa/mobile-build.json'),JSON.stringify(report,null,2)+'\n');
 for(const[file,sha]of protectedFiles)if(!fs.existsSync(file)||digest(fs.readFileSync(file))!==sha)throw Error('QA modified protected production output '+path.relative(out,file));
 return {candidateCommit:manifest.candidateCommit,assets:Object.keys(assets).length,overrides:Object.keys(manifest.overrides).length,protectedFiles:protectedFiles.size};
}
