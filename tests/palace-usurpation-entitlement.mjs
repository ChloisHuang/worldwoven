import test from 'node:test';
import assert from 'node:assert/strict';
import {createPalaceUsurpation,palaceUsurpationCaseId,palaceUsurpationRoll} from '../source/game/palace-usurpation-ledger.js';
import {palaceUsurpationPledgeDecision,palaceUsurpationSame as same} from '../source/game/palace-usurpation-policy.js';
import {palaceUsurpationRoyalMealEligibility,isCurrentPalaceUsurpationRoyalMealEligibility} from '../source/game/palace-usurpation-entitlement.js';
import {createRoyalKitchenOrders,validRoyalKitchenState,validRoyalPlayerEligibility,royalPlayerEligibilityEvidence,sameRoyalPlayerEligibility} from '../source/game/china-royal-kitchen-orders.js';
import {createDailyNeeds} from '../source/game/daily-needs.js';

// Regression: a real completed investiture used to have no player meal rights.
// New rights must retain the original finite orders and consumption receipts;
// a title string, unresolved case or historical record cannot create new food.
const copy = value=>JSON.parse(JSON.stringify(value));
const ACTOR = Object.freeze({actorId:'player',bodyId:'body:player'});
const SEAT = 'china-palace-dining-seat-19.8';
const CONSORT = Object.freeze({eligible:true,actorId:'player',titleId:'consort',appointmentId:'consort-appointment:consort-petition:player:1',appointmentReceiptId:'original-emperor-reading:1'});
const FIRST = palaceUsurpationCaseId(1,0);
function world() {
  const supporter=(id,circleId)=>({id,bodyId:`body:${id}`,name:id,ageYears:30,alive:true,eligible:true,supportsGeneral:true,
    roleId:`role:${id}`,circleId,relationship:1,trust:1,informedOpinion:1});
  return {player:{id:'player',bodyId:ACTOR.bodyId,ageYears:24,alive:true},
    emperor:{id:'cn-emperor',bodyId:'body:emperor',ageYears:45,alive:true,tenureRevision:0},
    supporters:[supporter('official-a','court'),supporter('commander','guard'),supporter('attendant','inner')],
    guard:{commanderId:'commander',guards:[{id:'commander',bodyId:'body:commander'},{id:'guard-a',bodyId:'body:guard-a'}]},
    experience:{intrigue:6,guard:6,abdication:6},exposure:0,
    safety:{oldWorkSettled:true,itemsSettled:true,meetingsSettled:true,actorTransitionsSafe:true},
    residences:{player:{roomId:'consort-reserve-1',bedId:'china-consort-bed-reserve-1'},formerEmperor:{roomId:'bedroom',bedId:'china-dragon-bed'}},
    unrelated:{money:123,career:{roleId:'old-role'},kinship:['original-family'],oldCharter:{signerId:'cn-emperor',text:'immutable'}},
  };
}
function seed() {
  for(let value=1;value<100000;value++)if(world().supporters.every(person=>palaceUsurpationPledgeDecision(value,FIRST,person).accepted)&&palaceUsurpationRoll(value,`${FIRST}:resolution`)<.8)return value;
  throw Error('deterministic seed unavailable');
}
const GOOD=seed();
function fixture(saved) {
  const context=world(),clock={day:1,hour:8},evidence=new Map(),flags={save:true};let saves=0;
  const core=createPalaceUsurpation({saved,worldSeed:GOOD,getClock:()=>clock,getContext:()=>context,
    verifyEvidence:r=>same(evidence.get(r.id),r),saveState:()=>{saves++;return flags.save;}});
  const task=()=>core.currentTask(),id=()=>task()?.id||FIRST;
  function receipt(kind,actorId='player') {
    const actors=[context.player,context.emperor,...context.supporters],actor=actors.find(person=>person.id===actorId);
    const r={id:`actual:${id()}:${kind}:${actorId}`,kind,caseId:id(),playerId:'player',playerBodyId:ACTOR.bodyId,
      emperorId:'cn-emperor',emperorBodyId:context.emperor.bodyId,emperorRevision:0,actorId,actorBodyId:actor.bodyId,
      targetId:'palace:courtyard',objectId:`physical:${id()}:${kind}`,participants:actors.map(person=>({actorId:person.id,bodyId:person.bodyId})).sort((a,b)=>a.actorId.localeCompare(b.actorId)),completed:true,at:copy(clock)};
    if(kind==='political-response')r.durationSeconds=4;
    if(kind==='intrigue'){r.meal={orderId:`meal-order:${id()}`,objectId:r.objectId,consumerId:'cn-emperor',consumerBodyId:context.emperor.bodyId,status:'consumed'};r.storyActionId=`story-action:${id()}`;}
    if(kind==='acclamation')r.supporterIds=task().pledges.filter(p=>p.accepted).map(p=>p.actorId).sort();
    if(kind==='safe-handoff')r.residences=copy(context.residences);
    if(kind==='investiture-reading'){r.documentId=`usurpation-charter:${id()}`;r.objectId=r.documentId;r.safeHandoff=receipt('safe-handoff');}
    evidence.set(r.id,copy(r));return r;
  }
  const plan=()=>{assert(core.begin().ok);assert(core.selectRoute(id(),'intrigue').ok);for(const person of context.supporters)assert.equal(core.pledge(id(),person.id,receipt('political-response',person.id)).accepted,true);};
  const ready=()=>{plan();assert(core.recordPreparation(id(),'intrigue',receipt('intrigue')).ok);assert(core.recordPreparation(id(),'acclamation',receipt('acclamation')).ok);assert.equal(core.resolve(id(),receipt('mechanism-resolution')).passed,true);};
  const invest=()=>{assert(core.investiture(id(),receipt('investiture-reading')).ok);};
  return {core,context,flags,plan,ready,invest,task,receipt,saves:()=>saves,eligibility:()=>palaceUsurpationRoyalMealEligibility(core,ACTOR)};
}
function invested() {const f=fixture();f.ready();f.invest();return f;}
function serve(orders,id) {
  assert(orders.prepare(id));
  for(const [from,to] of [['prepared','cooked'],['cooked','carrying'],['carrying','served'],['served','eating']])assert(orders.change(id,from,to));
}
function meal(orders,actorId='player') {const order=orders.request({actorId,seatId:SEAT});assert(order);serve(orders,order.id);assert(orders.consume(order.id,actorId,12));return order;}

test('only the original completed reading grants frozen player/body/tenure meal evidence',()=>{
  const f=fixture(),unrelated=copy(f.context.unrelated);
  assert.equal(f.eligibility(),null);f.ready();assert.equal(f.core.authority().suspended,true);assert.equal(f.eligibility(),null);
  f.invest();const before=f.core.snapshot(),saves=f.saves(),e=f.eligibility();
  assert.deepEqual(e,{eligible:true,actorId:'player',titleId:'emperor',source:'palace-usurpation',caseId:FIRST,bodyId:ACTOR.bodyId,officeRevision:1,investitureReceiptId:f.task().investiture.receipt.id});
  assert(Object.isFrozen(e));assert(validRoyalPlayerEligibility(e));assert(isCurrentPalaceUsurpationRoyalMealEligibility(e));assert.equal(royalPlayerEligibilityEvidence(e),e);
  assert.equal(palaceUsurpationRoyalMealEligibility(f.core,{...ACTOR,actorId:'cn-emperor'}),null);
  assert.equal(palaceUsurpationRoyalMealEligibility(f.core,{...ACTOR,bodyId:'body:impostor'}),null);
  assert.equal(palaceUsurpationRoyalMealEligibility(f.core),null);
  assert.deepEqual(f.core.snapshot(),before);assert.equal(f.saves(),saves);assert.deepEqual(f.context.unrelated,unrelated);
});

test('rejected investiture save keeps the former holder through cold load until the same reading retries successfully',()=>{
  const f=fixture();f.ready();const before=f.core.snapshot(),receipt=f.receipt('investiture-reading'),caseId=f.task().id;
  f.flags.save=false;
  assert.equal(f.core.investiture(caseId,receipt).code,'save-failed');
  assert.equal(f.core.office().actorId,'cn-emperor');assert.equal(f.core.office().revision,0);assert.equal(f.eligibility(),null);
  assert.equal(f.task().stage,'ready-for-investiture');assert.equal(f.task().investiture,null);assert.deepEqual(f.core.snapshot(),before);
  const cold=fixture(f.core.snapshot());
  assert.equal(cold.core.state().loadError,null);assert.equal(cold.core.office().actorId,'cn-emperor');assert.equal(cold.core.office().revision,0);
  assert.equal(cold.task().id,caseId);assert.equal(cold.eligibility(),null);assert.deepEqual(cold.core.snapshot(),before);
  f.flags.save=true;
  assert(f.core.investiture(caseId,receipt).ok);assert.equal(f.core.office().actorId,'player');assert.equal(f.core.office().revision,1);
  assert.equal(f.task().id,caseId);assert.deepEqual(f.task().investiture.receipt,receipt);
  assert.equal(f.eligibility().investitureReceiptId,receipt.id);assert.equal(f.eligibility().officeRevision,1);
  assert.equal(f.core.snapshot().events.filter(event=>event.type==='investiture').length,1);
});

test('self-declared titles and copied historical evidence cannot authorize a fresh meal',()=>{
  const f=invested(),e=f.eligibility();
  for(const forged of ['emperor',{eligible:true,actorId:'player',titleId:'emperor'},copy(e),{...CONSORT,titleId:'emperor'},
    {eligible:true,actorId:'player',roleId:'cn-emperor'},{eligible:true,actorId:'player',titleId:'cn-royal-kitchen-cook'},
    {...e,investitureReceiptId:'fake-reading'},{...e,bodyId:'body:impostor'}]){
    assert.equal(royalPlayerEligibilityEvidence(forged),null);
    const orders=createRoyalKitchenOrders({getPlayerMealEligibility:()=>forged});
    assert.equal(orders.available('player'),false);assert.equal(orders.request({actorId:'player',seatId:SEAT}),null);assert.equal(orders.snapshot().supply.remaining,120);
  }
  assert.equal(sameRoyalPlayerEligibility(CONSORT,e),false);
  for(const changed of [{...e,bodyId:'body:someone-else'},{...e,investitureReceiptId:'other-reading'},
    {...e,caseId:'palace-usurpation:1:2',officeRevision:2}])assert.equal(sameRoyalPlayerEligibility(e,changed),false);
});

test('corrupt core, mismatched original reading and suspended or replaced holder fail closed',()=>{
  const f=invested(),saved=f.core.snapshot();
  for(const mutate of [s=>s.office.bodyId='body:impostor',s=>s.cases.at(-1).stage='ready-for-investiture',
    s=>s.cases.at(-1).investiture.receipt.id='fake-reading',s=>s.events.at(-1).receipt.id='wrong-original-reading',
    s=>s.cases.at(-1).investiture.receipt.completed=false,s=>s.cases.at(-1).investiture.officeRevision=2]){
    const damaged=copy(saved);mutate(damaged);const restored=fixture(damaged);
    assert.equal(restored.core.state().loadError,'invalid-usurpation-state');assert.equal(restored.eligibility(),null);
    // Defensive cross-check at the adapter boundary, even if a host exposes an
    // inconsistent current-task or snapshot implementation.
    const inconsistent={...f.core,office:()=>copy(damaged.office),currentTask:()=>copy(damaged.cases.at(-1)),snapshot:()=>copy(damaged)};
    assert.equal(palaceUsurpationRoyalMealEligibility(inconsistent,ACTOR),null);
  }
  let holderId='player',suspended=false;
  const live={...f.core,authority:()=>({...f.core.authority(),holderId,suspended})},e=palaceUsurpationRoyalMealEligibility(live,ACTOR);
  assert(e);const orders=createRoyalKitchenOrders({getPlayerMealEligibility:()=>e}),order=orders.request({actorId:'player',seatId:SEAT});assert(order);assert(orders.prepare(order.id));
  for(const change of [()=>{suspended=true;},()=>{suspended=false;holderId='cn-emperor';}]){
    change();assert.equal(palaceUsurpationRoyalMealEligibility(live,ACTOR),null);assert.equal(isCurrentPalaceUsurpationRoyalMealEligibility(e),false);
    assert.equal(orders.available('player'),false);assert.equal(orders.request({actorId:'player',seatId:SEAT}),null);assert.equal(orders.change(order.id,'prepared','cooked'),false);assert.equal(orders.consume(order.id,'player',12),false);
  }
  assert.equal(orders.snapshot().supply.remaining,119);assert.equal(orders.snapshot().orders[0].stage,'prepared');
});

test('one emperor order uses one original portion, twelve real seconds and one needs receipt',()=>{
  const f=invested(),before=f.core.snapshot(),orders=createRoyalKitchenOrders({getPlayerMealEligibility:f.eligibility});
  const request={actorId:'player',seatId:SEAT},order=orders.request(request);assert(order);
  assert.equal(orders.request(request).id,order.id);assert.equal(orders.snapshot().serial,1);assert.equal(orders.snapshot().supply.remaining,120);
  assert.equal(orders.request({...request,workerId:'player',workReceiptId:'cn-royal-kitchen-labor-1'}),null);assert.equal(orders.claim('cn-royal-kitchen-labor-1',1),false);
  serve(orders,order.id);assert.equal(orders.prepare(order.id),false);assert.equal(orders.consume(order.id,'cn-emperor',12),false);assert.equal(orders.consume(order.id,'player',11.999),false);
  assert(orders.consume(order.id,'player',12));const consumed=orders.snapshot();assert(orders.consume(order.id,'player',12));assert.deepEqual(orders.snapshot(),consumed);
  assert.equal(consumed.supply.remaining,119);assert.equal(orders.receipts().length,1);assert(validRoyalKitchenState(consumed));
  const needs=createDailyNeeds({getRoyalMealEligibility:f.eligibility}),receipts=orders.receipts();
  assert(needs.royalMealReceipts(receipts,consumed));assert.equal(needs.hunger('player'),0);assert.equal(needs.royalMealReceipts(receipts,consumed),false);
  const repaired=createDailyNeeds({getRoyalMealEligibility:()=>null});assert.equal(repaired.mealReceipts(receipts),false);
  assert(repaired.royalMealReceipts(receipts,consumed),'completed source may repair old needs without current office');
  assert.equal(repaired.royalMealReceipts(receipts,consumed),false);assert.deepEqual(f.core.snapshot(),before);
});

test('cold emperor meals retain original body, tenure, inventory and reject changed receipt identity',()=>{
  const f=invested(),orders=createRoyalKitchenOrders({getPlayerMealEligibility:f.eligibility}),order=orders.request({actorId:'player',seatId:SEAT});assert(order);serve(orders,order.id);
  const saved=orders.snapshot(),cold=fixture(f.core.snapshot()),restored=createRoyalKitchenOrders({saved,getPlayerMealEligibility:cold.eligibility});
  assert.deepEqual(restored.snapshot(),saved);assert.equal(restored.request({actorId:'player',seatId:SEAT}).id,order.id);assert(restored.consume(order.id,'player',12));
  assert.equal(restored.snapshot().supply.remaining,119);assert.equal(restored.snapshot().serial,1);
  const consumed=restored.snapshot(),receipt=restored.receipts()[0];
  for(const change of [{bodyId:'body:impostor'},{investitureReceiptId:'different-reading'},{caseId:'palace-usurpation:1:2',officeRevision:2}]){
    const tampered={...receipt,eligibility:{...receipt.eligibility,...change}},needs=createDailyNeeds();
    assert.equal(needs.royalMealReceipts([tampered],consumed),false);
  }
});

test('old consort in-flight and consumed rows plus former emperor receipts survive cold load unchanged',()=>{
  const old=createRoyalKitchenOrders({getPlayerMealEligibility:()=>CONSORT});meal(old,'cn-emperor');meal(old);
  const open=old.request({actorId:'player',seatId:SEAT});assert(open);assert(old.prepare(open.id));const saved=old.snapshot(),serialized=JSON.stringify(saved);
  const consort=createRoyalKitchenOrders({saved,getPlayerMealEligibility:()=>CONSORT});assert.equal(JSON.stringify(consort.snapshot()),serialized);assert(consort.change(open.id,'prepared','cooked'));
  assert.deepEqual(royalPlayerEligibilityEvidence(CONSORT),CONSORT);assert.equal(consort.receipts()[0].actorId,'cn-emperor');assert.deepEqual(consort.receipts()[1].eligibility,CONSORT);
  const f=invested(),newEmperor=createRoyalKitchenOrders({saved,getPlayerMealEligibility:f.eligibility});
  assert.equal(newEmperor.loadError(),null);assert.equal(JSON.stringify(newEmperor.snapshot()),serialized);
  assert.equal(newEmperor.available('player'),false);assert.equal(newEmperor.request({actorId:'player',seatId:SEAT}),null);assert.equal(newEmperor.change(open.id,'prepared','cooked'),false);
  assert.equal(JSON.stringify(newEmperor.snapshot()),serialized,'new office cannot relabel old order or signatures');
  const needs=createDailyNeeds({getRoyalMealEligibility:f.eligibility});assert(needs.royalMealReceipts(newEmperor.receipts(),saved));assert.equal(needs.royalMealReceipts(newEmperor.receipts(),saved),false);
  assert(newEmperor.cancel('player'));const next=newEmperor.request({actorId:'player',seatId:SEAT});assert(next);assert.equal(next.number,4);assert.equal(next.eligibility.titleId,'emperor');
  assert.deepEqual(newEmperor.receipts(),old.receipts());assert.equal(newEmperor.snapshot().supply.remaining,117);assert.equal(newEmperor.snapshot().supply.wasted,1);
});

test('per-frame entitlement checks cache political history while still checking current authority',()=>{
  const f=invested(),calls={task:0,snapshot:0,authority:0,office:0},live={...f.core,
    state:()=>{throw Error('full history state must not be used');},
    currentTask:()=>{calls.task++;return f.core.currentTask();},snapshot:()=>{calls.snapshot++;return f.core.snapshot();},
    authority:()=>{calls.authority++;return f.core.authority();},office:()=>{calls.office++;return f.core.office();}};
  const initial=palaceUsurpationRoyalMealEligibility(live,ACTOR);
  for(let frame=0;frame<120;frame++){
    assert.equal(palaceUsurpationRoyalMealEligibility(live,ACTOR),initial);
    assert.equal(royalPlayerEligibilityEvidence(initial),initial);
  }
  assert.equal(calls.task,1);assert.equal(calls.snapshot,1);assert(calls.authority>=241);assert(calls.office>=241);
});
