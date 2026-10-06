// These focused cases guard real failure boundaries: a tool-return save can
// fail or replay, and published fixed-pay garden slips must survive the new
// continuous workflow without losing wages, history or the daily skill cap.
import assert from 'node:assert/strict';
import {createFormalCareers,GARDEN_ASSISTANT_ROLE as ROLE,FORMAL_CAREER_ROLES} from '../source/game/formal-careers.js';
import {GARDEN_MAINTENANCE_TARGETS,validGardenMaintenanceReceipt} from '../source/game/france-gardener-role.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
const durable=state=>{const copy=clone(state);delete copy.loadError;delete copy.lastError;return copy;};
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={career:false,bank:false};let seed=1;
 while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const initial=durable(createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state());initial.skills.gardening=2;
 const bank=createCurrencyLedger({saved:store.bank,saveState:state=>{if(flags.bank)return false;store.bank=clone(state);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,
  saveState:state=>{if(flags.career)return false;store.careers=clone(state);},creditWageToBank:bank.creditWageToBank});
 const receiptId='fr-garden-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);};
 const start=(legacy=false)=>{hire();assert(careers.beginDuty({receiptId,...(legacy?{}:{shiftKind:'continuous'})}).ok);};
 const complete=(hours=6,tasks=0)=>{clock.hour=careers.state().lastDuty.arrivalHour+hours;clock.seconds=secondsFor(hours);
  assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);};
 const inspect=()=>assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);
 return {careers,bank,store,clock,flags,receiptId,hire,start,complete,inspect};
}
const receipt=(f,number=1,kind='water')=>({id:`fr-garden-maintenance-${kind}-${number}`,number,kind,
 workReceiptId:f.receiptId,day:f.careers.state().lastDuty?.day??f.clock.day,targetIds:[...GARDEN_MAINTENANCE_TARGETS[kind]],completed:true,returned:true});

assert.equal(FORMAL_CAREER_ROLES.length,17);assert.equal(FORMAL_CAREER_ROLES.filter(role=>role.id===ROLE.id).length,1);
const f=fixture();f.start();assert.equal(f.careers.state().lastDuty.shiftKind,'continuous');
const water=receipt(f),prune=receipt(f,2,'prune');assert(validGardenMaintenanceReceipt(water));assert(validGardenMaintenanceReceipt(prune));
for(const patch of [{id:water.id+'-again'},{number:0},{number:1.5},{number:Number.MAX_SAFE_INTEGER+1},{kind:'plant'},
 {day:-1},{day:.5},{day:Number.MAX_SAFE_INTEGER+1},{workReceiptId:'fr-garden-labor-01'},
 {workReceiptId:'fr-garden-labor-9007199254740992'},{targetIds:['west-nursery-rose-a']},
 {targetIds:[...water.targetIds].reverse()},{targetIds:['west-parterre-east-hedge']},{completed:false},{returned:false},{extra:true}]){
 assert.equal(f.careers.gardenMaintenanceReceipt({...water,...patch}).code,'invalid-work-receipt');
}
for(const patch of [{day:2},{workReceiptId:'fr-garden-labor-2'}])assert.equal(f.careers.gardenMaintenanceReceipt({...water,...patch}).code,'wrong-duty-source');
assert.equal(fixture().careers.gardenMaintenanceReceipt(water).code,'wrong-duty-source');
f.flags.career=true;const before=durable(f.careers.state());assert.equal(f.careers.gardenMaintenanceReceipt(water).code,'save-failed');
assert.deepEqual(durable(f.careers.state()),before);assert.equal(f.bank.history().length,0);f.flags.career=false;
const first=f.careers.gardenMaintenanceReceipt(water);assert.equal(first.xpGained,10);assert.equal(first.review.customerName,'埃米尔');
assert.equal(first.review.tableName,'工作评价');assert.equal(first.review.score,1);assert.equal(first.servicePenalty,0);
assert.equal(f.careers.state().performance,1);assert.equal(f.careers.state().skillXP.gardening,10);assert.equal(f.bank.history().length,0);
const revision=f.careers.state().revision;assert(f.careers.gardenMaintenanceReceipt(clone(water)).replayed);assert.equal(f.careers.state().revision,revision);
assert.equal(f.careers.customerReview({roleId:ROLE.id,receiptId:f.receiptId,reviewId:water.id,
 customerId:'france-gardener',customerName:'埃米尔',tableId:'fr-garden-maintenance',tableName:'工作评价',
 dishId:'water',dishName:'原玫瑰花畦浇水',reasonCode:'garden-maintenance-completed'}).code,'invalid-customer-review');
const reload=fixture({store:f.store});assert.equal(reload.careers.state().loadError,null);assert(reload.careers.gardenMaintenanceReceipt(water).replayed);
assert.equal(reload.careers.state().skillXP.gardening,10);assert.equal(reload.careers.gardenMaintenanceReceipt(prune).xpGained,10);
reload.complete(6,2);assert.equal(reload.careers.gardenMaintenanceReceipt(receipt(reload,3)).xpGained,10,'inspection can drain a pending tool-return proof');
reload.inspect();assert.equal(reload.careers.state().lastDuty.wage,4);assert.equal(reload.careers.state().lastEvaluation.evaluatorId,'france-gardener');
assert.equal(reload.careers.gardenMaintenanceReceipt(receipt(reload,4,'prune')).xpGained,10,'ready can drain a pending proof without changing wages');
assert.equal(reload.careers.state().lastDuty.wage,4);assert.equal(reload.bank.history().length,0);
reload.flags.bank=true;assert.equal(reload.careers.settle().code,'save-failed');reload.flags.bank=false;reload.flags.career=true;
assert(reload.careers.settle().cleanupPending);assert.equal(reload.bank.state().balances.france.bank,4);
const paid=fixture({store:reload.store,clock:reload.clock});assert(paid.careers.settle().replayed);
const capped=paid.careers.gardenMaintenanceReceipt(receipt(paid,5));assert.equal(capped.xpGained,0);assert.equal(capped.limited,'daily-skill-limit');
assert.equal(capped.review.score,1);assert.equal(paid.careers.state().lastDuty.wage,4);assert.equal(paid.bank.history().filter(row=>row.action==='wage').length,1);
assert.equal(fixture({store:paid.store,clock:paid.clock}).careers.state().loadError,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].gardenMaintenanceReceipt.targetIds[0]='invented-flower',
 s=>s.lastDuty.customerReviews[0].gardenMaintenanceReceipt.day++,s=>s.lastDuty.customerReviews[0].score++,
 s=>s.lastDuty.customerReviews[0].customerName='旅人',s=>s.lastDuty.customerReviews.push(clone(s.lastDuty.customerReviews[0])),
 s=>delete s.lastDuty.customerReviews,s=>{s.lastDuty.wage++;s.lastEvaluation.wage++;}]){
 const store=clone(paid.store);mutate(store.careers);assert.equal(fixture({store,clock:paid.clock}).careers.state().loadError,'invalid-career-state');
}
const full=fixture();full.start();full.complete(12);full.inspect();assert.equal(full.careers.state().lastDuty.wage,9);
assert.equal(full.careers.state().skillXP.gardening,0,'standing on duty alone gives no gardening XP');assert(full.careers.settle().ok);
const shared=fixture();shared.start();for(let index=0;index<3;index++){
 const lesson=shared.careers.learningTicket('france-salon','fr-gardening-intro');assert(lesson.ok);
 assert.equal(shared.careers.completeLearning(lesson.ticket,{seconds:8}).xpGained,10);
}
assert.equal(shared.careers.gardenMaintenanceReceipt(receipt(shared)).xpGained,10);
assert.equal(shared.careers.gardenMaintenanceReceipt(receipt(shared,2,'prune')).limited,'daily-skill-limit');
const missed=fixture();missed.start();assert(missed.careers.interruptDuty().ok);
assert.equal(missed.careers.gardenMaintenanceReceipt(receipt(missed)).code,'wrong-duty-source');

// No migration is allowed to turn an already admitted fixed-pay shift into
// an hourly one, insert new proof fields, or reinterpret its old 9/8 voucher.
for(const arrival of [6,13])for(const stage of ['working','inspection','ready','paid']){
 const legacy=fixture({clock:{day:1,hour:arrival,seconds:0}});legacy.start(true);
 if(stage!=='working')legacy.complete(1);
 if(['ready','paid'].includes(stage))legacy.inspect();
 if(stage==='paid')assert(legacy.careers.settle().ok);
 delete legacy.store.careers.lastDuty.customerReviews;
 const old=clone(legacy.store.careers),loaded=fixture({store:legacy.store,clock:legacy.clock});
 assert.equal(loaded.careers.state().loadError,null);assert.deepEqual(durable(loaded.careers.state()),old);
 if(stage==='working'){assert(loaded.careers.beginDuty({receiptId:loaded.receiptId,shiftKind:'continuous'}).unchanged);loaded.complete(1);}
 if(['working','inspection'].includes(stage))loaded.inspect();
 assert.equal(loaded.careers.state().lastDuty.shiftKind,undefined);
 assert.equal(loaded.careers.state().lastDuty.wage,arrival<12?9:8);
 if(stage!=='paid')assert(loaded.careers.settle().ok);
 assert.equal(loaded.bank.state().balances.france.bank,arrival<12?9:8);
 assert.equal(loaded.bank.history().filter(row=>row.action==='wage').length,1);
 assert.equal(fixture({store:loaded.store,clock:loaded.clock}).careers.state().loadError,null);
}
console.log('PASS garden maintenance: original-target tool-return proofs, atomic daily gardening XP, Emile reviews, hourly wages and preserved legacy 9/8-voucher shifts');
