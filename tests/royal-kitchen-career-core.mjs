// Protect the genuine three-day prerequisite and exactly-once service rewards;
// salary remains the existing continuous attendance contract.
import assert from 'node:assert/strict';
import {createFormalCareers,TAVERN_CHEF_ROLE as CHEF,ROYAL_KITCHEN_ROLE as ROYAL} from '../source/game/formal-careers.js';
import {createChinaTavernService} from '../source/game/china-tavern-service.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const copy=x=>structuredClone(x),clock={day:1,hour:6,seconds:0},bank=new Map();
let saved,fail=false,seed=1;
while(careerInterviewRoll(seed,CHEF.id,1)>.2||careerInterviewRoll(seed,ROYAL.id,4)>.2)seed++;
const make=state=>createFormalCareers({saved:state,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(fail)return false;saved=copy(s);},creditWageToBank:r=>{const old=bank.get(r.receiptId);if(old)assert.equal(old.amount,r.amount);bank.set(r.receiptId,r);return {ok:true,receiptId:r.receiptId,replayed:!!old};}});
const fresh=make().state();Object.assign(fresh.skills,{cooking:3,ritual:2});let careers=make(fresh);
assert.equal(careers.slotHolder(ROYAL.id),'cn-cooking');assert.equal(ROYAL.name,'御膳厨役');assert.equal(ROYAL.wage,32);
assert.equal(ROYAL.gradeLabel,undefined);assert.equal(ROYAL.rankId,undefined);assert.equal(ROYAL.slotId,'cn-royal-kitchen-cook-1');
assert.deepEqual(careers.eligibility(ROYAL.id,{ageYears:17}).reasons,['adult-required','tavern-chef-days-required']);
assert.deepEqual(careers.eligibility(ROYAL.id,{ageYears:22}).reasons,['tavern-chef-days-required']);
const rejected=make(fresh);assert.equal(rejected.apply(ROYAL.id,{ageYears:22}).code,'ineligible');assert.equal(make(saved).state().loadError,null,'ineligible experience result must reload');
const readOnly=copy(fresh);readOnly.skills.cooking=100;
assert(make(readOnly).eligibility(ROYAL.id,{ageYears:22}).reasons.includes('tavern-chef-days-required'));
assert(careers.apply(CHEF.id,{ageYears:22}).ok);assert.equal(careers.state().tenure,null);
assert(careers.reviewApplication(CHEF.id,{ageYears:22,applicationId:careers.applicationResult(CHEF.id).id}).ok);
const chefReceipt=(number,day=clock.day)=>({source:'china-tavern-chef',number,orderId:`cn-tavern-order-${number}`,mealId:`cn-tavern-order-${number}-dish`,actorId:'player',day,workReceiptId:`cn-tavern-chef-labor-${day}`,completed:true});
const finish=()=>{const d=careers.state().lastDuty;assert(careers.laborEvent('completed',{roleId:d.roleId,receiptId:d.workReceiptId,coveredSeconds:0,completedTasks:99}).ok);assert(careers.laborEvent('inspected',{roleId:d.roleId,receiptId:d.workReceiptId}).ok);assert(careers.settle().ok);};
for(const day of [1,2,3]){
 clock.day=day;assert(careers.beginDuty({receiptId:`cn-tavern-chef-labor-${day}`}).ok);
 const r=chefReceipt(day*2);
 if(day===1){
  for(const bad of [{completed:false},{source:'reading'},{actorId:'cn-tavern-cook'},{mealId:'cn-tavern-order-9-dish'},{number:0},{workReceiptId:'cn-tavern-labor-1'}])assert.equal(careers.recordTavernChefService({...r,...bad}).code,'invalid-work-receipt');
  assert.equal(careers.recordTavernChefService({...r,day:9}).code,'wrong-duty-source');
  fail=true;assert.equal(careers.recordTavernChefService(r).code,'save-failed');assert.equal(careers.royalKitchenQualification().qualifiedDays,0);fail=false;
 }
 assert(careers.recordTavernChefService(r).ok);assert(careers.recordTavernChefService(r).replayed);
 assert.equal(careers.recordTavernChefService({...r,day:day+1}).code,'work-receipt-conflict');
 assert(careers.recordTavernChefService(chefReceipt(day*2+1)).ok);assert.equal(careers.royalKitchenQualification().qualifiedDays,day,'many orders on one day count once');
 finish();careers=make(saved);assert.equal(careers.state().loadError,null);
}
assert.equal(bank.size,0,'zero attendance and original orders cannot mint piecework pay');
assert(careers.resign().ok);assert.equal(careers.royalKitchenQualification().qualifiedDays,3);
careers=make(saved);assert.equal(careers.state().loadError,null);assert(careers.eligibility(ROYAL.id,{ageYears:22}).ok);
const qualified=copy(saved),legacy=copy(saved);legacy.version=7;delete legacy.workExperience;
const old=make(legacy);assert.equal(old.state().loadError,null);assert.equal(old.royalKitchenQualification().qualifiedDays,0,'legacy skills/pay/task totals add no inferred days');
for(const corrupt of [null,{tavernChef:[chefReceipt(1),chefReceipt(2)],royalKitchen:{receipts:[]}}])assert.equal(make({...qualified,workExperience:corrupt}).state().loadError,'invalid-career-state');
clock.day=4;careers=make(qualified);assert(careers.apply(ROYAL.id,{ageYears:22}).ok);assert.equal(careers.applicationResult(ROYAL.id).status,'pending');assert.equal(careers.state().tenure,null);
careers=make(saved);assert.equal(careers.state().loadError,null);assert.equal(careers.applicationResult(ROYAL.id).status,'pending');
assert(careers.reviewApplication(ROYAL.id,{ageYears:22,applicationId:careers.applicationResult(ROYAL.id).id}).ok);assert.equal(careers.slotHolder(ROYAL.id),'player');assert.equal(careers.state().officialCareer.appointments.length,0);
assert(careers.beginDuty({receiptId:'cn-royal-kitchen-labor-1'}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');
const royal={source:'china-royal-kitchen',number:1,orderId:'cn-royal-meal-1',mealId:'cn-royal-meal-1-meal',actorId:'cn-emperor',day:4,workReceiptId:'cn-royal-kitchen-labor-1',completed:true};
for(const bad of [{completed:false},{actorId:'player'},{mealId:'cn-royal-meal-2-meal'},{workReceiptId:'cn-clinic-physician-labor-1'}])assert.equal(careers.recordRoyalKitchenService({...royal,...bad}).code,'invalid-work-receipt');
assert.equal(careers.recordRoyalKitchenService({...royal,day:5}).code,'wrong-duty-source');
const before=careers.state();fail=true;assert.equal(careers.recordRoyalKitchenService(royal).code,'save-failed');assert.equal(careers.state().skillXP.cooking,before.skillXP.cooking);assert.equal(careers.state().lastDuty.customerReviews.length,0);fail=false;
assert.equal(careers.recordRoyalKitchenService(royal).xpGained,10);assert.equal(careers.state().performance,before.performance+1);assert.equal(bank.size,0);
assert(careers.recordRoyalKitchenService(royal).replayed);assert.equal(careers.recordRoyalKitchenService({...royal,actorId:'cn-consort-yue'}).code,'work-receipt-conflict');
careers=make(saved);assert.equal(careers.state().loadError,null);assert(careers.recordRoyalKitchenService(royal).replayed);assert.equal(careers.state().skillXP.cooking,10);
const later={...royal,number:3,orderId:'cn-royal-meal-3',mealId:'cn-royal-meal-3-meal',actorId:'cn-consort-ling'},earlier={...royal,number:2,orderId:'cn-royal-meal-2',mealId:'cn-royal-meal-2-meal',actorId:'cn-consort-yue'};assert.equal(careers.recordRoyalKitchenService(later).xpGained,10);assert.equal(careers.recordRoyalKitchenService(earlier).xpGained,10,'earlier original meal may finish after a newer one');assert(careers.recordRoyalKitchenService(later).replayed);assert.equal(careers.state().lastDuty.customerReviews.length,3);
clock.hour=18;clock.seconds=12*60/GAME_MINUTES_PER_SECOND;
assert(careers.laborEvent('completed',{roleId:ROYAL.id,receiptId:royal.workReceiptId,coveredSeconds:clock.seconds,completedTasks:1}).ok);assert(careers.laborEvent('inspected',{roleId:ROYAL.id,receiptId:royal.workReceiptId}).ok);assert.equal(careers.state().lastDuty.wage,32);assert(careers.settle().ok);assert.equal(bank.size,1);assert.equal([...bank.values()][0].amount,32);
careers=make(saved);assert.equal(careers.state().loadError,null);assert(careers.recordRoyalKitchenService(royal).replayed);assert.equal(bank.size,1);assert(careers.resign().ok);assert.equal(careers.royalKitchenQualification().qualifiedDays,3);
// Exercise the actual tavern adapter's outbox recovery with a rejected career
// write: it cannot retire the job before its original-order proof is durable.
clock.day=1;clock.hour=6;clock.seconds=0;careers=make(fresh);
assert(careers.apply(CHEF.id,{ageYears:22}).ok);assert(careers.reviewApplication(CHEF.id,{ageYears:22,applicationId:careers.applicationResult(CHEF.id).id}).ok);assert(careers.beginDuty({receiptId:'cn-tavern-chef-labor-1'}).ok);
const proof=chefReceipt(1),world={receiptId:proof.workReceiptId,stage:'finished',completedTasks:3,chefServiceReceipts:[proof],tables:[],orders:[]};
const scene={start:()=>true,restoreWorld:()=>true,snapshot:()=>copy(world),state:()=>copy(world),choices:()=>[],finished:()=>true};
const player={ageYears:22,root:{position:{x:22.35,y:.215,z:11.7}}},host={walking:false,station:{npcPosition:[24.1,.215,11.4]},root:{position:{x:24.1,y:.215,z:11.4}}};
fail=true;const service=createChinaTavernService({meal:{staffScene:scene,view:()=>({})},careers,getPlayer:()=>player,getClock:()=>clock,host,saved:{version:1,serial:1,job:{id:proof.workReceiptId,receiptId:proof.workReceiptId,formalRoleId:CHEF.id,stage:'working',coveredSeconds:0,completedTasks:3}},world,saveState:()=>true,document:null});
assert.equal(careers.royalKitchenQualification().qualifiedDays,0);service.update(.1);assert.equal(careers.state().lastDuty.stage,'working');assert.equal(service.claim(),false);
fail=false;service.update(.1);assert.equal(careers.royalKitchenQualification().qualifiedDays,1);assert.equal(careers.state().lastDuty.stage,'inspection');assert(service.claim());assert.equal(service.state().job,null);service.update(.1);assert.equal(careers.royalKitchenQualification().qualifiedDays,1);service.dispose();
console.log('PASS royal kitchen: three original chef days, pending review, migration/resignation, receipt failure/replay, cooking XP and continuous 32-copper bank wage');
