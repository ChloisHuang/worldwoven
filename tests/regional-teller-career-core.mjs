// Protect the shared daily ledger boundary: four real hiring desks must never
// become four pay sources, and an atomic save failure cannot grant XP or wages.
import assert from 'node:assert/strict';
import {createFormalCareers,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {REGIONAL_TELLER_ROLES,regionalTellerContract,regionalTellerAuditProof,freezeTellerSource} from '../source/game/regional-teller-audit-proof.js';
import {validTellerAuditReceipt,sameTellerAuditReceipt} from '../source/game/regional-teller-career-proof.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
const roles=Object.values(REGIONAL_TELLER_ROLES),copy=structuredClone;
function fixture(role,{saved=null,seedChange=()=>{}}={}){
 const clock={day:3,hour:8,seconds:300},store=copy(saved||{}),flags={fail:false};let core,pending;
 const bank=createGameCurrencyLedger({saved:store,storage:{setItem(key,value){if(flags.fail)return false;Object.assign(store,JSON.parse(value));return true;}},transactionParticipant:tx=>{
  if(!pending||tx.action!=='wage'||tx.requestId!==pending.id||tx.roleId!==pending.roleId||tx.slotId!==pending.slotId||tx.amount!==8||tx.day!==pending.day||tx.currency!==pending.currency)return {ok:false,code:'original-audit-required'};
  return core.prepareTellerAuditService(pending);
 }});
 if(!store.formalCareers){const seed=createFormalCareers({saveState:()=>true,getClock:()=>clock}).state();Object.assign(seed.skills,role.skillRequirements);seed.tenure={roleId:role.id,slotId:role.slotId,sinceDay:3,sinceHour:8};seedChange(seed);store.formalCareers=seed;}
 core=createFormalCareers({saved:store.formalCareers,getClock:()=>clock,saveState:next=>{if(flags.fail)return false;store.formalCareers=copy(next);return true;}});
 const receipt=(forRole=role)=>{const proof=regionalTellerAuditProof(regionalTellerContract({country:forRole.country,day:clock.day,holderRevision:1,source:freezeTellerSource(bank)}));return {version:1,id:proof.orderId,roleId:forRole.id,slotId:forRole.slotId,day:clock.day,amount:8,currency:forRole.currency,proof,completedAt:clock.seconds};};
 const pay=r=>{pending=r;try{return bank.creditWageToBank({amount:r.amount,receiptId:r.id,roleId:r.roleId,slotId:r.slotId,day:r.day,currency:r.currency});}finally{pending=null;}};
 return {core,bank,clock,store,flags,receipt,pay};
}
for(const role of roles){
 assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===role.id).length,1);assert.equal(FORMAL_CAREER_SLOTS.filter(r=>r.roleId===role.id).length,1);
 assert.equal(FORMAL_CAREER_SLOTS.find(r=>r.roleId===role.id).replacement,true);assert.equal(role.paymentKind,'salary');assert.deepEqual(role.skillRequirements,{writing:1,ritual:1});
 const seed=createFormalCareers({saveState:()=>true,getClock:()=>({day:3,hour:8,seconds:300})}).state();
 const bare=createFormalCareers({saveState:()=>true,getClock:()=>({day:3,hour:8,seconds:300})});
 assert(bare.eligibility(role.id,{ageYears:17}).reasons.includes('adult-required'));assert.deepEqual(bare.eligibility(role.id,{ageYears:18}).reasons,['writing-required','ritual-required']);
 Object.assign(seed.skills,role.skillRequirements);let worldSeed=1;while(careerInterviewRoll(worldSeed,role.id,3)>=.5)worldSeed++;
 const hiring=createFormalCareers({saved:seed,worldSeed,saveState:()=>true,getClock:()=>({day:3,hour:8,seconds:300})});
 assert(hiring.apply(role.id,{ageYears:18}).ok);assert.equal(hiring.state().tenure,null);assert(hiring.reviewApplication(role.id,{ageYears:18,applicationId:hiring.applicationResult(role.id).id}).ok);assert.equal(hiring.slotHolder(role.id),'player');assert.equal(hiring.catalogue().find(r=>r.id===role.id).vacancy,0);
 const f=fixture(role),r=f.receipt(),before=f.core.state();assert.equal(before.loadError,null);assert(validTellerAuditReceipt(r));assert.equal(r.proof.report.rows.length,4);assert(r.proof.report.rows.every(row=>row.total===0),'all zero-activity original currencies still require audit');
 assert.equal(f.core.beginDutyAvailability(role.id,{receiptId:role.workSource+'-1'}).ok,true);assert.equal(f.core.settle().code,'work-incomplete');
 const preparationBefore=f.core.state(),prepared=f.core.prepareTellerAuditService(r);assert(prepared.ok);assert.equal(prepared.skill,'writing');assert.equal(prepared.xpGained,10);assert.equal(prepared.review.score,1);assert.deepEqual(f.core.state(),preparationBefore,'preparation is read-only');
 assert.equal(f.bank.creditWageToBank({amount:8,receiptId:r.id,roleId:r.roleId,slotId:r.slotId,day:r.day,currency:r.currency}).ok,false,'direct wages require live original work participant');
 f.flags.fail=true;assert.equal(f.pay(r).ok,false);assert.equal(f.core.state().tellerAuditServices.length,0);assert.equal(f.bank.balances()[role.currency].bank,0);assert.equal(f.core.state().skillXP.writing,0);
 f.flags.fail=false;assert(f.pay(r).ok);assert.equal(f.bank.balances()[role.currency].bank,8);assert.equal(f.core.state().performance,1);assert.equal(f.core.state().skillXP.writing,10);assert.equal(f.core.state().lastDuty,null);assert.equal(f.core.state().promotionProgress,0);assert.equal(f.core.beginDuty({receiptId:role.workSource+'-1'}).code,'legacy-teller-paid-today');
 for(const other of roles.filter(v=>v.id!==role.id))assert.equal(f.bank.balances()[other.currency].bank,0,'pay stays in frozen signing currency');
 assert(f.pay(r).replayed);assert(f.core.prepareTellerAuditService(r).replayed);assert.equal(f.core.state().performance,1);
 const reload=fixture(role,{saved:f.store});assert.equal(reload.core.state().loadError,null);assert(reload.pay(r).replayed);assert.equal(reload.core.workState().latestTellerAuditReview.score,1);assert(!('tellerAuditServices' in reload.core.workState()));
 const reordered=Object.fromEntries(Object.entries(r).reverse());assert(sameTellerAuditReceipt(r,reordered));
 for(const change of [{amount:9},{currency:roles.find(v=>v.currency!==role.currency).currency},{roleId:role.country},{extra:true},{id:r.id+'-duplicate'},{proof:{...r.proof,actorId:role.incumbentId}},{proof:{...r.proof,steps:[]}},{proof:{...r.proof,journal:[{fake:true}]}},{proof:{...r.proof,returnedHome:false}}])assert(!validTellerAuditReceipt({...r,...change}),JSON.stringify(change));
 assert.equal(f.core.prepareTellerAuditService({...r,completedAt:r.completedAt-1}).code,'work-receipt-conflict');
 for(const other of roles.filter(v=>v.id!==role.id)){const otherReceipt=f.receipt(other);assert(validTellerAuditReceipt(otherReceipt));assert.equal(f.core.prepareTellerAuditService(otherReceipt).code,'work-receipt-conflict');assert.equal(f.pay(otherReceipt).ok,false,'same global day cannot be paid at another country desk');}
 f.clock.day=4;f.clock.seconds+=100;assert(f.pay(f.receipt()).ok);assert.equal(f.core.state().tellerAuditServices.length,2);assert.equal(f.bank.balances()[role.currency].bank,16);
 for(const corrupt of [s=>delete s.tellerAuditServices,s=>s.tellerAuditServices.push(copy(r)),s=>s.tellerAuditServices[0].currency=roles.find(v=>v.currency!==role.currency).currency,s=>s.tellerAuditServices.reverse(),s=>s.tellerAuditServices[0].proof.report.rows[0].bank++]){const s=copy(f.store.formalCareers);corrupt(s);assert.equal(createFormalCareers({saved:s,saveState:()=>true,getClock:()=>f.clock}).state().loadError,'invalid-career-state');}
 const old=copy(before);old.version=12;delete old.tellerAuditServices;const untouched=copy(old);let writes=0;const migrated=createFormalCareers({saved:old,saveState:()=>{writes++;},getClock:()=>f.clock}).state();assert.equal(migrated.loadError,null);assert.equal(migrated.version,13);assert.deepEqual(migrated.tellerAuditServices,[]);assert.deepEqual(old,untouched);assert.equal(writes,0);for(const key of Object.keys(old).filter(k=>k!=='version'))assert.deepEqual(migrated[key],old[key]);
 const downgraded=copy(f.store.formalCareers);downgraded.version=12;assert.equal(createFormalCareers({saved:downgraded,saveState:()=>true,getClock:()=>f.clock}).state().loadError,'invalid-career-state','cannot erase completed audits by downgrading version');
 assert(f.core.resign().ok);assert(f.core.prepareTellerAuditService(r).replayed);assert.equal(f.core.slotHolder(role.id),role.incumbentId);
}
console.log('PASS all four local hiring entries, adult/skills/one-seat, four-currency originals, global daily duplicate rejection, frozen wages, atomic failure/reload/replay and v12 migration');
for(const role of roles){
 const capped=fixture(role,{seedChange:s=>{s.daily={...s.daily,day:3,writing:4};}});assert(capped.pay(capped.receipt()).ok);assert.equal(capped.core.state().skillXP.writing,0);assert.equal(capped.core.state().daily.writing,4);assert.equal(capped.bank.balances()[role.currency].bank,8);assert.equal(capped.core.state().performance,1);
 const ceiling=fixture(role,{seedChange:s=>{s.skills.writing=99;s.skills.ritual=1;}});assert(ceiling.pay(ceiling.receipt()).ok);assert.equal(ceiling.core.state().skills.writing,99);assert.equal(ceiling.core.state().skillXP.writing,0);
 const stale=fixture(role),candidate=stale.core.prepareTellerAuditService(stale.receipt());assert(stale.core.resign().ok);assert(!candidate.valid());assert(!candidate.lock());assert(!candidate.committed());
 const locked=fixture(role),participant=locked.core.prepareTellerAuditService(locked.receipt());assert(participant.lock());assert.equal(locked.core.resign().code,'career-busy');participant.release();assert.equal(locked.core.state().tellerAuditServices.length,0);
}
console.log('PASS shared writing daily cap and skill ceiling preserve rightful pay; stale or reentrant atomic participants cannot mutate career state');

// Fixed wages use the existing continuous attendance pipeline, not audit pay.
for(const role of roles){
 for(const hours of [12,6,18*.7/60,0]){
  const clock={day:9,hour:6,seconds:9000},paid=[],seed=createFormalCareers({saveState:()=>true,getClock:()=>clock}).state();
  Object.assign(seed.skills,role.skillRequirements);seed.tenure={roleId:role.id,slotId:role.slotId,sinceDay:9,sinceHour:6};let saved,fail=false;
  const options={getClock:()=>clock,saveState:s=>{if(fail)return false;saved=copy(s);return true;},creditWageToBank:tx=>{paid.push(copy(tx));return {ok:true,receiptId:tx.receiptId};}};
  let career=createFormalCareers({...options,saved:seed});const receiptId=role.workSource+'-99';
  fail=true;assert.equal(career.beginDuty({receiptId}).ok,false);assert.equal(career.state().lastDuty,null);fail=false;
  assert(career.beginDuty({receiptId}).ok);assert.equal(career.state().lastDuty.shiftKind,'continuous');assert.equal(career.state().lastDuty.tellerPayVersion,1);
  career=createFormalCareers({...options,saved});assert.equal(career.state().loadError,null);assert.equal(career.workState().lastDuty.tellerPayVersion,1);
  if(hours===12){
   const bank=createGameCurrencyLedger({saved:{},storage:{setItem:()=>true}}),proof=regionalTellerAuditProof(regionalTellerContract({country:role.country,day:9,holderRevision:1,source:freezeTellerSource(bank),workReceiptId:receiptId,contractVersion:2}));
   const r={version:2,id:proof.orderId,roleId:role.id,slotId:role.slotId,day:9,amount:0,currency:role.currency,proof,completedAt:clock.seconds};assert(validTellerAuditReceipt(r));
   assert.equal(career.prepareTellerAuditService({...r,proof:{...proof,workReceiptId:'wrong-1'}}).code,'wrong-duty-source');
   const prepared=career.prepareTellerAuditService(r);assert(prepared.ok);assert.equal(paid.length,0);assert(prepared.lock());saved=copy(prepared.patch.formalCareers);assert(prepared.committed());prepared.release();
   assert.equal(career.state().tellerAuditServices[0].amount,0);assert.equal(career.state().skillXP.writing,10);assert.equal(paid.length,0);
   assert(career.prepareTellerAuditService(r).replayed);
  }

  clock.hour=6+hours;clock.seconds+=hours*60/.7;
  assert(career.laborEvent('completed',{roleId:role.id,receiptId,coveredSeconds:hours*60/.7,completedTasks:0}).ok);
  assert(career.laborEvent('inspected',{roleId:role.id,receiptId}).ok);const expected=Math.floor(role.wage*hours/12+1e-9);
  assert.equal(career.state().lastDuty.wage,expected);assert.equal(career.state().lastEvaluation.tellerPayVersion,1);
  career=createFormalCareers({...options,saved});assert.equal(career.state().loadError,null);
  assert(career.settle().ok);assert.equal(paid.length,expected>0?1:0);if(expected>0){assert.equal(paid[0].amount,expected);assert.equal(paid[0].currency,role.currency);assert.equal(paid[0].receiptId,'career:'+role.slotId+':9');}
  assert.equal(career.settle().ok,false);assert.equal(career.beginDuty({receiptId:role.workSource+'-100'}).code,'already-paid-today');
  const restored=createFormalCareers({...options,saved});assert.equal(restored.state().loadError,null);assert.equal(restored.state().lastDuty.wage,expected);
  const corrupt=copy(saved);corrupt.lastDuty.tellerPayVersion=2;assert.equal(createFormalCareers({...options,saved:corrupt}).state().loadError,'invalid-career-state');
 }
}
console.log('PASS fixed four-country full/half/18-second/zero attendance salaries, frozen pay version, save failure, restore and no duplicate/legacy-day payroll');
