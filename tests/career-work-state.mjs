// Long legal career histories used to be copied at every work/HUD read. Keep
// their complete state contract while checking the separate bounded projection.
import assert from 'node:assert/strict';
import {createFormalCareers,COURT_CLERK_ROLE as CLERK,TAVERN_STEWARD_ROLE as STEWARD} from '../source/game/formal-careers.js';

const clock={day:0,hour:8,seconds:0};let saved,writes=0;
const receipts=new Map(),options={worldSeed:785,getClock:()=>clock,saveState:s=>{saved=s;writes++;},creditWageToBank:deposit=>{
  const old=receipts.get(deposit.receiptId);if(old)assert.deepEqual(deposit,old);
  receipts.set(deposit.receiptId,structuredClone(deposit));return {ok:true,receiptId:deposit.receiptId,replayed:!!old};
}};
const careers=createFormalCareers(options),keys=['revision','skills','tenure','lastDuty','lastEvaluatedDay','lastEvaluation','lastCustomerReview','loadError','lastError'];
function check(core=careers){
  const full=core.state(),view=core.workState(),duty=full.lastDuty&&{...full.lastDuty};if(duty)delete duty.customerReviews;
  const customer=full.lastDuty?.customerReviews?.at(-1);
  assert.deepEqual(Object.keys(view).sort(),keys.slice().sort());
  for(const key of keys.filter(k=>!['lastDuty','lastCustomerReview'].includes(k)))assert.deepEqual(view[key],full[key],key);
  assert.deepEqual(view.lastDuty,duty);
  assert.deepEqual(view.lastCustomerReview,customer?Object.fromEntries(['id','customerName','score','positive','reason'].map(k=>[k,customer[k]])):null);
  view.skills.ritual=999;if(view.tenure)view.tenure.roleId='changed';if(view.lastDuty)view.lastDuty.stage='changed';
  if(view.lastEvaluation)view.lastEvaluation.reason='changed';if(view.lastCustomerReview)view.lastCustomerReview.reason='changed';
  assert.deepEqual(core.state(),full,'mutating any projected record cannot write back');
  const mutable=core.state();mutable.officialCareer.service.push({id:'changed'});mutable.applications.history=[];
  assert.deepEqual(core.state(),full,'full state remains a detached mutable snapshot');
  return full;
}
check();
for(let day=0;day<3;day++){
  clock.day=day;
  for(const source of ['cn-rest','cn-calligraphy'])for(let n=0;n<(day===2?1:3);n++){
    const ticket=careers.learningTicket(source);assert(ticket.ok);clock.seconds+=8;assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);
  }
}
function hire(role){
  for(let attempt=0;attempt<30&&!careers.isHired(role.id);attempt++){
    if(attempt)clock.day++;clock.hour=8;assert(careers.apply(role.id,{ageYears:22}).ok);
    check();assert.equal(careers.workState().tenure,null);assert.equal(careers.applicationResult(role.id).status,'pending');
    const applicationId=careers.applicationResult(role.id).id,result=careers.reviewApplication(role.id,{ageYears:22,applicationId});
    if(!result.ok){assert.equal(result.code,'interview-rejected');continue;}
    if(role===CLERK)for(const step of ['receive-document','appointment'])assert(careers.reviewApplication(role.id,{ageYears:22,applicationId,step}).ok);
  }
  assert(careers.isHired(role.id));check();
}
hire(CLERK);
let longSave;
for(let n=1;n<=1000;n++){
  if(n>1)clock.day++;clock.hour=10;clock.seconds+=30;
  assert(careers.beginDuty().ok);clock.hour=11.5;assert(careers.dutyEvent('court-start').ok);
  clock.hour=12;assert(careers.dutyEvent('court-completed').ok);assert(careers.dutyEvent('archive-completed').ok);assert(careers.settle().ok);
  if(![1,100,1000].includes(n))continue;
  const restored=createFormalCareers({...options,saved});const full=check(restored);
  assert.equal(full.loadError,null);assert.equal(full.officialCareer.service.length,n);
  assert(JSON.stringify(restored.workState()).length<1600,'work reads stay small as legal service history grows');
  const beforeWrites=writes,beforePay=receipts.size;
  for(let step=0;step<100;step++)restored.workState();
  assert.equal(writes,beforeWrites);assert.equal(receipts.size,beforePay);assert.deepEqual(restored.state(),full);
  if(n===1000)longSave=structuredClone(saved);
}
assert.equal(receipts.size,1000);assert.equal([...receipts.values()].reduce((sum,r)=>sum+r.amount,0),20000);
assert(careers.resign().ok);check();assert.equal(careers.workState().tenure,null);
clock.day++;hire(CLERK);assert(careers.resign().ok);clock.day++;hire(STEWARD);
assert.equal(careers.state().officialCareer.service.length,1000);assert.equal(careers.state().officialCareer.appointments.length,2);
assert.equal(careers.applicationHistory(CLERK.id).length,1,'rehiring keeps the previous appointment receipt');
const receiptId='cn-tavern-labor-1';assert(careers.beginDuty({receiptId}).ok);
const review={roleId:STEWARD.id,receiptId,reviewId:receiptId+'-order-1-wrong-table',customerId:'cn-customer-1',customerName:'林客',tableId:'china-tavern-table-1',tableName:'东侧一桌',dishId:'yunlai-mushroom-rice',dishName:'云来菌菇饭',reasonCode:'wrong-table'};
assert(careers.customerReview(review).ok);check();
const old=careers.workState();assert(careers.customerReview({...review,reviewId:review.reviewId+'-corrected',reasonCode:'corrected',correctedReviewId:review.reviewId}).ok);
check();assert.notEqual(careers.workState().lastCustomerReview.id,old.lastCustomerReview.id);assert.equal(careers.state().lastDuty.customerReviews.length,2);
const errorRevision=careers.workState().revision;
assert.equal(careers.beginDuty().ok,false);assert(careers.workState().lastError,'errors stay fresh without requiring a revision change');assert.equal(careers.workState().revision,errorRevision);
const corrupt=createFormalCareers({...options,saved:{version:10}});check(corrupt);assert.equal(corrupt.workState().loadError,'invalid-career-state');
const reloaded=createFormalCareers({...options,saved:longSave});check(reloaded);assert.equal(reloaded.state().officialCareer.service.length,1000);
console.log('PASS bounded detached work state: no job, pending, employed, resigned, corrupt save, fresh errors/reviews, full history compatibility and 1/100/1000 legal service rows');
