// CR01/W03 regression risks: invented/mixed source proof awarding XP, duplicate
// growth/pay on retry, lost old careers, stale bedside actions and remote handoff.
// Lightweight pure ledgers and DOM only; physical bed use is tested separately.
import assert from 'node:assert/strict';
import {createFormalCareers,FRANCE_BEDCHAMBER_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {FRANCE_BEDCHAMBER_ITEM_ID,FRANCE_BEDCHAMBER_BED_ID,FRANCE_BEDCHAMBER_RECEIPT_FIELDS,validFranceBedchamberReceipt,sameFranceBedchamberReceipt,franceBedchamberReviewScore} from '../source/game/france-bedchamber-role.js';
import {createFranceBedchamberEmployment} from '../source/game/france-bedchamber-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {createObjectInteractionAnchors} from '../source/game/object-interaction-anchors.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},ritual=1,reject=false,proofs=[]}={}){
 const failures={career:false,bank:false,context:false,missing:false,corrupt:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=ritual;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,getFranceBedchamberWorkContext:()=>{
  if(failures.context)throw Error('ledger unavailable');return failures.missing?null:{receipts:proofs,loadError:failures.corrupt?'invalid-bedchamber-state':null};
 },saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='fr-bedchamber-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 const prove=r=>{proofs.push(clone(r));return r;};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish,proofs,prove};
}
const receipt=(f,cycle=1)=>({source:'france-bedchamber',id:`france-bed-linen-cycle-${cycle}-${f.receiptId}`,itemId:'france-bed-linen',bedId:'france-furniture-bed-0',cycle,useId:`france-bed-use-${cycle}`,workReceiptId:f.receiptId,completed:true,accurate:true,outcome:'completed'});
assert(Object.isFrozen(ROLE));assert(Object.isFrozen(ROLE.skillRequirements));assert(Object.isFrozen(ROLE.dutyWindow));assert(Object.isFrozen(FRANCE_BEDCHAMBER_RECEIPT_FIELDS));
assert.equal(FRANCE_BEDCHAMBER_ITEM_ID,'france-bed-linen');assert.equal(FRANCE_BEDCHAMBER_BED_ID,'france-furniture-bed-0');
assert.equal(ROLE.country,'france');assert.equal(ROLE.currency,'france');assert.equal(ROLE.wage,12);assert.equal(ROLE.preparationBonus,0);assert.deepEqual(ROLE.skillRequirements,{ritual:1});assert.deepEqual(ROLE.dutyWindow,{startHour:6,endHour:18});assert.equal(ROLE.rank,undefined);assert.equal(ROLE.supervisorId,'france-bedroom');assert.equal(ROLE.employer,'朱丽叶');assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'fr-bedchamber-service-1',roleId:ROLE.id,holderId:'france-bedroom',replacement:true});
const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:17}).ok,false);assert.equal(fixture({ritual:0}).careers.eligibility(ROLE.id,{ageYears:18}).ok,false);f.start();
const r=receipt(f);assert(validFranceBedchamberReceipt(r));assert(sameFranceBedchamberReceipt(r,clone(r)));assert.equal(franceBedchamberReviewScore(r),1);
for(const patch of [{itemId:'france-bed-linen-2'},{bedId:'france-furniture-bed-1'},{cycle:0},{cycle:1.5},{cycle:Number.MAX_SAFE_INTEGER+1},{workReceiptId:'fr-bedchamber-labor-01'},{workReceiptId:'fr-bedchamber-labor-9007199254740992'},{useId:'france-bed-use-0'},{useId:'france-bed-use-01'},{useId:'france-bed-use-9007199254740992'},{useId:'jp-bedding-use-1-1'},{completed:false},{accurate:false},{outcome:'handoff'},{source:'japan-linen'},{id:r.id+'-replay'},{customerName:'invented guest'},{day:1}])assert.equal(f.careers.recordFranceBedchamberReview({...r,...patch}).code,'invalid-work-receipt',JSON.stringify(patch));
for(const key of FRANCE_BEDCHAMBER_RECEIPT_FIELDS){const incomplete=clone(r);delete incomplete[key];assert.equal(validFranceBedchamberReceipt(incomplete),false,key);}
assert.equal(f.careers.recordFranceBedchamberReview(r).code,'invalid-work-receipt','receipt shape alone is not original-bed source proof');
f.prove(r);for(const key of ['context','missing','corrupt']){f.failures[key]=true;assert.equal(f.careers.recordFranceBedchamberReview(r).code,'work-context-unavailable');f.failures[key]=false;}
f.proofs[0].accurate=false;assert.equal(f.careers.recordFranceBedchamberReview(r).code,'invalid-work-receipt');f.proofs[0].accurate=true;
f.failures.career=true;assert.equal(f.careers.recordFranceBedchamberReview(r).code,'save-failed');assert.equal(f.careers.state().skillXP.ritual,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);
f.failures.career=false;assert.equal(f.careers.recordFranceBedchamberReview(r).xpGained,10);assert.equal(f.careers.recordFranceBedchamberReview(r).xpGained,0);assert.equal(f.careers.recordFranceBedchamberReview({...r,useId:'france-bed-use-2'}).code,'review-conflict');assert.equal(f.bank.state().balances.france.bank,0,'care receipt never pays a task wage');
assert.equal(f.careers.state().lastDuty.customerReviews[0].customerId,'france-bedroom');assert.equal(f.careers.state().lastDuty.customerReviews[0].customerName,'朱丽叶');assert.equal(f.careers.state().lastDuty.customerReviews[0].reasonCode,'france-bedchamber-completed');
assert.equal(f.careers.customerReview({roleId:ROLE.id,receiptId:f.receiptId,reviewId:'invented-review',customerId:'invented-guest',customerName:'来客',tableId:'fake-table',dishId:'fake-dish',reasonCode:'dirty-table'}).code,'invalid-customer-review');
const otherShift=receipt({...f,receiptId:'fr-bedchamber-labor-2'},2);assert.equal(f.careers.recordFranceBedchamberReview(otherShift).code,'wrong-duty-source');
const reusedUse={...receipt(f,2),useId:r.useId};assert.equal(f.careers.recordFranceBedchamberReview(f.prove(reusedUse)).code,'invalid-customer-review','one actual use cannot support two care cycles');f.proofs.pop();
const restored=fixture({store:f.store});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.recordFranceBedchamberReview(r).replayed,'stored proof replays without new growth or requiring an already-consumed physical cycle');
const ticket=restored.careers.learningTicket('jp-library','jp-ritual-intro');assert(ticket.ok);assert.equal(restored.careers.completeLearning(ticket.ticket,{seconds:8}).xpGained,10);
for(let n=2;n<=3;n++)assert.equal(restored.careers.recordFranceBedchamberReview(restored.prove(receipt(restored,n))).xpGained,10);
assert.equal(restored.careers.recordFranceBedchamberReview(restored.prove(receipt(restored,4))).limited,'daily-skill-limit');assert.equal(restored.careers.state().daily.ritual,4);
restored.finish(6,4);assert.equal(restored.careers.state().lastDuty.wage,6);assert.equal(restored.careers.state().lastEvaluation.evaluatorId,'france-bedroom');
restored.failures.bank=true;assert.equal(restored.careers.settle().ok,false);assert.equal(restored.bank.state().balances.france.bank,0);restored.failures.bank=false;assert(restored.careers.settle().ok);assert.equal(restored.bank.state().balances.france.bank,6);restored.careers.settle();assert.equal(restored.bank.state().balances.france.bank,6);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,12);assert.equal(full.careers.state().skillXP.ritual,0);assert(full.careers.settle().ok);assert(full.careers.resign().ok);assert.equal(full.careers.slotHolder(ROLE.id),'france-bedroom');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(rejected.careers.state().tenure,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].bedchamberReceipt.cycle++,s=>s.lastDuty.customerReviews[0].bedchamberReceipt.bedId='france-furniture-bed-1',s=>s.lastDuty.customerReviews[0].dishId='new-linen',s=>s.lastDuty.customerReviews[0].score++,s=>s.lastDuty.customerReviews[0].customerName='替身',s=>s.lastDuty.customerReviews[0].bedchamberReceipt.extra=true,s=>s.lastDuty.customerReviews[1].bedchamberReceipt.useId=s.lastDuty.customerReviews[0].bedchamberReceipt.useId]){const store=clone(restored.store);mutate(store.careers);assert.equal(fixture({store,clock:restored.clock}).careers.state().loadError,'invalid-career-state');}
// A catalogue extension must preserve a save created without the new role.
const oldRoles=FORMAL_CAREER_ROLES.filter(role=>role.id!==ROLE.id),oldSlots=FORMAL_CAREER_SLOTS.filter(slot=>slot.roleId!==ROLE.id),old=createFormalCareers({roles:oldRoles,slots:oldSlots,getClock:()=>f.clock,saveState:()=>true}).state();old.skills.art=3;old.skillXP.art=17;old.lowerWork['fr-garden-labor']=2;
const oldRestored=createFormalCareers({saved:old,getClock:()=>f.clock,saveState:()=>true}).state();assert.deepEqual(oldRestored,old);assert.equal(oldRestored.loadError,null);
const oldClock={day:2,hour:6,seconds:0},oldRole=oldRoles.find(role=>role.id==='fr-tea-server');let oldSeed=1;
while(careerInterviewRoll(oldSeed,oldRole.id,oldClock.day)>=.6)oldSeed++;
const oldInitial=createFormalCareers({roles:oldRoles,slots:oldSlots,getClock:()=>oldClock,saveState:()=>true}).state();Object.assign(oldInitial.skills,oldRole.skillRequirements);
const oldEmployed=createFormalCareers({roles:oldRoles,slots:oldSlots,saved:oldInitial,worldSeed:oldSeed,getClock:()=>oldClock,saveState:()=>true,creditWageToBank:()=>({ok:true})});
assert(oldEmployed.apply(oldRole.id,{ageYears:18}).ok);assert(oldEmployed.reviewApplication(oldRole.id,{ageYears:18,applicationId:oldEmployed.applicationResult(oldRole.id).id}).ok);assert(oldEmployed.beginDuty({receiptId:'fr-tea-labor-5'}).ok);
for(const finish of [false,true]){
 if(finish){oldClock.hour=12;oldClock.seconds=secondsFor(6);assert(oldEmployed.laborEvent('completed',{roleId:oldRole.id,receiptId:'fr-tea-labor-5',coveredSeconds:oldClock.seconds,completedTasks:0}).ok);assert(oldEmployed.laborEvent('inspected',{roleId:oldRole.id,receiptId:'fr-tea-labor-5'}).ok);assert(oldEmployed.settle().ok);}
 const original=oldEmployed.state(),cold=createFormalCareers({saved:original,getClock:()=>oldClock,saveState:()=>true}).state();assert.deepEqual(cold,original,'adding the original bed role preserves an active/paid old French employment, applications, review and salary');
}
console.log('PASS France bedchamber contract: exact original bed/use/cycle proof, no shape-only XP, immutable replay, source/save failures, shared growth cap, old-state preservation, fixed 12/6 French wages and exactly-once bank');

const e=fixture();e.hire();let dutyState={receiptId:null,status:null},onsite=true,employmentSaved=null;const player={ageYears:18,root:{position:{x:0,y:0,z:0}}};
const duty={registry:[0,0,0],holdDuty:id=>{dutyState={receiptId:id,status:'paused'};return true;},meetingReady:()=>true,canClaimDuty:()=>true,claimDuty:id=>{dutyState={receiptId:id,status:'active'};return true;},dutyState:()=>clone(dutyState),workReceipts:id=>e.proofs.filter(r=>r.workReceiptId===id),releaseDuty:()=>{dutyState={receiptId:null,status:null};return true;},canEndDuty:()=>true,inWorkplace:()=>onsite,dutyActive:id=>dutyState.receiptId===id&&dutyState.status==='active',held:()=>null,workIntent:()=>null,workChoices:()=>[],workLabel:()=> '原寝室待照料',requestMeeting:()=>{},isActing:()=>false,playerPose:()=>null};
const employment=createFranceBedchamberEmployment({bedchamber:duty,careers:e.careers,getPlayer:()=>player,getClock:()=>e.clock,saveState:s=>{employmentSaved=clone(s);}});
assert(employment.accept());assert.equal(employment.intent('cancel').provider,'france-bedchamber-employment');for(let n=0;n<11;n++)employment.update(.1);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9);
onsite=false;employment.update(100);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9,'offsite does not accrue time');e.prove(receipt(e));employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);assert.equal(employmentSaved.job.completedTasks,1);employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);
player.root.position.x=10;assert.equal(employment.endShift(),false,'handoff requires meeting at the original place');player.root.position.x=0;e.clock.seconds=1.1;e.clock.hour=6+1.1*GAME_MINUTES_PER_SECOND/60;assert(employment.endShift());assert(employment.claim());assert.equal(employment.state().job,null);employment.dispose();
const alias=createFranceBedchamberEmployment({duty,careers:fixture().careers,getPlayer:()=>player,getClock:()=>e.clock});assert.equal(alias.intent('formal-view').provider,'france-bedchamber-employment');alias.dispose();
console.log('PASS France bedchamber employment: exact provider/review bridge, source-only completion, actual on-site attendance and local handoff');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},u=fixture(),requests=[];let choices=[{kind:'task:france-bed-linen-cycle-1',action:'原床罩 · 亲手抚平原床罩'}];
const service={atRegistration:()=>true,state:()=>({job:u.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:u.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),taskChoices:()=>choices,intent:(kind='wait')=>kind.startsWith('task:')&&!choices.some(c=>c.kind===kind)?null:({id:kind,intentKey:kind,kind,provider:'france-bedchamber-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:u.careers,copperLedger:u.bank,getClock:()=>u.clock,getPlayer:()=>player,getCountry:()=> 'france',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc}),dialog=doc.body.children.find(e=>e.tag==='dialog');
ui.open();assert(text(dialog).includes('白金皇家寝室'));ui.open({scope:'role',roleId:ROLE.id});for(const label of ['12法国券','朱丽叶','礼仪','两只原枕','台上原织物','回床复核','不按件或点击加钱'])assert(text(dialog).includes(label),label);
assert(u.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('有人使用原床时暂停照料'));
assert(u.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:u.careers.applicationResult(ROLE.id).id}).ok);assert(u.careers.beginDuty({receiptId:u.receiptId}).ok);
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原寝室待做照料'));assert(text(dialog).includes(choices[0].action));
const stale=all(dialog).find(e=>e.tag==='button'&&e.textContent===choices[0].action);choices=[];ui.update('lot');stale.onclick();assert.equal(requests.length,0);
assert(u.careers.recordFranceBedchamberReview(u.prove(receipt(u))).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原寝室照料复核 +1'));assert(text(dialog).includes('礼仪经验 10'));assert(!text(dialog).includes('顾客评价扣薪'));
assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='cancel'));ui.dispose();
const julie={actorId:'france-bedroom',root:{position:{x:0,y:0,z:0}}},bed={id:'france-furniture-bed-0',center:[1,0,1]},anchors=createObjectInteractionAnchors({actors:()=>[julie],furniture:()=>[bed]});
assert.equal(anchors.resolve({provider:'france-bedchamber-employment',kind:'formal-review'}).actor,julie);
assert.equal(anchors.resolve({provider:'france-bedchamber-employment',kind:'task',visualAnchor:{furnitureId:bed.id}}).furniture,bed,'actual authored work object takes precedence over original supervisor');
assert.equal(anchors.resolve({provider:'france-bedchamber-employment',continuation:true}),null);
console.log('PASS France bedchamber handbook/anchors: local catalogue/interview, original care wording, live/stale task buttons, safe handoff controls, growth and Julie/original-bed identity');
