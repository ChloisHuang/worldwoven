// Regression risks: receptionist credit must share the payer/artist/property
// save, survive ownership changes, and never replay or repair itself as money.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaSalonReceptionAccount} from '../source/game/china-salon-reception-account.js';
import {SALON_RECEPTION_ROLE as ROLE} from '../source/game/china-salon-reception-role.js';
const copy=structuredClone,artist='cn-tavern-reciter';
const proof=(n=1,changes={})=>({kind:'salon-reception-work',version:1,sessionId:`cn-salon-1-${n}`,actorId:ROLE.incumbentId,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:0,contractVersion:1,amount:8,customerId:'player',artistId:artist,activity:'poetry',fee:20,roomId:'tavern-guest-lan',steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true,...changes});
const service=p=>({id:p.sessionId,actorId:p.artistId,customerId:p.customerId,activity:p.activity,fee:p.fee,roomId:p.roomId,incomePolicy:{version:1,performerShareBps:5000,rounding:'floor'},completed:true,receptionWork:p});
const txFor=p=>({id:`test-settlement:${p.sessionId}`,action:'settle',currency:'copper',reservationId:p.sessionId,requestId:JSON.stringify(['settle',p.sessionId]),amount:p.fee});
function fixture(input={}){
 const saved=copy({chinaServiceWorld:{till:0},copperLedger:{version:1,cash:1000,bank:900,accountOpened:true,nextTransaction:1,transactions:[]},...input});
 let durable=copy(saved),economy,property,account,activeProof=null,failure=null,writes=0,day=0;
 const storage={setItem(key,text){if(failure==='false')return false;if(failure==='throw')throw Error('quota');if(failure==='promise')return Promise.resolve();durable=JSON.parse(text);writes++;return true;}};
 const ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>tx.action==='settle'?economy.prepareIncome(tx,activeProof):property?.prepareCurrencyCommit(tx)});
 economy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:ledger,getReceptionAccount:()=>account});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day}),getTill:()=>saved.chinaServiceWorld.till+economy.summary().businessProceeds,getReceptionAccount:()=>account,
  saveState(next){const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,chinaTavernProperty:next}));if(result===false||result?.then)return result;saved.chinaTavernProperty=next;return true;}});
 account=createChinaSalonReceptionAccount({saved:saved.chinaSalonReceptionAccount,getSalonIncome:()=>economy.snapshot(),getProperty:()=>property});
 const total=()=>{const b=ledger.balances().copper,p=property.state();return b.cash+b.bank+b.held+p.balance+Object.values(p.npcFunds).reduce((sum,n)=>sum+n,0)+economy.account(artist).bank+(account.account()?.bank||0);};
 return {saved,ledger,economy,property,account,total,get durable(){return copy(durable);},get writes(){return writes;},get day(){return day;},set day(n){day=n;},set failure(value){failure=value;},
  reserve(p){return ledger.reserve(p.fee,p.sessionId);},settle(p,withWork=true){activeProof=service(p);if(!withWork)delete activeProof.receptionWork;return ledger.settle(p.sessionId);},
  prepare(p){return economy.prepareIncome(txFor(p),service(p));}};
}
const failure=(result,code)=>{assert.equal(result.ok,false);if(code)assert.equal(result.code,code);};
const f=fixture(),initial=f.total();assert.deepEqual(f.account.account(),{cash:0,bank:0});
assert(f.reserve(proof()).ok);const before=f.writes;assert(f.settle(proof()).ok);assert.equal(f.writes,before+1);
assert.equal(f.economy.summary().grossRevenue,20);assert.equal(f.economy.account(artist).bank,10);assert.equal(f.account.account().bank,8);assert.equal(f.property.state().balance,122);assert.equal(f.property.state().paidWages,8);assert.equal(f.total(),initial);
assert(f.property.verifyReceptionAccount().ok);assert(f.ledger.settle(proof().sessionId).replayed);assert.equal(f.writes,before+1);
const loaded=fixture(f.durable);assert.equal(loaded.account.loadError,null);assert.equal(loaded.property.loadError,null);assert(loaded.property.verifyReceptionAccount().ok);assert.equal(loaded.total(),initial);
const receipt=f.economy.snapshot().receipts[0];assert(f.account.prepareWage({proof:proof(),settlementReceipt:receipt}).replayed);
const revised=proof(1,{holderRevision:1});failure(f.account.prepareWage({proof:revised,settlementReceipt:{...receipt,receptionWork:revised}}),'reception-wage-conflict');
for(const bad of [proof(1,{completed:false}),proof(1,{amount:9}),proof(1,{actorId:'player'}),proof(1,{steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:1}})])failure(f.account.prepareWage({proof:bad,settlementReceipt:receipt}));
console.log('PASS minimum20 -> artist10/business10 -> receptionist8/retained2; one save, zero-origin balance, canonical replay and holder-independent identity');

for(const mode of ['false','throw','promise']){
 const g=fixture(),p=proof();assert(g.reserve(p).ok);const prior=g.durable,bank=g.ledger.balances().copper.bank;
 g.failure=mode;failure(g.settle(p));assert.equal(g.account.account().bank,0);assert.equal(g.economy.account(artist).bank,0);assert.equal(g.property.state().paidWages,0);assert.equal(g.property.state().balance,120);assert.equal(g.ledger.balances().copper.bank,bank);assert.deepEqual(g.durable,prior);
 g.failure=null;assert(g.settle(p).ok);assert.equal(g.account.account().bank,8);assert.equal(g.property.state().paidWages,8);
}
{
 const g=fixture(),p=proof(),candidate=g.prepare(p),before=g.account.snapshot();assert(candidate.ok);assert(candidate.valid());
 assert(g.property.refreshDay().ok);assert.equal(candidate.valid(),false);assert.equal(candidate.committed(),false);assert.deepEqual(g.account.snapshot(),before);assert.equal(g.economy.summary().grossRevenue,0);
}
{
 const g=fixture(),p=proof();assert(g.reserve(p).ok);assert(g.settle(p,false).ok);assert.equal(g.account.account().bank,0);
 const historical={...g.economy.snapshot().receipts[0],receptionWork:p};failure(g.account.prepareWage({proof:p,settlementReceipt:historical}),'reception-historical-income');
 assert.equal(fixture(g.durable).account.account().bank,0);
}
console.log('PASS failed/throwing/async save leaves every leg unchanged; retry once, stale participant rejected, legacy income earns no backpay');

for(const change of [
 saved=>saved.chinaSalonReceptionAccount.accounts[ROLE.incumbentId].bank++,
 saved=>saved.chinaSalonReceptionAccount.receipts[0].settlementId='fabricated',
 saved=>saved.chinaSalonReceptionAccount.receipts.push(copy(saved.chinaSalonReceptionAccount.receipts[0])),
 saved=>delete saved.chinaSalonReceptionAccount,
 saved=>saved.chinaTavernProperty.events.splice(0,1),
 saved=>saved.chinaTavernProperty.events[0].amount++,
 saved=>delete saved.chinaSalonEconomy.receipts[0].receptionWork,
]){
 const saved=f.durable;change(saved);const bad=fixture(saved);assert(bad.account.loadError);assert.equal(bad.account.account(),null);failure(bad.account.prepareWage({proof:proof(2),settlementReceipt:receipt}));
}
console.log('PASS both-direction property/income/account journals reject altered amounts, missing counterpart, duplicate and fabricated source');

{
 const g=fixture();for(let tries=0;tries<8;tries++){assert(g.property.refreshDay().ok);if(g.property.state().market.willing)break;g.day++;}
 let state=g.property.state();assert(state.market.willing);assert(g.property.applyPurchase(state.market.price).ok);assert(g.property.confirmPurchase().ok);
 const before=g.total(),cash=g.ledger.balances().copper.cash;assert(g.property.draw(g.property.state().balance).ok);assert.equal(g.property.state().balance,0);
 assert(g.reserve(proof()).ok);assert(g.settle(proof()).ok);assert.equal(g.property.state().balance,2);assert.equal(g.account.account().bank,8);assert.equal(g.ledger.balances().copper.cash,cash-20);assert.equal(g.total(),before);
 assert(g.property.setPrice(200).ok);state=g.property.state();const bid=state.market.offers.find(o=>o.status==='open');assert(bid);assert(g.property.replyOffer(bid.id,true).ok);
 assert.equal(g.property.state().balance,2);assert.equal(g.account.account().bank,8);assert(g.reserve(proof(2)).ok);assert(g.settle(proof(2)).ok);assert.equal(g.property.state().balance,4);assert.equal(g.account.account().bank,16);assert.equal(g.total(),before);
 const reloaded=fixture(g.durable);assert.equal(reloaded.account.loadError,null);assert.equal(reloaded.property.state().ownerId,bid.buyerId);assert.equal(reloaded.property.state().balance,4);assert.equal(reloaded.total(),before);
}
{
 const g=fixture();for(let i=0;i<5;i++)assert(g.ledger.creditWageToBank({amount:120,receiptId:`finite-wage:${i}`,roleId:'cn-tavern-helper',slotId:'helper',day:i}).ok);
 assert.equal(g.property.state().balance,0);assert.equal(g.property.state().npcFunds['cn-tavern-host'],0);
 assert(g.reserve(proof()).ok);assert(g.settle(proof()).ok);assert.equal(g.property.state().balance,2);assert.equal(g.property.state().npcFunds['cn-tavern-host'],0);
 assert.equal(g.account.account().bank,8);assert.equal(g.economy.account(artist).bank,10);
}
console.log('PASS real ownership purchase/sale/draw and empty owner funds preserve artist share, finite business debit and receptionist personal income');
