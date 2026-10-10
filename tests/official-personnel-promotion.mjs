// Real signed roster and old/new salary regression: a saved lottery is consumed
// only by the original emperor, and a v2 salary requires every original duty.
import assert from 'node:assert/strict';
import {createFormalCareers,COURT_CLERK_ROLE} from '../source/game/formal-careers.js';
import {officialTenureId} from '../source/game/official-career-progress.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {createChinaPersonnelRecords,CHINA_PERSONNEL_OFFICIALS_V1 as OFFICIALS} from '../source/game/china-personnel-records.js';
import {createChinaPersonnelWork,CHINA_PERSONNEL_COMPILE_POINT,validateChinaPersonnelWorkCase} from '../source/game/china-personnel-work.js';
import {approvePending} from './fixtures/career-application.mjs';
const copy=structuredClone,ROLE=COURT_CLERK_ROLE.id,LU='cn-official-personnel',EMPEROR='cn-emperor',REGULAR='cn-records-regular',PERSONNEL='cn-records-personnel';
let good,bad;
for(let seed=1;seed<10000&&(!good||!bad);seed++){
 if(careerInterviewRoll(seed,ROLE,1)>=.565||careerInterviewRoll(seed,ROLE+':promotion',3)>=.7)continue;
 const roll=careerInterviewRoll(seed,ROLE+':promotion:personnel',6);if(roll<.7&&!good)good=seed;if(roll>=.7&&!bad)bad=seed;
}
function fixture(seed=good){
 const clock={day:1,hour:8,seconds:100},flags={save:false,bank:false},jobs=new Map(),bank=new Map(),actors=new Map([
  [LU,{actorId:LU,bodyId:LU+'-original-body',alive:true,position:[19.3,3.915,32.15],busy:false}],
  [EMPEROR,{actorId:EMPEROR,bodyId:EMPEROR+'-original-body',alive:true,position:[-15.1,.215,-13.35],busy:false}],
 ]);let careers,stored,reads=0,writes=0,enabled=true,mutateRead=x=>x;
 const options={worldSeed:seed,getClock:()=>clock,enablePersonnelProgression:true,resolvePromotionActor:id=>actors.get(id),
  readPersonnelWork:query=>{reads++;const found=[...jobs.values()].filter(j=>j.mode===query.mode&&j.officialTenureId===query.officialTenureId&&(query.day===undefined||j.day===query.day)&&(query.allowPending||j.status==='signed')).at(-1);return mutateRead(found?copy(found):null);},
  saveState:next=>{writes++;if(flags.save)return false;stored=copy(next);return true;},creditWageToBank:receipt=>{if(flags.bank)return {ok:false};if(bank.has(receipt.receiptId)){assert.deepEqual(bank.get(receipt.receiptId),receipt);return {ok:true,replayed:true};}bank.set(receipt.receiptId,copy(receipt));return {ok:true};}};
 const load=(saved=stored)=>{careers=createFormalCareers({...options,enablePersonnelProgression:enabled,saved});assert.equal(careers.state().loadError,null);return careers;};
 load();const initial=careers.state();initial.skills.ritual=2;initial.skills.writing=3;load(initial);
 const f={clock,flags,jobs,bank,actors,options,get careers(){return careers;},get saved(){return copy(stored);},get writes(){return writes;},get reads(){return reads;},load,
  mutateRead:fn=>{mutateRead=fn;},enable:value=>{enabled=value;},day:n=>{clock.day=n;clock.hour=8;clock.seconds=n*100;assert(careers.observeDay().ok);},
  proof(step,changes={}){const app=careers.promotionSummary().application,actorStep=['interview','imperial-review'].includes(step),actor=actors.get(step==='interview'?LU:EMPEROR),duration=actorStep?4:step==='appointment'?3:0;
   return {applicationId:app.id,documentId:`appointment:${app.id}`,actorId:'player',targetId:actorStep?actor.actorId:'cn-court-career-desk',position:step==='imperial-review'?[-15.1,.145,-14.45]:actorStep?[actor.position[0]+.7,actor.position[1],actor.position[2]]:step==='appointment'?[20.55,.215,32.25]:[21.50,.215,32.25],standing:true,clear:true,elapsed:duration,duration,day:clock.day,completedAt:clock.seconds,...(actorStep?{recipientPosition:copy(actor.position),recipientBodyId:actor.bodyId,recipientAlive:true}:{}),...changes};},
  review(step,changes={}){return careers.reviewPromotion({applicationId:careers.promotionSummary().application.id,step,proof:f.proof(step,changes)});},
  court(){clock.hour=10;assert(careers.beginDuty().ok);clock.hour=11.5;assert(careers.dutyEvent('court-start').ok);clock.hour=12;assert(careers.dutyEvent('court-completed').ok);},
  archive(changes={}){return careers.dutyEvent('archive-completed',{proof:{actorId:'player',targetId:'cn-court-career-desk',position:[21.50,.215,32.25],standing:true,clear:true,elapsed:8,duration:8,...changes}});},
  paid(){f.court();assert(careers.dutyEvent('archive-completed').ok);assert(careers.settle().ok);},
  ready(){assert(careers.apply(ROLE,{ageYears:20}).ok);approvePending(careers);for(let day=1;day<=3;day++){if(day>1)f.day(day);f.paid();}assert(careers.applyPromotion().ok);let id=careers.promotionSummary().application.id;for(const step of ['interview','receive-document','appointment'])assert(careers.reviewPromotion({applicationId:id,step}).ok);assert.equal(careers.currentRole().rankId,REGULAR);for(let day=4;day<=6;day++){f.day(day);f.paid();}},
  promote(){assert(careers.applyPromotion().ok);for(const step of ['interview','receive-document','imperial-review','appointment'])assert(f.review(step).ok);assert.equal(careers.currentRole().rankId,PERSONNEL);},
  job({day=clock.day,mode='trial',signed=true}={}){
   const tenureId=officialTenureId(careers.state().tenure),records=createChinaPersonnelRecords({resolveActor:id=>{const row=OFFICIALS.find(x=>x.actorId===id);return {actorId:id,alive:true,position:copy(row.office)};},saveState:()=>true});
   assert(records.witnessCourt({id:`cn-morning-audience:${day}`,day,actorIds:OFFICIALS.map(x=>x.actorId)}).ok);
   for(const row of OFFICIALS.slice(0,2))assert(records.witnessArchive({id:`cn-official-archive:${row.actorId}:${day}`,actorId:row.actorId,day,audienceId:`cn-morning-audience:${day}`,position:copy(row.office),elapsed:8,duration:8}).ok);
   const work=createChinaPersonnelWork({sourceFor:(d,n)=>records.sourceFor(d,n),readAppointment:()=>({actorId:'player',tenureId,rankId:mode==='trial'?REGULAR:careers.currentRole().rankId}),validateEligibility:r=>r.officialTenureId===tenureId,resolveActor:id=>actors.get(id),saveState:state=>{for(const row of state.cases)jobs.set(row.id,copy(row));return true;}});
   assert(work.claim({day,mode,officialTenureId:tenureId}).ok);const id=work.current().id;
   for(const row of OFFICIALS){assert(work.visit({caseId:id,actorId:row.actorId,proof:{caseId:id,actorId:'player',targetId:row.actorId,position:[row.office[0]+.7,row.office[1],row.office[2]],standing:true,clear:true,elapsed:3,duration:3}}).ok);assert(work.record({caseId:id,actorId:row.actorId,archiveStatus:OFFICIALS.slice(0,2).includes(row)?'accepted':'awaiting'}).ok);}
   assert(work.compile({caseId:id,proof:{caseId:id,actorId:'player',targetId:'cn-court-career-desk',position:copy(CHINA_PERSONNEL_COMPILE_POINT),standing:true,clear:true,elapsed:8,duration:8,revision:work.current().revision}}).ok);
   const sign=()=>{const actor=actors.get(LU);return work.review({caseId:id,proof:{caseId:id,actorId:'player',targetId:LU,position:[actor.position[0]+.7,actor.position[1],actor.position[2]],standing:true,clear:true,elapsed:4,duration:4,revision:work.current()?.revision??jobs.get(id).revision,recipientPosition:copy(actor.position),recipientBodyId:actor.bodyId,recipientAlive:true}});};
   if(signed)assert(sign().ok);return {id,work,records,sign};
  },
 };
 return f;
}
const fail=(r,code)=>{assert.equal(r.ok,false);if(code)assert.equal(r.code,code);};
// Distinct real regular-grade days, one current-tenure signed trial, no legacy
// performance/elapsed days/boolean receipt can replace evidence.
{
 const f=fixture();f.ready();const c=f.careers,oldContract=f.saved.lastDuty,skillBefore=c.state().skillXP;
 assert.equal(c.promotionSummary().qualifiedDays,3);assert.equal(c.promotionSummary().trialComplete,false);fail(c.applyPromotion(),'personnel-trial-required');
 f.mutateRead(()=>true);fail(c.applyPromotion(),'personnel-trial-required');f.mutateRead(x=>x);const job=f.job();assert(validateChinaPersonnelWorkCase(f.jobs.get(job.id)));assert.deepEqual(c.state().skillXP,skillBefore);
 assert.equal(c.promotionSummary().trialComplete,true);f.enable(false);f.load();fail(f.careers.applyPromotion(),'promotion-route-complete');f.enable(true);f.load();
 f.flags.save=true;fail(f.careers.applyPromotion(),'save-failed');f.flags.save=false;assert.equal(f.careers.promotionSummary().application.toRankId,REGULAR);assert(f.careers.applyPromotion().ok);
 const submitted=f.careers.promotionSummary().application,roll=submitted.roll;f.load();assert.deepEqual(f.careers.promotionSummary().application,submitted);
 fail(f.review('interview',{elapsed:3.99}),'invalid-promotion-proof');f.flags.save=true;fail(f.review('interview'),'save-failed');f.flags.save=false;assert.equal(f.careers.promotionSummary().application.recommendation,null);
 assert(f.review('interview').ok);let app=f.careers.promotionSummary().application;assert.equal(app.imperialDecision,null);assert.equal(app.roll,roll);assert.equal(app.recommendation.chance,.7);f.load();
 assert(f.review('receive-document').ok);f.load();fail(f.review('imperial-review',{documentId:'wrong'}),'invalid-promotion-proof');fail(f.review('imperial-review',{recipientBodyId:'replacement'}),'invalid-promotion-proof');
 f.flags.save=true;fail(f.review('imperial-review'),'save-failed');assert.equal(f.careers.promotionSummary().application.imperialDecision,null);f.flags.save=false;assert(f.review('imperial-review').ok);const decision=f.careers.promotionSummary().application.imperialDecision,writes=f.writes;assert(f.review('imperial-review').replayed);assert.equal(f.writes,writes);f.load();assert.deepEqual(f.careers.promotionSummary().application.imperialDecision,decision);
 assert.equal(f.careers.currentRole().rankId,REGULAR);f.actors.get(EMPEROR).alive=false;fail(f.review('appointment',{elapsed:2.99}),'invalid-promotion-proof');f.flags.save=true;fail(f.review('appointment'),'save-failed');f.flags.save=false;assert(f.review('appointment').ok);const approved=f.saved;assert.equal(f.careers.currentRole().name,'吏务核籍录事');assert.equal(f.careers.currentRole().wage,26);assert.deepEqual(f.careers.state().lastDuty,oldContract);const after=f.writes;assert(f.review('appointment').replayed);assert.equal(f.writes,after);f.load();assert.equal(f.careers.currentRole().gradeLabel,'从八品');fail(f.careers.applyPromotion(),'promotion-applied-today');
 // New daily contract requires own court, the same-day signed roster and own8s archive.
 f.actors.get(EMPEROR).alive=true;f.day(7);f.court();assert.equal(f.careers.workState().lastDuty.officialPayContract.basePay,26);fail(f.archive(),'personnel-duty-required');const dutyJob=f.job({mode:'duty'});fail(f.archive({elapsed:7.99}),'invalid-personnel-archive-proof');f.flags.save=true;fail(f.archive(),'save-failed');assert.equal(f.careers.state().lastDuty.stage,'archive');f.flags.save=false;assert(f.archive().ok);assert.equal(f.careers.state().lastDuty.wage,28);assert.equal(f.careers.state().lastDuty.personnelWork.id,dutyJob.id);f.load();
 f.flags.save=true;assert(f.careers.settle().cleanupPending);f.flags.save=false;f.load();assert(f.careers.settle().replayed);assert.equal(f.bank.size,7);f.load();
 for(const mutate of [s=>s.lastDuty.officialPayContract.basePay=30,s=>s.lastDuty.personnelWork.receipt.rows.pop(),s=>s.officialCareer.applications.reverse(),s=>s.officialCareer.applications.at(-1).imperialDecision.roll=.999,s=>s.officialCareer.applications.at(-1).declaration=null]){const invalid=f.saved;mutate(invalid);assert.equal(createFormalCareers({...f.options,saved:invalid}).state().loadError,'invalid-career-state');}
 assert.equal(approved.officialCareer.applications.length,2);
}
// Current-rank negative service counts against the net requirement. Genuine
// older performance/entry service does not replace it, and the original chance
// formula retains its penalty rather than silently flooring every chance at .70.
{
 const f=fixture();f.ready();f.job();f.day(7);f.court();assert(f.careers.interruptDuty('interrupted').ok);
 assert.equal(f.careers.promotionSummary().qualifiedDays,3);assert.equal(f.careers.promotionSummary().balance,2);fail(f.careers.applyPromotion(),'service-performance-required');
 f.day(8);f.paid();assert.equal(f.careers.promotionSummary().qualifiedDays,4);assert.equal(f.careers.promotionSummary().balance,3);assert(f.careers.applyPromotion().ok);assert(f.review('interview').ok);assert.equal(f.careers.promotionSummary().application.recommendation.chance,.69);f.load();
}
// Past-rank and foreign-tenure signed work cannot satisfy this appointment.
{
 const f=fixture();f.ready();const early=f.job({day:2});assert(validateChinaPersonnelWorkCase(f.jobs.get(early.id)));fail(f.careers.applyPromotion(),'personnel-trial-required');
 const trial=f.job();const original=f.jobs.get(trial.id);f.mutateRead(job=>job?.id===trial.id?{...job,officialTenureId:'another-tenure'}:job);fail(f.careers.applyPromotion(),'personnel-trial-required');f.mutateRead(x=>x);f.promote();assert(f.careers.resign().ok);f.load();assert.equal(f.careers.promotionSummary().rankId,null);assert.equal(f.careers.state().officialCareer.applications.filter(a=>a.status==='approved').length,2);assert.deepEqual(f.jobs.get(trial.id),original);
}
// Rejection is decided once, persists, and cannot be rerolled/redeclared.
{
 const f=fixture(bad);f.ready();f.job();assert(f.careers.applyPromotion().ok);assert(f.review('interview').ok);assert(f.review('receive-document').ok);fail(f.review('imperial-review'),'promotion-review-rejected');const saved=f.saved,writes=f.writes;assert.equal(f.careers.currentRole().rankId,REGULAR);f.load();fail(f.review('imperial-review'),'promotion-review-rejected');assert.equal(f.writes,writes);assert.deepEqual(f.saved,saved);fail(f.review('appointment'),'no-pending-promotion');fail(f.careers.applyPromotion(),'promotion-applied-today');
}
// A failed identity or changed real evidence cannot become an appointment.
for(const change of ['identity','trial']){
 const f=fixture();f.ready();f.job();assert(f.careers.applyPromotion().ok);assert(f.review('interview').ok);assert(f.review('receive-document').ok);
 if(change==='identity')f.actors.get(EMPEROR).bodyId='replacement-body';else f.mutateRead(job=>job?{...job,rows:[]}:null);
 fail(f.review('imperial-review'),change==='identity'?'promotion-identity-changed':'promotion-eligibility-changed');assert.equal(f.careers.currentRole().rankId,REGULAR);f.load();
}
// A busy original Lu may defer exactly the compiled original duty, never mint
// next-day attendance or drop the pending wage/contract on reload.
{
 const f=fixture();f.ready();f.job();f.promote();f.day(7);f.court();const job=f.job({mode:'duty',signed:false});fail(f.careers.deferPersonnelReview({caseId:job.id}),'personnel-review-not-waiting');
 f.actors.get(LU).busy=true;f.flags.save=true;fail(f.careers.deferPersonnelReview({caseId:job.id}),'save-failed');assert.equal(f.careers.state().lastDuty.personnelDeferral,null);f.flags.save=false;assert(f.careers.deferPersonnelReview({caseId:job.id}).ok);const marker=f.saved.lastDuty.personnelDeferral;f.load();f.day(8);assert.deepEqual(f.careers.state().lastDuty.personnelDeferral,marker);assert.equal(f.careers.state().lastDuty.stage,'archive');fail(f.careers.beginDuty(),'personnel-review-pending');fail(f.careers.dutyEvent('court-start'),'personnel-review-pending');assert.equal(f.careers.state().lastEvaluation.day,6);fail(f.archive(),'personnel-duty-required');
 f.actors.get(LU).busy=false;assert(job.sign().ok);assert(f.careers.archiveAvailability().ok);assert(f.archive().ok);assert.equal(f.careers.state().lastEvaluation.day,7);assert.equal(f.careers.state().lastDuty.wage,28);assert(f.careers.settle().ok);f.load();assert.equal(f.careers.state().officialCareer.service.filter(row=>row.rankId===PERSONNEL).length,1);
 f.day(9);assert.equal(f.careers.state().lastEvaluation.day,8);assert.equal(f.careers.state().lastEvaluation.positive,false);f.load();
}
// Morning application/recommendation freezes an explicit receipt prefix. Work
// later that day remains a real obligation and must not corrupt a cold save.
for(const stage of ['submitted','recommended','negative']){
 const f=fixture();f.ready();f.job();f.promote();const skilled=f.saved;skilled.skills.writing=4;f.load(skilled);
 for(let day=7;day<=11;day++){f.day(day);f.court();f.job({mode:'duty'});assert(f.archive().ok);assert(f.careers.settle().ok);}
 f.day(12);assert(f.careers.applyPromotion().ok);const frozen=copy(f.careers.promotionSummary().application.checked);
 if(stage==='recommended')assert(f.review('interview').ok);
 f.court();if(stage==='negative')assert(f.careers.interruptDuty('interrupted').ok);else {f.job({mode:'duty'});assert(f.archive().ok);assert(f.careers.settle().ok);}
 f.load();assert.deepEqual(f.careers.promotionSummary().application.checked,frozen);
 assert.equal(f.careers.promotionSummary().balance,stage==='negative'?4:6);
 if(stage==='negative')fail(f.review('interview'),'promotion-eligibility-changed');
 const legacy=f.saved;delete legacy.officialCareer.applications.at(-1).checked.serviceIds;if(legacy.officialCareer.applications.at(-1).recommendation)delete legacy.officialCareer.applications.at(-1).recommendation.checked.serviceIds;
 assert.equal(createFormalCareers({...f.options,saved:legacy}).state().loadError,null);
 const forged=f.saved;forged.officialCareer.applications.at(-1).checked.serviceIds[0]='career-review:cn-court-clerk-1:1';assert.equal(createFormalCareers({...f.options,saved:forged}).state().loadError,'invalid-career-state');
}
// Same-office ladder: every new personal grade requires fresh actual duty
// receipts, not entry-grade days or a passage of calendar time. The fixed seed
// lottery may reject; a later real worked day can support one new application.
{
 const f=fixture();f.ready();f.job();f.promote();
 const skilled=f.saved;skilled.skills.ritual=4;skilled.skills.writing=8;f.load(skilled);
 let day=6;
 const targets=[['cn-records-personnel-regular',5,30],['cn-records-personnel-7-junior',7,34],['cn-records-personnel-7-regular',9,38],['cn-records-personnel-6-junior',12,42],['cn-records-personnel-6-regular',15,48]];
 for(const [target,required,pay] of targets){
  const from=f.careers.currentRole().rankId,oldPay=f.careers.currentRole().wage;
  assert.equal(f.careers.promotionSummary().qualifiedDays,0);assert.equal(f.careers.promotionSummary().requirements.serviceDays,required);
  for(let n=0;n<required;n++){
   f.day(++day);f.court();fail(f.archive(),'personnel-duty-required');f.job({mode:'duty'});assert(f.archive().ok);assert(f.careers.settle().ok);
   assert.equal(f.careers.state().lastDuty.wage,oldPay+2);
   if(n<required-1)assert.equal(f.careers.promotionAvailability().ok,false);
  }
  let approved=false;
  for(let attempts=0;attempts<20&&!approved;attempts++){
   assert(f.careers.applyPromotion().ok);const submitted=f.saved;assert.equal(submitted.officialCareer.applications.at(-1).routeVersion,3);f.load();
   assert(f.review('interview').ok);f.load();assert(f.review('receive-document').ok);f.load();
   const imperial=f.review('imperial-review');f.load();
   if(!imperial.ok){fail(imperial,'promotion-review-rejected');fail(f.careers.applyPromotion(),'promotion-applied-today');f.day(++day);f.court();f.job({mode:'duty'});assert(f.archive().ok);assert(f.careers.settle().ok);continue;}
   assert.equal(f.careers.currentRole().rankId,from);const previous=f.careers.state().lastDuty;
   f.flags.save=true;fail(f.review('appointment'),'save-failed');f.flags.save=false;assert(f.review('appointment').ok);approved=true;
   assert.equal(f.careers.currentRole().rankId,target);assert.equal(f.careers.currentRole().wage,pay);assert.deepEqual(f.careers.state().lastDuty,previous);
   assert(f.review('appointment').replayed);f.load();assert.equal(f.careers.currentRole().rankId,target);
   const invalid=f.saved;invalid.officialCareer.applications.at(-1).checked.qualifiedDayIds[0]=0;assert.equal(createFormalCareers({...f.options,saved:invalid}).state().loadError,'invalid-career-state');
  }
  assert(approved,'Bounded fixed-seed attempts reach next grade');
 }
 assert.equal(f.careers.currentRole().gradeLabel,'正六品');assert.equal(f.careers.promotionSummary().routeId,null);assert(f.careers.promotionSummary().reasons.includes('promotion-route-complete'));
 f.day(++day);f.court();f.job({mode:'duty'});assert(f.archive().ok);assert(f.careers.settle().ok);assert.equal(f.careers.state().lastDuty.wage,50);f.load();
 assert.equal(f.careers.state().officialCareer.applications.filter(a=>a.status==='approved').length,7);
}
console.log('PASS personnel promotion: old ordered ranks and contracts; current real service/trial; original Lu/emperor/paper; fixed lottery; save/reload/replay; 26+2 signed duty; narrow busy-review deferral.');
