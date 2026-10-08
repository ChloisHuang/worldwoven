// Existing service scene + existing life sampler + actual Three actor roots and
// navigation executor. Fixture floor/doors/accounts isolate source transactions;
// this is not a full-main, rendered production route or real payroll assertion.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {beginActorNavigationStep} from '../source/game/actor-navigation.js';
import {createChinaTavernRecruitment,TAVERN_RECRUITMENT_TABLES as TABLES} from '../source/game/china-tavern-recruitment.js';
import {createChinaTavernHiring,TAVERN_HIRING_ROLES as ROLES,TAVERN_HIRING_BUSINESS_ID as BUSINESS} from '../source/game/china-tavern-hiring.js';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createTavernServiceScene,verifySavedRecruitmentTableWork}=await import('../source/game/china-tavern-service-scene.js');
const copy=structuredClone,WEST='cn-tavern-diner-west',EAST='cn-tavern-diner-east';
function actor(id,name,p){const root=new THREE.Group();root.position.fromArray(p);root.userData.bodyId=id;
 const hands=[new THREE.Object3D(),new THREE.Object3D()];hands[0].position.set(-.18,1.2,.3);hands[1].position.set(.18,1.2,.3);root.add(...hands);root.userData.hands=hands;
 return {station:{id,npcName:name,npcPosition:p.slice()},root,route:[],phase:0,walking:false,alive:true,ageYears:29,
  locomotion:{walkSpeed:3},lastPose:null,animate(_t,walking,action){this.lastPose={walking,action};}};}
function fixture(saved=null){
 const game=copy(saved?.game||{}),clock={seconds:saved?.seconds??700000,hour:10,day:8},owner={ownerId:'player',ownership:2};
 const npcs=[actor('cn-tavern-host','许安',[24.1,.215,6.4]),actor('cn-tavern-cook','沈禾',[23.3,.215,4.36]),actor('cn-tavern-assistant','陆青',[22,.215,9.1]),actor(WEST,'顾谨',[20,.215,22.4]),actor(EAST,'周棠',[22,.215,22.4])];
 if(saved?.positions)for(const n of npcs)n.root.position.fromArray(saved.positions[n.station.id]);
 const player=actor('player','你',[14,.215,20]),byId=id=>npcs.find(n=>n.station.id===id),group=new THREE.Group();group.add(...npcs.map(n=>n.root),player.root);
 const roles={chef:'cn-tavern-cook',assistant:saved?saved.assistant:'cn-tavern-assistant'},slotRevision=saved?.slotRevision??3;
 let revision=slotRevision,runtime=null,hiring=null,scene=null,mounted=null,fail=false,jointWrites=0;
 const items=[{id:'west',key:18.1,x:19,z:13.65},{id:'east',key:23.9,x:23,z:17.65}].flatMap(t=>[-1,1].map(side=>({
  id:`china-tavern-dining-${t.key}-${side}`,kind:'chair',position:[t.x,.215,t.z+side*1.55],anchor:[t.x,.215,t.z+side*1.045],
  center:[t.x,.215,t.z+side*1.045],seatY:.9,yaw:side===1?Math.PI:0}))).concat(['lan','zhu'].map((id,i)=>({
   id:'china-tavern-bed-'+id,kind:'bed',position:[18+i*5,4.015,19.5],anchor:[18+i*5,4.015,18.5],center:[18+i*5,4.015,18.5],supportY:4.9,yaw:0})));
 const facilities=createFacilityQueue(),furniture={items,facilities,releaseActor:id=>facilities.releaseActor(id),
  standPoint:(_nav,_extra,seat)=>new THREE.Vector3(...seat.position)};
 const doors={cameraColliders:[],routeStep(route,p,tolerance){while(route[0]&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<=tolerance)route.shift();return {waypoint:route[0],waiting:false,phase:'walking'};}};
 const reservations=new Map(saved?.reservations||[]),needs=new Map(npcs.map(n=>[n.station.id,{seekMeal:false,seekToilet:false}]));
 const sharedNeeds={status:id=>needs.get(id),has:()=>true,hunger:()=>0,register:()=>true,mealReceipts:()=>{}};
 const nsource=id=>{const n=byId(id);return n&&{actorId:id,name:n.station.npcName,bodyId:n.root.userData.bodyId,bodyRevision:null,ageYears:29,alive:n.alive,
  protected:![WEST,EAST].includes(id),currentRoleId:roles.assistant===id?ROLES.assistant.roleId:null};};
 const saveAtomic=patch=>{if(fail)return false;Object.assign(game,copy(patch));jointWrites++;return true;};
 scene=createTavernServiceScene({npcs,lot:{group,bounds:{minX:10,maxX:30,minZ:0,maxZ:25},colliders:[],cameraColliders:[]},furniture,doors,
  planPath:(_from,to)=>[{...to}],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;return {bodyBlocked:false};},
  poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,worldSeed:1,sharedNeeds,
  getKitchenRole:r=>({holderId:roles[r],actor:byId(roles[r]),reliefActor:null,available:!!roles[r],alive:!!roles[r],isPlayer:false,revision}),
  getRecruitment:()=>runtime,saveState:next=>{if(fail)return false;game.chinaServiceWorld=copy(next);return true;}});
 if(game.chinaServiceWorld)assert(scene.restoreWorld(game.chinaServiceWorld));else {
  assert(scene.initializeWorld());const seed=scene.snapshot();
  // Explicit original-guest budget fixture avoids adding a second lodging route
  // to this custody regression. The scene spends these same purses once.
  for(const v of seed.visitors){v.copper=v.id===WEST?6:8;seed.orders.find(o=>o.customerId===v.id).customerCopper=v.copper;}
  assert(scene.restoreWorld(seed));
 }
 runtime=createChinaTavernRecruitment({saved:game.chinaTavernRecruitment,getClock:()=>clock,getHiring:()=>hiring,
  readOwner:()=>owner,readCandidate:nsource,readSlot:()=>({roleId:ROLES.assistant.roleId,slotId:ROLES.assistant.slotId,revision,holderId:roles.assistant,tenureHolderId:null}),
  readActor:byId,readActorState:scene.recruitmentActorState,
  readPlayerState:()=>({actorId:'player',position:player.root.position.toArray(),inScene:true,standing:true,busy:false,mounted:false}),
  releaseCustomer:scene.releaseRecruitmentCustomer,returnCustomer:scene.returnRecruitmentCustomer,
  resolveMeetingPoint:scene.resolveRecruitmentMeetingPoint,moveTo:scene.moveRecruitmentActor,stopMove:scene.stopRecruitmentMove,
  claimTable:scene.claimRecruitmentTable,tableClaimValid:scene.recruitmentTableClaimValid,releaseTable:scene.releaseRecruitmentTable,
  canWorkTable:scene.canRecruitmentWorkTable,faceWorkTarget:scene.faceRecruitmentWork,canSeeOwner:()=>true,onInspect:()=>{},
  saveState:next=>saveAtomic({chinaTavernRecruitment:next}),verifyTableWork:scene.verifyRecruitmentTableWork,
  commitTableWork:(proof,c,next)=>{const p=scene.prepareRecruitmentTableWork({proof,candidate:c});if(!p.ok||!p.lock())return false;
   try{return p.save(saveAtomic,next)&&p.committed();}finally{assert(p.release());}},
  reserveTrial:a=>{const receipt={id:a.id+':reserve',applicationId:a.id,amount:12,seconds:clock.seconds};reservations.set(receipt.id,receipt);return receipt;},
  verifyMoneyReceipt:(kind,p)=>kind==='reservation'&&JSON.stringify(reservations.get(p.id))===JSON.stringify(p),payTrial:()=>false,releaseTrialReservation:()=>true,
 });
 hiring=createChinaTavernHiring({saved:game.chinaTavernHiring,readOwner:()=>owner,
  readCandidate:id=>({...nsource(id),...runtime.willingness(id)}),readSlot:()=>({roleId:ROLES.assistant.roleId,slotId:ROLES.assistant.slotId,revision,holderId:roles.assistant,tenureHolderId:null}),
  verifyQualification:()=>false,verifyTrialReceipt:runtime.verifyTrialReceipt,readSafeHandoff:()=>null,
  saveState:next=>saveAtomic({chinaTavernHiring:next})});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;beginActorNavigationStep(.1);scene.update(.1,clock.seconds);runtime.update(.1);for(const id of[WEST,EAST])scene.animateRecruitmentActor(id,clock.seconds);}};
 const row=()=>runtime.candidate(WEST)||runtime.state().candidates.findLast(c=>c.actorId===WEST);
 const until=(fn,label)=>{for(let i=0;i<8000&&!fn();i++)tick();assert(fn(),label+': '+JSON.stringify({runtime:runtime.state(),scene:scene.state()}));};
 const vacate=()=>{roles.assistant=null;revision++;};
 const prepare=()=>{until(()=>scene.snapshot().orders.every(o=>o.stage==='done'),'original meal plates fully washed');vacate();until(()=>row()?.phase==='meeting','existing guest life sampler elects application and actor walks to public meeting');
  player.root.position.fromArray(row().meeting.position);player.root.position.x-=1.2;assert(runtime.executeIntent(runtime.intent(row().applicationId,'trial')));};
 const snapshot=()=>({game:{...copy(game),chinaTavernRecruitment:runtime.snapshot(),chinaTavernHiring:hiring.snapshot(),chinaServiceWorld:scene.snapshot()},
  seconds:clock.seconds,assistant:roles.assistant,slotRevision:revision,positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()])),reservations:[...reservations]});
 return {game,scene,runtime,hiring,npcs,byId,player,items,facilities,clock,needs,tick,row,until,prepare,vacate,snapshot,
  fail:value=>fail=value,employ:id=>{roles.assistant=id;revision++;},mount:seat=>{mounted=seat;},get jointWrites(){return jointWrites;}};
}

// The original meal and its physical dish must finish before the guest can be
// yielded. Selection then passes through the existing idle personality sampler.
const f=fixture(),original=f.byId(WEST),initialOrder=f.scene.snapshot().orders.find(o=>o.customerId===WEST).id;
assert.equal(f.scene.recruitmentCustomerAvailable(original),false);
assert.equal(f.scene.releaseRecruitmentCustomer(WEST,{id:'unproven'}),null);
f.prepare();assert.strictEqual(f.byId(WEST),original);assert(f.scene.snapshot().orders.find(o=>o.id===initialOrder)?.consumed);
assert.equal(f.scene.snapshot().visitors.find(v=>v.id===WEST).copper,0);assert.equal(f.scene.snapshot().till,14);
assert(f.scene.state().staffLife.events.some(e=>e.actorId===WEST&&e.event==='external:tavern-assistant-application'));
assert(f.runtime.owns(WEST));assert(!f.scene.owns(original));
const before=original.root.position.clone();f.scene.update(.1,f.clock.seconds);assert(before.equals(original.root.position),'guest scene cannot move recruitment-held body');
assert(f.scene.recruitmentLeaseValid(WEST,f.row().lease,f.row()));

// Claim names the real original table; no fictitious facilities are created.
// Completion atomically clears original dirt and records the same source proof.
f.until(()=>f.row().phase==='cleaning','actual first table arrival');assert.equal(f.row().progress.elapsed,0);
const claim=f.row().tableClaim;assert.equal(claim.worldTableId,'west');assert.equal(claim.tableId,TABLES[0].id);
assert(f.scene.recruitmentTableHeld('west'));assert(!f.facilities.state().some(s=>s.id===TABLES[0].id));
assert(f.scene.snapshot().tables.find(t=>t.id==='west').dirty);
f.tick(49);assert.equal(f.row().steps.length,0);f.fail(true);f.tick(3);
assert.equal(f.row().steps.length,0);assert.equal(f.runtime.snapshot().pending.length,1);
assert(f.scene.snapshot().tables.find(t=>t.id==='west').dirty);assert.equal(f.scene.snapshot().recruitmentTableReceipts,undefined);
const pending=copy(f.runtime.snapshot().pending[0].receipt),cold=f.snapshot();
const g=fixture(cold);assert.equal(g.runtime.loadError,null);assert(g.scene.recruitmentTableHeld('west'),'cold pending proof keeps original table claim');
g.tick();assert.equal(g.row().steps.length,1);assert(!g.scene.snapshot().tables.find(t=>t.id==='west').dirty);
assert(verifySavedRecruitmentTableWork(g.scene.snapshot(),pending));assert(g.scene.verifyRecruitmentTableWork(pending));
assert.equal(g.scene.snapshot().recruitmentTableReceipts.length,1);assert.equal(g.game.chinaTavernRecruitment.sources.filter(e=>e.kind==='table-work').length,1);
assert.equal(g.byId(WEST).root.userData.bodyId,WEST);assert.equal(g.scene.snapshot().visitors.find(v=>v.id===WEST).copper,0);
g.until(()=>g.row().phase==='review','same actor completes east table and returns');
assert.equal(g.scene.snapshot().recruitmentTableReceipts.length,2);assert(g.scene.snapshot().tables.every(t=>!t.dirty));
assert(g.hiring.application(g.row().applicationId).trial.work);assert.equal(g.hiring.application(g.row().applicationId).trial.payment,null);
assert(g.scene.snapshot().recruitmentTableReceipts.every(p=>p.completedSeconds-p.startedSeconds>=5&&p.startedSeconds>700000));
assert.equal(g.scene.snapshot().till,14,'trial cleaning never manufactures sales or wages');

// Cancellation returns the original identity/purse/order history without a
// position reset; the unchanged guest loop may then choose its ordinary life.
const work=copy(g.scene.snapshot().recruitmentTableReceipts),position=g.byId(WEST).root.position.clone();
assert(g.runtime.cancel(WEST));g.runtime.update(.1);assert.equal(g.row().phase,'returned');assert(position.equals(g.byId(WEST).root.position));
assert(!g.runtime.owns(WEST));assert(g.scene.owns(g.byId(WEST)));assert.deepEqual(g.scene.snapshot().recruitmentTableReceipts,work);

// A real job binding excludes original guest updates even after source custody
// ends. Historical kitchen membership survives dismissal without retyping old
// paid guest orders or resetting that visitor's finite purse.
g.employ(WEST);g.tick();assert.equal(g.scene.kitchenRole('assistant').actor,g.byId(WEST));
assert(g.scene.snapshot().kitchenPeople.includes(WEST));assert(!g.scene.recruitmentCustomerAvailable(g.byId(WEST)));
const visits=g.scene.snapshot().visitors.find(v=>v.id===WEST).visits;g.tick(100);
assert.equal(g.scene.snapshot().visitors.find(v=>v.id===WEST).visits,visits);assert.equal(g.scene.snapshot().visitors.find(v=>v.id===WEST).copper,0);
const hired=fixture(g.snapshot());assert.equal(hired.scene.state().loadError,null);assert.equal(hired.scene.snapshot().visitors.find(v=>v.id===WEST).copper,0);
hired.vacate();hired.tick();assert(hired.scene.recruitmentCustomerAvailable(hired.byId(WEST)));

// A runtime-only forged completed receipt cannot load without its independent
// original table result, and suspend keeps the same pending application.
const malformed=g.snapshot();malformed.game.chinaServiceWorld.recruitmentTableReceipts=[];
assert(fixture(malformed).runtime.loadError);
const s=fixture();s.prepare();s.until(()=>s.row().phase==='cleaning','suspend fixture arrival');s.tick(15);
const saved=s.snapshot(),applicationId=s.row().applicationId;s.runtime.dispose({suspend:true});
assert.equal(s.hiring.application(applicationId).status,'submitted');const resumed=fixture(saved);
assert.equal(resumed.row().applicationId,applicationId);assert(resumed.runtime.willingness(WEST).willing);
const elapsed=resumed.row().progress.elapsed;resumed.clock.seconds+=10000;resumed.runtime.update(.1);
assert(resumed.row().progress.elapsed<=elapsed+.100001,'offline global clock jump earns at most this actual frame');
console.log('china tavern recruitment scene: original guest custody, real table outcomes and atomic source fixtures passed (not full-main proof)');
