// Bounded reproduction of officials frozen in opposing stair traffic.
// Six real actors, shared navigation, doors and facility claims; simulated DOM and
// renderer. This verifies movement/ownership, not browser or iOS presentation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function tavernStaffReview(){return {player,lot,camera,scene,sun,lighting,npcs,furniture,navOptions,chinaTavern,chinaTavernUI,chinaService:typeof chinaService==='undefined'?null:chinaService,chinaLabor,formalCareers,simulationClock,copperLedger,dailyNeeds,chinaAudience,chinaOfficialEconomy,chinaMoneyHouse,careerHandbook,npcSocial,saved};}
export function tavernStaffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();careerHandbook.update(mode);}
export function tavernStaffView(a,p=.20){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);}
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction,planPath};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
replaceOnce('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']);prior.appearance.seed=42;prior.simulationClock={version:1,seconds:(21*60+57-600)/.7};prior.chinaAudience={day:0,calledDay:0,outcome:'completed'};storage['worlds-days-v1']=JSON.stringify(prior);
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),copy=x=>JSON.parse(JSON.stringify(x));
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.tavernStaffReview(),T=three.namespace,officials=r.npcs.filter(n=>n.station.courtRole),B=cache.get(path.resolve('source/game/china-official-bureau.js')).namespace.CHINA_OFFICIAL_BUREAU;
const original=r.npcs.slice(),appearance=officials.map(n=>copy(n.root.userData.appearance)),economy=copy(r.chinaOfficialEconomy.snapshot()),checks=[];
assert.equal(officials.length,6);
function stages(){return r.chinaAudience.state().life.actors;}
function details(){return r.chinaAudience.snapshot().life.runtime.stages.map(([id,s])=>({id,index:s.index,point:r.npcs.find(n=>n.station.id===id).root.position.toArray(),travel:s.travel,mount:s.mount,failed:s.retries}));}
for(const scenario of ['simultaneous-return','counterflow-checkpoint','player-obstruction']){
 r.player.root.position.set(0,.13,24);
 const snap=r.chinaAudience.snapshot();snap.runtime.phase='waiting';snap.runtime.tasks=[];
 snap.life.runtime.stages=officials.map((n,i)=>{
  const bed=r.furniture.items.find(b=>b.id===B.beds[i]),down=scenario==='counterflow-checkpoint'&&i===4;
  n.root.position.set(14+i*.8,.115,28.2);
  if(scenario!=='simultaneous-return'&&i>=2){const z=35.5-(i-2)*.7;n.root.position.set(26.92,.115+(36.3-z)/5.8*3.8,z);}
  const destination=down?[14,.115,28.2]:bed.position,path=i<2?[destination]:down?[...B.stairRoute.slice(0,4).reverse(),destination]:[...B.stairRoute,destination];
  return [n.station.id,{id:down?'life-garden':'life-rest',path,index:i<2||down||scenario==='simultaneous-return'?0:4,arrived:false,planned:false,stalled:0,retries:0,elapsed:0,duration:1000,label:down?'沿东侧庭院散步赏荷':'回自己的值宿室歇息',choice:{id:down?'garden':'rest',duration:1000,facilityId:down?null:bed.id,point:destination,relief:{fatigue:-.7}},mountTarget:down?null:{$worldRef:'furniture',id:bed.id},roomId:down?null:B.privateRoomIds[i],waiting:0}];
 });
 // Scenario fixtures begin at these authored physical checkpoints. From here
 // onward all movement, furniture ownership and recovery are production code.
 assert(r.chinaAudience.restore(copy(snap)));
 if(scenario==='player-obstruction')r.player.root.position.set(26.92,.115+(36.3-32)/5.8*3.8,32);
 let frames=0,checkpoint=false;
 const done=()=>stages().every((a,i)=>scenario==='counterflow-checkpoint'&&i===4?a.arrived&&Math.hypot(a.position[0]-14,a.position[2]-28.2)<.2:!!a.mounted);
 for(;frames<650&&!done();frames++){
  const before=officials.map(n=>n.root.position.clone()),mounted=officials.map(n=>!!r.chinaAudience.mountForActor(n));
  now+=100;main.namespace.tavernStaffStep(.1);
  officials.forEach((n,i)=>{assert.equal(n,original.find(o=>o.station.id===n.station.id));if(!mounted[i]&&!r.chinaAudience.mountForActor(n))assert(before[i].distanceTo(n.root.position)<.3,'continuous physical route '+n.station.id);if(frames%20===0&&!r.chinaAudience.mountForActor(n))assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'walls and stairs remain solid');});
  if(scenario==='counterflow-checkpoint'&&frames===30){const current=copy(r.chinaAudience.snapshot()),positions=officials.map(n=>n.root.position.toArray());assert(r.chinaAudience.restore(current));assert.deepEqual(officials.map(n=>n.root.position.toArray()),positions,'saved crossing restores the same people at the same positions');checkpoint=true;}
 }
 assert(done(),scenario+' did not finish '+JSON.stringify(details()));assert.equal(r.npcs.length,original.length);assert(officials.every((n,i)=>JSON.stringify(n.root.userData.appearance)===JSON.stringify(appearance[i])),'identity stays unchanged');
 assert.deepEqual(copy(r.chinaOfficialEconomy.snapshot()),economy,'stair recovery never pays or changes accounts');assert.equal(r.chinaAudience.state().failures.length,0);
 const mounts=stages().filter(a=>a.mounted);for(const a of mounts){const i=officials.findIndex(n=>n.station.id===a.id);assert.equal(a.mounted,B.beds[i],'each official reaches his own bed');}
 checks.push({scenario,simulationSeconds:(frames*.1).toFixed(1),mounted:mounts.length,checkpoint});console.log('CHECK',JSON.stringify(checks.at(-1)));
}
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
console.log(JSON.stringify({status:'PASS',scope:'Production main, six official identities, actual stair/door/bed geometry and life checkpoints; simulated DOM/renderer, not browser or iOS',checks,seconds:(Date.now()-started)/1000,maxRssMiB:process.resourceUsage().maxRSS/1024}));

`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-official-meal-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
