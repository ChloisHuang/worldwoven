// Bounded persistence checks: no renderer, scene, server, or copied source tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {createGameStorage,PREVIEW_STORAGE_PREFIX} from '../source/game/game-storage.js';
import * as appearance from '../source/game/appearance.js';
import {ensurePlayerAge} from '../source/game/player-age.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
import {createGameHealthWorld} from '../source/game/game-health-world.js';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const key='worlds-days-v1',clone=value=>JSON.parse(JSON.stringify(value));
const main=read('source/game/main.js'),gateSource=read('source/game/character-preview-gate.js');
const extraTraits=['chinLength','chinProjection','noseBridgeHeight','noseTipSize'];
const legacyKeys=['jawWidth','legLength','eyeSize','noseSize','noseWidth','socketDepth'];

// Read the deployed contract and its small pure dependencies from Git into memory.
const historicalURLs=new Map();
function historicalURL(rel){
 if(historicalURLs.has(rel))return historicalURLs.get(rel);
 let code=execFileSync('git',['show',`3cde448:${rel}`],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
 code=code.replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g,(_,before,spec,after)=>before+historicalURL(path.posix.normalize(path.posix.join(path.posix.dirname(rel),spec)))+after);
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');historicalURLs.set(rel,url);return url;
}
const legacy=await import(historicalURL('source/game/appearance.js'));

function storage(entries={}){
 const values=new Map(Object.entries(entries)),writes=[],reads=[];
 return {values,writes,reads,failWrites:false,
  getItem(k){reads.push(k);return values.get(k)??null;},
  setItem(k,v){writes.push([k,String(v)]);if(this.failWrites)throw Error('session quota failure');values.set(k,String(v));},
  snapshot(){return [...values].sort(([a],[b])=>a.localeCompare(b));}
 };
}
function gate(search,normal,session){
 const globals={location:{search},localStorage:normal,sessionStorage:session};
 const code=gateSource.replace(/^import .*;\s*$/m,'').replace(/\bexport\s+/g,'');
 const value=new Function('createGameStorage','globalThis',code+'\nreturn {CHARACTER_PREVIEW_ENABLED,PREVIEW_NPCS_ENABLED,gameStorage};')(createGameStorage,globals);
 return {...value,globals};
}
function balancedBlock(text,start){
 assert.equal(text[start],'{');let depth=0,quote=null,escaped=false;
 for(let i=start;i<text.length;i++){
  const c=text[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0)return text.slice(start,i+1);
 }
 assert.fail('Unclosed source block');
}
function saveCallback(property){
 const marker=`saved:saved.${property}`,start=main.indexOf(marker);assert(start>=0,`actual main ${property} wiring exists`);
 const arrow=main.indexOf('saveState:state=>',start);assert(arrow>=0);
 return 'state=>'+balancedBlock(main,arrow+'saveState:state=>'.length);
}
function initialize(gameStorage,preview){
 const begin=main.indexOf('let saved={visited:[]'),end=main.indexOf('const scene=',begin);
 assert(begin>=0&&end>begin,'actual main initialization has a bounded pre-scene seam');
 const confirmStart=main.indexOf('if(confirm){',main.indexOf('function closeOutfitPreview('));assert(confirmStart>=0);
 const confirm=balancedBlock(main,confirmStart+'if(confirm)'.length);
 const pagehide=main.match(/addEventListener\('pagehide',[^\n]+/);assert(pagehide,'actual pagehide flush exists');
 const visibilityStart=main.indexOf("document.addEventListener('visibilitychange',()=>");assert(visibilityStart>=0);
 const visibility=balancedBlock(main,visibilityStart+"document.addEventListener('visibilitychange',()=>".length);
 const dependencies={gameStorage,CHARACTER_PREVIEW_ENABLED:preview,ensurePlayerAge,
  validAppearanceState:appearance.validAppearanceState,migrateAppearanceState:appearance.migrateAppearanceState,
  createAppearanceState:appearance.createAppearanceState,createCopperLedger,createGameHealthWorld,crypto:webcrypto};
 const code=main.slice(begin,end)+`
 const events={},addEventListener=(name,fn)=>events[name]=fn;
 ${pagehide[0]}
 const document={hidden:true},showDoorwayHint=()=>{},clock={getDelta(){}},keys=new Set(),$=()=>({style:{}});let paused=false,joy={};
 events.visibilitychange=()=>${visibility};
 return {get saved(){return saved;},save,copperLedger,gameHealth,events,
  persistLabor:${saveCallback('chinaLabor')},persistSalon:${saveCallback('chinaSalon')},
  confirmAppearance:(outfitDraft,outfit)=>${confirm}};
 `;
 return new Function(...Object.keys(dependencies),code)(...Object.values(dependencies));
}
function formalFixture(){
 return {visited:['japan'],stamps:{japan:['jp-tea']},outfit:2,appearance:legacy.createAppearanceState(41),playerProfile:{ageYears:28},
  copperLedger:{version:1,cash:20,bank:0,accountOpened:false,nextTransaction:1,transactions:[]},
  chinaLabor:{version:1,serial:0,job:null},chinaSalon:{serial:2,time:7,relationships:{'cn-salon-artist':2}},
  gameHealth:createGameHealthWorld({worldSeed:41}).snapshot(),curtains:{france:true}};
}
function stores(fixture=formalFixture()){
 return {normal:storage({[key]:JSON.stringify(fixture),'health-other-game':'{"course":"untouched"}','wallet-other-game':'0007','relations-other-game':'friendship:\u4e0d\u53d8','unrelated-empty':''}),session:storage({'unrelated-session':'untouched'})};
}
const actor=(id,position={x:0,y:0,z:0})=>({station:{id},root:{position,rotation:{y:0}},walking:false});
function rng(seed){let n=seed>>>0,calls=0;const draw=()=>{calls++;n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};draw.calls=()=>calls;return draw;}

test('preview initialization, appearance, health, relationships, ledger and labor write only the isolated session save',()=>{
 const {normal,session}=stores(),before=normal.snapshot(),initialBytes=normal.getItem(key),locked=gate('?character-preview=1',normal,session);
 assert.equal(locked.CHARACTER_PREVIEW_ENABLED,true);assert.equal(locked.PREVIEW_NPCS_ENABLED,false);
 assert.equal(locked.gameStorage.getItem(key),initialBytes,'first preview read is the exact formal copy');
 const game=initialize(locked.gameStorage,true);
 assert.equal(Object.keys(game.saved.appearance.player.shapeTraits).length,10,'only copied appearance is expanded');
 const draft=clone(game.saved.appearance);draft.player.shapeTraits.chinLength=1.12;game.confirmAppearance(draft,5);
 assert.equal(JSON.parse(session.getItem(PREVIEW_STORAGE_PREFIX+key)).appearance.player.shapeTraits.chinLength,1.12);
 assert(game.copperLedger.openAccount('preview-open').ok);assert(game.copperLedger.deposit(4,'preview-deposit').ok);
 const player=actor('player',{x:22.35,y:.215,z:11.7}),host=actor('cn-tavern-host',{x:24.1,y:.215,z:11.4});
 const labor=createChinaTavernLabor({employment:{isHired:()=>true,state:()=>({version:1,roleId:'cn-tavern-helper',revision:1})},getPlayer:()=>player,host,copperLedger:game.copperLedger,saved:game.saved.chinaLabor,saveState:game.persistLabor,document:null});
 assert(labor.accept());assert.equal(game.saved.chinaLabor.job.stage,'working');
 for(let table=0;table<2;table++){
  const [x,y,z]=labor.view().target.position;Object.assign(player.root.position,{x,y,z});assert(labor.startCleaning());
  for(let i=0;i<50;i++)labor.update(.1);
 }
 assert.equal(labor.view().job.stage,'ready');Object.assign(player.root.position,{x:22.35,y:.215,z:11.7});assert(labor.claim());
 assert.equal(game.copperLedger.state().total,32);assert.equal(game.saved.chinaLabor.job,null);
 const relations={...game.saved.chinaSalon,relationships:{'cn-salon-artist':3},life:{people:{friend:{relations:{player:.75}}}}};game.persistSalon(relations);
 game.gameHealth.enter('china',[host]);const event=game.gameHealth.beginInteraction('npc-social',['player','cn-tavern-host']);assert(event);
 game.gameHealth.interaction({...event,duration:6});game.gameHealth.update(6,{player,actors:[host],playerExertion:.4});
 const beforeHide=session.writes.length;game.events.visibilitychange();game.events.pagehide();assert.equal(session.writes.length,beforeHide+2);
 const persisted=JSON.parse(session.getItem(PREVIEW_STORAGE_PREFIX+key));
 assert.equal(persisted.outfit,5);assert.equal(persisted.copperLedger.cash,28);assert.equal(persisted.copperLedger.bank,4);
 assert.deepEqual(persisted.chinaLabor,game.saved.chinaLabor);assert.deepEqual(persisted.chinaSalon,relations);assert.deepEqual(persisted.gameHealth,game.gameHealth.snapshot());
 assert.deepEqual(normal.snapshot(),before);assert.equal(normal.writes.length,0,'no formal key was written');
 assert(session.writes.every(([k])=>k.startsWith(PREVIEW_STORAGE_PREFIX)),'all preview writes are namespaced');
 assert.equal(session.getItem('unrelated-session'),'untouched');
 assert.equal(createGameStorage({normal}).getItem(key),initialBytes,'fresh normal facade returns original state');
});

test('session write failures reject ledger/labor transactions and never fall back to formal storage',()=>{
 const {normal,session}=stores(),before=normal.snapshot(),game=initialize(createGameStorage({preview:true,normal,session}),true);
 const durable=session.snapshot(),ledgerBefore=game.copperLedger.state(),laborBefore=clone(game.saved.chinaLabor);session.failWrites=true;
 assert.throws(()=>createGameStorage({preview:true,normal,session}).setItem('arbitrary','write'),/session quota failure/);
 assert.equal(game.copperLedger.openAccount('failing-open').code,'save-failed');assert.deepEqual(game.copperLedger.state(),ledgerBefore);
 const player=actor('player',{x:22.35,y:.215,z:11.7}),host=actor('cn-tavern-host',{x:24.1,y:.215,z:11.4});
 const labor=createChinaTavernLabor({employment:{isHired:()=>true,state:()=>({version:1,roleId:'cn-tavern-helper',revision:1})},getPlayer:()=>player,host,copperLedger:game.copperLedger,saved:game.saved.chinaLabor,saveState:game.persistLabor,document:null});
 assert.equal(labor.accept(),false);assert.equal(labor.view().lastError,'save-failed');assert.deepEqual(game.saved.chinaLabor,laborBefore);
 game.events.pagehide();assert.deepEqual(session.snapshot(),durable);assert.deepEqual(normal.snapshot(),before);assert.equal(normal.writes.length,0);
});

test('query changes cannot reroute an existing document; absent session storage stays in memory',()=>{
 const {normal,session}=stores(),before=normal.snapshot(),preview=gate('?character-preview=1',normal,session);
 const copied=preview.gameStorage.getItem(key);preview.globals.location.search='';preview.gameStorage.setItem(key,'preview-only');
 assert.equal(preview.CHARACTER_PREVIEW_ENABLED,true);assert.equal(preview.gameStorage.getItem(key),'preview-only');assert.deepEqual(normal.snapshot(),before);
 const ordinary=gate('',normal,session);ordinary.globals.location.search='?character-preview=1';
 assert.equal(ordinary.CHARACTER_PREVIEW_ENABLED,false);assert.equal(ordinary.gameStorage.getItem(key),copied);
 ordinary.gameStorage.setItem('formal-test-key','normal');assert.equal(normal.getItem('formal-test-key'),'normal');assert.equal(session.getItem(PREVIEW_STORAGE_PREFIX+'formal-test-key'),null);
 const memory=createGameStorage({preview:true,normal});memory.setItem(key,'memory-only');assert.equal(memory.getItem(key),'memory-only');assert.equal(normal.getItem(key),copied);
 for(const query of['','?character-preview=0','?character-preview=true','?preview-npcs=1'])assert.equal(gate(query,normal,session).CHARACTER_PREVIEW_ENABLED,false);
});

test('normal initialization keeps a valid six-trait formal save byte-for-byte and performs no migration write',()=>{
 const {normal,session}=stores(),before=normal.snapshot(),ordinary=gate('',normal,session),game=initialize(ordinary.gameStorage,false);
 assert.deepEqual(game.saved.appearance,formalFixture().appearance);assert.equal(game.saved.appearance.npcShapeVersion,1);
 assert.deepEqual(Object.keys(game.saved.appearance.player.shapeTraits),legacyKeys);
 assert.deepEqual(normal.snapshot(),before);assert.equal(normal.writes.length,0);assert.equal(session.writes.length,0);
 assert(!/\b(?:localStorage|sessionStorage)\s*\./.test(main),'main has no direct browser-storage bypass');
});

test('formal appearance creation, migration and random draw order match deployed 3cde448',()=>{
 for(const seed of[0,1,41,4294967295]){
  const expected=legacy.createAppearanceState(seed),actual=appearance.createAppearanceState(seed,{extended:false});assert.deepEqual(actual,expected);
  assert.equal(actual.npcShapeVersion,1);assert(extraTraits.every(k=>!(k in actual.player.shapeTraits)));
  for(const version of[1,2,3]){
   const old={...clone(expected),version};if(version!==3)delete old.player.shapeTraits;else delete old.player.shapeTraits.eyeSize;
   const migrated=appearance.migrateAppearanceState(old,{extended:false});assert.deepEqual(migrated,legacy.migrateAppearanceState(old));
   assert(extraTraits.every(k=>!(k in migrated.player.shapeTraits)));assert.equal(migrated.npcShapeVersion,1);
  }
  const left=rng(seed),right=rng(seed);assert.deepEqual(appearance.randomizePlayerAppearance(actual,left,{extended:false}),legacy.randomizePlayerAppearance(expected,right));assert.equal(left.calls(),right.calls());assert.equal(left.calls(),13);
 }
});

test('formal validation and malformed-version migration retain the deployed contract',()=>{
 const base=legacy.createAppearanceState(41),cases=[base,null,{}, {...base,version:2}, {...base,npcShapeVersion:0}, {...base,npcShapeVersion:2}, {...base,npcShapeVersion:undefined}, {...base,player:{...base.player,shapeTraits:{...base.player.shapeTraits,jawWidth:9}}}];
 for(const input of cases){
  assert.equal(!!appearance.validAppearanceState(input,{extended:false}),!!legacy.validAppearanceState(input),`validator matches baseline for ${JSON.stringify(input)}`);
  assert.deepEqual(appearance.migrateAppearanceState(input,{extended:false}),legacy.migrateAppearanceState(input),`migration matches baseline for NPC version ${input?.npcShapeVersion}`);
 }
});
