// Regression risk: the new salaried player seat must debit the existing finite
// employer exactly once, while historical NPC per-order income stays separate.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createFormalCareers,SALON_RECEPTION_CAREER_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaSalonReceptionAccount,receptionWageReceipt} from '../source/game/china-salon-reception-account.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const copy=structuredClone,WORK=ROLE.workSource+'-1';
const proof=n=>({kind:'salon-reception-work',version:1,sessionId:'cn-salon-npc-'+n,actorId:'player',roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:1,contractVersion:2,amount:0,customerId:CHINA_OFFICIAL_IDS[0],artistId:'cn-tavern-reciter',activity:'poetry',fee:20,roomId:'tavern-guest-lan',steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true});
const receipt=(n,waitSeconds=8)=>({source:'china-salon-reception',id:`cn-salon-npc-${n}-${WORK}`,workReceiptId:WORK,sessionId:'cn-salon-npc-'+n,customerId:CHINA_OFFICIAL_IDS[0],customerName:'原来客',completed:true,accurate:true,timely:waitSeconds<=60,waitSeconds,proof:proof(n)});
function fixture(input=null){
 const clock=copy(input?.clock||{day:1,hour:6,seconds:0}),flags={bank:null,career:false};
 const seed=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();
 let durable=copy(input||{formalCareers:{...seed,skills:{...seed.skills,ritual:2,writing:1},tenure:{roleId:ROLE.id,slotId:ROLE.slotId,sinceDay:1,sinceHour:6}}}),saved=copy(durable),property,writes=0;
 const ledger=createGameCurrencyLedger({saved,getClock:()=>clock,storage:{setItem(_key,text){
  if(flags.bank==='false')return false;if(flags.bank==='throw')throw Error('quota');if(flags.bank==='async')return Promise.resolve();
  durable={...JSON.parse(text),clock:copy(clock)};writes++;return true;
 }},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>clock,getTill:()=>0});
 const careers=createFormalCareers({saved:saved.formalCareers,getClock:()=>clock,creditWageToBank:ledger.creditWageToBank,saveState:next=>{
  if(flags.career)return false;saved.formalCareers=copy(next);durable={...copy(saved),clock:copy(clock)};return true;
 }});
 assert.equal(careers.state().loadError,null);assert.equal(property.loadError,null);assert.equal(ledger.loadError,null);
 const start=(day=clock.day)=>{clock.day=day;clock.hour=6;clock.seconds=(day-1)*1440/GAME_MINUTES_PER_SECOND;assert(careers.beginDuty({receiptId:ROLE.workSource+'-'+day}).ok);};
 const finish=(hours=12,completedTasks=0)=>{clock.hour=6+hours;clock.seconds+=hours*60/GAME_MINUTES_PER_SECOND;const args={roleId:ROLE.id,receiptId:ROLE.workSource+'-'+clock.day,coveredSeconds:hours*60/GAME_MINUTES_PER_SECOND,completedTasks};assert(careers.laborEvent('completed',args).ok);assert(careers.laborEvent('inspected',args).ok);};
 return {clock,flags,careers,ledger,property,start,finish,get durable(){return copy(durable);},get writes(){return writes;}};
}

test('actual careers → bank → property pays full16 and half8 once, without cash or NPC order income',()=>{
 for(const hours of [6,12]){
  const f=fixture();f.start();f.finish(hours);const wage=hours===6?8:16;
  assert.equal(f.careers.state().lastDuty.wage,wage);assert.equal(f.ledger.state().bank,0);
  const paid=f.careers.settle();assert(paid.ok);assert.equal(f.ledger.state().bank,wage);assert.equal(f.ledger.state().cash,0);
  assert.equal(f.property.state().paidWages,wage);assert.equal(f.property.state().balance,120-wage);
  assert.deepEqual(f.property.snapshot().events.map(e=>e.kind),['wage']);
  const re=fixture(f.durable);assert.equal(re.careers.state().lastDuty.stage,'paid');
  assert.equal(re.careers.settle().code,'work-incomplete');assert(re.ledger.creditWageToBank(paid.deposit).replayed);
  assert.equal(re.ledger.state().bank,wage);assert.equal(re.property.state().balance,120-wage);assert.equal(re.property.snapshot().events.length,1);
 }
});

test('reviews atomically cap four daily writing credits, restore/replay/conflict and never modulate wages',()=>{
 const f=fixture();f.start();const original=f.durable;f.flags.career=true;
 assert.equal(f.careers.recordChinaSalonReceptionReview(receipt(1)).ok,false);assert.deepEqual(f.durable,original);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);f.flags.career=false;
 for(let n=1;n<=5;n++){const result=f.careers.recordChinaSalonReceptionReview(receipt(n,n===2?61:8));assert(result.ok);assert.equal(result.xpGained,n<=4?10:0);assert.equal(result.servicePenalty,0);}
 assert.equal(f.careers.state().daily.writing,4);assert.equal(f.careers.state().lastDuty.customerReviews[1].score,0);
 assert(f.careers.recordChinaSalonReceptionReview(receipt(1)).replayed);
 assert.equal(f.careers.recordChinaSalonReceptionReview({...receipt(1),customerName:'different'}).code,'review-conflict');
 assert.equal(f.careers.recordChinaSalonReceptionReview({...receipt(6),proof:{...proof(6),amount:8}}).code,'invalid-work-receipt');
 const before=f.careers.state(),re=fixture(f.durable);assert.deepEqual(re.careers.state().skillXP,before.skillXP);assert.deepEqual(re.careers.state().skills,before.skills);assert(re.careers.recordChinaSalonReceptionReview(receipt(1)).replayed);
 re.finish(12,5);assert.equal(re.careers.state().lastDuty.wage,16);assert(re.careers.settle().ok);assert.equal(re.ledger.state().bank,16);assert.equal(re.property.state().paidWages,16);
 const malformed=f.durable;malformed.formalCareers.lastDuty.customerReviews[0].salonReceptionReceipt.proof.amount=8;
 assert.equal(createFormalCareers({saved:malformed.formalCareers,getClock:()=>f.clock,saveState:()=>true}).state().loadError,'invalid-career-state');
});

test('bank save failure and post-credit career cleanup failure retain one payable receipt, never double debit',()=>{
 for(const failure of ['false','throw','async']){
  const f=fixture();f.start();f.finish();const prior=f.durable;f.flags.bank=failure;
  assert.equal(f.careers.settle().ok,false);assert.deepEqual(f.durable,prior);assert.equal(f.careers.state().lastDuty.stage,'ready');assert.equal(f.ledger.state().bank,0);assert.equal(f.property.state().balance,120);assert.equal(f.property.snapshot().events.length,0);
  f.flags.bank=null;f.flags.career=true;const paid=f.careers.settle();assert(paid.ok&&paid.cleanupPending);assert.equal(f.ledger.state().bank,16);assert.equal(f.property.state().balance,104);assert.equal(f.durable.formalCareers.lastDuty.stage,'ready');
  const re=fixture(f.durable),repaid=re.careers.settle();assert(repaid.ok&&repaid.replayed);assert.equal(re.careers.state().lastDuty.stage,'paid');assert.equal(re.ledger.state().bank,16);assert.equal(re.property.state().balance,104);assert.equal(re.property.snapshot().events.length,1);assert.equal(re.writes,0);
 }
});

test('real daily player payroll exhausts the existing owner purse and leaves uncovered wages ready and owed',()=>{
 let f=fixture();for(let day=1;day<=37;day++){f.start(day);f.finish();assert(f.careers.settle().ok);}
 f.start(38);f.finish(6);assert(f.careers.settle().ok);
 // Existing bank interest remains separate from employer-funded salary.
 assert.equal(f.ledger.history().filter(t=>t.action==='wage').reduce((n,t)=>n+t.amount,0),600);assert.equal(f.property.state().balance,0);assert.equal(f.property.state().npcFunds['cn-tavern-host'],0);const bankBefore=f.ledger.state().bank;
 f.start(39);f.finish();const prior=f.durable;
 assert.equal(f.careers.settle().code,'insufficient-business-funds');assert.equal(f.careers.state().lastDuty.stage,'ready');assert.equal(f.careers.state().lastDuty.wage,16);assert.deepEqual(f.durable,prior);
 f=fixture(prior);assert.equal(f.careers.settle().code,'insufficient-business-funds');assert.equal(f.ledger.state().bank,bankBefore);assert.equal(f.property.state().paidWages,600);assert.equal(f.property.state().balance,0);assert.equal(f.property.state().npcFunds['cn-tavern-host'],0);
});

test('player v2 completed NPC order preserves evidence but never pays the legacy NPC eight-copper contract',()=>{
 const p=proof(1),tx={id:'official-tx-1',receiptId:'official-salon-settle:'+p.sessionId,action:'salon-settle',orderId:p.sessionId,amount:20,artistId:p.artistId,activity:p.activity,actorId:p.customerId,incomePolicy:{version:1,performerShareBps:5000,rounding:'floor'},evidence:{kind:'salon-service',completed:true,orderId:p.sessionId,customerId:p.customerId,artistId:p.artistId,activity:p.activity,elapsed:3,duration:3}};
 // Only official-source admission is stubbed here; artist accounting, canonical
 // proof validation and receptionist-account restoration are their real modules.
 const official={history:()=>[tx],prepareSalonSettle:()=>({ok:true,transaction:tx})};let calls=0;
 const economy=createChinaSalonEconomy({copperLedger:{history:()=>[]},officialEconomy:official,getReceptionAccount:()=>{calls++;throw Error('player order cannot invoke NPC wages');}});
 const service={id:p.sessionId,actorId:p.artistId,customerId:p.customerId,activity:p.activity,fee:20,roomId:p.roomId,incomePolicy:tx.incomePolicy,completed:true,receptionWork:p};
 const candidate=economy.prepareOfficialIncome(tx,service);assert(candidate.ok);assert(candidate.lock());assert(candidate.committed());candidate.release();assert.equal(calls,0);
 assert.equal(economy.account(p.artistId).bank,10);assert.equal(economy.summary().businessProceeds,10);assert.deepEqual(economy.snapshot().receipts[0].receptionWork,p);assert(economy.prepareOfficialIncome(tx,service).replayed);
 const restored=createChinaSalonEconomy({saved:economy.snapshot(),copperLedger:{history:()=>[]},officialEconomy:official});assert.equal(restored.loadError,null);
 const account=createChinaSalonReceptionAccount({getSalonIncome:()=>restored,getProperty:()=>({events:[]})});assert.equal(account.loadError,null);assert.equal(account.account().bank,0);assert.deepEqual(account.snapshot().receipts,[]);
 assert.throws(()=>receptionWageReceipt(p,economy.snapshot().receipts[0]),/invalid-reception-wage-contract/);
 assert.equal(account.prepareWage({proof:p,settlementReceipt:economy.snapshot().receipts[0]}).ok,false);
});
