// Protect the new save boundary and clinic proof ledger: adding a skill must
// preserve rank/salary history; service proof and actual duty pay stay separate.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFormalCareers,COURT_CLERK_ROLE as CLERK,PHARMACY_ASSISTANT_ROLE as ASSISTANT,CLINIC_PHYSICIAN_ROLE as ROLE} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {studyOptions,STUDY_SKILL_NAMES} from '../source/game/study-lessons.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
import {createFormalLaborContract} from '../source/game/formal-labor-contract.js';
import {approvePending} from './fixtures/career-application.mjs';
const copy=structuredClone;
function fixture(saved,{day=1,hour=8,seed=785}={}){
 const clock={day,hour,seconds:0},flags={save:false},bank=new Map();let stored,careers;
 const load=value=>careers=createFormalCareers({saved:value,worldSeed:seed,getClock:()=>clock,saveState:value=>{if(flags.save)return false;stored=copy(value);return true;},creditWageToBank:d=>{const previous=bank.get(d.receiptId);if(previous){assert.deepEqual(previous,d);return {ok:true,replayed:true};}bank.set(d.receiptId,copy(d));return {ok:true};}});
 load(saved);
 return {get careers(){return careers;},clock,flags,bank,load,get saved(){return copy(stored);}};
}
const receipt=(number=1,overrides={})=>({receiptId:'cn-pharmacy-labor-1',orderId:`cn-clinic-order-${number}`,number,cardId:`cn-clinic-card-${number}`,packetId:`cn-clinic-packet-${number}`,recipientId:'cn-tavern-diner-west',recipientName:'顾谨',review:{evaluatorId:'cn-tavern-diner-west',positive:true,reason:'原单与云纹包同号，已当面交付本人'},...overrides});
const sixSkillSave=value=>{const s=copy(value);s.version=6;delete s.learning['jp-library'];delete s.learning['egypt-papyrus'];delete s.workExperience;delete s.skills.care;delete s.daily.care;delete s.skillXP.care;delete s.lowerWork[ASSISTANT.workSource];return s;};
const fresh=()=>fixture().careers.state();
function hirePhysician(){
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,1)>=.60)seed++;
 const s=fresh();Object.assign(s.skills,{care:2,writing:2,ritual:1});const f=fixture(s,{seed});
 assert(f.careers.recordClinicAssistantService(receipt()).ok);assert(f.careers.apply(ROLE.id,{ageYears:18}).ok);approvePending(f.careers,18);return f;
}

test('six-skill save gains only empty care; official promotion and frozen wages survive migration',()=>{
 let seed=1;while(careerInterviewRoll(seed,CLERK.id,1)>=.565||careerInterviewRoll(seed,CLERK.id+':promotion',3)>=.70)seed++;
 const s=fresh();Object.assign(s.skills,{ritual:2,writing:2,gardening:3,art:4,cooking:5,martial:6});s.skillXP.martial=17;const f=fixture(s,{seed});
 assert(f.careers.apply(CLERK.id,{ageYears:22}).ok);approvePending(f.careers);
 for(let day=1;day<=3;day++){
  Object.assign(f.clock,{day,hour:10,seconds:day*100});assert(f.careers.beginDuty().ok);f.clock.hour=11.5;assert(f.careers.dutyEvent('court-start').ok);f.clock.hour=12;assert(f.careers.dutyEvent('court-completed').ok);assert(f.careers.dutyEvent('archive-completed').ok);assert(f.careers.settle().ok);
 }
 assert(f.careers.applyPromotion().ok);const id=f.careers.promotionSummary().application.id;
 for(const step of ['interview','receive-document','appointment'])assert(f.careers.reviewPromotion({applicationId:id,step}).ok);
 const old=sixSkillSave(f.careers.state()),m=fixture(old,{day:3,hour:12}).careers.state();
 assert.equal(m.loadError,null);assert.equal(m.version,11);assert.equal(m.skills.care,0);assert.equal(m.skillXP.care,0);assert.equal(m.daily.care,0);assert.equal(m.lowerWork[ASSISTANT.workSource],0);
 for(const key of ['tenure','lastDuty','lastEvaluation','lastPaidDay','officialCareer','applications'])assert.deepEqual(m[key],old[key],key);
 for(const key of Object.keys(old.skills)){assert.equal(m.skills[key],old.skills[key]);assert.equal(m.skillXP[key],old.skillXP[key]);}
 assert.equal(fixture(old,{day:3,hour:12}).careers.currentRole().gradeLabel,'正九品');assert.equal(m.lastDuty.wage,20);
});

test('published v1/v4/v5 shapes migrate, partial new care and missing rank saves reject',()=>{
 for(const version of [4,5]){
  const old=sixSkillSave(fresh());old.version=version;delete old.officialCareer;delete old.skills.martial;delete old.daily.martial;delete old.skillXP.martial;if(version===4)delete old.skillXP;
  old.skills.writing=3;const c=fixture(old).careers;assert.equal(c.state().loadError,null);assert.equal(c.state().skills.writing,3);assert.equal(c.state().skills.care,0);assert.equal(c.state().lowerWork[ASSISTANT.workSource],0);
 }
 const v1=sixSkillSave(fresh());v1.version=1;delete v1.officialCareer;delete v1.skillXP;
 for(const key of ['gardening','art','cooking','martial']){delete v1.skills[key];delete v1.daily[key];}
 delete v1.lowerWork['fr-garden-labor'];for(const source of ['cn-archery','france-salon','france-atelier'])delete v1.learning[source];for(const row of Object.values(v1.learning))delete row.lessonId;
 assert.equal(fixture(v1).careers.state().loadError,null);assert.equal(fixture(v1).careers.state().skills.care,0);
 const partial=sixSkillSave(fresh());partial.skills.care=0;assert.equal(fixture(partial).careers.state().loadError,'invalid-career-state');
 const missing=fresh();delete missing.officialCareer;assert.equal(fixture(missing).careers.state().loadError,'invalid-career-state');
});

test('only original positive assistant deliveries earn durable care XP, once per order',()=>{
 const f=fixture();
 for(const bad of [{number:0},{number:1.5},{orderId:'cn-clinic-order-2'},{cardId:'cn-clinic-card-2'},{packetId:'cn-clinic-packet-2'},{receiptId:'cn-clinic-physician-labor-1'},{recipientId:'player'},{review:{evaluatorId:'cn-tavern-diner-east',positive:true}},{review:{evaluatorId:'cn-tavern-diner-west',positive:false}}])assert.equal(f.careers.recordClinicAssistantService(receipt(1,bad)).code,'invalid-work-receipt');
 assert.equal(f.careers.state().lowerWork[ASSISTANT.workSource],0);assert.equal(f.careers.completedLowerWork({source:ASSISTANT.workSource,receiptId:receipt().receiptId}).code,'unknown-work-source');
 f.flags.save=true;assert.equal(f.careers.recordClinicAssistantService(receipt()).code,'save-failed');assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.careers.state().lowerWork[ASSISTANT.workSource],0);
 f.flags.save=false;assert.equal(f.careers.recordClinicAssistantService(receipt()).xpGained,10);const prior=f.careers.state();assert(f.careers.recordClinicAssistantService(receipt()).replayed);assert.deepEqual(f.careers.state(),prior);
 f.load(f.saved);assert.equal(f.careers.recordClinicAssistantService(receipt()).xpGained,0);assert.equal(f.careers.state().skillXP.care,10);
 assert(f.careers.recordClinicAssistantService(receipt(9)).ok);assert(f.careers.recordClinicAssistantService(receipt(3)).replayed);assert.equal(f.careers.state().skillXP.care,20);assert.equal(f.careers.state().lowerWork[ASSISTANT.workSource],9);assert.equal(f.bank.size,0);
 for(const number of [10,11,12])assert(f.careers.recordClinicAssistantService(receipt(number)).ok);assert.equal(f.careers.state().daily.care,4);assert.equal(f.careers.state().lowerWork[ASSISTANT.workSource],12);assert.equal(f.careers.recordClinicAssistantService(receipt(12)).xpGained,0);
});

test('physician skill, adult and actual assistant-history gates survive rejected application reload',()=>{
 const f=fixture(),reasons=f.careers.apply(ROLE.id,{ageYears:17}).reasons;
 assert.deepEqual(reasons,['adult-required','care-required','writing-required','ritual-required','clinic-experience-required']);assert.equal(f.careers.state().tenure,null);
 const reload=fixture(f.saved);assert.equal(reload.careers.state().loadError,null);assert.deepEqual(reload.careers.applicationResult(ROLE.id).reasons,reasons);
 const qualified=fresh();Object.assign(qualified.skills,{care:2,writing:2,ritual:1});const readingOnly=fixture(qualified);assert.deepEqual(readingOnly.careers.eligibility(ROLE.id,{ageYears:18}).reasons,['clinic-experience-required']);
 assert(readingOnly.careers.recordClinicAssistantService(receipt()).ok);assert(readingOnly.careers.eligibility(ROLE.id,{ageYears:18}).ok);
 const f2=hirePhysician();assert.equal(f2.careers.slotHolder(ROLE.id),'player');assert.equal(f2.careers.catalogue().filter(r=>r.id===ROLE.id).length,1);assert.equal(f2.careers.currentRole().rankId,undefined);assert.equal(f2.careers.state().officialCareer.appointments.length,0);assert.equal(fixture(f2.saved).careers.state().loadError,null);
});

test('Chinese care lesson grants gradual XP and leaves the default ritual lesson unchanged',()=>{
 assert.equal(STUDY_SKILL_NAMES.care,'照护');const local=studyOptions('cn-rest'),lesson=local.find(x=>x.id==='care-intro');assert.equal(lesson.skill,'care');assert(lesson.excerpt.includes('虚构'));assert.equal(local[0].id,'ritual-intro');assert(!studyOptions('france-salon').some(x=>x.skill==='care'));
 const f=fixture();for(let i=0;i<3;i++){const t=f.careers.learningTicket('cn-rest','care-intro');assert(t.ok);assert.equal(f.careers.completeLearning(t.ticket,{seconds:8}).xpGained,10);}assert.equal(f.careers.state().skills.care,1);assert.equal(f.careers.state().lowerWork[ASSISTANT.workSource],0);
 const capped=fresh();capped.skills.ritual=100;const independent=fixture(capped),ticket=independent.careers.learningTicket('cn-rest','care-intro').ticket;assert.equal(independent.careers.completeLearning(ticket,{seconds:8}).xpGained,10);
});

test('physician continuous duty pays witnessed attendance once, independently of per-order completion',()=>{
 const f=hirePhysician(),receiptId='cn-clinic-physician-labor-1';assert(f.careers.beginDuty({receiptId}).ok);assert.equal(f.careers.state().lastDuty.shiftKind,'continuous');
 const started=f.careers.state();f.load(started);assert.equal(f.careers.state().loadError,null);assert.equal(f.careers.state().lastDuty.stage,'working');
 const seconds=60/GAME_MINUTES_PER_SECOND;Object.assign(f.clock,{hour:9,seconds});
 assert.equal(f.careers.laborEvent('completed',{roleId:ROLE.id,receiptId:'cn-clinic-physician-labor-2',coveredSeconds:seconds,completedTasks:1}).code,'wrong-duty-source');
 assert.equal(f.careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:seconds,completedTasks:-1}).code,'invalid-shift-work');assert.equal(f.careers.settle().code,'work-incomplete');assert.equal(f.bank.size,0);
 assert(f.careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:seconds,completedTasks:1}).ok);assert.equal(f.careers.state().lastDuty.stage,'inspection');assert(f.careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);assert.equal(f.careers.state().lastDuty.wage,2);
 const ready=f.saved;assert.equal(fixture(ready,{hour:9}).careers.state().loadError,null);const invalid=copy(ready);invalid.lastDuty.completedTasks=-1;assert.equal(fixture(invalid,{hour:9}).careers.state().loadError,'invalid-career-state');
 assert(f.careers.settle().ok);assert.equal([...f.bank.values()][0].amount,2);f.load(ready);assert(f.careers.settle().replayed);assert.equal(f.bank.size,1);
 assert.equal(f.careers.state().lastEvaluation.evaluatorId,'cn-clinic-physician');assert.equal(f.careers.state().officialCareer.service.length,0);
 const idle=hirePhysician();assert(idle.careers.beginDuty({receiptId}).ok);Object.assign(idle.clock,{hour:9,seconds});
 const contract=createFormalLaborContract({careers:idle.careers,role:ROLE,getJob:()=>null,getPlayer:()=>({ageYears:22}),meetHost:()=>true});
 const idleJob={formalRoleId:ROLE.id,receiptId,coveredSeconds:seconds,completedTasks:0};assert(contract.complete(idleJob));assert(contract.inspect(idleJob).ok);
 assert.equal(idle.careers.state().lastDuty.completedTasks,0);assert.equal(idle.careers.state().lastDuty.wage,2);assert.equal(idle.bank.size,1);assert.equal(idle.careers.state().lowerWork[ASSISTANT.workSource],1);assert.equal(fixture(idle.saved,{hour:9}).careers.state().loadError,null);
 const cancelled=hirePhysician();assert(cancelled.careers.beginDuty({receiptId}).ok);assert(cancelled.careers.interruptDuty('cancelled').ok);assert.equal(cancelled.careers.settle().code,'work-incomplete');assert.equal(cancelled.bank.size,0);
});
