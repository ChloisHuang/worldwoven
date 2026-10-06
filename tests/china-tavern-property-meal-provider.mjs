// Finite personal purses are ownership, not invented salary. Their original
// property events must survive split meals, business transactions and reloads;
// partial payments must never weaken the native full-order world proof.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts,NPC_GUEST_MEAL_PROVIDER as AGGREGATE} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
const copy=structuredClone,COOK='cn-tavern-cook',HOST='cn-tavern-host',ASSISTANT='cn-tavern-assistant',OTHER='cn-distinct-worker',PROVIDER='tavern-personal-funds';
const meal=(number=1,amount=6,actorId=COOK)=>({actorId,orderId:`cn-tavern-order-${number}`,amount});
const wage=(number=1)=>({amount:16,receiptId:`property-port-wage:${number}`,roleId:'cn-tavern-steward',slotId:'steward',day:10});
const rejected=(result,code)=>{assert.equal(result?.ok,false,JSON.stringify(result));if(code)assert.equal(result.code,code);};
function earnedGuard(account,day=20,hours=1.5,actorId=COOK){
 const coverage=[{actorId,roleId:GUARD.id,slotId:GUARD.slotId,holderRevision:day}];let time=(day*1440+360-600)/RATE,end=time+hours*60/RATE;
 account.observe({seconds:time,dt:.25,coverage});while(time<end){const dt=Math.min(.25,end-time);time+=dt;account.observe({seconds:time,dt,coverage});}assert(account.checkpoint({day,hour:18}));
}
function fixture(input,{fund=true}={}){
 let saved=copy(input||{chinaServiceWorld:{till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),durable=copy(saved),property,ledger,guard,port,aggregate;
 let day=saved.chinaTavernProperty?.market?.day??10,onSave=null,failure=null,writes=0;
 const storage={setItem(_key,json){const callback=onSave;onSave=null;callback?.();if(failure==='false')return false;if(failure==='object')return {ok:false};if(failure==='throw')throw Error('quota');if(failure==='promise')return Promise.resolve(true);if(failure==='rejected-promise')return Promise.reject(Error('async unavailable'));durable=JSON.parse(json);writes++;return true;}};
 function store(patch){const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,...patch}));if(result===false||result?.ok===false||result?.then)return result;Object.assign(saved,copy(patch));return true;}
 function load(){
  ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day}),getTill:()=>saved.chinaServiceWorld.till,saveState:(next,patch={})=>store({...patch,chinaTavernProperty:next}),worldSeed:1});
  guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:saved.chinaGuardAccounts,saveState:(next,_receipt,patch={})=>store({...patch,chinaGuardAccounts:next})});
  assert.equal(typeof property.mealFundsProvider,'function','property exposes only its narrow dormant meal provider');port=property.mealFundsProvider();
  aggregate=createNPCGuestAccounts([{id:PROVIDER,economy:port},{id:'china-guard-accounts',economy:guard}],{saved:saved.chinaGuestMealAccounts,saveState:(next,patch={})=>store({...patch,chinaGuestMealAccounts:next})});
 }
 function buy(){
  for(let tries=0;tries<12;tries++){assert(property.refreshDay().ok);const state=property.state();if(state.market.willing){assert(property.applyPurchase(state.market.price,state.revision).ok);assert(property.confirmPurchase(property.state().revision).ok);return state.market.price;}day++;}
  throw Error('expected original deterministic seller consent');
 }
 load();
 if(!input&&fund){
  day=0;buy();day=10;assert(property.refreshDay().ok);assert(property.setPrice(236).ok);const state=property.state(),offer=state.market.offers.find(row=>row.buyerId===COOK&&row.amount===236);assert(offer);assert(property.replyOffer(offer.id,true,state.revision).ok);assert.equal(property.npcAccount(COOK).total,4);
  earnedGuard(guard);assert.equal(guard.account(COOK).bank,3);earnedGuard(guard,21,1.5,OTHER);
 }
 return {get property(){return property;},get ledger(){return ledger;},get guard(){return guard;},get port(){return port;},get aggregate(){return aggregate;},get saved(){return copy(saved);},get durable(){return copy(durable);},get writes(){return writes;},get day(){return day;},set day(value){day=value;},buy,
  onSave:callback=>onSave=callback,fail:value=>failure=value,earn:(d=22,hours=1.5,id=COOK)=>earnedGuard(guard,d,hours,id),
  patch(input=meal(),refund=false){return {chinaServiceWorld:{...copy(saved.chinaServiceWorld),orders:[...saved.chinaServiceWorld.orders.filter(order=>order.id!==input.orderId),{id:input.orderId,customerId:input.actorId,price:input.amount,payment:refund?'refunded':'reserved',collected:!refund,...(refund?{cancelled:true}:{})}]}};},
  reload(){saved=copy(durable);load();},income(amount){saved.chinaServiceWorld.till+=amount;durable=copy(saved);}
 };
}
const snapshot=f=>({property:f.property.snapshot(),guard:f.guard.snapshot(),aggregate:f.aggregate.snapshot(),ledger:f.ledger.state(),saved:f.saved,durable:f.durable,writes:f.writes});
const business=f=>{const state=f.property.state();return Object.fromEntries(['ownerId','ownership','invested','revenue','paidWages','drawn','balance'].map(key=>[key,state[key]]));};
const lease=input=>({actorId:input.actorId,orderId:input.orderId,accountProvider:AGGREGATE});

{
 const f=fixture(null,{fund:false});assert.deepEqual(f.port.mealAccountIdentity(),{version:1,namespace:'chinaTavernProperty',currency:'copper',roleIds:['cn-tavern-finite-personal-purse']});assert.equal(f.port.hasIncome,undefined);
 for(const [id,total]of [[HOST,480],[COOK,240],[ASSISTANT,260]]){assert.equal(f.port.ownsPersonalMealAccount(id),true);assert.deepEqual(f.port.account(id),{cash:total,bank:0});assert.deepEqual(f.aggregate.account(id),{cash:total,bank:0});assert.equal(f.aggregate.hasIncome(id),false);assert.equal(f.aggregate.providerFor(id),PROVIDER);}
 for(const id of ['player',OTHER,'cn-successor']){assert.equal(f.port.ownsPersonalMealAccount(id),false);assert.equal(f.port.account(id),null);assert.equal(f.aggregate.account(id),null);}
 const before=business(f);f.income(50);assert.equal(f.port.account(HOST).cash,480);assert.equal(f.port.account(COOK).cash,240);assert.equal(f.property.state().balance,before.balance+50);assert.equal(f.writes,0);
 for(const method of ['invest','draw','setPrice','replyOffer','confirmPurchase','prepareCurrencyCommit'])assert.equal(f.port[method],undefined,'meal port exposes no business authority');
}
console.log('PASS original finite480/240/260 purses project as personal cash, never salary, bank funds, business revenue or successor ownership');

const paidFixture=fixture(),opening=snapshot(paidFixture),company=business(paidFixture),host=paidFixture.property.npcAccount(HOST),assistant=paidFixture.property.npcAccount(ASSISTANT),other=paidFixture.guard.account(OTHER);
assert.deepEqual(paidFixture.aggregate.account(COOK),{cash:4,bank:3});assert.equal(paidFixture.aggregate.hasIncome(COOK),true);assert.equal(paidFixture.aggregate.providerFor(COOK),AGGREGATE);
const payment=paidFixture.aggregate.prepareMealPayment(meal());assert(payment.ok);assert.equal(payment.balanceAfter,1);assert(payment.commit(paidFixture.patch()).ok);assert.equal(paidFixture.writes,opening.writes+1);
assert.deepEqual(paidFixture.port.account(COOK),{cash:0,bank:0});assert.equal(paidFixture.guard.account(COOK).bank,1);assert.deepEqual(business(paidFixture),company);assert.deepEqual(paidFixture.property.npcAccount(HOST),host);assert.deepEqual(paidFixture.property.npcAccount(ASSISTANT),assistant);assert.deepEqual(paidFixture.guard.account(OTHER),other);assert.deepEqual(paidFixture.ledger.state(),opening.ledger);
assert.deepEqual(paidFixture.aggregate.snapshot().transfers[0].portions.map(part=>[part.providerId,part.amount,part.sourceSplit]),[[PROVIDER,4,{cash:4,bank:0}],['china-guard-accounts',2,{cash:0,bank:2}]]);
assert.deepEqual(paidFixture.property.snapshot().events.slice(0,-1),opening.property.events);assert.equal(paidFixture.property.snapshot().events.at(-1).kind,'npc-meal-payment');assert.equal(paidFixture.property.snapshot().events.at(-1).amount,4);
assert(paidFixture.aggregate.validMealLease(lease(meal()),paidFixture.saved.chinaServiceWorld.orders.at(-1)));const paidSave=paidFixture.durable;paidFixture.reload();assert.equal(paidFixture.aggregate.loadError,null);assert(paidFixture.aggregate.validMealLease(lease(meal()),paidFixture.saved.chinaServiceWorld.orders.at(-1)));
paidFixture.buy();const afterSale=business(paidFixture),purseAfterSale=paidFixture.port.account(COOK).cash;paidFixture.earn(23);const guardAfterIncome=paidFixture.guard.account(COOK).bank,writes=paidFixture.writes;
assert(paidFixture.aggregate.prepareMealRefund(meal()).commit(paidFixture.patch(meal(),true)).ok);assert.equal(paidFixture.writes,writes+1);assert.equal(paidFixture.port.account(COOK).cash,purseAfterSale+4);assert.equal(paidFixture.guard.account(COOK).bank,guardAfterIncome+2);assert.deepEqual(business(paidFixture),afterSale);assert.deepEqual(paidFixture.guard.account(OTHER),other);
assert(paidFixture.aggregate.prepareMealRefund(meal()).commit(paidFixture.patch(meal(),true)).replayed);rejected(paidFixture.aggregate.prepareMealPayment(meal()));paidFixture.reload();assert.equal(paidFixture.aggregate.loadError,null);assert.equal(paidFixture.port.account(COOK).cash,purseAfterSale+4);
console.log('PASS real cook240 minus consented236 purchase plus observed guard3 pays6 in one save; exact4+2 refund survives ownership change, later earnings and reload without business/other-person effects');

{
 const f=fixture(),candidate=f.aggregate.prepareMealPayment(meal()),before=snapshot(f);assert(candidate.ok);
 const unvalidated=f.port.prepareMealPayment(meal(1,4));assert(unvalidated.ok);assert.equal(unvalidated.lock(),false);rejected(unvalidated.committed());
 const record=copy(candidate.snapshot.transfers[0]);
 for(const mutate of [r=>{r.actorId=ASSISTANT;},r=>{r.portions[0].amount=3;r.portions[1].amount=3;},r=>{r.portions[0].sourceSplit={cash:0,bank:4};},r=>{r.portions[0].identity.namespace='foreign-purse';}]){
  const bad=copy(record);mutate(bad);assert.equal(unvalidated.validateMealWorld(f.patch(),bad),false);assert.equal(unvalidated.lock(),false);rejected(unvalidated.committed());assert.deepEqual(snapshot(f),before);
 }
 const wrongActor=f.patch();wrongActor.chinaServiceWorld.orders.at(-1).customerId=ASSISTANT;const wrongTotal=f.patch();wrongTotal.chinaServiceWorld.orders.at(-1).price=4;const wrongStatus=f.patch();wrongStatus.chinaServiceWorld.orders.at(-1).payment='settled';const uncollected=f.patch();uncollected.chinaServiceWorld.orders.at(-1).collected=false;
 for(const patch of [{},wrongActor,wrongTotal,wrongStatus,uncollected,{...f.patch(),chinaTavernProperty:{}}]){rejected(candidate.commit(patch));assert.deepEqual(snapshot(f),before);}
 const native=f.property.prepareNpcMealPayment(meal(2,4));assert(native.ok);rejected(native.commit(f.patch(meal(2,6))),'invalid-npc-meal-world');assert.deepEqual(snapshot(f),before);
 assert(candidate.commit(f.patch()).ok);const refund=f.aggregate.prepareMealRefund(meal()),paid=snapshot(f),badRefund=f.patch(meal(),true);badRefund.chinaServiceWorld.orders.at(-1).cancelled=false;rejected(refund.commit(badRefund));assert.deepEqual(snapshot(f),paid);assert(refund.commit(f.patch(meal(),true)).ok);
}
console.log('PASS split commit requires exact full-price actor/order/reserve/refund world proof; native full-price commit is unchanged and invalid attempts never mutate');

for(const mode of ['false','object','throw','promise','rejected-promise']){
 const f=fixture(),candidate=f.aggregate.prepareMealPayment(meal()),before=snapshot(f);f.fail(mode);rejected(candidate.commit(f.patch()));assert.deepEqual(snapshot(f),before);f.fail(null);assert(candidate.commit(f.patch()).ok);
 const refund=f.aggregate.prepareMealRefund(meal()),paid=snapshot(f);f.fail(mode);rejected(refund.commit(f.patch(meal(),true)));assert.deepEqual(snapshot(f),paid);f.fail(null);assert(refund.commit(f.patch(meal(),true)).ok);f.reload();assert.equal(f.aggregate.loadError,null);assert.deepEqual(f.aggregate.account(COOK),{cash:4,bank:3});
}
console.log('PASS false/object/throw/resolved/rejected Promise payment and refund failures preserve all journals; same candidate retries and reloads exact balances');

{
 const f=fixture(),candidate=f.aggregate.prepareMealPayment(meal()),native=f.property.prepareNpcMealPayment(meal(9,1)),salary=f.property.prepareCurrencyCommit({...wage(),action:'wage',currency:'copper',requestId:wage().receiptId}),guard=f.guard.prepareMealPayment(meal(8,1));let blocked;
 f.onSave(()=>{blocked=[f.property.prepareNpcMealPayment(meal(10,1)),native.commit(f.patch(meal(9,1))),f.ledger.creditWageToBank(wage()),f.property.prepareReceptionWage({}),f.guard.prepareMealPayment(meal(7,1)),guard.commit()];blocked.push({ok:salary.lock()});});
 assert(candidate.commit(f.patch()).ok);for(const result of blocked)rejected(result);assert.equal(salary.valid(),false);assert.equal(salary.committed(),false);rejected(native.commit(f.patch(meal(9,1))));rejected(guard.commit());
 const next=f.aggregate.prepareMealRefund(meal());f.earn(24);const changed=snapshot(f);rejected(next.commit(f.patch(meal(),true)));assert.deepEqual(snapshot(f),changed);f.reload();assert.equal(f.aggregate.loadError,null);
 const stale=fixture(),prepared=stale.aggregate.prepareMealPayment(meal());stale.income(5);const tillChanged=snapshot(stale);rejected(prepared.commit(stale.patch()));assert.deepEqual(snapshot(stale),tillChanged);
 const reverse=fixture(),preprepared=reverse.aggregate.prepareMealPayment(meal());let blockedNew,blockedPrepared;
 reverse.onSave(()=>{blockedNew=reverse.aggregate.prepareMealPayment(meal(3));blockedPrepared=preprepared.commit(reverse.patch());});assert(reverse.ledger.creditWageToBank(wage(2)).ok);rejected(blockedNew);rejected(blockedPrepared);const afterWage=snapshot(reverse);rejected(preprepared.commit(reverse.patch()));assert.deepEqual(snapshot(reverse),afterWage);assert.equal(reverse.port.account(COOK).cash,4);assert.equal(reverse.guard.account(COOK).bank,3);reverse.reload();assert.equal(reverse.aggregate.loadError,null);
}
console.log('PASS aggregate property/guard locks block native, wage, receptionist and preprepared reentry; subsequent income or till changes reject stale candidates');

{
 const f=fixture();assert(f.aggregate.prepareMealPayment(meal(1,7)).commit(f.patch(meal(1,7))).ok);assert.deepEqual(f.aggregate.account(COOK),{cash:0,bank:0});assert(f.port.ownsPersonalMealAccount(COOK));f.reload();assert.deepEqual(f.aggregate.account(COOK),{cash:0,bank:0});assert(f.aggregate.prepareMealRefund(meal(1,7)).commit(f.patch(meal(1,7),true)).ok);assert.deepEqual(f.aggregate.account(COOK),{cash:4,bank:3});
 const empty=fixture(paidSave);empty.earn(25,3);const propertyBefore=empty.property.snapshot(),candidate=empty.aggregate.prepareMealPayment(meal(2));let blocked;
 empty.onSave(()=>{blocked=empty.property.prepareNpcMealPayment(meal(9,1));});assert(candidate.commit(empty.patch(meal(2))).ok);rejected(blocked,'property-busy');assert.deepEqual(empty.property.snapshot(),propertyBefore);assert.equal(empty.aggregate.snapshot().transfers.at(-1).portions.length,1);empty.reload();assert.equal(empty.aggregate.loadError,null);
 const cash=fixture(null,{fund:false});cash.earn();const guardBefore=cash.guard.snapshot();let guardBlocked;cash.onSave(()=>{guardBlocked=cash.guard.prepareMealPayment(meal(9,1));});assert(cash.aggregate.prepareMealPayment(meal()).commit(cash.patch()).ok);rejected(guardBlocked);assert.deepEqual(cash.guard.snapshot(),guardBefore);assert.equal(cash.aggregate.snapshot().transfers[0].portions.length,1);cash.reload();assert.equal(cash.aggregate.loadError,null);
 const poor=fixture(),before=snapshot(poor);rejected(poor.aggregate.prepareMealPayment(meal(1,8)));assert.deepEqual(snapshot(poor),before);
}
console.log('PASS zero-total payment/refund survives reload, zero-portion property/guard stays locked without fabricated event, and insufficient total changes nothing');

{
 const f=fixture(null,{fund:false}),input=meal();assert(f.property.prepareNpcMealPayment(input).commit(f.patch(input)).ok);const native=copy(f.property.snapshot().events.at(-1));f.earn();f.reload();assert.equal(f.aggregate.loadError,null);
 const projected=f.port.mealTransfer(input.orderId,'meal-payment');assert.equal(projected.actorId,COOK);assert.equal(projected.amount,6);assert.deepEqual(projected.sourceSplit,{cash:6,bank:0});assert(f.port.mealTransferOrderIds().includes(input.orderId));assert.deepEqual(f.property.snapshot().events.at(-1),native);
 assert(f.aggregate.validMealLease({...lease(input),accountProvider:PROVIDER},f.saved.chinaServiceWorld.orders.at(-1)));assert(f.aggregate.forProvider(PROVIDER).prepareMealRefund(input).commit(f.patch(input,true)).ok);assert.equal(f.port.account(COOK).cash,240);assert.equal(f.guard.account(COOK).bank,3);assert.equal(f.aggregate.snapshot().transfers.length,0);f.reload();assert.equal(f.aggregate.loadError,null);
}
console.log('PASS original native events project without rewriting; legacy property-only payer refunds exactly after later guard earnings with no new split journal');

for(const mutate of [
 s=>{s.chinaTavernProperty.events.at(-1).amount++;},
 s=>{const event=s.chinaTavernProperty.events.at(-1);event.actorId=ASSISTANT;event.id=`yunlai-${event.kind}:${ASSISTANT}:${event.orderId}`;},
 s=>{s.chinaTavernProperty.events.pop();},
 s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].sourceSplit={cash:0,bank:4};},
 s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].identity.namespace='different-property';},
 s=>{s.chinaGuestMealAccounts.transfers[0].actorId=ASSISTANT;},
 s=>{delete s.chinaGuestMealAccounts;},
]){
 const bad=copy(paidSave);mutate(bad);const f=fixture(bad),before=snapshot(f);assert(f.property.loadError||f.aggregate.loadError);rejected(f.aggregate.prepareMealRefund(meal()));assert.deepEqual(snapshot(f),before);assert.deepEqual(f.property.snapshot(),bad.chinaTavernProperty,'rejected property evidence remains available');
}
console.log('PASS altered/missing original events, foreign actor, split source/identity tampering and absent aggregate proof fail closed without discarding evidence');

{
 const reordered=copy(paidSave),part=reordered.chinaGuestMealAccounts.transfers[0].portions.find(p=>p.providerId===PROVIDER),d=part.identity;
 part.identity={roleIds:d.roleIds,currency:d.currency,namespace:d.namespace,version:d.version};
 const f=fixture(reordered);assert.equal(f.aggregate.loadError,null);assert(f.aggregate.prepareMealRefund(meal()).commit(f.patch(meal(),true)).ok);assert.equal(f.port.account(COOK).cash,4);assert.equal(f.guard.account(COOK).bank,3);f.reload();assert.equal(f.aggregate.loadError,null);assert(f.aggregate.prepareMealRefund(meal()).commit(f.patch(meal(),true)).replayed);
 const extra=copy(paidSave);extra.chinaGuestMealAccounts.transfers[0].portions[0].identity.extra=true;assert(fixture(extra).aggregate.loadError);
}
console.log('PASS source identity key order is immaterial across reload/exact refund; extra or changed descriptor fields remain rejected');
