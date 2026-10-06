/** Query boot and emitted reference check only. Never starts a world/renderer. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=path.resolve('dist/client'),manifest=JSON.parse(fs.readFileSync(root+'/build.json','utf8')),assets=manifest.assets,read=url=>fs.readFileSync(path.join(root,url),'utf8');
const relByURL=new Map(Object.entries(assets).map(([rel,url])=>[url,rel]));
for(const [rel,url]of Object.entries(assets)){const bytes=fs.readFileSync(path.join(root,url)),body=bytes.toString('utf8');assert(url.includes('.'+createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.'),rel);if(url.endsWith('.js'))assert(!/\bimport\s*\(\s*['"]\.\.?\//.test(body),'literal dynamic import must be hashed: '+rel);}
const main=assets['game/main.js'],preview=assets['game/character-preview-entry.js'],entry=assets['game/entry.js'],live=assets['game/character-live-entry.js'];assert(main&&preview&&entry&&live);assert(read(entry).includes("import('"+main+"')"));assert(read(entry).includes("import('"+preview+"')"));
function staticGraph(start){const seen=new Set();function visit(url){if(seen.has(url))return;seen.add(url);for(const m of read(url).matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){const spec=m[1]==='three'?assets['vendor/three/build/three.module.js']:m[1];if(spec.startsWith('/assets/')){assert(relByURL.has(spec),'emitted reference exists '+spec);visit(spec);}}}visit(start);return seen;}
const normal=staticGraph(main),candidate=staticGraph(preview),liveGraph=staticGraph(live);
assert([...liveGraph].some(url=>relByURL.get(url)==='game/complete-adult/assets/adult-forms-data.js'));
assert(read(entry).includes("import('"+live+"')"));
assert(![...normal].some(url=>/^game\/complete-adult\//.test(relByURL.get(url))&&relByURL.get(url)!=='game/complete-adult/attachment-fit.js'));
assert([...candidate].some(url=>relByURL.get(url)==='game/complete-adult/assets/adult-forms-data.js'));
assert([...candidate].some(url=>relByURL.get(url)==='game/complete-adult/assets/female-hair-options-data.js'));
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
async function run(search,{failPreview=false,failLive=false}={}){
 const requested=[],elements=new Map(),link={},location={search,href:'https://alien.doudouai.net/?'+search.replace(/^\?/,'')+'#france'};
 const document={getElementById:id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',querySelector:()=>link});return elements.get(id);}};
 const context=vm.createContext({location,URL,document,localStorage:memory(),sessionStorage:memory()}),cache=new Map();
 function module(url){if(cache.has(url))return cache.get(url);const mod=new vm.SourceTextModule(read(url),{context,identifier:url,importModuleDynamically:async spec=>{requested.push(spec);if(spec===preview&&failPreview||spec===live&&failLive)throw new Error('candidate-load-failed');assert([main,preview,live].includes(spec));const stub=new vm.SyntheticModule([],()=>{},{context,identifier:spec});await stub.link(()=>{});await stub.evaluate();return stub;}});cache.set(url,mod);return mod;}
 const mod=module(entry);await mod.link(spec=>module(spec));let failed=false;try{await mod.evaluate();}catch(error){if(!failPreview&&!failLive)throw error;failed=true;}
 return{requested,failed,elements,link,staticModules:[...cache.keys()]};
}
const ordinary=await run('');assert.deepEqual(ordinary.requested,[live,main]);assert(!ordinary.staticModules.includes(preview));
const enabled=await run('?character-preview=1');assert.deepEqual(enabled.requested,[preview,main]);
const returned=await run('');assert.deepEqual(returned.requested,[live,main]);
const failed=await run('?character-preview=1&hair=long',{failPreview:true});assert(failed.failed);assert.deepEqual(failed.requested,[preview]);assert(failed.elements.get('loading').hidden);assert(!failed.elements.get('error').hidden);assert(failed.elements.get('error-text').textContent.includes('正式存档未修改'));assert.equal(new URL(failed.link.href).hash,'#france');assert.equal(new URL(failed.link.href).search,'');
const liveFailed=await run('',{failLive:true});assert(liveFailed.failed);assert.deepEqual(liveFailed.requested,[live]);assert(liveFailed.elements.get('error-text').textContent.includes('请刷新重试'));assert.equal(new URL(liveFailed.link.href).hash,'#france');
const html=read('/index.html');assert(html.includes(entry));assert(/id="appearance-shapes-panel"[^>]*hidden/.test(html));assert(html.includes('随机会更换外形与服装；只选服装会保留人物'));
const source=fs.readFileSync('source/game/main.js','utf8');assert(source.includes('if(!CHARACTER_PREVIEW_ENABLED||shapeControls.size)return;'));assert.equal((source.match(/previewSubject:'player'/g)||[]).length,1);assert(!/localStorage|sessionStorage/.test(source));
console.log(JSON.stringify({status:'PASS',normalStaticModules:normal.size,liveModelModules:liveGraph.size,candidateStaticModules:candidate.size,ordinaryDynamicRequests:ordinary.requested,previewDynamicRequests:enabled.requested,failedPreviewStartsMain:false,defaultSlidersHidden:true,hashPreserved:true,scope:'Emitted module/query execution with stubbed main; no world/browser/render'},null,2));
