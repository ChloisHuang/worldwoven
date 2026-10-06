// One price-confirmed meal, interrupted once and completed through the moved
// kitchen/table service chain. Bind directly to the integrated
// owner checkout: no copied product sources, actor placement or checkpoint seed.
// Simulated DOM and renderer; this is not browser, WebGL or iOS verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const owner=path.resolve(process.env.WORLDWOVEN_OWNER_ROOT||path.join(__dirname,'..'));
const sourceHead=execFileSync('git',['-C',owner,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const mainSource=fs.readFileSync(path.join(owner,'source/game/main.js'),'utf8');
assert(mainSource.includes('chinaService?.dispose({suspend:true})'),'integrated main suspends the service on region exit');
const mainSha256=createHash('sha256').update(mainSource).digest('hex');
let harness=fs.readFileSync(path.join(owner,'tests/fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){assert.equal(harness.split(before).length,2,'fixture seam: '+before);harness=harness.replace(before,after);}
replaceOnce("require('node:fs').mkdirSync('qa',{recursive:true});",'');
replaceOnce("const root=path.resolve('source');",'const root='+JSON.stringify(path.join(owner,'source'))+';');
const extras=`
export function tavernContinuityProbe(){return {player,npcs,furniture,lot,navOptions,chinaTavern,chinaTavernUI,chinaService,copperLedger};}
export function tavernContinuityStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();}
export {save,requestFurniture,blocked,furnitureSafetyBoxes};
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
const workContacts=new Map(),near=(actor,p)=>Math.hypot(actor.root.position.x-p[0],actor.root.position.z-p[2])<.12&&Math.abs(actor.root.position.y-p[1])<.2;
const frame=()=>{const staff=r.npcs.filter(n=>['cn-tavern-host','cn-tavern-cook','cn-tavern-assistant'].includes(n.station.id)),positions=staff.map(n=>n.root.position.clone()),mounts=staff.map(n=>n.serviceMount);now+=100;api.tavernContinuityStep(.1);assert(Date.now()-started<300000,'one bounded affected scene');assert(process.memoryUsage().rss<1.2*1024**3,'bounded scene memory');
 for(const [i,n]of staff.entries()){const prior=positions[i],mount=n.serviceMount,oldMount=mounts[i],distance=prior.distanceTo(n.root.position),mounting=mount!==oldMount&&mount&&prior.distanceTo(new three.namespace.Vector3(...mount.position))<.4&&near(n,mount.anchor),standing=oldMount&&!mount&&prior.distanceTo(new three.namespace.Vector3(...oldMount.anchor))<.35&&distance<2;
  assert(distance<.4||mounting||standing,'continuous original staff movement '+JSON.stringify({id:n.station.id,before:prior.toArray(),after:n.root.position.toArray(),oldMount:oldMount?.id,mount:mount?.id,distance}));
  if(mount)assert(near(n,mount.anchor),'mounted actor stays on its authored seat');else assert(!api.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'staff remains clear of relocated furniture '+n.station.id+' '+n.root.position.toArray());}
 const snapshot=r.chinaTavern.snapshot(),order=snapshot.world.orders.find(o=>o.customerId==='player'),phase=order&&snapshot.phases.find(([id])=>id===order.id),contact=({paid:'prep',prepared:'stove',cooked:'cookPass'})[order?.stage];
 if(contact&&phase?.[1]>0&&!workContacts.has(contact)){const cook=staff.find(n=>n.station.id==='cn-tavern-cook'),point=r.chinaTavern.dish.points[contact];assert(near(cook,point),'real work occurs at relocated '+contact);workContacts.set(contact,{point:point.slice(),position:cook.root.position.toArray(),orderId:order.id,mealId:order.mealId,seconds:phase[1]});record('physical '+contact+' contact',workContacts.get(contact));}
 assert.equal(r.chinaTavern.state().failures.length,0,'real main route failure '+JSON.stringify(summary()));};
const until=(predicate,label,max=1400)=>{let steps=0;while(!predicate()&&steps<max){frame();steps++;if(steps%200===0)console.log('WAIT',label,JSON.stringify(summary()));}assert(predicate(),label+' '+JSON.stringify(summary()));record(label,{steps});return steps;};
const seatId='china-tavern-dining-18.1-1';
same(r.chinaTavern.dish.points.prep,[23.3,.215,4.36],'kitchen prep moved north five metres');same(r.chinaTavern.dish.points.passTop,[24.35,1.31,5.34],'same pass moved north five metres');assert(Math.abs(r.chinaTavern.seats.find(s=>s.id===seatId).center[2]-17.52)<1e-8,'same south dining seat moved1.9m north');
assert(r.copperLedger.earn(6,'tavern-continuity-fixture').ok,'fixture funds use production ledger');
const customerSeat=r.chinaTavern.seats.find(s=>s.id===seatId);api.requestFurniture(customerSeat);let sitAttempts=1;
until(()=>{if(state().seated===seatId)return true;if(!state().pathLength&&!state().pendingInteraction&&r.furniture.canSit(r.navOptions,api.furnitureSafetyBoxes(),customerSeat)){api.requestFurniture(customerSeat);sitAttempts++;}return state().seated===seatId;},'normal arrival and clear-space sit request mount the same real dining chair',600);record('explicit seat request count',{sitAttempts});
assert.equal(r.chinaTavern.state().order,null);assert.equal(r.copperLedger.state().cash,6);
r.chinaTavernUI.open();assert(r.chinaTavernUI.isOpen());
let confirm=all.slice().reverse().find(e=>e.tagName==='button'&&e.textContent==='确认点餐 · 6文');
assert(confirm&&!confirm.disabled,'visible menu explicitly confirms six copper');confirm.onclick();confirm=null;
const orderId=r.chinaTavern.state().order?.id;assert(orderId,'menu creates a player order');
assert.equal(r.copperLedger.reservations().find(h=>h.id===orderId)?.status,'reserved');
assert.equal(r.copperLedger.state().cash,0);r.chinaTavernUI.close();
// Interrupt the first naturally available order timer, resume only its remaining
// time, then finish this same meal once. No wrong-dish or wage chain is replayed.
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
until(()=>r.chinaTavern.state().order?.stage==='carrying','original assistant takes the same freshly prepared dish');
const carried=r.chinaTavern.state(),dishId=carried.order.mealId;assert.equal(carried.order.id,orderId);assert.equal(carried.order.holder,'assistant');assert.equal(carried.props.mealId,dishId);assert.deepEqual([...workContacts.keys()].sort(),['cookPass','prep','stove']);
until(()=>r.chinaTavern.state().order?.stage==='ready','same paid order reaches its original relocated table');
assert.equal(r.chinaTavern.state().order.seatId,seatId);assert.equal(r.chinaTavern.state().props.mealId,dishId);assert.equal(r.copperLedger.reservations().find(h=>h.id===orderId)?.status,'settled');assert.equal(r.copperLedger.history().filter(t=>t.action==='reserve'&&t.requestId===orderId).length,1);assert.equal(r.copperLedger.history().filter(t=>t.action==='settle'&&t.reservationId===orderId).length,1);
assert(r.chinaTavern.eat());assert.equal(r.chinaTavern.eat(),false);frame();const hand=r.player.root.userData.hands[0].getWorldPosition(new three.namespace.Vector3());assert(hand.distanceTo(new three.namespace.Vector3(...r.chinaTavern.state().props.bowlPosition))<.11,'same bowl reaches actual diner palm');
until(()=>r.chinaTavern.state().order?.stage==='return','same consumed plate is physically collected');assert.equal(r.chinaTavern.state().order.mealId,dishId);assert.equal(r.chinaTavern.state().order.holder,'assistant');assert(!r.chinaTavern.state().props.foodVisible);
until(()=>!r.chinaTavern.state().order,'same plate returns to relocated basin and is washed');const completed=r.chinaTavern.state();assert.equal(completed.props.trayCount,0);assert.equal(completed.props.bowlCount,0);for(const event of ['dish-prepared','dish-on-pass','tray-received','delivered','table-cleared','washed'])assert(completed.history.some(h=>h.event===event&&h.orderId===orderId&&h.mealId===dishId),'same physical item '+event);assert.equal(r.copperLedger.state().cash,0);same(state().playerLook,before.playerLook,'same player identity after complete meal');record('one restored paid meal completes its relocated physical service chain',{orderId,dishId,workContacts:[...workContacts]});
const resumed=r.chinaTavern.snapshot(),result={status:'PASS',scope:'One actual-main China paid meal, partial-phase save/re-entry, relocated prep/stove/pass, original table, consumption and washing; simulated DOM and renderer, not browser/iOS',sourceHead:SOURCE_HEAD,sourceMainSha256:MAIN_SHA,orderId,phaseBefore:phase,phaseAfter:resumed.world.orders.find(o=>o.id===phase.id)?.stage||'done',resumedSteps:steps,checks,seconds:(Date.now()-started)/1000};
r=null;ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify(result));
`;
harness=harness.slice(0,start)+body.replace('SOURCE_HEAD',JSON.stringify(sourceHead)).replace('MAIN_SHA',JSON.stringify(mainSha256))+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-continuity-main-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
