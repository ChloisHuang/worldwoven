import assert from 'node:assert/strict';
import {fixture} from './china-host-needs.mjs';
import {CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {CLINIC_ROLES} from '../source/game/china-clinic-roles.js';
import {TAVERN_MEAL as M} from '../source/game/china-tavern-kitchen.js';

// The shared queue must not route a new externally controlled person through
// an official/clinic purse, duplicate the external lease, or save half a refund.
// The provider stub isolates that adapter contract; its real ledger is tested
// with the royal-kitchen account module, not reimplemented as a second economy.
const ID='cn-cooking',OTHER='cn-personal-guest-next',copy=x=>JSON.parse(JSON.stringify(x));
function actor(id,x=24){return {station:{id,npcName:id,npcPosition:[x,.215,10]},root:{position:{x,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};}
function setup({cash=2,bank=28,saved=null}={}){
 let f,fail=false,allowed=true,attempts=0;
 let ledger=copy(saved?.chinaRoyalKitchenAccounts||{version:1,accounts:{[ID]:{cash,bank},[OTHER]:{cash:0,bank:30}},mealTransfers:[]});
 function prepare(input,kind){
  const base=ledger,account=ledger.accounts[input.actorId],payment=ledger.mealTransfers.find(r=>r.kind==='meal-payment'&&r.orderId===input.orderId);
  if(!account||kind==='meal-payment'&&account.cash+account.bank<input.amount)return {ok:false,code:'insufficient-funds'};
  if(kind==='meal-refund'&&(!payment||payment.actorId!==input.actorId||payment.amount!==input.amount))return {ok:false,code:'refund-conflict'};
  const next=copy(ledger),old=ledger.mealTransfers.find(r=>r.kind===kind&&r.orderId===input.orderId);
  if(!old){const split=kind==='meal-payment'?{cash:Math.min(account.cash,input.amount),bank:Math.max(0,input.amount-account.cash)}:payment.sourceSplit,direction=kind==='meal-payment'?-1:1;
   next.accounts[input.actorId].cash+=direction*split.cash;next.accounts[input.actorId].bank+=direction*split.bank;next.mealTransfers.push({...input,kind,sourceSplit:copy(split)});
  }
  let committed=false;return {ok:true,balanceAfter:next.accounts[input.actorId].cash+next.accounts[input.actorId].bank,commit(patch){
   if(committed)return {ok:true,replayed:true};attempts++;if(fail)return {ok:false,code:'save-failed'};if(base!==ledger)return {ok:false,code:'stale'};
   assert(patch.chinaServiceWorld,'the original queue and account use one save');ledger=next;committed=true;Object.assign(f.game,copy(patch),{chinaRoyalKitchenAccounts:copy(next)});return {ok:true};
  }};
 }
 const economy={account:id=>copy(ledger.accounts[id]||{cash:0,bank:0}),snapshot:()=>copy(ledger),prepareMealPayment:d=>prepare(d,'meal-payment'),prepareMealRefund:d=>prepare(d,'meal-refund')};
 const forbidden={account(){throw Error('foreign account read');},prepareMealPayment(){throw Error('foreign account charged');},prepareMealRefund(){throw Error('foreign account refunded');}};
 const guest=actor(ID),second=actor(OTHER,25);
 f=fixture(saved,{extraActors:[guest,second],sceneOptions:{guestEconomy:economy,canBorrowGuest:()=>allowed,canBorrowClinic:()=>true,clinicEconomy:forbidden,officialEconomy:forbidden}});
 f.hungry(false);f.needs.set(ID,{seekMeal:true,seekToilet:false});f.needs.set(OTHER,{seekMeal:true,seekToilet:false});
 return {...f,guest,second,economy,fail:v=>fail=v,allow:v=>allowed=v,get attempts(){return attempts;}};
}
const guestOrder=f=>f.scene.snapshot().orders.find(o=>o.customerId===ID&&!o.cancelled&&o.stage!=='done');
const paid=f=>{assert(f.scene.registerGuestPerson(ID));assert(f.scene.requestGuestMeal(ID));f.until(()=>guestOrder(f)?.payment==='reserved','host physically takes guest prepayment');return guestOrder(f);};

const empty=setup({cash:0,bank:0});assert(empty.scene.registerGuestPerson(ID));const before=empty.scene.snapshot();assert.equal(empty.scene.guestMealAvailable(ID),false);assert.equal(empty.scene.requestGuestMeal(ID),false);assert.deepEqual(copy(empty.scene.snapshot()),copy(before));assert.equal(empty.attempts,0);assert.equal(empty.scene.owns(empty.guest),false);
const gated=setup();gated.allow(false);assert.equal(gated.scene.registerGuestPerson(ID),false);gated.allow(true);assert(gated.scene.registerGuestPerson(ID));assert(gated.scene.registerGuestPerson(ID));assert.equal(gated.scene.snapshot().guestPeople.length,1);gated.allow(false);assert.equal(gated.scene.requestGuestMeal(ID),false);gated.allow(true);gated.guest.alive=false;assert.equal(gated.scene.guestMealAvailable(ID),false);assert.equal(gated.scene.registerGuestPerson(ID),false);gated.guest.alive=true;assert(gated.scene.guestMealAvailable(ID));
const defaultDenied=fixture(null,{extraActors:[actor(ID)]});assert.equal(defaultDenied.scene.registerGuestPerson(ID),false);
for(const id of [M.host,M.cook,M.assistant,'cn-tavern-reciter','cn-tavern-diner-west'])assert.equal(gated.scene.registerGuestPerson(id),false,id+' keeps its original provider');assert.equal(gated.scene.registerClinicPerson(ID),false,'clinic registration cannot overwrite the guest provider');
console.log('PASS no funds causes no order or lease, dynamic permission/alive gate, idempotent registry and existing identities remain separate');

const f=setup(),foreignBefore={property:copy(f.property.npcAccount(M.host)),artist:copy(f.artistEconomy.snapshot())};
assert(f.scene.registerGuestPerson(ID));assert(f.scene.registerGuestPerson(OTHER));assert(f.scene.requestGuestMeal(ID));const lease=f.scene.guestMeal(ID);assert.equal(lease.kind,'personal-guest');assert.equal(lease.accountProvider,'china-royal-kitchen-accounts');assert.equal(f.scene.guestMealActorId(),ID);assert.equal(f.scene.clinicMeal(ID),null);assert.equal(f.scene.officialMeal(ID),null);assert.equal(f.scene.owns(f.guest),true);assert.equal(f.scene.requestGuestMeal(OTHER),false);assert.equal(f.scene.requestArtistMeal('cn-tavern-reciter'),false);assert.equal(f.scene.requestGuestMeal(ID),false);assert(!f.scene.snapshot().clinicDiner&&!f.scene.snapshot().officialDiner);
f.until(()=>guestOrder(f)?.stage==='ordered','same host records the same dish');f.fail(true);f.tick(40);assert.equal(guestOrder(f).stage,'ordered');assert.deepEqual(f.economy.account(ID),{cash:2,bank:28});assert.equal(f.economy.snapshot().mealTransfers.length,0);f.fail(false);f.until(()=>guestOrder(f)?.payment==='reserved','retry original payment with atomic world write');assert.deepEqual(f.economy.account(ID),{cash:0,bank:24});assert.equal(f.game.chinaServiceWorld.guestDiner.orderId,lease.orderId);assert.equal(f.economy.snapshot().mealTransfers.length,1);assert.deepEqual(f.economy.snapshot().mealTransfers[0].sourceSplit,{cash:2,bank:4});
const checkpoint=copy(f.game),g=setup({saved:checkpoint});assert.equal(g.scene.guestMealActorId(),ID);assert.deepEqual(g.economy.account(ID),{cash:0,bank:24});g.until(()=>!g.scene.guestMeal(ID),'original kitchen delivers and guest fully consumes');const consumed=g.scene.snapshot().mealReceipts.find(r=>r.actorId===ID);assert.equal(consumed.orderId,lease.orderId);assert.equal(consumed.mealId,lease.orderId+'-dish');assert.equal(g.needs.get(ID).seekMeal,false);assert.equal(g.scene.owns(g.guest),false);assert.equal(g.economy.snapshot().mealTransfers.length,1);g.until(()=>g.scene.snapshot().orders.find(o=>o.id===lease.orderId)?.stage==='done','same dish clears and washes');assert.deepEqual(g.economy.account(ID),{cash:0,bank:24});assert.deepEqual(copy(g.artistEconomy.snapshot()),foreignBefore.artist);assert.deepEqual(copy(g.property.npcAccount(M.host)),foreignBefore.property);
console.log('PASS one shared lease, own-account atomic payment failure/retry, saved original dish delivery/consumption/cleanup and no foreign charge');

const cancelled=setup(),order=paid(cancelled),till=cancelled.scene.snapshot().till;cancelled.fail(true);assert.equal(cancelled.scene.cancelGuestMeal(ID),false);assert.equal(cancelled.scene.guestMeal(ID).orderId,order.id);assert.deepEqual(cancelled.economy.account(ID),{cash:0,bank:24});assert.equal(guestOrder(cancelled).payment,'reserved');cancelled.fail(false);assert(cancelled.scene.cancelGuestMeal(ID));assert.deepEqual(cancelled.economy.account(ID),{cash:2,bank:28});assert.equal(cancelled.scene.guestMealActorId(),null);assert.equal(cancelled.scene.snapshot().till,till);assert.equal(cancelled.economy.snapshot().mealTransfers.filter(r=>r.kind==='meal-refund').length,1);assert.equal(cancelled.scene.cancelGuestMeal(ID),false);assert.equal(cancelled.needs.get(ID).seekMeal,true);assert.equal(cancelled.scene.snapshot().mealReceipts?.some(r=>r.actorId===ID)||false,false);assert.deepEqual(setup({saved:cancelled.game}).economy.account(ID),{cash:2,bank:28});
const served=setup(),servedOrder=paid(served);served.until(()=>guestOrder(served)?.stage==='eating','actual delivered meal settles');const earned=served.scene.snapshot().till;assert(served.scene.cancelGuestMeal(ID));assert.deepEqual(served.economy.account(ID),{cash:0,bank:24});assert.equal(served.scene.snapshot().till,earned);assert.equal(served.needs.get(ID).seekMeal,true);assert.equal(served.economy.snapshot().mealTransfers.length,1);served.until(()=>served.scene.snapshot().orders.find(o=>o.id===servedOrder.id)?.stage==='done','cancelled delivered dish is cleaned');
console.log('PASS refundable original source split, failed/refunded atomic save retry and delivered cancellation never refunds or invents relief');

const rejected=setup();assert(rejected.scene.registerGuestPerson(ID));rejected.reject(true);const rejectedBefore=copy(rejected.scene.snapshot());assert.equal(rejected.scene.requestGuestMeal(ID),false);assert.deepEqual(copy(rejected.scene.snapshot()),rejectedBefore);assert.equal(rejected.facilities.state().some(s=>s.reservations.some(r=>r.actor===ID)),false);assert.equal(rejected.economy.snapshot().mealTransfers.length,0);rejected.reject(false);assert(rejected.scene.requestArtistMeal('cn-tavern-reciter'));assert.equal(rejected.scene.requestGuestMeal(ID),false,'artist also excludes guest in the same single lease');assert(rejected.scene.cancelArtistMeal('cn-tavern-reciter'));assert(rejected.scene.requestGuestMeal(ID));
const valid=copy(rejected.scene.snapshot());assert(rejected.scene.restoreWorld(valid));
const corruptions=[w=>{w.guestPeople={};},w=>{w.guestPeople=[ID,ID];},w=>{w.guestPeople=['bad-id'];},w=>{w.guestDiner.kind='clinic-staff';},w=>{w.guestDiner.accountProvider='china-clinic-npc-economy';},w=>{w.guestDiner.actorId=OTHER;},w=>{w.guestDiner.orderId='cn-tavern-order-999';},w=>{w.guestDiner.mode='idle';},w=>{delete w.guestDiner;},w=>{w.clinicDiner=copy(w.guestDiner);},w=>{w.clinicPeople=[ID];},w=>{w.hostPeople=[M.host,ID];},w=>{w.kitchenPeople=[M.cook,M.assistant,ID];}];
for(const id of [...CHINA_OFFICIAL_IDS,'cn-tavern-reciter',M.host,M.cook,M.assistant,'cn-tavern-diner-west',...Object.values(CLINIC_ROLES).map(r=>r.originalHolderId)])corruptions.push(w=>{w.guestPeople.push(id);});
for(const mutate of corruptions){const bad=copy(valid);mutate(bad);assert.equal(setup().scene.restoreWorld(bad),false,'corrupt/ambiguous guest ownership must reject');}
console.log('PASS failed request releases seat, lease exclusivity both directions, valid reload and malformed/foreign/orphan guest save rejection');
