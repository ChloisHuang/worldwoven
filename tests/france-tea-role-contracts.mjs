// Prevent source-review replay and positive-review wage inflation while
// exercising shared continuous-role saves, applications and finite occupancy.
import assert from 'node:assert/strict';
import {createFormalCareers,TEA_SERVER_ROLE as TEA,PHARMACY_ASSISTANT_ROLE as PHARMACY,TAVERN_STEWARD_ROLE as TAVERN,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({role=TEA,saved,clock:previous,bank={amount:0,receipts:new Map()}}={}){
 const clock={day:1,hour:6,seconds:0,...previous},flags={fail:false};let durable=saved&&clone(saved),worldSeed=1;
 while(careerInterviewRoll(worldSeed,role.id,clock.day)>=.6)worldSeed++;
 const options={worldSeed,getClock:()=>clock,saveState:next=>{if(flags.fail)return false;durable=clone(next);},creditWageToBank:deposit=>{
  assert.equal(deposit.currency,role.currency);const prior=bank.receipts.get(deposit.receiptId);
  if(prior)return {ok:prior.amount===deposit.amount,replayed:true,receiptId:deposit.receiptId};
  bank.amount+=deposit.amount;bank.receipts.set(deposit.receiptId,clone(deposit));return {ok:true,receiptId:deposit.receiptId};}};
 if(!saved){saved=createFormalCareers(options).state();delete saved.loadError;delete saved.lastError;Object.assign(saved.skills,role.skillRequirements);}
 const careers=createFormalCareers({...options,saved});
 const hire=()=>{assert(careers.apply(role.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);const application=careers.applicationResult(role.id);assert.equal(application.status,'pending');assert(careers.reviewApplication(role.id,{ageYears:18,applicationId:application.id}).ok);};
 const receiptId=role.workSource+'-1';
 const start=()=>{hire();assert(careers.beginDuty({receiptId,shiftKind:'continuous'}).ok);};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:role.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:role.id,receiptId}).ok);};
 return {careers,clock,flags,bank,hire,start,finish,receiptId,saved:()=>clone(durable)};
}
const review=(f,number=1)=>({roleId:TEA.id,receiptId:f.receiptId,reviewId:`france-tea-${number}-order-done`,customerId:'france-cafe',customerName:'加布里埃尔',tableId:'real-loggia-south',tableName:'宫苑茶廊原座',dishId:'tea-cake',dishName:'热茶与小蛋糕',reasonCode:'tea-completed'});

assert.equal(FORMAL_CAREER_ROLES.length,7);
assert(!FORMAL_CAREER_ROLES.some(r=>r.id==='cn-tavern-host'),'ownership stays outside salaried vacancies');
assert.deepEqual(TEA.skillRequirements,{ritual:2,writing:1});
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===TEA.id),{id:'fr-tea-server-1',roleId:TEA.id,holderId:'france-salon',replacement:true});
const application=fixture();assert(application.careers.apply(TEA.id,{ageYears:18}).ok);assert.equal(application.careers.apply(TEA.id,{ageYears:18}).code,'application-pending');
const pending=fixture({saved:application.saved()});assert.equal(pending.careers.slotHolder(TEA.id),'france-salon');assert.equal(pending.careers.applicationResult(TEA.id).status,'pending');assert(pending.careers.reviewApplication(TEA.id,{ageYears:18,applicationId:pending.careers.applicationResult(TEA.id).id}).ok);assert.equal(pending.careers.slotHolder(TEA.id),'player');assert.equal(pending.careers.catalogue().find(r=>r.id===TEA.id).vacancy,0);assert.equal(pending.careers.apply(TEA.id,{ageYears:18}).code,'already-applied-today');assert.equal(fixture({saved:pending.saved()}).careers.slotHolder(TEA.id),'player');

const f=fixture();f.start();const first=review(f);
for(const patch of [{customerId:'player'},{dishId:'other-cake'},{reviewId:'france-tea-0-order-done'},{reviewId:'france-tea-01-order-done'},{reviewId:'france-tea-9007199254740992-order-done'},{reasonCode:'corrected'}])assert.equal(f.careers.customerReview({...first,...patch}).code,'invalid-customer-review');
f.flags.fail=true;assert.equal(f.careers.customerReview(first).code,'save-failed');assert.equal(f.careers.state().performance,0);f.flags.fail=false;
assert.equal(f.careers.customerReview(first).servicePenalty,0);assert.equal(f.careers.state().performance,1);assert.equal(f.careers.state().promotionProgress,0);assert(f.careers.customerReview(first).unchanged);assert.equal(f.careers.customerReview({...first,tableId:'another-seat'}).code,'review-conflict');assert.equal(f.careers.customerReview({...first,receiptId:'fr-tea-labor-2'}).code,'wrong-duty-source');
const resumed=fixture({saved:f.saved()});assert.equal(resumed.careers.state().loadError,null);assert(resumed.careers.customerReview(first).unchanged);assert.equal(resumed.careers.state().performance,1);
for(let n=2;n<=8;n++)assert.equal(resumed.careers.customerReview(review(resumed,n)).servicePenalty,0);
resumed.finish(6,8);assert.equal(resumed.careers.state().lastDuty.wage,5,'eight outcomes cannot add to six actual duty hours');assert.equal(resumed.careers.state().lastEvaluation.servicePenalty,undefined);assert(resumed.careers.state().lastEvaluation.reason.endsWith('5法国券'));assert.equal(resumed.careers.state().performance,8);assert(resumed.careers.customerReview(first).unchanged);
const ready=fixture({saved:resumed.saved(),clock:resumed.clock,bank:resumed.bank});assert.equal(ready.careers.state().loadError,null);ready.flags.fail=true;assert(ready.careers.settle().cleanupPending);assert.equal(ready.bank.amount,5);
const retry=fixture({saved:ready.saved(),clock:ready.clock,bank:ready.bank});assert(retry.careers.settle().replayed);assert.equal(retry.bank.amount,5);assert.equal(retry.bank.receipts.size,1);const paid=fixture({saved:retry.saved(),clock:retry.clock,bank:retry.bank});assert.equal(paid.careers.state().loadError,null);assert.equal(paid.careers.state().lastDuty.stage,'paid');assert.equal(paid.careers.settle().code,'work-incomplete');assert(paid.careers.resign().ok);assert.equal(paid.careers.slotHolder(TEA.id),'france-salon');
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,10,'full tea shift earns exactly the agreed wage');assert.equal(fixture({saved:full.saved(),clock:full.clock}).careers.state().loadError,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].score=2,s=>{s.lastDuty.wage++;s.lastEvaluation.wage++;}]){const corrupt=resumed.saved();mutate(corrupt);assert.equal(fixture({saved:corrupt,clock:resumed.clock}).careers.state().loadError,'invalid-career-state');}

const pharmacy=fixture({role:PHARMACY});pharmacy.start();pharmacy.finish(6);assert(pharmacy.careers.settle().ok);const pharmacyReload=fixture({role:PHARMACY,saved:pharmacy.saved(),clock:pharmacy.clock,bank:pharmacy.bank});assert.equal(pharmacyReload.careers.state().loadError,null);assert.equal(pharmacyReload.careers.state().lastDuty.stage,'paid');assert.equal(pharmacyReload.bank.amount,6);
const tavern=fixture({role:TAVERN});tavern.start();const bad={...review(tavern),roleId:TAVERN.id,reviewId:tavern.receiptId+'-order-1-wrong-table',customerId:'cn-customer-1',reasonCode:'wrong-table'};assert.equal(tavern.careers.customerReview(bad).servicePenalty,2);assert.equal(tavern.careers.customerReview({...bad,reviewId:bad.reviewId+'-corrected',reasonCode:'corrected',correctedReviewId:bad.reviewId}).servicePenalty,1);tavern.finish(6,1);assert.equal(tavern.careers.state().lastDuty.wage,7);assert.equal(fixture({role:TAVERN,saved:tavern.saved(),clock:tavern.clock}).careers.state().loadError,null);
console.log('PASS tea exclusive applications, durable outcome dedupe, actual-hours France pay without review bonus, pharmacy paid reload and unchanged tavern penalties');
