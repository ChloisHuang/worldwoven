// Focused linkage regression: two orders cannot exchange cargo, and cancelling
// or releasing a carrier must not leave a claimed job or an invisible tray.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanVisitorIdentity,isJapanEmployeeInteraction} from '../source/game/japan-visitors.js';
let saved;const board=createJapanServiceOrders({worldSeed:17,saveState:s=>saved=s});
const spawn=()=>board.spawn({...createJapanVisitorIdentity(board.nextIdentity(),17),restPoint:[-7.7,3.8,6.61],diningPoint:[-7.7,3.8,6.61]});
const a=spawn(),b=spawn();assert.notEqual(a.id,b.id);assert.equal(spawn(),null);
assert.deepEqual(board.state().visits.map(v=>v.appearance),[a.appearance,b.appearance]);
const claim=(v,kind,worker)=>{const job=board.jobs().find(j=>j.visitId===v.id&&j.kind===kind);assert(job,`${kind} is ready`);assert(board.claim(job.id,worker));return job;};
for(const v of [a,b]) {
 assert.equal(board.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId:v.poolId+'-seat-1'}),false,'No bath without an issued token, washing and delivery');
 assert(board.guestStep(v.id,'arrived',{position:P.reception}));
 const registration=claim(v,'register','jp-welcome');
 assert(board.complete(registration.id,'jp-welcome',{position:P.registrar,guestPosition:P.reception}));
 const prep=claim(v,'prepare','jp-incense');
 assert(board.complete(prep.id,'jp-incense',{position:P.apothecary}));
}
const va=board.getVisit(a.id),vb=board.getVisit(b.id),carrier=va.side==='men'?'jp-onsen':'jp-women-onsen',destination=P[va.side+'Service'];
const delivery=claim(va,'deliverMix',carrier);
const evidence={position:destination,itemId:va.mixtureId,tokenId:va.tokenId};
assert.equal(board.complete(delivery.id,carrier,evidence),false,'Must pick up the actual tray');
assert(board.pickup(delivery.id,carrier,{position:P.apothecaryPickup}));
assert.equal(board.complete(delivery.id,carrier,{...evidence,itemId:vb.mixtureId,tokenId:vb.tokenId}),false,'Cannot deliver another visit’s mixture or token');
assert(board.releaseWorker(carrier));
assert.equal(board.state().claims.length,0);
assert.deepEqual(board.state().items.find(i=>i.id===va.mixtureId).location,{type:'point',id:'apothecaryPickup'});
assert(board.claim(delivery.id,carrier));assert(board.pickup(delivery.id,carrier,{position:P.apothecaryPickup}));
// Refresh while carrying: same two identities, one tray returned, no stale lock.
const resumed=createJapanServiceOrders({saved,worldSeed:17});
assert.equal(resumed.state().visits.length,2);assert.equal(resumed.state().nextVisit,3);
assert.deepEqual(resumed.state().visits.map(v=>v.appearance),[a.appearance,b.appearance]);
assert.equal(resumed.state().claims.length,0);
assert.deepEqual(resumed.state().items.find(i=>i.id===va.mixtureId).location,{type:'point',id:'apothecaryPickup'});
assert(board.complete(delivery.id,carrier,evidence));
assert.equal(board.jobs().some(j=>j.id===delivery.id),false);
const second=board.jobs().find(j=>j.visitId===b.id&&j.kind==='deliverMix');
const worker=vb.side==='men'?'jp-onsen':'jp-women-onsen';
assert(board.claim(second.id,worker));assert(board.pickup(second.id,worker,{position:P.apothecaryPickup}));
assert(board.cancel(b.id,'guest-left'));assert.equal(board.state().claims.length,0);
assert.equal(board.jobs().some(j=>j.visitId===b.id),false);
assert(board.state().items.filter(i=>i.visitId===b.id).every(i=>i.location.type==='cancelled'));
assert.equal(board.complete(second.id,worker,{position:P[vb.side+'Service'],itemId:vb.mixtureId,tokenId:vb.tokenId}),false,'Late cancelled completion cannot revive an order');
assert.equal(board.jobs().some(j=>j.kind==='cook'),false,'Kitchen waits for the actual post-bath request');
for(const [event,position]of [['changed',P[va.side+'Changing']],['washed',P[va.side+'Washing']]])assert(board.guestStep(va.id,event,{position}));
const seatId=va.poolId+'-seat-1';
assert(board.guestStep(va.id,'bath-mounted',{poolId:va.poolId,seatId}));assert(board.guestStep(va.id,'bathed',{seatId}));
assert(board.guestStep(va.id,'dried',{position:P[va.side+'Changing']}));assert(board.guestStep(va.id,'rested',{position:va.restPoint}));
const cooking=claim(va,'cook','jp-ramen');assert(board.complete(cooking.id,'jp-ramen',{position:P[cooking.to]}));
const meal=board.getVisit(va.id),serving=claim(meal,'serve','jp-sushi');assert(board.pickup(serving.id,'jp-sushi',{position:P[serving.from]}));
const servingEvidence={position:meal.servePoint,guestPosition:meal.diningPoint,itemId:meal.mealId,tokenId:meal.tokenId};
assert.equal(board.complete(serving.id,'jp-sushi',servingEvidence),false,'Serving waits until the diner actually sits');
assert(board.guestStep(va.id,'sat-to-eat',{position:va.diningPoint}));assert(board.complete(serving.id,'jp-sushi',servingEvidence));
assert(board.guestStep(va.id,'ate',{position:va.diningPoint}));
assert.equal(board.jobs().some(j=>j.kind==='checkout'),false,'A guest still upstairs cannot monopolize the front desk and deadlock a new arrival');
assert(board.guestStep(va.id,'returned-to-desk',{position:P.reception}));
const checkout=claim(va,'checkout','jp-welcome');assert(board.complete(checkout.id,'jp-welcome',{position:P.registrar,guestPosition:P.reception,tokenId:va.tokenId}));
assert(board.guestStep(va.id,'left',{position:P.departure}));assert.equal(board.state().completed,1);
board.forgetFinished([va.id]);assert(board.getVisit(va.id),'departed original guest retains their actual dirty plate until collected');const washing=claim(meal,'wash','jp-ramen');assert(board.pickup(washing.id,'jp-ramen',{position:meal.servePoint}));assert(board.complete(washing.id,'jp-ramen',{position:P.kitchenPickup,itemId:meal.mealId,tokenId:meal.tokenId}));board.forgetFinished([va.id]);assert.equal(board.getVisit(va.id),null);assert.equal(board.getVisit(vb.id).stage,'cancelled','Retiring one guest must not forget a cancelled guest who is still walking out');
board.dispose();resumed.dispose();
const employee={station:{id:'jp-sushi'},root:{position:{x:4,y:11.4,z:-2}}};
assert(isJapanEmployeeInteraction(employee,{performing:'jp-sushi',position:{x:4.7,y:11.4,z:-2}}),'Nearby employee can pause for the player');
assert.equal(isJapanEmployeeInteraction(employee,{performing:'jp-sushi',position:{x:4,y:0,z:-2}}),false,'An empty station cannot pause its employee from another floor');
assert.equal(isJapanEmployeeInteraction(employee,{performing:'jp-sushi',position:{x:-6,y:11.4,z:-2}}),false,'Same-floor distant employees continue their delivery');
assert(isJapanEmployeeInteraction(employee,{conversationActorId:'jp-sushi',position:{x:4.7,y:11.4,z:-2}}),'Explicit nearby conversation uses the actual employee identity');
console.log('PASS: distinct cargo, causal preparation/meal/checkout, carrier abort, cancellation and refresh identity');

{
 const b=createJapanServiceOrders({worldSeed:31}),v=b.spawn({...createJapanVisitorIdentity(b.nextIdentity(),31),restPoint:[-7.7,3.8,6.61],diningPoint:[-7.7,3.8,6.61]});b.guestStep(v.id,'arrived',{position:P.reception});let j=b.jobs().find(j=>j.kind==='register');b.claim(j.id,'jp-welcome');b.complete(j.id,'jp-welcome',{position:P.registrar,guestPosition:P.reception});j=b.jobs().find(j=>j.kind==='prepare');b.claim(j.id,'jp-incense');b.complete(j.id,'jp-incense',{position:P.apothecary});j=b.jobs().find(j=>j.kind==='deliverMix');const carrier=v.side==='men'?'jp-onsen':'jp-women-onsen';b.claim(j.id,carrier);b.pickup(j.id,carrier,{position:P.apothecaryPickup});const checkpoint=JSON.parse(JSON.stringify(b.state())),reloaded=createJapanServiceOrders({saved:checkpoint,worldSeed:31,preservePhysical:true});reloaded.restoreClaims(checkpoint.claims);assert.deepEqual(reloaded.state().items,checkpoint.items);assert.deepEqual(reloaded.state().claims,checkpoint.claims);assert.equal(reloaded.state().items.find(i=>i.id===j.itemId).location.id,carrier);assert(reloaded.complete(j.id,carrier,{position:P[v.side+'Service'],itemId:j.itemId,tokenId:b.getVisit(v.id).tokenId}));assert(!reloaded.complete(j.id,carrier,{position:P[v.side+'Service'],itemId:j.itemId,tokenId:b.getVisit(v.id).tokenId}));console.log('PASS carried Japan item/worker claim retains same identity and delivers once');
}
