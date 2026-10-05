// Regression risks: a buy/sell click spans ownership and a shared bank receipt;
// failed storage, stale controls, reloads and payroll must not split that write.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const seedSave=()=>({visited:[],stamps:{},chinaServiceWorld:{till:0},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}});
function fixture(input=seedSave()) {
 let saved=clone(input),durable=clone(input),failure=null,writes=0,day=0,property,ledger;
 const storage={setItem(key,json){if(failure==='throw')throw Error('quota');if(failure==='false')return false;if(failure==='promise')return Promise.resolve();durable=JSON.parse(json);writes++;}};
 const load=()=>{
  ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
  property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day}),getTill:()=>saved.chinaServiceWorld.till,worldSeed:1,
   saveState(next){const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,chinaTavernProperty:next}));if(result===false||result?.then)return result;saved.chinaTavernProperty=next;}});
 };
 load();
 return {get property(){return property;},get ledger(){return ledger;},get durable(){return clone(durable);},get writes(){return writes;},get saved(){return saved;},set failure(value){failure=value;},set day(value){day=value;},get day(){return day;},income(n){saved.chinaServiceWorld.till+=n;durable=clone(saved);},reload(){saved=clone(durable);load();}};
}
const code=(r,c)=>{assert.equal(r.ok,false);assert.equal(r.code,c);};
function consenting(f) {for(let n=0;n<8;n++){assert(f.property.refreshDay().ok);const s=f.property.state();if(s.market.willing)return s;f.day++;}throw Error('expected a willing daily seller');}
function buy(f) {const s=consenting(f);assert(f.property.applyPurchase(s.market.price,s.revision).ok);assert(f.property.confirmPurchase(f.property.state().revision).ok);assert.equal(f.property.state().ownerId,'player');return s.market.price;}
const checks=[];
{
 const f=fixture();f.property.refreshDay();const first=f.property.state(),w=f.writes;
 for(let i=0;i<3;i++)assert(f.property.refreshDay().ok);assert.equal(f.writes,w);f.reload();assert.deepEqual(f.property.state().market,first.market);
 assert(f.property.applyPurchase(1,first.revision).ok);assert.equal(f.property.state().market.application.status,'rejected');code(f.property.confirmPurchase(),'seller-consent-required');
 code(f.property.applyPurchase(first.market.price),'already-applied-today');f.reload();assert.equal(f.property.state().market.application.status,'rejected');assert.equal(f.ledger.state().bank,900);
 f.day++;assert(f.property.refreshDay().ok);assert.equal(f.property.state().market.application,null);assert.notEqual(f.property.state().market.day,first.market.day);checks.push('daily persisted listing and one stable seller refusal');
}
{
 const f=fixture();let s=consenting(f);assert(f.property.applyPurchase(s.market.price,s.revision).ok);s=f.property.state();
 const before=f.durable;
 for(const failure of ['false','throw','promise']) {f.failure=failure;code(f.property.confirmPurchase(s.revision),failure==='promise'?'async-save-unsupported':'save-failed');assert.equal(f.property.state().ownerId,'cn-tavern-host');assert.equal(f.ledger.state().bank,900);assert.deepEqual(f.durable,before);}
 f.failure=null;const price=s.market.application.amount;assert(f.property.confirmPurchase(s.revision).ok);assert.equal(f.ledger.state().bank,900-price);assert.equal(f.ledger.state().cash,50);assert.equal(f.property.state().npcFunds['cn-tavern-host'],480+price);
 code(f.property.confirmPurchase(s.revision),'stale-property-intent');const w=f.writes;f.reload();assert.equal(f.property.state().loadError,null);assert.equal(f.property.state().ownerId,'player');code(f.property.confirmPurchase(),'seller-consent-required');assert.equal(f.writes,w);checks.push('atomic failed saves, explicit confirmation, double submit and reload');
}
{
 const input=seedSave();input.copperLedger.bank=1;const f=fixture(input),s=consenting(f);f.property.applyPurchase(s.market.price);code(f.property.confirmPurchase(),'insufficient-bank');assert.equal(f.property.state().ownerId,'cn-tavern-host');assert.equal(f.ledger.state().bank,1);checks.push('insufficient funds does not transfer title');
}
{
 const f=fixture();buy(f);assert(f.property.setPrice(500).ok);let s=f.property.state();assert(s.market.offers.length>0);assert(s.market.offers.every(o=>o.amount<=s.npcFunds[o.buyerId]));
 const denied=s.market.offers[0];assert(f.property.replyOffer(denied.id,false,s.revision).ok);const original=f.property.state().market.offers;
 assert(f.property.setPrice(200).ok);s=f.property.state();assert.equal(s.market.offers.find(o=>o.id===denied.id).status,'rejected');assert(s.market.offers.every(o=>o.amount<=200));code(f.property.replyOffer(denied.id,true),'offer-unavailable');
 const offer=s.market.offers.find(o=>o.status==='open'),beforeBank=f.ledger.state().bank,beforeFunds=s.npcFunds[offer.buyerId],balance=s.balance;
 f.failure='false';code(f.property.replyOffer(offer.id,true,s.revision),'save-failed');assert.equal(f.ledger.state().bank,beforeBank);assert.equal(f.property.state().ownerId,'player');f.failure=null;
 assert(f.property.replyOffer(offer.id,true,s.revision).ok);assert.equal(f.property.state().ownerId,offer.buyerId);assert.equal(f.property.state().npcFunds[offer.buyerId],beforeFunds-offer.amount);assert.equal(f.ledger.state().bank,beforeBank+offer.amount);assert.equal(f.property.state().balance,balance);code(f.property.replyOffer(offer.id,true,s.revision),'stale-property-intent');f.reload();assert.equal(f.property.state().loadError,null);assert.equal(f.property.state().ownerId,offer.buyerId);checks.push('player repricing/refusal and finite NPC purchase; business balance follows title');
}
{
 const f=fixture();buy(f);const starting=f.property.state().balance,bank=f.ledger.state().bank;f.income(20);assert.equal(f.property.state().balance,starting+20);assert.equal(f.ledger.state().bank,bank);
 const wage={amount:16,receiptId:'career:cn-tavern-steward:0',roleId:'cn-tavern-steward',slotId:'cn-tavern-steward:rotation',day:0};
 f.failure='throw';code(f.ledger.creditWageToBank(wage),'save-failed');assert.equal(f.property.state().paidWages,0);f.failure=null;assert(f.ledger.creditWageToBank(wage).ok);assert.equal(f.property.state().paidWages,16);assert.equal(f.property.state().balance,starting+4);assert.equal(f.ledger.state().bank,bank+16);assert(f.ledger.creditWageToBank(wage).replayed);f.reload();assert(f.ledger.creditWageToBank(wage).replayed);assert.equal(f.property.state().paidWages,16);
 const s=f.property.state();assert(f.property.draw(10,s.revision).ok);code(f.property.draw(10,s.revision),'stale-property-intent');assert.equal(f.property.state().balance,starting-6);assert.equal(f.ledger.state().bank,bank+26);assert(f.property.invest(20).ok);assert.equal(f.property.state().balance,starting+14);assert.equal(f.ledger.state().bank,bank+6);
 assert(f.property.draw(f.property.state().balance).ok);code(f.ledger.creditWageToBank({...wage,receiptId:'career:cn-tavern-steward:1',day:1}),'insufficient-business-funds');assert.equal(f.property.state().paidWages,16);assert(f.property.invest(20).ok);assert(f.ledger.creditWageToBank({...wage,receiptId:'career:cn-tavern-steward:1',day:1}).ok);f.reload();assert.equal(f.property.state().loadError,null);checks.push('gross till, real wage receipts, capital and withdrawals reconcile without wallet income');
}
{
 const f=fixture();for(let i=0;i<5;i++)assert(f.ledger.creditWageToBank({amount:120,receiptId:`finite-wage:${i}`,roleId:'cn-tavern-helper',slotId:'helper',day:i}).ok);
 assert.equal(f.property.state().npcFunds['cn-tavern-host'],0);assert.equal(f.property.state().balance,0);code(f.ledger.creditWageToBank({amount:1,receiptId:'finite-wage:6',roleId:'cn-tavern-helper',slotId:'helper',day:6}),'insufficient-business-funds');
 code(f.ledger.transferBusiness({amount:50,receiptId:'forged-sale',operation:'sale'}),'property-consent-required');f.reload();assert.equal(f.property.state().loadError,null);checks.push('NPC operating support is finite; business credits require consent');
}
{
 const f=fixture();buy(f);const broken=f.durable;broken.chinaTavernProperty.events[0].amount++;const b=fixture(broken);assert(b.property.state().loadError);code(b.property.setPrice(100),b.property.state().loadError);checks.push('altered title receipt fails closed');
}
console.log('PASS tavern property:',checks.join('; '));
