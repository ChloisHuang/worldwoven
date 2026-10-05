// One bounded pair of existing low-funds guests in production main.
// Real actors, shared navigation, doors and facility claims; simulated DOM and
// renderer. This verifies movement/ownership, not browser or iOS presentation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function tavernStaffReview(){return {player,lot,camera,scene,sun,lighting,npcs,furniture,navOptions,chinaTavern,chinaTavernUI,chinaService:typeof chinaService==='undefined'?null:chinaService,chinaLabor,formalCareers,simulationClock,copperLedger,dailyNeeds,careerHandbook,npcSocial,saved};}
export function tavernStaffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();careerHandbook.update(mode);}
export function tavernStaffView(a,p=.20){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);}
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction,planPath};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),copy=x=>JSON.parse(JSON.stringify(x));
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.tavernStaffReview(),scene=r.chinaTavern.staffScene,idsGuest=['cn-tavern-diner-west','cn-tavern-diner-east'],guests=idsGuest.map(id=>r.npcs.find(n=>n.station.id===id));
// A saved low-funds pair: one idle hungry guest and one old unpaid order.
// These are fixture starting positions, before any simulation frame.
const seed=scene.snapshot();for(const[i,v]of seed.visitors.entries()){v.copper=i*2;v.mode=i?'dining':'idle';}seed.orders[0].stage='done';seed.orders[1].stage='ordered';assert(scene.restoreWorld(seed));
for(const[i,n]of guests.entries()){n.root.position.set(20.2+i*1.3,.215,18.8);n.route=[];assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'legal fixture start');r.furniture.facilities.reserve(seed.orders[i].seatId,n.station.id,{purpose:'tavern-meal'});}
const money=copy(r.copperLedger.state()),needs=idsGuest.map(id=>r.dailyNeeds.hunger(id)),observed=Object.fromEntries(idsGuest.map(id=>[id,{departed:false,moves:0,lifeMoves:0,choices:new Set()}]));
let steps=0;const frame=()=>{const before=guests.map(n=>n.root.position.clone());now+=100;main.namespace.tavernStaffStep(.1);steps++;
 const world=scene.state();assert.equal(world.serial,seed.serial,'no unaffordable new order');assert.deepEqual(copy(world.visitors.map(v=>v.copper)),[0,2]);assert.equal(world.till,0);assert.deepEqual(copy(r.copperLedger.state()),money,'player wallet never funds guests');
 for(const[i,n]of guests.entries()){const watch=observed[n.station.id],v=world.visitors.find(v=>v.id===n.station.id),life=world.staffLife.actors.find(a=>a.id===n.station.id),moved=before[i].distanceTo(n.root.position);assert(moved<.4,'continuous shared-route movement '+n.station.id);assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'guest outside static furniture '+n.station.id+' '+n.root.position.toArray());if(moved>.005)watch.moves++;if(v.mode==='idle'&&n.root.position.z>21.7)watch.departed=true;if(watch.departed&&life?.choice){watch.choices.add(life.choice);if(moved>.005)watch.lifeMoves++;}assert(!world.seatClaims.some(f=>f.reservations.some(q=>q.actor===n.station.id&&q.purpose==='tavern-meal')),'no unpaid dining claim');assert(r.dailyNeeds.hunger(n.station.id)>=needs[i],'no fake hunger relief');}
 if(steps%100===0)console.log('PROGRESS',steps,JSON.stringify(world.actors.filter(a=>idsGuest.includes(a.id))));
};
for(;steps<800&&!Object.values(observed).every(o=>o.departed&&o.lifeMoves>=8&&o.choices.size>=1);)frame();
assert(Object.values(observed).every(o=>o.departed&&o.moves>=15&&o.lifeMoves>=8&&o.choices.size>=1),'both original guests leave and walk under free-life controller '+JSON.stringify({observed:Object.fromEntries(Object.entries(observed).map(([id,o])=>[id,{...o,choices:[...o.choices]}])),world:scene.state()}));
assert.equal(scene.state().history.filter(e=>e.event==='meal-deferred').length,2);assert(scene.snapshot().visitors.every(v=>v.mealDeferred));assert(scene.snapshot().orders.find(o=>o.number===2).cancelled);assert.equal(scene.snapshot().orders.find(o=>o.number===2).collected,false);
console.log(JSON.stringify({status:'PASS',scope:'One low-funds two-guest branch in production main, real Three actors/shared navigation/doors; simulated DOM and renderer, not browser/iOS',steps,seconds:(Date.now()-started)/1000,guests:Object.fromEntries(Object.entries(observed).map(([id,o])=>[id,{...o,choices:[...o.choices]}])),world:scene.snapshot().visitors,positions:guests.map(n=>n.root.position.toArray())}));
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);

`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-low-funds-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
