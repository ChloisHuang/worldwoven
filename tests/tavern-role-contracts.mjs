// Protect real skill gating, occupied-incumbent rotation slots, v3 migration,
// durable customer correction and salary dedupe across split-save/reload.
import assert from 'node:assert/strict';
import {createFormalCareers,TAVERN_HOST_ROLE as HOST,TAVERN_CHEF_ROLE as CHEF,TAVERN_STEWARD_ROLE as ASSISTANT,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
const copy=structuredClone;
function fixture(saved,bank={amount:0,receipts:new Map()},options={}){
 const clock={day:1,hour:8,seconds:0},flags={fail:false};let durable=saved&&copy(saved);
 const careers=createFormalCareers({saved,worldSeed:26,getClock:()=>clock,...options,saveState:next=>{if(flags.fail)return false;durable=copy(next);},creditWageToBank:deposit=>{
  const prior=bank.receipts.get(deposit.receiptId);if(prior)return {ok:prior.amount===deposit.amount,replayed:true,receiptId:deposit.receiptId};
  bank.amount+=deposit.amount;bank.receipts.set(deposit.receiptId,copy(deposit));return {ok:true,receiptId:deposit.receiptId};}});
 const study=skill=>{const ticket=careers.learningTicket('cn-rest',`${skill}-intro`);assert(ticket.ok);assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);};
 const train=role=>{for(const[skill,minimum]of Object.entries(role.skillRequirements))for(let i=0;i<minimum;i++)study(skill);};
 return {careers,clock,flags,bank,study,train,saved:()=>copy(durable)};
}
for(const role of [CHEF]){
 const f=fixture();assert(!f.careers.apply(role.id,{ageYears:18}).ok);assert.equal(f.careers.state().tenure,null);
 f.train(role);f.clock.day=2;assert(f.careers.eligibility(role.id,{ageYears:18}).ok);
 const slot=FORMAL_CAREER_SLOTS.find(s=>s.id===role.slotId);assert.equal(slot.holderId,role.incumbentId);assert.equal(slot.rotation,true);
 assert(f.careers.apply(role.id,{ageYears:18}).ok);assert.equal(f.careers.state().lastDuty,null,'Application never creates or moves physical work');
 assert.equal(f.careers.catalogue().find(r=>r.id===role.id).vacancy,0);assert.equal(slot.holderId,role.incumbentId,'NPC incumbent remains real');
 const before=f.saved();f.clock.hour=18;assert.equal(f.careers.beginDutyAvailability(role.id).code,'outside-arrival-window');assert.deepEqual(f.saved(),before);
 f.clock.hour=17+59/60;assert(f.careers.beginDuty({receiptId:`${role.workSource}-1`}).ok);
 const recovered=fixture(f.saved(),f.bank);assert.equal(recovered.careers.state().loadError,null);assert.equal(recovered.careers.state().lastDuty.workReceiptId,`${role.workSource}-1`);
 const occupied=fixture(undefined,undefined,{roles:[role],slots:[{...slot,rotation:undefined}]});occupied.train(role);assert.deepEqual(occupied.careers.apply(role.id,{ageYears:18}).reasons,['no-vacancy']);
}
const noArt=fixture();noArt.study('art');noArt.study('art');noArt.study('ritual');assert(noArt.careers.eligibility(CHEF.id,{ageYears:18}).reasons.includes('cooking-required'));
noArt.study('cooking');const incomplete=noArt.careers.learningTicket('cn-rest','cooking-intro');noArt.careers.cancelLearning(incomplete.ticket);assert.equal(noArt.careers.completeLearning(incomplete.ticket,{seconds:8}).code,'learning-interrupted');assert.equal(noArt.careers.state().skills.cooking,1);
const f=fixture();f.train(ASSISTANT);assert(f.careers.apply(ASSISTANT.id,{ageYears:18}).ok);
const receiptId='cn-tavern-labor-1';assert(f.careers.beginDuty({receiptId}).ok);
const bad={roleId:ASSISTANT.id,receiptId,reviewId:receiptId+'-order-1-wrong-table',customerId:'cn-customer-1',customerName:'林客',tableId:'china-tavern-table-1',tableName:'东侧一桌',dishId:'yunlai-mushroom-rice',dishName:'云来菌菇饭',reasonCode:'wrong-table'};
f.flags.fail=true;assert.equal(f.careers.customerReview(bad).code,'save-failed');assert.equal(f.careers.state().performance,0);f.flags.fail=false;
assert(f.careers.customerReview(bad).ok);assert.equal(f.careers.state().performance,-2);assert(f.careers.customerReview(bad).unchanged);
let r=fixture(f.saved(),f.bank);assert.equal(r.careers.state().loadError,null);assert(r.careers.customerReview(bad).unchanged);assert.equal(r.careers.state().performance,-2);
const fixed={...bad,reviewId:bad.reviewId+'-corrected',reasonCode:'corrected',correctedReviewId:bad.reviewId};assert(r.careers.customerReview(fixed).ok);assert(r.careers.customerReview(fixed).unchanged);assert.equal(r.careers.state().performance,-1);assert.equal(r.careers.state().promotionProgress,0,'Deliberate error/correction cannot farm promotions');
assert.equal(r.careers.customerReview({...bad,receiptId:'cn-tavern-labor-2'}).code,'wrong-duty-source');
assert(r.careers.laborEvent('completed',{roleId:ASSISTANT.id,receiptId}).ok);assert(r.careers.laborEvent('inspected',{roleId:ASSISTANT.id,receiptId}).ok);assert.equal(r.careers.state().lastDuty.wage,16);assert.equal(r.careers.state().lastEvaluation.servicePenalty,1);
r.flags.fail=true;assert(r.careers.settle().cleanupPending);assert.equal(r.bank.amount,16);r=fixture(r.saved(),r.bank);assert.equal(r.careers.state().loadError,null);assert(r.careers.settle().replayed);assert.equal(r.bank.amount,16);assert.equal(r.bank.receipts.size,1);assert.equal(r.careers.beginDuty({receiptId:'cn-tavern-labor-2'}).code,'already-paid-today');
const penaltySaved=r.saved();penaltySaved.lastDuty.wage++;penaltySaved.lastEvaluation.wage++;assert.equal(fixture(penaltySaved).careers.state().loadError,'invalid-career-state');
const original=fixture();original.train(ASSISTANT);original.careers.apply(ASSISTANT.id,{ageYears:18});original.careers.beginDuty({receiptId});original.careers.laborEvent('completed',{roleId:ASSISTANT.id,receiptId});original.careers.laborEvent('inspected',{roleId:ASSISTANT.id,receiptId});original.careers.settle();
const v3=original.saved();v3.version=3;delete v3.skills.cooking;delete v3.daily.cooking;delete v3.lastDuty.customerReviews;
const migrated=fixture(v3,original.bank);assert.equal(migrated.careers.state().loadError,null);assert.equal(migrated.careers.state().skills.cooking,0);
for(const key of ['tenure','lastPaidDay','learning','lowerWork','performance','promotionProgress','lastEvaluation','applications'])assert.deepEqual(migrated.careers.state()[key],v3[key]);
assert.deepEqual(migrated.careers.state().lastDuty,{...v3.lastDuty,customerReviews:[]});assert.equal(migrated.careers.settle().code,'work-incomplete');
for(const corrupt of [s=>s.skills.ritual=101,s=>{s.lastDuty.wage=16;s.lastEvaluation.wage=16;},s=>s.skills.cooking=8,s=>s.lastEvaluation.servicePenalty=1]){const bad=copy(v3);corrupt(bad);assert.equal(fixture(bad).careers.state().loadError,'invalid-career-state');}
const cancelled=fixture();cancelled.train(ASSISTANT);cancelled.careers.apply(ASSISTANT.id,{ageYears:18});cancelled.careers.beginDuty({receiptId});cancelled.careers.customerReview(bad);assert(cancelled.careers.interruptDuty('cancelled').ok);assert.equal(cancelled.careers.beginDuty({receiptId:'cn-tavern-labor-2'}).code,'duty-missed');assert.equal(fixture(cancelled.saved()).careers.state().performance,-3);assert.equal(cancelled.bank.amount,0);
console.log('PASS tavern roles: exact cooking requirements, explicit start/18:00, incumbent rotation, v3 paid migration, durable bad/corrected reviews, no correction farm, cancel/reload and one bank wage');
// Continuous careers cover the real 06–18 window. A couple of orders cannot
// mint a full day's salary; quiet waiting remains paid and premature/replayed receipts retain legacy safety.
const secondsFor=hours=>hours*60/.7;
function continuous({arrival=6,ended=18,hours=ended-arrival,tasks=1,role=ASSISTANT}={}){
 const f=fixture();f.clock.hour=arrival;f.train(role);f.careers.apply(role.id,{ageYears:18});const receiptId=`${role.workSource}-1`;
 assert(f.careers.beginDuty({receiptId,shiftKind:'continuous'}).ok);f.clock.hour=ended;f.clock.seconds=secondsFor(ended-arrival);
 const work={roleId:role.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks};
 return {...f,work};
}
for(const [args,expected] of [[{},17],[{arrival:10},10],[{ended:8},2],[{arrival:17.99,ended:18},0]]){
 let f=continuous(args);assert(f.careers.laborEvent('completed',f.work).ok);assert(f.careers.laborEvent('inspected',f.work).ok);assert.equal(f.careers.state().lastDuty.wage,expected);assert.equal(f.careers.state().promotionProgress,expected===17?1:0);
 const snapshot=f.saved(),restored=fixture(snapshot,f.bank);restored.clock.hour=f.clock.hour;restored.clock.seconds=f.clock.seconds;assert.equal(restored.careers.state().loadError,null);assert(restored.careers.settle().ok);assert.equal(restored.bank.amount,expected);assert.equal(restored.bank.receipts.size,expected?1:0);assert.equal(restored.careers.settle().code,'work-incomplete');
}
for(const work of [{coveredSeconds:-1},{coveredSeconds:secondsFor(15)},{completedTasks:-1},{completedTasks:1.5}]){const f=continuous();assert.equal(f.careers.laborEvent('completed',{...f.work,...work}).code,'invalid-shift-work');assert.equal(f.careers.state().lastDuty.stage,'working');}
const capped=continuous({arrival:8,ended:19,hours:10});assert(capped.careers.laborEvent('completed',capped.work).ok);assert(capped.careers.laborEvent('inspected',capped.work).ok);assert.equal(capped.careers.state().lastDuty.wage,13,'On-duty time stops paying at18:00');
const dirty=continuous();const dirt={...bad,roleId:ASSISTANT.id,receiptId:dirty.work.receiptId,reviewId:dirty.work.receiptId+'-order-2-dirty-table',reasonCode:'dirty-table'};
assert(dirty.careers.customerReview(dirt).ok);assert(dirty.careers.customerReview(dirt).unchanged);assert.equal(dirty.careers.state().performance,-2);assert(dirty.careers.state().lastDuty.customerReviews[0].reason.includes('上一位客人'));
assert(dirty.careers.laborEvent('completed',dirty.work).ok);assert(dirty.careers.laborEvent('inspected',dirty.work).ok);assert.equal(dirty.careers.state().lastDuty.wage,15);assert.equal(fixture(dirty.saved()).careers.state().loadError,null);
const zero=continuous({arrival:17.99,ended:18});zero.careers.laborEvent('completed',zero.work);zero.careers.laborEvent('inspected',zero.work);zero.flags.fail=true;assert.equal(zero.careers.settle().code,'save-failed');zero.flags.fail=false;assert(zero.careers.settle().ok);assert.equal(zero.bank.receipts.size,0);assert(zero.careers.resign().ok);assert.equal(zero.careers.apply(ASSISTANT.id,{ageYears:18}).code,'already-applied-today');assert.equal(zero.careers.beginDuty({receiptId:'cn-tavern-labor-2'}).code,'not-employed');
console.log('PASS continuous contracts: full12h vs late/early prorated salary, witnessed-time/task bounds,18:00 cap, dirty-table dedupe, zero-pay no-mint and saved restoration');

const quiet=continuous({tasks:0});assert(quiet.careers.laborEvent('completed',quiet.work).ok);assert(quiet.careers.laborEvent('inspected',quiet.work).ok);assert.equal(quiet.careers.state().lastDuty.wage,17,'A real quiet shift is paid without inventing customer work');assert(quiet.careers.settle().ok);

// The published steward seat keeps its identity while the real assistant takes
// the other side of handover. Correction describes the actual corrected target.
const assistantSlot=FORMAL_CAREER_SLOTS.find(slot=>slot.id===ASSISTANT.slotId);assert.equal(assistantSlot.holderId,'cn-tavern-assistant');assert.equal(assistantSlot.rotation,true);
const correctedTarget=continuous({role:ASSISTANT});const wrongTarget={...bad,tableId:'wrong-table-2',tableName:'误放的二桌'};assert(correctedTarget.careers.customerReview(wrongTarget).ok);
assert(correctedTarget.careers.customerReview({...fixed,tableId:'china-tavern-table-1',tableName:'实际应送的一桌'}).ok);assert.equal(correctedTarget.careers.state().lastDuty.customerReviews[0].tableName,'误放的二桌');assert.equal(fixture(correctedTarget.saved()).careers.state().loadError,null);

// World events outlive work slips; receipt ownership is still checked before
// a stable order/table-use fact can affect the current employee's account.
for(const [reviewId,reasonCode]of [['cn-tavern-delivery-1-wrong-dish','wrong-dish'],['cn-tavern-delivery-2-wrong-table','wrong-table'],['cn-tavern-table-use-3-west-1','dirty-table'],['cn-tavern-table-use-4-east-0','dirty-table']]){
 const f=continuous({role:ASSISTANT}),fact={...bad,reviewId,reasonCode};assert.equal(f.careers.customerReview({...fact,receiptId:'cn-tavern-labor-2'}).code,'wrong-duty-source');assert(f.careers.customerReview(fact).ok);assert(f.careers.customerReview(fact).unchanged);
 const reload=fixture(f.saved());assert.equal(reload.careers.state().loadError,null);assert(reload.careers.customerReview(fact).unchanged);assert.equal(reload.careers.state().performance,-2);
 const correction={...fact,reviewId:reviewId+'-corrected',reasonCode:'corrected',correctedReviewId:reviewId};assert(reload.careers.customerReview(correction).ok);assert(reload.careers.customerReview(correction).unchanged);assert.equal(reload.careers.state().performance,-1);
}
for(const [reviewId,reasonCode]of [['cn-tavern-delivery-0-wrong-dish','wrong-dish'],['cn-tavern-delivery-1-wrong-table','wrong-dish'],['cn-tavern-table-use-3-west--1','dirty-table'],['cn-tavern-table-use-3-west-01','dirty-table'],['cn-tavern-delivery-9007199254740992-wrong-dish','wrong-dish']]){const f=continuous({role:ASSISTANT});assert.equal(f.careers.customerReview({...bad,reviewId,reasonCode}).code,'invalid-customer-review');}
console.log('PASS stable world review IDs: delivery and table-use events, current receipt ownership, legacy IDs, duplicate/reload/correction and invalid serials');

const ownership=fixture();ownership.train(HOST);assert(!ownership.careers.catalogue().some(r=>r.id===HOST.id));assert(!FORMAL_CAREER_SLOTS.some(slot=>slot.roleId===HOST.id));assert.equal(ownership.careers.apply(HOST.id,{ageYears:18}).code,'unknown-role');assert.equal(ownership.careers.state().tenure,null);assert.equal(ownership.careers.state().lastDuty,null);assert.equal(ownership.bank.amount,0);console.log('PASS proprietor cannot be obtained by salaried application; purchase system remains unavailable');
