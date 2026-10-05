// Financial and save invariants: evidence cannot be manufactured from time or
// skill, promotion must survive each interruption, and prior wages stay frozen.
import assert from 'node:assert/strict';
import {createFormalCareers,COURT_CLERK_ROLE} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {approvePending} from './fixtures/career-application.mjs';
const clone=x=>JSON.parse(JSON.stringify(x)),ROLE=COURT_CLERK_ROLE.id;
function fixture({seed=785,saved}={}){
 const clock={day:1,hour:8,seconds:0},flags={save:false,bank:false},bank=new Map();let stored,careers;
 const load=value=>{careers=createFormalCareers({saved:value,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(flags.save)return false;stored=clone(s);},creditWageToBank:d=>{if(flags.bank)return {ok:false,code:'bank-unavailable'};const old=bank.get(d.receiptId);if(old){assert.equal(old.amount,d.amount);return {ok:true,replayed:true};}bank.set(d.receiptId,clone(d));return {ok:true};}});assert.equal(careers.state().loadError,null);return careers;};
 load(saved);if(!saved){const s=careers.state();s.skills.ritual=2;s.skills.writing=2;load(s);}
 const hire=()=>{assert(careers.apply(ROLE,{ageYears:20}).ok);approvePending(careers);assert(careers.isHired());};
 const day=n=>{clock.day=n;clock.hour=8;clock.seconds+=100;careers.observeDay();};
 const complete=()=>{clock.hour=10;assert(careers.beginDuty().ok);clock.hour=11.5;assert(careers.dutyEvent('court-start').ok);clock.hour=12;assert(careers.dutyEvent('court-completed').ok);assert(careers.dutyEvent('archive-completed').ok);};
 const paid=()=>{complete();assert(careers.settle().ok);};
 const enough=()=>{hire();paid();day(2);paid();day(3);paid();};
 return {get careers(){return careers;},clock,flags,bank,load,hire,day,complete,paid,enough,get saved(){return clone(stored);}};
}
let good=0,bad=0;for(let seed=1;seed<10000&&(!good||!bad);seed++){if(careerInterviewRoll(seed,ROLE,1)>=.565)continue;const roll=careerInterviewRoll(seed,ROLE+':promotion',3);if(roll<.7&&!good)good=seed;if(roll>=.7&&!bad)bad=seed;}
const f=fixture({seed:good});f.hire();assert.equal(f.careers.promotionAvailability().ok,false);
f.complete();assert.equal(f.careers.promotionSummary().qualifiedDays,1);assert.equal(f.careers.dutyEvent('archive-completed').ok,false);assert.equal(f.careers.promotionSummary().qualifiedDays,1);assert(f.careers.settle().ok);
f.day(2);f.paid();f.day(3);f.complete();assert(f.careers.promotionAvailability().reasons.includes('promotion-duty-unsettled'));
f.flags.bank=true;assert.equal(f.careers.settle().ok,false);assert.equal(f.careers.applyPromotion().code,'promotion-duty-unsettled');f.flags.bank=false;assert(f.careers.settle().ok);
assert.equal(f.careers.promotionSummary().qualifiedDays,3);f.flags.save=true;assert.equal(f.careers.applyPromotion().code,'save-failed');f.flags.save=false;assert.equal(f.careers.promotionSummary().application,null);
assert(f.careers.applyPromotion().ok);const submitted=f.careers.promotionSummary().application;assert.equal(f.careers.applyPromotion().code,'promotion-pending');f.load(f.saved);assert.deepEqual(f.careers.promotionSummary().application,submitted);
assert(f.careers.reviewPromotion({applicationId:submitted.id}).ok);assert.equal(f.careers.currentRole().gradeLabel,'从九品');f.load(f.saved);assert.equal(f.careers.promotionSummary().application.stage,'document-ready');
assert(f.careers.reviewPromotion({applicationId:submitted.id,step:'receive-document'}).ok);f.load(f.saved);assert.equal(f.careers.promotionSummary().application.stage,'document-held');
const before=clone([...f.bank.values()]);assert(f.careers.reviewPromotion({applicationId:submitted.id,step:'appointment'}).ok);assert.equal(f.careers.currentRole().gradeLabel,'正九品');assert.equal(f.careers.currentRole().wage,22);assert.equal(f.careers.state().lastDuty.wage,20);assert.deepEqual([...f.bank.values()],before);assert.equal(f.careers.reviewPromotion({applicationId:submitted.id,step:'appointment'}).ok,false);f.load(f.saved);assert.equal(f.careers.currentRole().gradeLabel,'正九品');assert.equal(f.careers.state().lastDuty.wage,20);
const alteredOldWage=f.saved;for(const row of [alteredOldWage.lastDuty,alteredOldWage.lastEvaluation]){row.officialRankId='cn-records-regular';row.wage=24;}assert.equal(createFormalCareers({saved:alteredOldWage,getClock:()=>f.clock,saveState:()=>true}).state().loadError,'invalid-career-state');
f.day(4);f.complete();assert.equal(f.careers.state().lastDuty.wage,24);f.flags.save=true;assert(f.careers.settle().cleanupPending);f.flags.save=false;f.load(f.saved);assert.equal(f.careers.state().lastDuty.stage,'ready');assert(f.careers.settle().replayed);assert.equal([...f.bank.values()].reduce((sum,r)=>sum+r.amount,0),84);f.load(f.saved);
assert(f.careers.resign().ok);assert.equal(f.careers.state().officialCareer.appointments[0].endedAt.day,4);assert.equal(f.careers.state().officialCareer.service.length,4);f.day(5);f.hire();assert.equal(f.careers.currentRole().gradeLabel,'从九品');assert.equal(f.careers.promotionSummary().qualifiedDays,0);assert.equal(f.careers.promotionSummary().lifetimeQualifiedDays,4);f.load(f.saved);assert.equal(f.careers.state().officialCareer.applications[0].status,'approved');
const reject=fixture({seed:bad});reject.enough();assert(reject.careers.applyPromotion().ok);const rejectedId=reject.careers.promotionSummary().application.id;assert.equal(reject.careers.reviewPromotion({applicationId:rejectedId}).code,'promotion-review-rejected');const decision=reject.careers.promotionSummary().application;reject.load(reject.saved);assert.deepEqual(reject.careers.promotionSummary().application,decision);assert.equal(reject.careers.applyPromotion().code,'promotion-applied-today');assert.equal(reject.careers.reviewPromotion({applicationId:rejectedId}).code,'no-pending-promotion');assert.equal(reject.careers.currentRole().wage,18);
const legacy=fixture({seed:good});legacy.hire();legacy.paid();const old=legacy.saved;delete old.officialCareer;for(const r of [old.lastDuty,old.lastEvaluation]){delete r.officialPayVersion;delete r.officialRankId;delete r.officialTenureId;}old.performance=80;old.promotionProgress=80;legacy.load(old);assert.equal(legacy.careers.promotionSummary().qualifiedDays,1);assert.equal(legacy.careers.currentRole().wage,18);assert.equal(legacy.careers.state().lastDuty.wage,20);legacy.day(100);assert.equal(legacy.careers.promotionSummary().qualifiedDays,1);assert.equal(legacy.careers.promotionAvailability().ok,false);
const forged=clone(f.saved);forged.officialCareer.service.push(clone(forged.officialCareer.service[0]));assert.equal(createFormalCareers({saved:forged,getClock:()=>f.clock,saveState:()=>true}).state().loadError,'invalid-career-state');
console.log('PASS official service evidence, fixed review, three physical document stages, refusal, migration, resignation, frozen wages and bank cleanup replay');
