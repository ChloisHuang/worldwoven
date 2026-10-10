// A plausible receipt must not mint XP without the original care ledger;
// retries, cold restoration and bank failures must remain exactly-once.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_OMAMORI_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {JAPAN_OMAMORI_ITEM_IDS,validJapanOmamoriReceipt,sameJapanOmamoriReceipt} from '../source/game/japan-omamori-role.js';
import {createJapanOmamoriEmployment} from '../source/game/japan-omamori-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},ritual=1,writing=1,reject=false,proofs=[]}={}){
 const failures={career:false,bank:false,context:false,missing:false,corrupt:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=ritual;initial.skills.writing=writing;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,getJapanOmamoriWorkContext:()=>{
  if(failures.context)throw Error('ledger unavailable');return failures.missing?null:{receipts:proofs,loadError:failures.corrupt?'invalid-omamori-state':null};
 },saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-omamori-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 const prove=r=>{proofs.push(clone(r));return r;};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish,proofs,prove};
}
const receipt=(f,cycle=1,itemId='jp-omamori-1')=>({source:'japan-omamori',id:`${itemId}-cycle-${cycle}-${f.receiptId}`,itemId,cycle,workReceiptId:f.receiptId,completed:true,accurate:true,outcome:'completed'});
assert(Object.isFrozen(ROLE));assert(Object.isFrozen(ROLE.skillRequirements));assert(Object.isFrozen(ROLE.dutyWindow));assert(Object.isFrozen(JAPAN_OMAMORI_ITEM_IDS));
assert.equal(ROLE.wage,12);assert.equal(ROLE.preparationBonus,0);assert.deepEqual(ROLE.skillRequirements,{ritual:1,writing:1});assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'jp-omamori-service-1',roleId:ROLE.id,holderId:'jp-omamori',replacement:true});
const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:17}).ok,false);for(const key of ['ritual','writing'])assert.equal(fixture({[key]:0}).careers.eligibility(ROLE.id,{ageYears:18}).ok,false);f.start();
const r=receipt(f);assert(validJapanOmamoriReceipt(r));assert(sameJapanOmamoriReceipt(r,clone(r)));for(const itemId of JAPAN_OMAMORI_ITEM_IDS)assert(validJapanOmamoriReceipt(receipt(f,1,itemId)));
for(const patch of [{itemId:'jp-omamori-0'},{itemId:'jp-omamori-01'},{itemId:'jp-omamori-15'},{cycle:0},{cycle:1.5},{cycle:Number.MAX_SAFE_INTEGER+1},{workReceiptId:'jp-omamori-labor-01'},{workReceiptId:'jp-omamori-labor-9007199254740992'},{completed:false},{accurate:false},{outcome:'cord'},{source:'japan-linen'},{id:r.id+'-replay'},{day:1}])assert.equal(f.careers.recordJapanOmamoriReview({...r,...patch}).code,'invalid-work-receipt',JSON.stringify(patch));
assert.equal(f.careers.recordJapanOmamoriReview(r).code,'invalid-work-receipt','valid shape alone is not source proof');
f.prove(r);for(const key of ['context','missing','corrupt']){f.failures[key]=true;assert.equal(f.careers.recordJapanOmamoriReview(r).code,'work-context-unavailable');f.failures[key]=false;}
f.proofs[0].accurate=false;assert.equal(f.careers.recordJapanOmamoriReview(r).code,'invalid-work-receipt');f.proofs[0].accurate=true;
f.failures.career=true;assert.equal(f.careers.recordJapanOmamoriReview(r).code,'save-failed');assert.equal(f.careers.state().skillXP.ritual,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);
f.failures.career=false;assert.equal(f.careers.recordJapanOmamoriReview(r).xpGained,10);assert.equal(f.careers.recordJapanOmamoriReview(r).xpGained,0);assert.equal(f.bank.state().balances.japan.bank,0,'care receipt never pays an item wage');
const restored=fixture({store:f.store});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.recordJapanOmamoriReview(r).replayed,'verified stored evidence replays without growth after reload');
const ticket=restored.careers.learningTicket('jp-library','jp-ritual-intro');assert(ticket.ok);assert.equal(restored.careers.completeLearning(ticket.ticket,{seconds:8}).xpGained,10);
for(let n=2;n<=3;n++)assert.equal(restored.careers.recordJapanOmamoriReview(restored.prove(receipt(restored,n))).xpGained,10);
assert.equal(restored.careers.recordJapanOmamoriReview(restored.prove(receipt(restored,4))).limited,'daily-skill-limit');assert.equal(restored.careers.state().daily.ritual,4);
restored.finish(6,4);assert.equal(restored.careers.state().lastDuty.wage,6);assert.equal(restored.careers.state().lastEvaluation.evaluatorId,'jp-omamori');
restored.failures.bank=true;assert.equal(restored.careers.settle().ok,false);assert.equal(restored.bank.state().balances.japan.bank,0);restored.failures.bank=false;assert(restored.careers.settle().ok);assert.equal(restored.bank.state().balances.japan.bank,6);restored.careers.settle();assert.equal(restored.bank.state().balances.japan.bank,6);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,12);assert.equal(full.careers.state().skillXP.ritual,0);assert(full.careers.settle().ok);assert(full.careers.resign().ok);assert.equal(full.careers.slotHolder(ROLE.id),'jp-omamori');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(rejected.careers.state().tenure,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].omamoriReceipt.cycle++,s=>s.lastDuty.customerReviews[0].dishId='jp-omamori-2',s=>s.lastDuty.customerReviews[0].score++,s=>s.lastDuty.customerReviews[0].customerName='替身',s=>s.lastDuty.customerReviews[0].omamoriReceipt.extra=true]){const store=clone(restored.store);mutate(store.careers);assert.equal(fixture({store,clock:restored.clock}).careers.state().loadError,'invalid-career-state');}
console.log('PASS omamori contract: live original proof, strict fourteen item IDs, replay/save rollback, shared study cap, adult hiring, 12/6 Japanese time wages and exactly-once banking');

const e=fixture();e.hire();let dutyState={receiptId:null,status:null},onsite=true,employmentSaved=null;
const duty={registry:[0,0,0],holdDuty:id=>{dutyState={receiptId:id,status:'paused'};return true;},meetingReady:()=>true,canClaimDuty:()=>true,claimDuty:id=>{dutyState={receiptId:id,status:'active'};return true;},dutyState:()=>clone(dutyState),workReceipts:id=>e.proofs.filter(r=>r.workReceiptId===id),releaseDuty:()=>{dutyState={receiptId:null,status:null};return true;},canEndDuty:()=>true,inWorkplace:()=>onsite,dutyActive:id=>dutyState.receiptId===id&&dutyState.status==='active',held:()=>null,workIntent:()=>null,workChoices:()=>[],workLabel:()=> '原件待照料',requestMeeting:()=>{},isActing:()=>false,playerPose:()=>null};
const employment=createJapanOmamoriEmployment({omamori:duty,careers:e.careers,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getClock:()=>e.clock,saveState:s=>{employmentSaved=clone(s);}});
assert(employment.accept());assert.equal(employment.intent('cancel').provider,'japan-omamori-employment');for(let n=0;n<11;n++)employment.update(.1);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9);
onsite=false;employment.update(100);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9,'offsite does not accrue time');e.prove(receipt(e));employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);assert.equal(employmentSaved.job.completedTasks,1);employment.update(0);assert.equal(e.careers.state().skillXP.ritual,10);employment.dispose();
console.log('PASS omamori employment bridge: exact role/provider, original review method, source-only completion and on-site attendance');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},u=fixture(),requests=[];let choices=[{kind:'task:jp-omamori-1-cycle-1',action:'原号御守 · 亲手检查绳结'}];
const service={atRegistration:()=>true,state:()=>({job:u.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:u.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),taskChoices:()=>choices,intent:(kind='wait')=>kind.startsWith('task:')&&!choices.some(c=>c.kind===kind)?null:({id:kind,intentKey:kind,kind,provider:'japan-omamori-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:u.careers,copperLedger:u.bank,getClock:()=>u.clock,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc}),dialog=doc.body.children.find(e=>e.tag==='dialog');
ui.open();assert(text(dialog).includes('参道御守原摊照料登记处'));ui.open({scope:'role',roleId:ROLE.id});for(const label of ['12日本券','Emi','礼仪','文书','绳结','刺绣','14件','不按件加钱'])assert(text(dialog).includes(label),label);
assert(u.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('不虚构订单或每日重置'));
assert(u.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:u.careers.applicationResult(ROLE.id).id}).ok);assert(u.careers.beginDuty({receiptId:u.receiptId}).ok);
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原件待做照料'));assert(text(dialog).includes(choices[0].action));
const stale=all(dialog).find(e=>e.tag==='button'&&e.textContent===choices[0].action);choices=[];ui.update('lot');stale.onclick();assert.equal(requests.length,0);
assert(u.careers.recordJapanOmamoriReview(u.prove(receipt(u))).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原御守照料归位 +1'));assert(text(dialog).includes('礼仪经验 10'));assert(!text(dialog).includes('顾客评价扣薪'));
assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='cancel'));ui.dispose();
console.log('PASS omamori handbook: registration/interview, live item choices, stale clicks, safe handoff controls and completion growth');
