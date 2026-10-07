// Lifecycle invalidation releases a saved fixture without moving its occupant.
// Existing physical interruption and completed outbox receipts keep their rules.
import assert from 'node:assert/strict';
import {createDailyToilet} from '../source/game/daily-toilet.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const P={id:'test-wc',roomId:'washroom',receiptSource:'test-toilet',intentId:'test-toilet',provider:'test',name:'净室',approach:[0,0,1],anchor:[1,.25,1],seatY:.8,yaw:1,seconds:.3,closures:['door']};
const actor=(id,p)=>({station:{id},root:{position:{x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}},rotation:{y:2}},walking:false,route:[],alive:true});
function fixture(saved={},withPredicate=true){
 const staff=actor('staff',[-5,0,-5]),player=actor('player',[-4,0,-4]),other=actor('other',[-3,0,-3]),bounds={minX:-10,maxX:10,minZ:-10,maxZ:10};
 const f={staff,player,other,durable:copy(saved),events:[],writes:0,reject:false,rejectCompletion:false,present:true,colliders:[]};
 const options={facility:P,lot:{bounds,colliders:f.colliders,walkableSurfaces:[{...bounds,y:0}],explorationTargets:[{id:P.id,position:P.approach}],interiorRooms:[{id:P.roomId,minX:.5,maxX:1.5,minZ:.5,maxZ:1.5}]},doors:{getState:()=>[{id:'door',kind:'door',fraction:0}],cameraColliders:[]},getPlayer:()=>player,getActors:()=>f.present?[staff,other]:[other],getClock:()=>({day:4,hour:12}),saveState:next=>{if(f.reject==='throw')throw Error('storage-unavailable');if(f.reject)return false;f.durable=copy(next);f.writes++;return true;},onCompleted:r=>{f.events.push(copy(r));return !f.rejectCompletion;},...(withPredicate?{isActorAlive:n=>n.alive!==false}:{})};
 f.reload=(snapshot=f.durable)=>f.service=createDailyToilet({...options,saved:copy(snapshot)});
 f.tick=(count=1)=>{for(let i=0;i<count;i++)f.service.update(.1);};
 f.mount=()=>{staff.root.position.set(...P.approach);assert(f.service.requestActor(staff));assert(f.service.updateActor(staff,.1));assert(f.service.actorPose(staff));};
 f.blockExit=()=>f.colliders.push({minX:-2,maxX:2,minY:0,maxY:2,minZ:-1,maxZ:3});
 f.reload();return f;
}
const unchanged=(f,before)=>assert.deepEqual({position:f.staff.root.position.toArray(),yaw:f.staff.root.rotation.y,walking:f.staff.walking,route:f.staff.route},before);
const physical=f=>copy({position:f.staff.root.position.toArray(),yaw:f.staff.root.rotation.y,walking:f.staff.walking,route:f.staff.route});

const rejected=fixture();rejected.staff.alive=false;assert(!rejected.service.requestActor(rejected.staff));assert.equal(rejected.writes,0);assert.equal(rejected.service.actorPose(rejected.staff),null);
const route=fixture();assert(route.service.requestActor(route.staff));route.staff.walking=true;route.staff.route=[[2,0,1]];route.staff.alive=false;const onRoute=physical(route);let travelCalls=0;
assert(route.service.updateActor(route.staff,.1,{travel:()=>travelCalls++}));assert.equal(travelCalls,0);unchanged(route,onRoute);assert(!route.service.active(null));assert.equal(route.durable.pending,null);assert.equal(route.durable.lastOutcome.status,'cancelled');assert.equal(route.events.length,0);

const mounted=fixture();mounted.mount();mounted.blockExit();mounted.staff.alive=false;const seated=physical(mounted);assert.equal(mounted.service.actorPose(mounted.staff),null);mounted.tick();unchanged(mounted,seated);assert(!mounted.service.ownsActor(mounted.staff));assert.equal(mounted.durable.pending,null);assert.equal(mounted.events.length,0);
const cancelDead=fixture();cancelDead.mount();cancelDead.staff.alive=false;const deadPosition=physical(cancelDead);assert(cancelDead.service.cancel('lifecycle', 'staff'));unchanged(cancelDead,deadPosition);assert.equal(cancelDead.durable.lastOutcome.reason,'lifecycle');
console.log('PASS dead reserve, approach, mounted update and ordinary cancel produce no motion, pose or relief');

for(const failure of [true,'throw']){
 const f=fixture();f.mount();const durable=copy(f.durable),before=physical(f);f.reject=failure;
 assert(!f.service.abandonActor('staff','role-released'));assert.deepEqual(f.durable,durable);assert(f.service.active('staff'));assert(f.service.ownsActor(f.staff));assert.equal(f.service.actorPose(f.staff),null);
 f.tick(5);assert(!f.service.updateActor(f.staff,.1,{travel:()=>assert.fail('abandoned actor routed')}));assert(!f.service.requestActor(f.other));unchanged(f,before);assert.equal(f.events.length,0);
 f.reject=false;f.tick();unchanged(f,before);assert.equal(f.durable.pending,null);assert.equal(f.durable.lastOutcome.reason,'role-released');assert.equal(f.service.state().lastError,null);assert(!f.service.active(null));
 const writes=f.writes;assert(f.service.abandonActor('staff'));assert.equal(f.writes,writes,'successful abandonment is idempotent');assert(!f.service.requestActor(f.other),'retired body still in room must clear before new admission');f.staff.root.position.set(-5,0,-5);assert(f.service.requestActor(f.other));
}
const deadFailure=fixture();deadFailure.mount();deadFailure.staff.alive=false;deadFailure.reject=true;const beforeFailedDeath=physical(deadFailure);deadFailure.tick();assert(deadFailure.service.active('staff'));deadFailure.staff.alive=true;assert.equal(deadFailure.service.actorPose(deadFailure.staff),null,'failed death cancellation cannot resume when external status changes');deadFailure.tick(10);unchanged(deadFailure,beforeFailedDeath);assert.equal(deadFailure.events.length,0);deadFailure.reject=false;deadFailure.tick();assert(!deadFailure.service.active(null));
console.log('PASS failed/throwing saves retain a motionless reservation; retry, status changes and repeated abandonment cannot resume or replay it');

for(const stage of ['approaching','using','leaving']){
 const seed=fixture();stage==='approaching'?assert(seed.service.requestActor(seed.staff)):seed.mount();const saved=copy(seed.durable);saved.pending.stage=stage;
 const f=fixture(saved);f.staff.root.position.set(...(stage==='approaching'?[-5,0,-5]:P.anchor));f.staff.alive=false;f.reject=true;const before=physical(f);
 assert.equal(f.service.restorePosition('staff',P.anchor),null);f.tick();assert.deepEqual(f.durable,saved);assert(f.service.active('staff'));assert(f.service.ownsActor(f.staff));assert.equal(f.service.actorPose(f.staff),null);assert(!f.service.requestActor(f.other));unchanged(f,before);
 f.reject=false;f.tick();unchanged(f,before);assert.equal(f.durable.pending,null);assert.equal(f.durable.lastOutcome.status,'cancelled');assert.equal(f.events.length,0);
 const absent=fixture(saved);absent.present=false;assert(absent.service.abandonActor('staff','removed'));assert.equal(absent.durable.pending,null);absent.tick();assert.equal(absent.events.length,0);assert.equal(absent.durable.lastOutcome.reason,'removed');
}
const recovery=fixture();recovery.mount();const savedRecovery=copy(recovery.durable);recovery.reload();assert(recovery.service.abandonActor('staff','explicit-before-recovery'));assert.equal(recovery.durable.pending,null);assert.equal(recovery.staff.root.position.toArray()[0],P.anchor[0]);assert.equal(recovery.events.length,0);assert(savedRecovery.pending);
console.log('PASS recovery-only approach/use/exit reservations cancel before movement, including missing actors and failed-save retries');

const completed=fixture();completed.mount();completed.blockExit();completed.rejectCompletion=true;for(let i=0;i<3;i++)completed.service.updateActor(completed.staff,.1);
assert.equal(completed.durable.receipts.length,1);assert.equal(completed.durable.receipts[0].delivered,false);assert.equal(completed.durable.pending.completed,true);const completedReceipt=copy(completed.durable.receipts),eventCount=completed.events.length;completed.staff.alive=false;const completedPosition=physical(completed);
assert(completed.service.abandonActor('staff'));unchanged(completed,completedPosition);assert.deepEqual(completed.durable.receipts,completedReceipt);assert.equal(completed.events.length,eventCount,'abandonment itself never delivers relief');assert.equal(completed.durable.lastOutcome.status,'completed');
completed.reload();completed.rejectCompletion=false;completed.tick();assert.equal(completed.durable.receipts.length,1);assert.equal(completed.durable.receipts[0].id,completedReceipt[0].id);assert.equal(completed.durable.receipts[0].delivered,true);assert.equal(completed.events.at(-1).actorId,'staff');
console.log('PASS completed receipts remain attributable and retryable; lifecycle cleanup creates no completion');

const alive=fixture();alive.mount();assert(alive.service.cancel()); // Default cancel targets the player, so staff remains mounted.
assert(alive.service.active('staff'));assert(alive.service.cancel('ordinary','staff'));assert.deepEqual(alive.staff.root.position.toArray(),P.approach);assert.equal(alive.events.length,0);
const defaultAlive=fixture({},false);defaultAlive.staff.alive=false;defaultAlive.mount();assert(defaultAlive.service.actorPose(defaultAlive.staff));assert(defaultAlive.service.cancel('legacy','staff'));assert.deepEqual(defaultAlive.staff.root.position.toArray(),P.approach);
console.log('PASS living cancellation and omitted liveness predicate preserve the original physical dismount');

const exitWrite=fixture();exitWrite.mount();exitWrite.reject=true;assert(!exitWrite.service.cancel('ordinary','staff'));assert(exitWrite.service.ownsActor(exitWrite.staff),'failed durable release keeps the fixture reserved after physical dismount');assert(!exitWrite.service.requestActor(exitWrite.other));assert.equal(exitWrite.events.length,0);exitWrite.reject=false;exitWrite.tick();assert(!exitWrite.service.active(null));assert.equal(exitWrite.durable.pending,null);
console.log('PASS failed durable exit cannot expose a second reservation before retry');
const lostOwner=fixture();lostOwner.mount();lostOwner.tick(205);assert(!lostOwner.service.ownsActor(lostOwner.staff));assert.equal(lostOwner.durable.lastOutcome.reason,'actor-controller-interrupted');assert.equal(lostOwner.events.length,0);
const exitWithoutOwner=fixture();exitWithoutOwner.mount();exitWithoutOwner.blockExit();assert(!exitWithoutOwner.service.cancel('interrupted','staff'));exitWithoutOwner.colliders.length=0;exitWithoutOwner.tick();assert(!exitWithoutOwner.service.ownsActor(exitWithoutOwner.staff));assert.deepEqual(exitWithoutOwner.staff.root.position.toArray(),P.approach);assert.equal(exitWithoutOwner.events.length,0);
console.log('PASS lost use-controller cancels without relief; leaving recovery is driven even without its caller');
