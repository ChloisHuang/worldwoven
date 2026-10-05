// One price-confirmed main-loop interruption. Bind directly to the integrated
// owner checkout: no copied product sources, actor placement or checkpoint seed.
// Simulated DOM and renderer; this is not browser, WebGL or iOS verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const owner=path.resolve(process.env.WORLDWOVEN_OWNER_ROOT||path.join(__dirname,'../../fourfang-public-alien'));
const sourceHead=execFileSync('git',['-C',owner,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const mainSource=fs.readFileSync(path.join(owner,'source/game/main.js'),'utf8');
assert(mainSource.includes('chinaService?.dispose({suspend:true})'),'integrated main suspends the service on region exit');
const mainSha256=createHash('sha256').update(mainSource).digest('hex');
let harness=fs.readFileSync(path.join(owner,'tests/fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){assert.equal(harness.split(before).length,2,'fixture seam: '+before);harness=harness.replace(before,after);}
replaceOnce("require('node:fs').mkdirSync('qa',{recursive:true});",'');
replaceOnce("const root=path.resolve('source');",'const root='+JSON.stringify(path.join(owner,'source'))+';');
const extras=`
export function tavernContinuityProbe(){return {player,npcs,furniture,chinaTavern,chinaTavernUI,chinaService,copperLedger};}
export function tavernContinuityStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();}
export {save,requestFurniture};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
replaceOnce('const document={body:',"const document={head:new E('head'),body:");
const start=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',start);
assert(start>=0&&end>start,'fixture scenario boundary');
const body=String.raw`
const api=main.namespace,started=Date.now(),checks=[],copy=x=>JSON.parse(JSON.stringify(x));
const same=(actual,expected,label)=>assert.deepStrictEqual(copy(actual),copy(expected),label);
const record=(label,details={})=>{checks.push({label,...details});console.log('PASS',label,JSON.stringify(details));};
const enterChina=()=>{all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();assert.equal(state().region,'china');};
enterChina();let r=api.tavernContinuityProbe();
assert(r.chinaTavern&&r.chinaService,'integrated main owns the shared meal and service');
const summary=()=>{const s=r.chinaTavern.snapshot();return {player:state().player,seated:state().seated,pathLength:state().pathLength,pending:state().pendingInteraction,toast:ids.toast.textContent,playerOrder:r.chinaTavern.state().order,phases:s.phases,orders:s.world.orders.map(o=>({id:o.id,stage:o.stage,mealId:o.mealId})),failures:r.chinaTavern.state().failures};};
const frame=()=>{now+=100;api.tavernContinuityStep(.1);assert.equal(r.chinaTavern.state().failures.length,0,'real main route failure '+JSON.stringify(summary()));};
const until=(predicate,label,max=900)=>{let steps=0;while(!predicate()&&steps<max){frame();steps++;if(steps%200===0)console.log('WAIT',label,JSON.stringify(summary()));}assert(predicate(),label+' '+JSON.stringify(summary()));record(label,{steps});return steps;};
const seatId='china-tavern-dining-18.1-1';
assert(r.copperLedger.earn(6,'tavern-continuity-fixture').ok,'fixture funds use production ledger');
api.requestFurniture(r.chinaTavern.seats.find(s=>s.id===seatId));
until(()=>state().seated===seatId,'normal arrival route mounts the real dining chair');
assert.equal(r.chinaTavern.state().order,null);assert.equal(r.copperLedger.state().cash,6);
r.chinaTavernUI.open();assert(r.chinaTavernUI.isOpen());
let confirm=all.slice().reverse().find(e=>e.tagName==='button'&&e.textContent==='确认点餐 · 6文');
assert(confirm&&!confirm.disabled,'visible menu explicitly confirms six copper');confirm.onclick();confirm=null;
const orderId=r.chinaTavern.state().order?.id;assert(orderId,'menu creates a player order');
assert.equal(r.copperLedger.reservations().find(h=>h.id===orderId)?.status,'reserved');
assert.equal(r.copperLedger.state().cash,0);r.chinaTavernUI.close();
// Interrupt the first naturally available order timer. Completing one remaining
// timed phase is sufficient; do not replay a meal, wrong dish or wage chain.
const durations={requested:1.3,ordered:1.3,paid:3.2,preparing:3.2,prepared:4.2,heating:4.2,cooked:1.1,pass:1.1,carrying:1.1,eating:5.5,dirty:1.1,return:2.8};
const phaseBoundary=()=>{const s=r.chinaTavern.snapshot();for(const [id,seconds]of s.phases){const o=s.world.orders.find(o=>o.id===id),duration=durations[o?.stage];if(o&&duration&&seconds>=.3&&seconds<duration-.2)return {id,seconds,duration,stage:o.stage,mealId:o.mealId,dishId:o.dishId};}return null;};
until(()=>!!phaseBoundary(),'reserved player order overlaps a live timed service phase',400);
const phase=phaseBoundary();api.save();
const persisted=JSON.parse(storage['worlds-days-v1']),checkpoint=persisted.worldContinuity.regions.china;
const before={controller:copy(r.chinaTavern.snapshot()),service:copy(r.chinaService.snapshot()),ledger:copy(r.copperLedger.state()),history:copy(r.copperLedger.history()),holds:copy(r.copperLedger.reservations()),clock:copy(state().simulationClock),playerLook:copy(state().playerLook),actors:r.chinaTavern.state().actors.map(a=>({id:a.id,position:a.position,mountId:a.mounted,yaw:r.npcs.find(n=>n.station.id===a.id).root.rotation.y}))};
same(checkpoint.controllers.chinaTavern,before.controller,'real main saves the matching world revision and phase');
same(checkpoint.controllers.chinaService,before.service,'real main saves service adapter continuity');
assert.equal(checkpoint.activity.seated,seatId);assert.equal(checkpoint.player.mountId,seatId);
assert.equal(before.controller.world.orders.find(o=>o.id===orderId).payment,'reserved');
assert.equal(before.history.filter(t=>t.action==='reserve'&&t.requestId===orderId).length,1);
assert.equal(before.history.filter(t=>t.action==='settle'&&t.reservationId===orderId).length,0);
record('captured actual main save at reserved receipt and partial phase',{orderId,phase,revision:before.controller.world.revision,dirtyTables:before.controller.world.tables,dirtyRooms:before.controller.world.rooms.map(room=>({id:room.id,dirty:room.dirty})),actors:before.actors});
// Retain JSON only across unload, allowing the old Three scene to be collected.
r=null;ids['return-world'].onclick();assert.equal(state().mode,'globe');assert.equal(state().characterResources.activeReferences,0);
const departed=JSON.parse(storage['worlds-days-v1']);
same(departed.chinaServiceWorld,before.controller.world,'suspending region exit neither cancels nor rewrites the order');
enterChina();r=api.tavernContinuityProbe();
same(r.chinaTavern.snapshot(),before.controller,'same orders, dishes, dirty facts, history and partial timers return');
same(r.chinaService.snapshot(),before.service,'same service adapter resumes');
same(r.copperLedger.state(),before.ledger,'money and journal unchanged after re-entry');
same(r.copperLedger.history(),before.history,'no replayed reserve or settlement transaction');
same(r.copperLedger.reservations(),before.holds,'same reserved receipt survives');
same(state().simulationClock,before.clock,'region change adds no offline time');
same(state().playerLook,before.playerLook,'player identity remains stable');
assert.equal(state().seated,seatId);same(r.player.root.position.toArray(),checkpoint.player.position,'same player position');assert.equal(r.player.root.rotation.y,checkpoint.player.yaw);
assert.equal(r.furniture.facilities.reservation(seatId,'player')?.status,'occupied','restored chair is physically claimed by player');
same(r.chinaTavern.state().actors.map(a=>a.id),before.actors.map(a=>a.id),'stable staff and guest identities');
for(const old of before.actors){const n=r.npcs.find(n=>n.station.id===old.id);assert(n,'same actor '+old.id);same(n.root.position.toArray(),old.position,'same position '+old.id);assert.equal(n.root.rotation.y,old.yaw,'same yaw '+old.id);assert.equal(n.serviceMount?.id||null,old.mountId,'same furniture mount '+old.id);if(old.mountId)assert.equal(r.furniture.facilities.reservation(old.mountId,old.id)?.status,'occupied','same occupied NPC chair '+old.id);}
assert(state().continuity.controllers.includes('chinaTavern'));assert(state().continuity.controllers.includes('chinaService'));
record('normal globe roundtrip restores exact receipt, money, dish, dirty state, actors and furniture');
const remaining=Math.ceil((phase.duration-phase.seconds)/.1)+3;
const steps=until(()=>r.chinaTavern.snapshot().world.orders.find(o=>o.id===phase.id)?.stage!==phase.stage,'one remaining timed phase completes after resume',remaining);
assert(steps<=remaining,'phase does not restart from zero');
assert.equal(r.chinaTavern.state().order.id,orderId);assert.equal(r.chinaTavern.state().order.payment,'reserved');
same(r.copperLedger.history(),before.history,'continuing the phase does not replay reserve or settle');
same(r.copperLedger.reservations(),before.holds,'receipt remains reserved after resumed phase');
const resumed=r.chinaTavern.snapshot(),result={status:'PASS',scope:'One actual-main China menu payment, save, globe exit and China re-entry; simulated DOM and renderer, not browser/iOS',sourceHead:SOURCE_HEAD,sourceMainSha256:MAIN_SHA,orderId,phaseBefore:phase,phaseAfter:resumed.world.orders.find(o=>o.id===phase.id).stage,resumedSteps:steps,checks,seconds:(Date.now()-started)/1000};
r=null;ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify(result));
`;
harness=harness.slice(0,start)+body.replace('SOURCE_HEAD',JSON.stringify(sourceHead)).replace('MAIN_SHA',JSON.stringify(mainSha256))+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-continuity-main-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
