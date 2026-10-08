// Focused controller regressions with real Three roots and explicit source/lease
// fixtures. This is NOT production main, dining-scene, payroll or rendered proof.
// Protects actual elapsed work, original actor control, cold continuity and
// atomic owner adoption from timer-only qualification or guessed money receipts.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {createChinaTavernRecruitment,TAVERN_RECRUITMENT_TABLES as TABLES} from '../source/game/china-tavern-recruitment.js';
import {createChinaTavernHiring,TAVERN_HIRING_BUSINESS_ID as BUSINESS,TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
registerHooks({resolve(specifier,context,next){return specifier==='three' ?
 {url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true} : next(specifier,context);}});
const {createTavernStaffLife}=await import('../source/game/china-tavern-staff-life.js');
const copy=structuredClone,WEST='cn-tavern-diner-west',EAST='cn-tavern-diner-east';
const equal=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
function body(id,xyz) {const root=new THREE.Group();root.position.fromArray(xyz);return {root,station:{id},walking:false,route:[],alive:true};}
function fixture(saved={},world=null) {
 const flags={save:false,pay:false,reserve:false,release:false,los:true,ownerBusy:false,actorBusy:false,held:false,needs:false,
  inScene:true,standing:true,carried:false,orderSafe:true,workSafe:true,tableSafe:true,travel:true,face:true};
 world??={owner:{ownerId:'player',ownership:2},slot:{roleId:ROLES.assistant.roleId,slotId:ROLES.assistant.slotId,revision:3,holderId:null,tenureHolderId:null},
  people:{[WEST]:{actorId:WEST,name:'顾谨',bodyId:WEST,bodyRevision:1,ageYears:29,alive:true,protected:false,currentRoleId:null},
   [EAST]:{actorId:EAST,name:'周棠',bodyId:EAST,bodyRevision:1,ageYears:29,alive:true,protected:false,currentRoleId:null}},
  actors:{[WEST]:body(WEST,[21,.215,11]),[EAST]:body(EAST,[22,.215,12])},
  player:body('player',[22.35,.215,6.7]),leases:new Map(),claims:new Map(),tableProofs:new Map(),reservations:new Map(),payments:new Map(),
  seconds:765432,business:120,bank:{[WEST]:0,[EAST]:0},releaseCalls:0,returnCalls:0,moveCalls:0,inspections:0,cleanTicks:0};
 const store=copy(saved);let hiring;
 const runtime=createChinaTavernRecruitment({saved:store.recruitment,
  saveState:next=>{if(flags.save)return false;store.recruitment=copy(next);return true;},getHiring:()=>hiring,
  getClock:()=>({seconds:world.seconds}),
  commitTableWork:(proof,_candidate,next)=>{if(flags.save)return false;store.recruitment=copy(next);world.tableProofs.set(proof.id,copy(proof));return true;},
  verifyTableWork:proof=>equal(world.tableProofs.get(proof.id),proof),
  readOwner:()=>copy(world.owner),readCandidate:id=>copy(world.people[id]??null),readSlot:()=>copy(world.slot),
  readActor:id=>world.actors[id],
  readActorState:(id,c)=>({bodyId:world.people[id]?.bodyId,bodyRevision:world.people[id]?.bodyRevision,alive:world.people[id]?.alive,
   inScene:flags.inScene,standing:flags.standing,busy:flags.actorBusy,sociallyHeld:flags.held,hasCarriedObjects:flags.carried,
   originalOrderSafe:flags.orderSafe,customerLeaseValid:equal(world.leases.get(id),c.lease),needsCustomerControl:flags.needs}),
  readPlayerState:()=>({actorId:'player',inScene:true,standing:true,busy:flags.ownerBusy,mounted:false,position:world.player.root.position.toArray()}),
  resolveMeetingPoint:()=>({id:'fixture-public-reception',position:[22.35,.215,6.7]}),
  releaseCustomer:(id,c)=>{world.releaseCalls++;if(flags.release || flags.needs || flags.actorBusy || flags.carried || !flags.orderSafe)return null;
   const lease={id:'original-guest-release:'+c.id,actorId:id,bodyId:c.bodyId,ownership:c.owner.ownership};world.leases.set(id,copy(lease));return lease;},
  returnCustomer:(id,lease)=>{assert(equal(world.leases.get(id),lease));world.returnCalls++;world.leases.delete(id);return true;},
  moveTo:(id,target,dt)=>{world.moveCalls++;const a=world.actors[id];a.walking=false;if(!flags.travel)return false;
   const delta=new THREE.Vector3(...target.position).sub(a.root.position),distance=delta.length();
   if(distance>.025){a.root.position.addScaledVector(delta.normalize(),Math.min(distance,dt*2));a.walking=distance>dt*2+.025;}
   return !a.walking;},
  stopMove:id=>{world.actors[id].walking=false;world.actors[id].route=[];},
  faceWorkTarget:(id,p)=>{if(flags.face){const a=world.actors[id];a.root.rotation.y=Math.atan2(p[0]-a.root.position.x,p[2]-a.root.position.z);world.cleanTicks++;}},
  claimTable:(id,t,c)=>{if(!flags.tableSafe || world.claims.has(t.id))return null;const claim={id:c.id+':claim:'+t.id,actorId:id,tableId:t.id};world.claims.set(t.id,copy(claim));return claim;},
  tableClaimValid:(id,claim,t)=>flags.tableSafe && equal(world.claims.get(t.id),claim) && claim.actorId===id,
  releaseTable:(id,claim)=>{if(equal(world.claims.get(claim.tableId),claim))world.claims.delete(claim.tableId);return true;},
  canWorkTable:()=>flags.workSafe,canSeeOwner:()=>flags.los,onInspect:()=>{world.inspections++;},
  reserveTrial:a=>{if(flags.reserve)return null;const id=a.trial.request.id+':reservation';if(world.reservations.has(id))return copy(world.reservations.get(id));
   if(world.business<12)return null;world.business-=12;const r={id,applicationId:a.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,amount:12,funding:'business'};
   world.reservations.set(id,copy(r));return r;},
  payTrial:(a,reservation,work)=>{if(flags.pay)return false;const id=a.trial.request.remuneration.id;if(world.payments.has(id))return copy(world.payments.get(id));
   assert(runtime.verifyTrialReceipt('work',work,a));assert(equal(world.reservations.get(reservation.id),reservation));
   const p={...a.trial.request.remuneration,sourceId:'business-fixture',sourceRevision:8,trialId:a.trial.request.id};
   world.payments.set(id,copy(p));world.bank[a.actor.actorId]+=12;return p;},
  verifyMoneyReceipt:(kind,p)=>equal((kind==='reservation'?world.reservations:world.payments).get(p.id),p),
  releaseTrialReservation:(a,r)=>{if(world.reservations.has(r.id)){world.reservations.delete(r.id);world.business+=12;}return true;},
 });
 hiring=createChinaTavernHiring({saved:store.hiring,saveState:next=>{store.hiring=copy(next);return true;},
  readOwner:()=>copy(world.owner),readCandidate:id=>({...copy(world.people[id]),...runtime.willingness(id)}),readSlot:()=>copy(world.slot),
  verifyTrialReceipt:runtime.verifyTrialReceipt,verifyQualification:()=>false,
  readSafeHandoff:a=>({id:a.id+':handoff',sourceId:'physical-handoff-fixture',sourceRevision:1,businessId:BUSINESS,
   applicationId:a.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,slotId:a.slotId,slotRevision:a.slotRevision,
   customerReleaseReceiptId:world.leases.get(a.actor.actorId)?.id,destinationReleaseReceiptId:a.id+':destination-release'}),
 });
 const row=(id=WEST)=>runtime.state().candidates.findLast(c=>c.actorId===id);
 const tick=(count=1,dt=.1)=>{for(let i=0;i<count;i++){world.seconds+=dt;runtime.update(dt);}};
 const until=(predicate,label='expected controller state')=>{for(let i=0;i<1600 && !predicate();i++)tick();assert(predicate(),label+': '+JSON.stringify(runtime.state()));};
 const choose=(id=WEST)=>{const choice=runtime.additionalChoices(id)[0];assert(choice);assert(runtime.acceptChoice(id,{...choice,startedAt:14}));return row(id);};
 const meeting=()=>{choose();until(()=>row().phase==='meeting');return row().applicationId;};
 const act=kind=>runtime.executeIntent(runtime.intent(row().applicationId,kind));
 const trial=()=>{meeting();assert(act('trial'));return row().applicationId;};
 const finish=()=>{trial();until(()=>row().phase==='review');return row().applicationId;};
 return {runtime,hiring,world,flags,store,row,tick,until,choose,meeting,act,trial,finish};
}

// Genuine life selection is the sole application entry; no forced skill source.
{
 const f=fixture(),n=f.world.actors[WEST];
 const life=createTavernStaffLife({actors:[n],furniture:{items:[],facilities:{state:()=>[]},releaseActor:()=>{}},
  getPlayer:()=>f.world.player,getMounted:()=>null,getClock:()=>({hour:10}),worldSeed:1,
  travel:(a,p,dt)=>{const delta=new THREE.Vector3(...p).sub(a.root.position),d=delta.length();
   if(d>.03)a.root.position.addScaledVector(delta.normalize(),Math.min(d,dt*2));return d<=dt*2+.03;},
  unmount:()=>true,effect:()=>{},getAdditionalChoices:a=>f.runtime.additionalChoices(a.station.id),
  onExternalChoice:(a,c)=>f.runtime.acceptChoice(a.station.id,c)});
 for(let i=0;i<5000 && !f.row();i++){life.tick(.1);life.update(n,.1,i*.1);}
 assert(f.row(),'existing personality sampler must dispatch external application without choice.target');
 assert(life.state().events.some(e=>e.event==='external:tavern-assistant-application'));
 assert.equal(life.socialProfile(WEST).current,null);assert(f.runtime.willingness(WEST).willing);
 life.dispose();
}
{
 const f=fixture();assert.deepEqual(f.runtime.additionalChoices('cn-clinic-physician'),[]);
 const c=f.runtime.additionalChoices(WEST)[0];assert(!f.runtime.acceptChoice(WEST,c));
 assert(!f.runtime.acceptChoice(WEST,{...c,startedAt:3,ownership:7}));
 f.flags.save=true;assert(!f.runtime.acceptChoice(WEST,{...c,startedAt:3}));assert.equal(f.runtime.state().sources.length,0);
 f.flags.save=false;f.choose();assert.equal(f.runtime.willingness(WEST).willing,true);
 assert.deepEqual(f.runtime.additionalChoices(WEST),[]);assert.equal(f.world.releaseCalls,0);
 assert.equal(f.runtime.state().sources[0].kind,'willingness');
}
for(const field of ['release','actorBusy','carried']) {
 const f=fixture();f.flags[field]=true;f.choose();const before=f.world.actors[WEST].root.position.clone();f.tick(100);
 assert.equal(f.row().phase,'waiting-release');assert(before.equals(f.world.actors[WEST].root.position));assert.equal(f.hiring.applications().length,0);
 f.flags[field]=false;f.until(()=>f.row().phase==='meeting');
}

// The actual public meeting gates every owner decision and rendering visibility
// never removes the standing player's right to make one.
{
 const f=fixture(),id=f.meeting(),original=f.world.actors[WEST];assert(f.world.moveCalls>1);
 assert.equal(f.hiring.application(id).actor.bodyId,WEST);assert.equal(f.row().reservation,null);
 f.world.player.root.visible=false;assert(f.act('inspect'));assert.equal(f.world.inspections,1);
 const stale=f.runtime.intent(id,'trial');f.world.player.root.position.x+=10;assert(!f.runtime.executeIntent(stale));
 f.world.player.root.position.x-=10;f.flags.ownerBusy=true;assert(!f.act('trial'));f.flags.ownerBusy=false;
 f.flags.los=false;assert(!f.act('trial'));f.flags.los=true;
 f.flags.reserve=true;assert(f.act('trial'));f.tick(100);assert.equal(f.row().phase,'meeting');assert.equal(f.row().steps.length,0);
 f.flags.reserve=false;f.tick();assert.equal(f.row().phase,'to-table');assert.equal(f.world.business,108);assert.strictEqual(f.world.actors[WEST],original);
 assert(!f.runtime.executeIntent(stale));assert.equal(f.world.bank[WEST],0);
}

// No distant, arriving, mounted, carried, occluded or offline seconds count.
{
 const f=fixture();f.trial();f.flags.travel=false;f.tick(200);assert.equal(f.row().progress.elapsed,0);
 f.flags.travel=true;f.until(()=>f.row().phase==='cleaning');assert.equal(f.row().progress.elapsed,0);
 f.tick(1,600);assert.equal(f.row().progress.elapsed,0);
 f.tick(20);assert(f.row().progress.elapsed>1.9 && f.row().progress.elapsed<2.1);
 f.flags.held=true;const elapsed=f.row().progress.elapsed;f.tick(200);assert.equal(f.row().progress.elapsed,elapsed);assert.equal(f.world.claims.size,0);
 f.flags.held=false;f.until(()=>f.row().steps.length===1);assert.equal(f.row().steps[0].tableId,TABLES[0].id);
 assert(f.row().steps[0].completedSeconds-f.row().steps[0].startedSeconds>=5);assert.equal(f.row().progress.elapsed,0);
 f.until(()=>f.row().phase==='cleaning');f.flags.workSafe=false;f.tick(70);assert.equal(f.row().steps.length,1);
 f.flags.workSafe=true;f.until(()=>f.row().phase==='review');
 const a=f.hiring.application(f.row().applicationId);assert(a.trial.work);assert.equal(a.trial.work.steps.length,2);
 assert(a.trial.work.steps[0].startedSeconds>765432,'payroll interval uses the global simulation clock');
 assert.equal(f.runtime.state().sources.filter(e=>e.kind==='table-work').length,2);
 assert(f.runtime.state().sources.filter(e=>e.kind==='table-work').every(e=>e.receipt.activeSeconds===5));
 assert(f.runtime.verifyTrialReceipt('work',a.trial.work,a));
 const fake=copy(a.trial.work);fake.steps[0].completedSeconds++;assert(!f.runtime.verifyTrialReceipt('work',fake,a));
}
for(const flag of ['standing','face']) {
 const f=fixture();f.trial();f.until(()=>f.row().phase==='cleaning');f.flags[flag]=false;
 if(flag==='face')f.world.actors[WEST].root.rotation.y=0;
 f.tick(90);assert.equal(f.row().steps.length,0);assert.equal(f.row().progress.elapsed,0);
 f.flags[flag]=true;f.until(()=>f.row().steps.length===1);
}

// Actual needs release the body, preserve application consent and completed work,
// then reacquire a fresh valid lease without rolling another willingness choice.
{
 const f=fixture();f.trial();f.until(()=>f.row().steps.length===1);const id=f.row().applicationId,w=f.runtime.willingness(WEST);
 f.flags.needs=true;f.tick();assert.equal(f.row().phase,'paused');assert(!f.runtime.owns(WEST));assert.equal(f.world.returnCalls,1);
 f.tick(30);assert.equal(f.row().steps.length,1);assert.deepEqual(f.runtime.willingness(WEST),w);
 f.flags.needs=false;f.until(()=>f.row().phase==='review');assert.equal(f.row().applicationId,id);assert.equal(f.hiring.applications().length,1);
}

// Cold save at the same physical wipe checkpoint resumes only after a fresh
// arrival guard. A moved body must redo that unfinished table; earned work stays.
{
 const f=fixture();f.trial();f.until(()=>f.row().phase==='cleaning');f.tick(20);
 const snapshot={recruitment:f.runtime.snapshot(),hiring:f.hiring.snapshot()},elapsed=f.row().progress.elapsed;
 const g=fixture(snapshot,f.world);assert.equal(g.runtime.loadError,null);assert.equal(g.hiring.loadError,null);
 g.tick();assert.equal(g.row().progress.elapsed,elapsed);g.until(()=>g.row().steps.length===1);
 const second={recruitment:g.runtime.snapshot(),hiring:g.hiring.snapshot()};
 g.world.actors[WEST].root.position.x+=.3;const h=fixture(second,g.world);h.until(()=>h.row().phase==='review');assert.equal(h.row().steps.length,2);
}

// Failed persistence freezes a real earned receipt rather than wiping again;
// its pending source survives ordinary snapshots/cold restart and commits once.
{
 const f=fixture();f.trial();f.until(()=>f.row().phase==='cleaning');f.tick(49);f.flags.save=true;f.tick(2);
 assert.equal(f.row().steps.length,0);assert.equal(f.runtime.snapshot().pending.length,1);
 const proof=copy(f.runtime.snapshot().pending[0].receipt),cold={recruitment:f.runtime.snapshot(),hiring:f.hiring.snapshot()};
 const g=fixture(cold,f.world);g.tick();assert.equal(g.row().steps.length,1);assert.deepEqual(g.runtime.snapshot().sources.at(-1).receipt,proof);
 g.until(()=>g.row().phase==='review');assert.equal(g.runtime.snapshot().sources.filter(e=>e.kind==='table-work').length,2);
}

// Refused payments cannot invent money or erase actual earned qualification.
{
 const f=fixture();f.flags.pay=true;const id=f.finish();f.tick(40);assert.equal(f.world.bank[WEST],0);
 assert(f.hiring.application(id).trial.work);assert.equal(f.hiring.application(id).trial.payment,null);
 assert(f.act('approve'));assert.equal(f.hiring.application(id).status,'pending-safe-handoff');
 f.flags.pay=false;f.tick();assert.equal(f.world.bank[WEST],12);f.tick(20);assert.equal(f.world.bank[WEST],12);
 assert(f.hiring.application(id).decision.salary.excludedTrial);assert.equal(f.hiring.application(id).decision.salary.baseDailyWage,16);
}

// Cancellation, scene departure, death and ownership transfer stop new labor;
// already earned source records and actor identity survive the return.
for(const change of [f=>f.runtime.cancel(WEST),f=>{f.flags.inScene=false;},f=>{f.world.people[WEST].alive=false;},
 f=>{f.world.owner.ownership++;}]) {
 const f=fixture();f.trial();f.until(()=>f.row().steps.length===1);const original=f.world.actors[WEST],id=f.row().applicationId;
 change(f);f.tick(3);assert.equal(f.row().phase,'returned');assert(!f.runtime.owns(WEST));assert.equal(f.row().steps.length,1);
 assert.strictEqual(f.world.actors[WEST],original);assert.equal(f.runtime.state().sources.filter(e=>e.kind==='table-work').length,1);
 assert.equal(f.world.bank[WEST],0);assert.equal(f.world.business,120);assert.equal(f.hiring.application(id).status,'cancelled');
}

// The exact existing actor is adopted only after ONE joint durable write. A
// failed write changes neither hiring status, slot nor controller ownership.
{
 const f=fixture(),id=f.finish();assert(f.act('approve'));
 const start=()=>({h:f.hiring.prepareHandoff({applicationId:id,by:'player',expectedRevision:f.hiring.snapshot().revision}),r:f.runtime.prepareAssigned(id)});
 let p=start();assert(p.h.ok && p.r.ok);assert(p.h.lock());assert(p.r.lock());
 assert(!p.h.save(()=>false));assert(!p.r.committed());assert(!p.h.committed());assert(p.r.release());assert(p.h.release());
 assert(f.runtime.owns(WEST));assert.equal(f.hiring.application(id).status,'pending-safe-handoff');assert.equal(f.world.slot.holderId,null);
 p=start();assert(p.h.lock());assert(p.r.lock());let joint;
 assert(p.h.save(bundle=>{joint={...copy(bundle.patch),...copy(p.r.patch),assignment:copy(bundle.assignment)};return true;}));
 assert(p.h.committed());assert(p.r.committed());f.world.slot.holderId=joint.assignment.holderId;assert(p.r.release());assert(p.h.release());
 assert.equal(f.row().phase,'assigned');assert(!f.runtime.owns(WEST));assert.equal(f.world.slot.holderId,WEST);
 assert.equal(joint.chinaTavernRecruitment.candidates[0].phase,'assigned');
 assert.equal(f.hiring.application(id).actor.bodyId,WEST);
}

// Malformed proof cannot be laundered through a saved runtime source journal.
{
 const f=fixture();f.trial();f.until(()=>f.row().phase==='cleaning');f.tick(20);
 const id=f.row().applicationId,saved={recruitment:f.runtime.snapshot(),hiring:f.hiring.snapshot()},row=saved.recruitment.candidates[0];
 row.progress.origin=[19.75,.215,13.65];f.world.actors[WEST].root.position.fromArray(row.progress.origin);f.world.claims.clear();
 const g=fixture(saved,f.world);assert.equal(g.runtime.loadError,null);assert.equal(g.row().applicationId,id);
 assert.equal(g.row().phase,'to-table');assert.equal(g.row().progress.elapsed,0);assert.equal(g.row().steps.length,0);
 assert.deepEqual(g.row().reservation,row.reservation);assert.equal(g.world.business,108,'same already funded trial is retained');
 g.until(()=>g.row().phase==='cleaning');assert.equal(g.row().progress.elapsed,0,'new approach needs fresh standing time');
 g.tick(20);assert.equal(g.row().steps.length,0,'obsolete partial seconds cannot complete the new approach');
}
{
 const f=fixture();f.finish();const saved={recruitment:f.runtime.snapshot(),hiring:f.hiring.snapshot()};
 saved.recruitment.sources.find(e=>e.kind==='table-work').receipt.activeSeconds=0;
 const g=fixture(saved,f.world);assert(g.runtime.loadError);assert(g.hiring.loadError);assert.equal(g.runtime.update(.1),false);
}
console.log('china tavern recruitment: physical controller/source fixture checks passed (not production main proof)');
