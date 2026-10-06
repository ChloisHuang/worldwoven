// A player wage save can otherwise reenter the NPC personal meal journal and
// report success with different durable and in-memory property events. Keep the
// original property, currency and exact-price native meal boundaries together.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
const copy=structuredClone,COOK='cn-tavern-cook',HOST='cn-tavern-host';
const meal=(number=1)=>({actorId:COOK,orderId:`cn-tavern-order-${number}`,amount:6});
const wage=(number=1)=>({amount:16,receiptId:`property-lock-wage:${number}`,roleId:'cn-tavern-steward',slotId:'steward',day:0});
function fixture(input){
 let saved=copy(input||{chinaServiceWorld:{till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),durable=copy(saved),property,ledger;
 let onSave=null,failure=null,writes=0,day=0,lastParticipant=null;
 const storage={setItem(_key,json){
  const callback=onSave;onSave=null;callback?.();
  if(failure==='throw')throw Error('quota');if(failure==='false')return false;if(failure==='object')return {ok:false};if(failure==='promise')return Promise.resolve(true);if(failure==='rejected-promise')return Promise.reject(Error('async storage unavailable'));
  durable=JSON.parse(json);writes++;return true;
 }};
 function store(next,patch={}){const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,...patch,chinaTavernProperty:next}));if(result===false||result?.ok===false||result?.then)return result;Object.assign(saved,copy(patch),{chinaTavernProperty:copy(next)});return true;}
 function load(){
  ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>lastParticipant=property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day}),getTill:()=>saved.chinaServiceWorld.till,saveState:store,worldSeed:1});
 }
 load();
 return {get property(){return property;},get ledger(){return ledger;},get saved(){return copy(saved);},get durable(){return copy(durable);},get writes(){return writes;},get lastParticipant(){return lastParticipant;},get day(){return day;},set day(value){day=value;},onSave:callback=>onSave=callback,fail:value=>failure=value,
  patch(input=meal(),refund=false){return {chinaServiceWorld:{...copy(saved.chinaServiceWorld),orders:[...saved.chinaServiceWorld.orders.filter(o=>o.id!==input.orderId),{id:input.orderId,customerId:input.actorId,price:input.amount,payment:refund?'refunded':'reserved',collected:!refund,...(refund?{cancelled:true}:{})}]}};},
  reload(){saved=copy(durable);load();},income(amount){saved.chinaServiceWorld.till+=amount;durable=copy(saved);}
 };
}
const rejected=(result,code)=>{assert.equal(result?.ok,false,JSON.stringify(result));if(code)assert.equal(result.code,code);};
const snapshot=f=>({property:f.property.snapshot(),ledger:f.ledger.state(),saved:f.saved,durable:f.durable,writes:f.writes});

{
 const f=fixture();let nested;
 f.onSave(()=>{const candidate=f.property.prepareNpcMealPayment(meal());nested=candidate.ok?candidate.commit(f.patch()):candidate;});
 assert(f.ledger.creditWageToBank(wage()).ok);
 assert.equal(nested.ok,false,'currency save must reject meal reentry: '+JSON.stringify({nested,memory:f.property.snapshot().events.map(e=>e.kind),durable:f.durable.chinaTavernProperty.events.map(e=>e.kind)}));
 assert.equal(f.property.npcAccount(COOK).total,240);assert.equal(f.property.state().paidWages,16);assert.deepEqual(f.property.snapshot(),f.durable.chinaTavernProperty);
 f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.npcAccount(COOK).total,240);assert.equal(f.property.state().paidWages,16);
}
console.log('PASS original player wage save refuses reverse native NPC meal reentry and reloads the same property events');

{
 const f=fixture(),prepared=f.property.prepareNpcMealPayment(meal());let nested;
 assert(prepared.ok);f.onSave(()=>{nested=prepared.commit(f.patch());});assert(f.ledger.creditWageToBank(wage()).ok);
 rejected(nested);const after=snapshot(f);rejected(prepared.commit(f.patch()),'stale-npc-meal');assert.deepEqual(snapshot(f),after);
 assert(f.property.prepareNpcMealPayment(meal()).commit(f.patch()).ok);assert.equal(f.property.npcAccount(COOK).total,234);assert.equal(f.property.state().paidWages,16);
 const paid=copy(f.property.snapshot());f.reload();assert.equal(f.property.loadError,null);assert.deepEqual(f.property.snapshot(),paid);
 assert(f.property.prepareNpcMealRefund(meal()).commit(f.patch(meal(),true)).ok);assert.equal(f.property.npcAccount(COOK).total,240);
 assert(f.property.prepareNpcMealRefund(meal()).commit(f.patch(meal(),true)).replayed);rejected(f.property.prepareNpcMealPayment(meal()),'npc-meal-already-refunded');
 f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.state().paidWages,16);assert.equal(f.property.npcAccount(COOK).total,240);
}
console.log('PASS preprepared meal cannot enter or overwrite a wage save; fresh native payment/refund replay and original full-price journal survive reload');

// Preparation alone is not permission to adopt an unpersisted wage. Use the
// genuine property participant shape without adding a fabricated ledger receipt.
const wageTransaction=number=>({...wage(number),action:'wage',currency:'copper',requestId:wage(number).receiptId});
{
 const f=fixture(),candidate=f.property.prepareCurrencyCommit(wageTransaction(8)),before=snapshot(f);
 assert(candidate.ok);assert(candidate.valid());assert.equal(candidate.committed(),false,'currency participant cannot adopt before its caller locks and saves');assert.deepEqual(snapshot(f),before);
 assert(candidate.lock());assert.equal(candidate.lock(),false);rejected(f.property.prepareNpcMealPayment(meal()),'property-busy');rejected(f.property.prepareCurrencyCommit(wageTransaction(9)),'property-busy');candidate.release();candidate.release();assert(candidate.valid());assert.equal(candidate.committed(),false);
 let nested,preparedLock,preparedAdoption;
 f.onSave(()=>{nested=f.ledger.creditWageToBank(wage(2));preparedLock=candidate.lock();preparedAdoption=candidate.committed();});
 assert(f.property.prepareNpcMealPayment(meal()).commit(f.patch()).ok);rejected(nested,'property-busy');assert.equal(preparedLock,false);assert.equal(preparedAdoption,false);
 assert.equal(f.ledger.state().bank,900);assert.equal(f.property.state().paidWages,0);assert.equal(candidate.valid(),false);assert.equal(candidate.lock(),false);assert.equal(candidate.committed(),false);
 const paid=snapshot(f);rejected(f.property.prepareNpcMealPayment(meal(2)).commit({...f.patch(meal(2)),chinaTavernProperty:{}}),'invalid-npc-meal-world');
 const wrong=f.patch(meal(2));wrong.chinaServiceWorld.orders.at(-1).price=7;rejected(f.property.prepareNpcMealPayment(meal(2)).commit(wrong),'invalid-npc-meal-world');assert.deepEqual(snapshot(f),paid);
 assert(f.ledger.creditWageToBank(wage(2)).ok);f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.state().paidWages,16);assert.equal(f.property.npcAccount(COOK).total,234);
}
console.log('PASS native meal save blocks fresh and preprepared currency participants; explicit lock/release, unlocked adoption refusal and exact meal world proof remain intact');

{
 const f=fixture(),candidate=f.property.prepareCurrencyCommit(wageTransaction(10));assert(candidate.ok&&candidate.valid());
 f.income(4);const before=snapshot(f);assert.equal(candidate.valid(),false);assert.equal(candidate.lock(),false);assert.equal(candidate.committed(),false);assert.deepEqual(snapshot(f),before);
 assert(f.ledger.creditWageToBank(wage(10)).ok);assert.equal(f.property.state().balance,108);assert.equal(f.property.npcAccount(HOST).total,480);f.reload();assert.equal(f.property.loadError,null);
}
console.log('PASS a changed original till invalidates the prepared property candidate without spending personal funds or rewriting gross income');

for(const mode of ['false','object','throw','promise','rejected-promise']){
 const f=fixture(),prepared=f.property.prepareNpcMealPayment(meal()),before=snapshot(f);let nested;
 f.fail(mode);f.onSave(()=>{nested=prepared.commit(f.patch());});rejected(f.ledger.creditWageToBank(wage()));rejected(nested);assert.deepEqual(snapshot(f),before,mode+' must leave both journals and storage unchanged');
 const participant=f.lastParticipant;assert(participant.valid(),mode+' must release the property lock after failure');assert(participant.lock());participant.release();assert(prepared.ok);
 f.fail(null);assert(f.ledger.creditWageToBank(wage()).ok);const writes=f.writes;assert(f.ledger.creditWageToBank(wage()).replayed);assert.equal(f.writes,writes);assert.equal(f.ledger.state().bank,916);assert.equal(f.property.state().paidWages,16);
 f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.npcAccount(COOK).total,240);assert.equal(f.property.state().paidWages,16);assert(f.ledger.creditWageToBank(wage()).replayed);
}
console.log('PASS false/object/throw/resolved-promise/rejected-promise storage failures release locks, preserve snapshots and permit one real retry plus receipt replay/reload');

function consenting(f){for(let tries=0;tries<8;tries++){assert(f.property.refreshDay().ok);const state=f.property.state();if(state.market.willing)return state;f.day++;}throw Error('expected original deterministic seller consent');}
{
 const f=fixture(),seller=consenting(f),price=seller.market.price;
 rejected(f.property.confirmPurchase(),'seller-consent-required');assert(f.property.applyPurchase(price,seller.revision).ok);const application=f.property.state(),before=snapshot(f);let nested;
 f.fail('object');f.onSave(()=>{nested=f.property.prepareNpcMealPayment(meal());});rejected(f.property.confirmPurchase(application.revision));rejected(nested,'property-busy');assert.deepEqual(snapshot(f),before);assert.equal(f.property.state().ownerId,HOST);
 f.fail(null);f.onSave(()=>{nested=f.property.prepareNpcMealPayment(meal());});assert(f.property.confirmPurchase(application.revision).ok);rejected(nested,'property-busy');assert.equal(f.property.state().ownerId,'player');assert.equal(f.ledger.state().bank,900-price);assert.equal(f.property.npcAccount(HOST).total,480+price);assert.equal(f.property.npcAccount(COOK).total,240);
 f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.state().ownerId,'player');
 // Seed 1's actual day-10 cook ceiling is 273; the private 240 balance caps
 // the original offer. No new receipt, starting funds or bid is fabricated.
 f.day=10;assert(f.property.refreshDay().ok);assert(f.property.setPrice(236).ok);const offer=f.property.state().market.offers.find(o=>o.buyerId===COOK&&o.amount===236);
 assert(offer,'original cook must make a genuine finite offer');const sale=f.property.state(),bank=f.ledger.state().bank,business=sale.balance;
 f.onSave(()=>{nested=f.property.prepareNpcMealPayment(meal());});assert(f.property.replyOffer(offer.id,true,sale.revision).ok);rejected(nested,'property-busy');assert.equal(f.property.state().ownerId,COOK);assert.equal(f.property.npcAccount(COOK).total,4);assert.equal(f.ledger.state().bank,bank+236);assert.equal(f.property.state().balance,business);
 rejected(f.property.prepareNpcMealPayment(meal()),'insufficient-or-invalid-npc-funds');rejected(f.ledger.transferBusiness({operation:'sale',amount:1,receiptId:'unconsented-sale',businessId:'cn-yunlai-tavern'}),'property-consent-required');
 f.reload();assert.equal(f.property.loadError,null);assert.equal(f.property.state().ownerId,COOK);assert.equal(f.property.npcAccount(COOK).total,4);assert.equal(f.property.state().balance,business);
}
console.log('PASS original seller consent, pending player purchase, rejected storage and accepted finite cook offer preserve title, private funds and capital across locks/reload');
