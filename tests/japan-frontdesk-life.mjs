// Shared-turn fairness and reception-queue recovery are durable logic; actual
// routes and poses are checked once by the bounded main/controller scenario.
import assert from 'node:assert/strict';
import {createJapanStaffLife,JAPAN_STAFF_CREW} from '../source/game/japan-staff-life.js';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P,JAPAN_SERVICE_WORKERS} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const actors=new Map(JAPAN_STAFF_CREW.map(id=>[id,{station:{id,npcName:id,npcAction:'tidy',workTarget:[2.8,1,-34.65],npcLabel:'清点补给木箱'},home:{toArray:()=>[1.5,0,-33]}}])),tasks=new Map(),facilities=createFacilityQueue();
const items=[{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},{id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18]}];
const board=createJapanServiceOrders(),options={actors,board,furniture:{items,facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:n=>{n.serviceMount=null;return true;},taskOf:n=>tasks.get(n.station.id)};
const upgrade=createJapanStaffLife({...options,saved:{version:1,next:1,dueIn:13,completed:8,interrupted:2}});
assert.equal(upgrade.snapshot().version,4);assert.equal(upgrade.state().nextWorkerId,'jp-sushi');assert.equal(upgrade.state().completed,8);assert.equal(upgrade.state().interrupted,2);upgrade.dispose();
const previous=createJapanStaffLife({...options,saved:{version:2,next:3,dueIn:7,completed:12}});assert.equal(previous.state().nextWorkerId,'jp-market-tea');assert.equal(previous.state().completed,12);previous.dispose();
function done(id){const t=tasks.get(id);assert.ok(t);t.arrived=true;if(t.mount)actors.get(id).serviceMount=t.mount;assert.notEqual(t.onArrive?.(),false);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);}
const life=createJapanStaffLife({...options,saved:{version:2,next:2,dueIn:0}}),turns=[];
for(let turn=0;turn<10;turn++){
 life.update(100,{night:true});const {id,reliefId}=life.state().active;turns.push(id);
 assert.equal(life.canClaim('jp-herb-workshop','prepare'),false,'Nao does not leave supplies before the pharmacy handoff');assert.equal(life.canWork(id),false);assert.equal(life.canWork(reliefId),false);
 const [a,b]=[tasks.get(id).to,tasks.get(reliefId).to];assert.ok(Math.hypot(a[0]-b[0],a[2]-b[2])>1,'Handoff participants have distinct physical work points');
 done(reliefId);assert.equal(life.state().active.phase,'handoff');done(id);life.update(.1,{night:true});
 assert.equal(tasks.get(id).action,['jp-ramen','jp-sushi'].includes(id)?'ramen':'tidy');assert.equal(board.holdWorkplace('kitchen',reliefId),false,'Only one shared kitchen owner');
 assert.equal(life.canWork(reliefId),true);assert.equal(life.canClaim('jp-herb-workshop','prepare'),id==='jp-incense','Nao prepares only during Itsuki relief');assert.equal(JAPAN_SERVICE_WORKERS.cook.includes('jp-market-tea'),false);
 done(id);life.update(.1,{night:true});assert.equal(tasks.get(id).mount.id,'staff-seat');
 done(id);life.update(.1,{night:true});done(id);life.update(.1,{night:true});assert.equal(tasks.get(id).mount.id,'staff-bed');
 done(id);life.update(.1,{night:true});done(id);
}
assert.deepEqual(turns,['jp-welcome','jp-market-tea','jp-incense','jp-herb-workshop','jp-onsen','jp-steam','jp-women-onsen','jp-rest','jp-ramen','jp-sushi']);assert.equal(life.state().completed,10);assert.equal(life.state().nextWorkerId,'jp-welcome');
life.update(100,{night:true});done('jp-market-tea');done('jp-welcome');life.update(.1,{night:true});done('jp-welcome');life.update(.1,{night:true});
life.playerRequest('staff-seat');life.update(.1,{night:true});done('jp-welcome');assert.equal(life.state().nextWorkerId,'jp-market-tea','Interrupted completed return yields the shared turn fairly');
life.update(100,{night:true});const snapshot=life.snapshot();assert.equal('active' in snapshot,false);life.dispose();tasks.clear();
const restored=createJapanStaffLife({...options,saved:snapshot});restored.update(.1,{night:true});assert.equal(restored.state().active.id,'jp-market-tea');assert.equal(facilities.state().some(f=>f.reservations.length||f.queue.length),false,'Re-entry retains counters/turn but no physical locks');restored.dispose();board.dispose();
// Waiting customers keep FIFO order; a departing queued player cannot wedge it.
const seats=[{id:'rest',kind:'seat',center:[-7.7,3.8,7.55],anchor:[-7.7,3.8,7.39]}],q=createFacilityQueue(),orders=createJapanServiceOrders();
const player={root:{position:{x:P.playerReception[0],y:0,z:P.playerReception[2]},userData:{appearance:{bodyPreset:'masculine-lean'}}}};
const service=createJapanPlayerService({board:orders,furniture:{items:seats,facilities:q,releaseActor:id=>q.releaseActor(id)},getPlayer:()=>player});
assert.ok(q.request('japan-service-reception','older-guest'));service.register('cloud-leaf');const queued=service.state().visit.id;assert.equal(service.state().visit.stage,'arriving');assert.equal(q.request('japan-service-reception','later-guest'),false);
player.root.position.z=12;service.update(.1);assert.equal(service.state().visit,null);assert.equal(q.state()[0].queue.includes(queued),false);q.release('japan-service-reception','older-guest');assert.ok(q.request('japan-service-reception','later-guest'));
q.release('japan-service-reception','later-guest');player.root.position.z=P.playerReception[2];service.register('cloud-leaf');const pending=service.state().visit.id,job=orders.jobs().find(j=>j.visitId===pending);assert.ok(orders.claim(job.id,'jp-market-tea'));service.cancel();assert.equal(orders.state().claims.length,0);assert.equal(q.state()[0].owner,null);
service.register('cloud-leaf');const retained=service.state().visit.id;service.suspend();assert.equal(orders.state().claims.length,0);assert.equal(q.state()[0].owner,null);assert.equal(orders.getVisit(retained).present,false);orders.dispose();q.dispose();
console.log('PASS: ten fair turns, supply role and pharmacy eligibility, distinct counter handoff, self-service eligibility, old-save upgrade, interruption, FIFO cancellation and exit cleanup');
