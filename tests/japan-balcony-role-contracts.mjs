// A plausible receipt must not mint XP without the original care ledger;
// retries, cold restoration and bank failures must remain exactly-once.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_BALCONY_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {validJapanBalconyReceipt,sameJapanBalconyReceipt} from '../source/game/japan-balcony-role.js';
import {createJapanBalconyEmployment} from '../source/game/japan-balcony-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},ritual=1,reject=false,proofs=[]}={}){
 const failures={career:false,bank:false,context:false,missing:false,corrupt:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=ritual;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,getJapanBalconyWorkContext:()=>{
  if(failures.context)throw Error('ledger unavailable');return failures.missing?null:{receipts:proofs,loadError:failures.corrupt?'invalid-balcony-state':null};
 },saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-balcony-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 const prove=r=>{proofs.push(clone(r));return r;};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish,proofs,prove};
}
const receipt=(f,cycle=1,day=f.clock.day)=>({source:'japan-balcony',id:`jp-balcony-gallery-1-cycle-${cycle}-${f.receiptId}`,itemId:'jp-balcony-gallery-1',cycle,day,workReceiptId:f.receiptId,completed:true,accurate:true,outcome:'completed'});
assert(Object.isFrozen(ROLE));assert(Object.isFrozen(ROLE.skillRequirements));assert(Object.isFrozen(ROLE.dutyWindow));
assert.equal(ROLE.wage,12);assert.equal(ROLE.preparationBonus,0);assert.deepEqual(ROLE.skillRequirements,{ritual:1});assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'jp-balcony-service-1',roleId:ROLE.id,holderId:'jp-balcony',replacement:true});
const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:17}).ok,false);for(const key of ['ritual'])assert.equal(fixture({[key]:0}).careers.eligibility(ROLE.id,{ageYears:18}).ok,false);f.start();
const r=receipt(f);assert(validJapanBalconyReceipt(r));assert(sameJapanBalconyReceipt(r,clone(r)));
for(const patch of [{itemId:'jp-balcony-gallery-0'},{itemId:'jp-balcony-gallery-01'},{itemId:'jp-balcony-gallery-2'},{cycle:0},{cycle:1.5},{cycle:Number.MAX_SAFE_INTEGER+1},{workReceiptId:'jp-balcony-labor-01'},{workReceiptId:'jp-balcony-labor-9007199254740992'},{completed:false},{accurate:false},{outcome:'cord'},{source:'japan-linen'},{id:r.id+'-replay'},{day:-1},{day:1.5},{day:Number.MAX_SAFE_INTEGER+1},{extra:true}])assert.equal(f.careers.recordJapanBalconyReview({...r,...patch}).code,'invalid-work-receipt',JSON.stringify(patch));
assert.equal(f.careers.recordJapanBalconyReview(r).code,'invalid-work-receipt','valid shape alone is not source proof');
f.prove(r);for(const key of ['context','missing','corrupt']){f.failures[key]=true;assert.equal(f.careers.recordJapanBalconyReview(r).code,'work-context-unavailable');f.failures[key]=false;}
f.proofs[0].accurate=false;assert.equal(f.careers.recordJapanBalconyReview(r).code,'invalid-work-receipt');f.proofs[0].accurate=true;
f.failures.career=true;assert.equal(f.careers.recordJapanBalconyReview(r).code,'save-failed');assert.equal(f.careers.state().skillXP.ritual,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);
f.failures.career=false;assert.equal(f.careers.recordJapanBalconyReview(r).xpGained,10);assert.equal(f.careers.recordJapanBalconyReview(r).xpGained,0);assert.equal(f.bank.state().balances.japan.bank,0,'care receipt never pays an item wage');
const restored=fixture({store:f.store});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.recordJapanBalconyReview(r).replayed,'verified stored evidence replays without growth after reload');
const learnBalcony=careers=>{const ticket=careers.learningTicket('jp-library','jp-ritual-intro');assert(ticket.ok);return careers.completeLearning(ticket.ticket,{seconds:8});};
for(let n=0;n<3;n++)assert.equal(learnBalcony(restored.careers).xpGained,10);
assert.equal(learnBalcony(restored.careers).limited,'daily-skill-limit');assert.equal(restored.careers.state().daily.ritual,4);
const capped=fixture();capped.start();for(let n=0;n<4;n++)assert.equal(learnBalcony(capped.careers).xpGained,10);
assert.equal(capped.careers.recordJapanBalconyReview(capped.prove(receipt(capped))).limited,'daily-skill-limit');assert.equal(capped.careers.state().daily.ritual,4);assert.equal(capped.careers.state().lastDuty.customerReviews.length,1,'completed source proof persists even at the shared growth cap');
const future=receipt(f,2,f.clock.day+1);assert(validJapanBalconyReceipt(future));assert.equal(f.careers.recordJapanBalconyReview(f.prove(future)).code,'wrong-duty-source','future inspections cannot belong to an earlier shift');
const old=fixture();old.start();const priorDay=receipt(old,1,0);assert.equal(old.careers.recordJapanBalconyReview(old.prove(priorDay)).xpGained,10,'unfinished prior-day inspection may complete in this duty');
const today=receipt(old,2,1);assert.equal(old.careers.recordJapanBalconyReview(old.prove(today)).xpGained,10,'one new inspection can follow a preserved older one');
assert.equal(old.careers.recordJapanBalconyReview(old.prove(receipt(old,3,1))).code,'invalid-work-receipt','a second inspection receipt for the same original day cannot earn another review');
assert.equal(old.careers.recordJapanBalconyReview({...priorDay,day:1}).code,'review-conflict','replay must preserve the original inspection day');
restored.finish(6,1);assert.equal(restored.careers.state().lastDuty.wage,6);assert.equal(restored.careers.state().lastEvaluation.evaluatorId,'jp-balcony');
restored.failures.bank=true;assert.equal(restored.careers.settle().ok,false);assert.equal(restored.bank.state().balances.japan.bank,0);restored.failures.bank=false;assert(restored.careers.settle().ok);assert.equal(restored.bank.state().balances.japan.bank,6);restored.careers.settle();assert.equal(restored.bank.state().balances.japan.bank,6);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,12);assert.equal(full.careers.state().skillXP.ritual,0);assert(full.careers.settle().ok);assert(full.careers.resign().ok);assert.equal(full.careers.slotHolder(ROLE.id),'jp-balcony');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(rejected.careers.state().tenure,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].balconyReceipt.cycle++,s=>s.lastDuty.customerReviews[0].dishId='jp-balcony-gallery-2',s=>s.lastDuty.customerReviews[0].balconyReceipt.day=2,s=>s.lastDuty.customerReviews[0].score++,s=>s.lastDuty.customerReviews[0].customerName='替身',s=>s.lastDuty.customerReviews[0].balconyReceipt.extra=true]){const store=clone(restored.store);mutate(store.careers);assert.equal(fixture({store,clock:restored.clock}).careers.state().loadError,'invalid-career-state');}
console.log('PASS balcony contract: live original proof, strict original gallery/day identity, replay/save rollback, shared study cap, adult hiring, 12/6 Japanese time wages and exactly-once banking');

const e=fixture();e.hire();let dutyState={receiptId:null,status:null},onsite=true,employmentSaved=null;
const duty={registry:[0,0,0],holdDuty:id=>{dutyState={receiptId:id,status:'paused'};return true;},meetingReady:()=>true,canClaimDuty:()=>true,claimDuty:id=>{dutyState={receiptId:id,status:'active'};return true;},dutyState:()=>clone(dutyState),workReceipts:id=>e.proofs.filter(r=>r.workReceiptId===id),releaseDuty:()=>{dutyState={receiptId:null,status:null};return true;},canEndDuty:()=>true,inWorkplace:()=>onsite,dutyActive:id=>dutyState.receiptId===id&&dutyState.status==='active',held:()=>null,workIntent:()=>null,workChoices:()=>[],workLabel:()=> '原件待照料',requestMeeting:()=>{},isActing:()=>false,playerPose:()=>null};
const employment=createJapanBalconyEmployment({balcony:duty,careers:e.careers,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getClock:()=>e.clock,saveState:s=>{employmentSaved=clone(s);}});
assert(employment.accept());assert.equal(employment.intent('cancel').provider,'japan-balcony-employment');for(let n=0;n<11;n++)employment.update(.1);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9);
onsite=false;employment.update(100);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9,'offsite does not accrue time');e.prove(receipt(e));employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);assert.equal(employmentSaved.job.completedTasks,1);employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);employment.dispose();
console.log('PASS balcony employment bridge: exact role/provider, original review method, source-only completion and on-site attendance');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},u=fixture(),requests=[];let choices=[{kind:'task:jp-balcony-gallery-1-cycle-1',action:'原灯笼望景廊 · 检查原走道通畅'}];
const service={atRegistration:()=>true,state:()=>({job:u.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:u.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),taskChoices:()=>choices,intent:(kind='wait')=>kind.startsWith('task:')&&!choices.some(c=>c.kind===kind)?null:({id:kind,intentKey:kind,kind,provider:'japan-balcony-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:u.careers,copperLedger:u.bank,getClock:()=>u.clock,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc}),dialog=doc.body.children.find(e=>e.tag==='dialog');
ui.open();assert(text(dialog).includes('四层原灯笼望景廊'));ui.open({scope:'role',roleId:ROLE.id});for(const label of ['12日本券','Ren','礼仪','始终公开可通行','原灯笼望景廊','6盏原高挂灯笼','原栏杆','当日仅一轮'])assert(text(dialog).includes(label),label);
assert(u.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('每天至多开启一轮'));
assert(u.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:u.careers.applicationResult(ROLE.id).id}).ok);assert(u.careers.beginDuty({receiptId:u.receiptId}).ok);
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原廊待做巡护'));assert(text(dialog).includes(choices[0].action));
const stale=all(dialog).find(e=>e.tag==='button'&&e.textContent===choices[0].action);choices=[];ui.update('lot');stale.onclick();assert.equal(requests.length,0);
assert(u.careers.recordJapanBalconyReview(u.prove(receipt(u))).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原廊巡护完成 +1'));assert(text(dialog).includes('礼仪经验 10'));assert(!text(dialog).includes('顾客评价扣薪'));
assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='cancel'));ui.dispose();
console.log('PASS balcony handbook: registration/interview, live item choices, stale clicks, safe handoff controls and completion growth');


// The bank may succeed before the career paid flag saves. Cold retry must
// reconcile the exact wage receipt and never issue a second deposit.
const cleanup=fixture();cleanup.start();cleanup.finish(6);cleanup.failures.career=true;assert.equal(cleanup.careers.settle().cleanupPending,true);assert.equal(cleanup.careers.state().lastDuty.stage,'ready');assert.equal(cleanup.bank.state().balances.japan.bank,6);
const cleanupCold=fixture({store:cleanup.store,clock:cleanup.clock});assert.equal(cleanupCold.careers.settle().replayed,true);assert.equal(cleanupCold.careers.state().lastDuty.stage,'paid');assert.equal(cleanupCold.bank.state().balances.japan.bank,6);

for(const duplicate of ['id','day','cycle']){
 const f=fixture();f.start();const r=receipt(f);f.prove(r);f.prove(duplicate==='id'?r:duplicate==='day'?receipt(f,2):receipt(f,1,0));assert.equal(f.careers.recordJapanBalconyReview(r).code,'invalid-work-receipt');assert.equal(f.careers.state().skillXP.ritual,0);
}
const forged=fixture();forged.start();assert.equal(forged.careers.customerReview({roleId:ROLE.id,receiptId:forged.receiptId,reviewId:'generic',customerId:'jp-balcony',customerName:'Ren',tableId:ROLE.id,dishId:'jp-balcony-gallery-1',reasonCode:'japan-balcony-completed'}).code,'invalid-customer-review');assert.equal(forged.careers.state().skillXP.ritual,0);
console.log('PASS balcony proof/payment boundaries: duplicate source identities fail closed, generic reviews rejected, cold paid-save recovery deposits once');

const interrupted=fixture();interrupted.hire();let rejectEmployment=true,jobSave=null,localDuty={receiptId:null,status:null};
const adapter={...duty,dutyState:()=>clone(localDuty),holdDuty:id=>{localDuty={receiptId:id,status:'paused'};return true;},claimDuty:id=>{localDuty={receiptId:id,status:'active'};return true;},releaseDuty:()=>{localDuty={receiptId:null,status:null};return true;},dutyActive:id=>localDuty.receiptId===id&&localDuty.status==='active',workReceipts:()=>[],inWorkplace:()=>true};
const options={balcony:adapter,careers:interrupted.careers,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getClock:()=>interrupted.clock,saveState:s=>{if(rejectEmployment)return {ok:false};jobSave=clone(s);return true;}};
const begin=createJapanBalconyEmployment(options);assert.equal(begin.accept(),false);assert.equal(begin.state().job,null);assert.equal(localDuty.receiptId,null);rejectEmployment=false;assert(begin.accept());assert.equal(begin.state().job.receiptId,interrupted.receiptId);begin.dispose();
const resume=createJapanBalconyEmployment({...options,saved:jobSave});assert.equal(localDuty.status,'paused');resume.update(100);assert.equal(resume.state().job.coveredSeconds,0);assert(resume.executeIntent(resume.intent('resume')));resume.update(.1);assert.equal(resume.state().job.coveredSeconds,.1);
rejectEmployment=true;assert.equal(resume.executeIntent(resume.intent('cancel')),false);assert.equal(interrupted.careers.state().lastDuty.stage,'working');assert.equal(localDuty.status,'active');rejectEmployment=false;assert(resume.executeIntent(resume.intent('cancel')));assert.equal(resume.state().job,null);assert.equal(localDuty.receiptId,null);assert.equal(interrupted.careers.state().lastDuty.stage,'missed');assert.equal(interrupted.bank.state().balances.japan.bank,0);resume.dispose();
console.log('PASS balcony employment boundaries: object-shaped save failure, cold pause, explicit resume and cancel retry without wages or phantom time');
