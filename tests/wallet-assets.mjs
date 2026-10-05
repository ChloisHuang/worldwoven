// A tiny build fixture, not a source snapshot or a full-game regression.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=path.resolve('.'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'wallet-assets-'));
const write=(rel,text)=>{const target=path.join(temp,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);};
const link=rel=>{const target=path.join(temp,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.symlinkSync(path.join(root,rel),target);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
const build=()=>{const r=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(fs.readFileSync(path.join(temp,'dist/client/build.json')));};
try{
  for(const rel of ['scripts/build.mjs','source/game/wallet.js','source/game/wallet.css','source/game/currency-ledger.js','source/game/copper-ledger.js'])link(rel);
  for(const country of ['china','japan','egypt','france'])link(`source/game/assets/currency/${country}.webp`);
  write('source/game/main.js',"import {createCurrencyWallet} from './wallet.js'; export {createCurrencyWallet};");
  write('source/game/entry.js',"import './main.js';");write('source/game/game.css','body{margin:0}');
  write('source/game/index.html','<link href="./game.css?rev=R7-20261002"><script src="./entry.js"></script><script>"../vendor/three/build/three.module.js"</script>');
  write('source/vendor/three/build/three.module.js','export {};');write('source/vendor/three/LICENSE','test fixture');
  fs.mkdirSync(path.join(temp,'source/licenses'),{recursive:true});write('worker/index.mjs','export default {};');write('.openai/hosting.json','{}');
  write('package.json','{"type":"module","version":"0.16.59"}');write('cache-baseline.json','{"publishedSourceCommit":"fixture","assets":[]}');
  const a=build(),client=path.join(temp,'dist/client');
  let size=0;
  for(const country of ['china','japan','egypt','france']){
    const rel=`game/assets/currency/${country}.webp`,url=a.assets[rel],original=fs.readFileSync(path.join(root,'source',rel)),built=fs.readFileSync(path.join(client,url));
    assert.equal(built.subarray(0,4).toString(),'RIFF');assert.deepEqual(built,original,'image bytes are never decoded as UTF-8');
    assert(url.includes(`.${hash(original)}.`));assert(built.length<110000);size+=built.length;
  }
  assert(size<400000,'all four note assets fit a 400KB transfer budget');
  const wallet=fs.readFileSync(path.join(client,a.assets['game/wallet.js']),'utf8');
  for(const rel of ['game/wallet.css',...['china','japan','egypt','france'].map(c=>`game/assets/currency/${c}.webp`)])assert(wallet.includes(a.assets[rel]),`hashed URL for ${rel}`);
  const html=fs.readFileSync(path.join(client,'index.html'),'utf8');assert(!html.includes('.webp'),'no eager image preload in HTML');
  write('cache-baseline.json',JSON.stringify({publishedSourceCommit:'fixture',assets:Object.values(a.assets)}));
  const b=build();assert.deepEqual(b.assets,a.assets,'unchanged JS/CSS/binary graph has stable hashes');
  // Unknown URL assets fail closed instead of quietly shipping a missing URL.
  write('source/game/main.js',"export const denied = new URL('./unexpected.png', import.meta.url).href;");
  const rejected=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,encoding:'utf8'});assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/Unsupported URL asset/);
  console.log(`PASS wallet assets: ${size} bytes, four byte-exact hashed WebP images, scoped CSS URL, no HTML preloads, stable retained graph and unsupported-path rejection`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
