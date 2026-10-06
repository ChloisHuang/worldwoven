// Dormant financial bridge only. Actual office/service motion is a later gate.
import assert from 'node:assert/strict';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createChinaOfficialSalonPayments} from '../source/game/china-official-salon-payments.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
const copy=x=>JSON.parse(JSON.stringify(x)),customerId=CHINA_OFFICIAL_IDS[5],artistId='cn-tavern-reciter';
const policy={version:1,performerShareBps:5000,rounding:'floor'};
function fixture(input={}){
 let saved=copy(input),fail=false,writes=0;
 const official=createChinaOfficialEconomy({saved:saved.chinaOfficialEconomy,getDay:()=>20,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:(next,tx,patch={})=>{if(fail)return false;saved={...saved,...copy(patch),chinaOfficialEconomy:copy(next)};writes++;return true;}});
 const artist=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,officialEconomy:official,saveState:(next,tx,patch={})=>{if(fail)return false;saved={...saved,...copy(patch),chinaSalonEconomy:copy(next)};writes++;return true;}});
 const pay=day=>official.completeDuty({actorId:customerId,day,receiptId:`cn-official-duty:${customerId}:${day}`,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}});
 function settlement(order){const proof={id:order.orderId,actorId:artistId,customerId,activity:'poetry',fee:order.amount,incomePolicy:policy,completed:true},payment=official.prepareSalonSettle({...order,evidence:{kind:'salon-service',completed:true,orderId:order.orderId,customerId,artistId,activity:'poetry',elapsed:2.2,duration:2.2}});assert(payment.ok,payment.code);const income=artist.prepareOfficialIncome(payment.transaction,proof);assert(income.ok,income.code);return {payment,income,commit(){if(!payment.valid()||!income.valid())return {ok:false};const result=payment.commit({...income.patch,chinaSalonNPC:{order:null,lastCompleted:order.orderId}});if(result.ok)assert(income.committed()!==false);return result;}};}
 return {official,artist,pay,settlement,get saved(){return copy(saved);},get writes(){return writes;},set fail(v){fail=v;}};
}
const f=fixture();for(let day=0;day<6;day++)assert(f.pay(day).ok);
const order={actorId:customerId,orderId:'cn-salon-npc-1',amount:115,artistId,activity:'poetry',incomePolicy:policy};
assert(f.official.prepareSalonReserve(order).commit({chinaSalonNPC:{order}}).ok);
assert.deepEqual(f.official.account(customerId),{bank:29,cash:0});assert.equal(f.artist.account(artistId).bank,0);
const settlement=f.settlement(order),before=f.saved;f.fail=true;assert.equal(settlement.commit().ok,false);assert.deepEqual(f.saved,before);assert.equal(f.artist.account(artistId).bank,0);f.fail=false;assert(settlement.commit().ok);
assert.equal(f.artist.account(artistId).bank,57);assert.equal(f.artist.summary().businessProceeds,58);assert.equal(f.official.account(customerId).bank+f.artist.account(artistId).bank+f.artist.summary().businessProceeds,144);
const reload=fixture(f.saved);assert.equal(reload.official.loadError,null);assert.equal(reload.artist.loadError,null);assert.equal(reload.artist.account(artistId).bank,57);const replay=reload.settlement(order);assert(replay.income.replayed);assert(replay.commit().ok);assert.equal(reload.artist.account(artistId).bank,57);
assert.equal(reload.official.prepareSalonRefund(order).ok,false,'delivered service is not refunded');
const meal=reload.artist.prepareMealPayment({actorId:artistId,orderId:'cn-tavern-order-3',amount:6});assert(meal.ok);assert(meal.commit({chinaServiceWorld:{financialFixture:true}}).ok);assert.equal(reload.artist.account(artistId).bank,51);assert.equal(fixture(reload.saved).artist.account(artistId).bank,51);
// Typed provenance cannot be forged or substituted by another source/account.
const corrupt=f.saved;corrupt.chinaSalonEconomy.receipts[0].customerId=CHINA_OFFICIAL_IDS[0];assert(fixture(corrupt).artist.loadError);
const missing=f.saved;delete missing.chinaOfficialEconomy;assert(fixture(missing).artist.loadError);
const forged={...settlement.payment.transaction,id:'official-forged'};assert.equal(reload.artist.prepareOfficialIncome(forged,{id:order.orderId,actorId:artistId,customerId,activity:'poetry',fee:115,incomePolicy:policy,completed:true}).ok,false);
const cancelled=fixture();assert(cancelled.pay(0).ok);assert(cancelled.pay(1).ok);const small={...order,amount:20};assert(cancelled.official.prepareSalonReserve(small).commit().ok);assert(cancelled.official.prepareSalonRefund(small).commit().ok);assert.equal(cancelled.artist.account(artistId).bank,0);assert.equal(cancelled.official.account(customerId).bank,48);
console.log('PASS dormant official earned-pay hold -> atomic 50/50 provenance -> artist personal meal debit; failed save/retry/reload/duplicate/cancel and forged-source rejection');

const portCase=fixture();for(let day=0;day<6;day++)assert(portCase.pay(day).ok);
const port=createChinaOfficialSalonPayments({officialEconomy:portCase.official,artistEconomy:portCase.artist}),session={id:port.nextId(),customerId,actorId:artistId,activity:'poetry',fee:115,incomePolicy:policy};
assert(port.available(customerId,115));assert(port.reserve(session).ok);assert.equal(portCase.artist.account(artistId).bank,0);assert.equal(port.settle(session,{elapsed:2.1}).ok,false);
portCase.fail=true;assert.equal(port.settle(session,{elapsed:2.2}).ok,false);assert.equal(portCase.artist.account(artistId).bank,0);portCase.fail=false;assert(port.settle(session,{elapsed:2.2}).ok);assert.equal(portCase.artist.account(artistId).bank,57);assert(port.settle(session,{elapsed:2.2}).ok);assert.equal(portCase.artist.account(artistId).bank,57);assert.equal(port.refund(session).ok,false);
assert.equal(port.nextId(),'cn-salon-npc-2');assert.equal(port.held().length,0);assert.equal(fixture(portCase.saved).artist.account(artistId).bank,57);
console.log('PASS original-controller payment port preserves pending holds and commits official debit plus artist income atomically');
