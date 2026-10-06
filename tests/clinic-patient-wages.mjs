// Protect patient/role/order proof, sealed bank amounts and published v10 jobs.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFormalCareers,PHARMACY_ASSISTANT_ROLE as ASSISTANT,CLINIC_PHYSICIAN_ROLE as PHYSICIAN,FORMAL_CAREER_ROLES} from '../source/game/formal-careers.js';
import {clinicPatientReview,clinicTiming} from '../source/game/china-clinic-reviews.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
const clean=c=>{const {loadError,lastError,...saved}=c.state();return saved;};
function fixture(role,saved=null,bankSaved=null){
 const clock={day:1,hour:6,seconds:0},flags={review:false,paid:false},stored={};
 const bank=createCurrencyLedger({saved:bankSaved,saveState:s=>{stored.bank=structuredClone(s);return true;}});
 const empty=createFormalCareers({getClock:()=>clock,saveState:()=>true});
 const seed=saved||{...clean(empty),tenure:{roleId:role.id,slotId:role.slotId,sinceDay:1,sinceHour:6}};
 const careers=createFormalCareers({saved:seed,getClock:()=>clock,saveState:s=>{
  if(flags.review||flags.paid&&s.lastDuty?.stage==='paid')return false;stored.career=structuredClone(s);return true;
 },creditWageToBank:bank.creditWageToBank});
 const receiptId=role.workSource+'-1';
 const begin=()=>assert(careers.beginDuty({receiptId}).ok);
 const end=(hours=12)=>{clock.hour=6+hours;clock.seconds=hours*60/.7;assert(careers.laborEvent('completed',{roleId:role.id,receiptId,coveredSeconds:clock.seconds,completedTasks:careers.state().lastDuty.customerReviews?.length||0}).ok);assert(careers.laborEvent('inspected',{roleId:role.id,receiptId}).ok);};
 return {careers,bank,clock,flags,stored,receiptId,begin,end};
}
function proof(role,number=1,seconds=20){
 const kind=role===PHYSICIAN?'physician':'assistant',receiptId=role.workSource+'-1';
 const order={number,recipientId:'cn-tavern-diner-west',serviceTiming:seconds===null?undefined:{[kind]:{...clinicTiming(receiptId),seconds}}};
 return {receiptId,number,orderId:'cn-clinic-order-'+number,cardId:'cn-clinic-card-'+number,packetId:'cn-clinic-packet-'+number,recipientId:order.recipientId,recipientName:'顾谨',
  ...(role===PHYSICIAN?{questioned:true,careCorrect:true,carePlanId:'stillwater-ache'}:{}),review:clinicPatientReview(order,kind,receiptId,0)};
}
for(const role of [ASSISTANT,PHYSICIAN]){
 test(role.id+' patient mean adjusts actual time pay within 80–120%; no patient is neutral',()=>{
  const limit=role===PHYSICIAN?90:180,base=role.wage+role.preparationBonus;
  for(const [seconds,rating,multiplier] of [[20,5,1.2],[limit+1,2,.9],[limit*2+1,1,.8],[null,3,1]]){
   const f=fixture(role);f.begin();const receipt=proof(role,1,seconds);assert.equal(receipt.review.rating,rating);assert(f.careers.recordClinicPatientReview(receipt).ok);f.end();
   assert.equal(f.careers.state().lastDuty.wage,Math.floor(base*multiplier+1e-9));assert(f.careers.settle().ok);assert.equal(f.bank.state().cash,0);
   const restored=fixture(role,clean(f.careers),f.stored.bank);assert.equal(restored.careers.state().loadError,null);assert.equal(restored.careers.state().lastDuty.wage,f.careers.state().lastDuty.wage);
  }
  const empty=fixture(role);empty.begin();empty.end();assert.equal(empty.careers.state().lastDuty.wage,base);
  const partial=fixture(role);partial.begin();assert(partial.careers.recordClinicPatientReview(proof(role)).ok);partial.end(6);assert.equal(partial.careers.state().lastDuty.wage,Math.floor(role.wage*.5*1.2));
 });
 test(role.id+' published v10 working, inspection, ready and paid preserve the original job and wage',()=>{
  for(const stage of ['working','inspection','ready','paid']){
   const f=fixture(role);f.begin();if(stage!=='working'){f.end(6);if(stage==='inspection'){const s=clean(f.careers);s.lastDuty.stage='inspection';s.lastDuty.wage=null;s.lastEvaluation=null;s.lastEvaluatedDay=null;f.stored.career=s;}else if(stage==='paid')assert(f.careers.settle().ok);}
   const old=stage==='inspection'?f.stored.career:clean(f.careers);delete old.lastDuty.clinicPayVersion;delete old.lastDuty.customerReviews;
   if(old.lastEvaluation)for(const key of ['clinicPayVersion','clinicRatingTotal','clinicReviewCount'])delete old.lastEvaluation[key];
   const restored=fixture(role,old,f.stored.bank);Object.assign(restored.clock,f.clock);assert.equal(restored.careers.state().loadError,null,stage);assert.deepEqual(clean(restored.careers),old,stage);
   if(stage==='working'){assert(restored.careers.recordClinicPatientReview(proof(role,2,null)).ok);assert.equal(restored.careers.state().lastDuty.customerReviews[0].clinicReceipt.review.rating,3);}
   if(stage==='ready'){assert.equal(restored.careers.recordClinicPatientReview(proof(role)).code,'review-sealed');assert(restored.careers.settle().ok);assert.equal(restored.bank.state().bank,old.lastDuty.wage);}
  }
 });
 test(role.id+' sealed pay survives delayed feedback and bank-success/cleanup-failure reload',()=>{
  const f=fixture(role);f.begin();const receipt=proof(role);assert(f.careers.recordClinicPatientReview(receipt).ok);f.end();const wage=f.careers.state().lastDuty.wage;
  f.flags.paid=true;const paid=f.careers.settle();assert(paid.ok&&paid.cleanupPending);assert.equal(f.careers.state().lastDuty.stage,'ready');assert.equal(f.bank.state().bank,wage);
  assert(f.careers.recordClinicPatientReview(receipt).replayed);assert.equal(f.careers.recordClinicPatientReview(proof(role,2,500)).code,'review-sealed');assert.equal(f.careers.state().lastDuty.wage,wage);
  const restored=fixture(role,f.stored.career,f.stored.bank);Object.assign(restored.clock,f.clock);assert.equal(restored.careers.state().loadError,null);assert(restored.careers.settle().replayed);assert.equal(restored.bank.state().bank,wage);assert.equal(restored.bank.state().transactions.filter(t=>t.requestId===`career:${role.slotId}:1`).length,1);
 });
}
test('only real-role original-number receipts can commit feedback and assistant XP once',()=>{
 const f=fixture(ASSISTANT);f.begin();const receipt=proof(ASSISTANT);
 for(const bad of [{recipientId:'player'},{orderId:'cn-clinic-order-2'},{packetId:'cn-clinic-packet-2'},{receiptId:'cn-pharmacy-labor-2'},{review:{...receipt.review,evaluatorId:'cn-tavern-diner-east'}},{review:{...receipt.review,rating:1}}])assert.equal(f.careers.recordClinicPatientReview({...receipt,...bad}).ok,false);
 f.flags.review=true;assert.equal(f.careers.recordClinicPatientReview(receipt).code,'save-failed');assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);f.flags.review=false;
 assert.equal(f.careers.recordClinicPatientReview(receipt).xpGained,10);const saved=clean(f.careers);assert(f.careers.recordClinicPatientReview(receipt).replayed);assert.deepEqual(clean(f.careers),saved);
 assert.equal(f.careers.recordClinicPatientReview(proof(ASSISTANT,1,500)).code,'review-conflict');const restored=fixture(ASSISTANT,saved);assert(restored.careers.recordClinicPatientReview(receipt).replayed);assert.equal(restored.careers.state().skillXP.care,10);
 const doctor=fixture(PHYSICIAN);doctor.begin();assert.equal(doctor.careers.recordClinicPatientReview({...proof(PHYSICIAN),careCorrect:false}).code,'invalid-work-receipt');
});
test('complete current feedback stays in full state while R128 workState copies only the latest small summary',()=>{
 const f=fixture(PHYSICIAN);f.begin();for(let n=1;n<=64;n++)assert(f.careers.recordClinicPatientReview(proof(PHYSICIAN,n,n%2?20:200)).ok);
 assert.equal(f.careers.state().lastDuty.customerReviews.length,64);const light=f.careers.workState();assert.equal(light.lastDuty.customerReviews,undefined);assert.equal(light.lastCustomerReview.rating,1);assert.equal(light.lastCustomerReview.clinicReceipt,undefined);assert.equal(light.applications,undefined);assert.equal(light.officialCareer,undefined);
 light.lastCustomerReview.reason='mutated';assert.notEqual(f.careers.workState().lastCustomerReview.reason,'mutated');assert(JSON.stringify(light).length<1600);assert.equal(FORMAL_CAREER_ROLES.length,19);
 f.end();assert(f.careers.settle().ok);const saved=clean(f.careers);const restored=fixture(PHYSICIAN,saved);Object.assign(restored.clock,f.clock);assert.equal(restored.careers.state().loadError,null);
 restored.clock.day=2;restored.clock.hour=6;assert(restored.careers.beginDuty({receiptId:PHYSICIAN.workSource+'-2'}).ok);assert.equal(fixture(PHYSICIAN,clean(restored.careers)).careers.state().loadError,null);
});
