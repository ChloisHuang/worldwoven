// A plausible receipt must not mint XP without the original care ledger;
// retries, cold restoration and bank failures must remain exactly-once.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_GARDEN_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {validJapanGardenReceipt,sameJapanGardenReceipt} from '../source/game/japan-garden-role.js';
import {createJapanGardenEmployment} from '../source/game/japan-garden-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},gardening=1,ritual=1,reject=false,proofs=[]}={}){
 const failures={career:false,bank:false,context:false,missing:false,corrupt:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.gardening=gardening;initial.skills.ritual=ritual;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,getJapanGardenWorkContext:()=>{
  if(failures.context)throw Error('ledger unavailable');return failures.missing?null:{receipts:proofs,loadError:failures.corrupt?'invalid-garden-state':null};
 },saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-garden-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 const prove=r=>{proofs.push(clone(r));return r;};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish,proofs,prove};
}
const receipt=(f,cycle=1,day=f.clock.day)=>({source:'japan-garden',id:`jp-garden-pond-1-cycle-${cycle}-${f.receiptId}`,itemId:'jp-garden-pond-1',cycle,day,workReceiptId:f.receiptId,completed:true,accurate:true,outcome:'completed'});
assert(Object.isFrozen(ROLE));assert(Object.isFrozen(ROLE.skillRequirements));assert(Object.isFrozen(ROLE.dutyWindow));
assert.equal(ROLE.wage,12);assert.equal(ROLE.preparationBonus,0);assert.deepEqual(ROLE.skillRequirements,{gardening:1,ritual:1});assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'jp-garden-service-1',roleId:ROLE.id,holderId:'jp-garden-onsen',replacement:true});
const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:17}).ok,false);for(const key of ['gardening','ritual'])assert.equal(fixture({[key]:0}).careers.eligibility(ROLE.id,{ageYears:18}).ok,false);f.start();
const r=receipt(f);assert(validJapanGardenReceipt(r));assert(sameJapanGardenReceipt(r,clone(r)));
for(const patch of [{itemId:'jp-garden-pond-0'},{itemId:'jp-garden-pond-01'},{itemId:'jp-garden-pond-2'},{cycle:0},{cycle:1.5},{cycle:Number.MAX_SAFE_INTEGER+1},{workReceiptId:'jp-garden-labor-01'},{workReceiptId:'jp-garden-labor-9007199254740992'},{completed:false},{accurate:false},{outcome:'cord'},{source:'japan-linen'},{id:r.id+'-replay'},{day:-1},{day:1.5},{day:Number.MAX_SAFE_INTEGER+1},{extra:true}])assert.equal(f.careers.recordJapanGardenReview({...r,...patch}).code,'invalid-work-receipt',JSON.stringify(patch));
assert.equal(f.careers.recordJapanGardenReview(r).code,'invalid-work-receipt','valid shape alone is not source proof');
f.prove(r);for(const key of ['context','missing','corrupt']){f.failures[key]=true;assert.equal(f.careers.recordJapanGardenReview(r).code,'work-context-unavailable');f.failures[key]=false;}
f.proofs[0].accurate=false;assert.equal(f.careers.recordJapanGardenReview(r).code,'invalid-work-receipt');f.proofs[0].accurate=true;
f.failures.career=true;assert.equal(f.careers.recordJapanGardenReview(r).code,'save-failed');assert.equal(f.careers.state().skillXP.gardening,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);
f.failures.career=false;assert.equal(f.careers.recordJapanGardenReview(r).xpGained,10);assert.equal(f.careers.recordJapanGardenReview(r).xpGained,0);assert.equal(f.bank.state().balances.japan.bank,0,'care receipt never pays an item wage');
const restored=fixture({store:f.store});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.recordJapanGardenReview(r).replayed,'verified stored evidence replays without growth after reload');
const learnGarden=careers=>{const ticket=careers.learningTicket('france-salon','fr-gardening-intro');assert(ticket.ok);return careers.completeLearning(ticket.ticket,{seconds:8});};
for(let n=0;n<3;n++)assert.equal(learnGarden(restored.careers).xpGained,10);
assert.equal(learnGarden(restored.careers).limited,'daily-skill-limit');assert.equal(restored.careers.state().daily.gardening,4);
const capped=fixture();capped.start();for(let n=0;n<4;n++)assert.equal(learnGarden(capped.careers).xpGained,10);
assert.equal(capped.careers.recordJapanGardenReview(capped.prove(receipt(capped))).limited,'daily-skill-limit');assert.equal(capped.careers.state().daily.gardening,4);assert.equal(capped.careers.state().lastDuty.customerReviews.length,1,'completed source proof persists even at the shared growth cap');
const future=receipt(f,2,f.clock.day+1);assert(validJapanGardenReceipt(future));assert.equal(f.careers.recordJapanGardenReview(f.prove(future)).code,'wrong-duty-source','future inspections cannot belong to an earlier shift');
const old=fixture();old.start();const priorDay=receipt(old,1,0);assert.equal(old.careers.recordJapanGardenReview(old.prove(priorDay)).xpGained,10,'unfinished prior-day inspection may complete in this duty');
const today=receipt(old,2,1);assert.equal(old.careers.recordJapanGardenReview(old.prove(today)).xpGained,10,'one new inspection can follow a preserved older one');
assert.equal(old.careers.recordJapanGardenReview(old.prove(receipt(old,3,1))).code,'invalid-customer-review','a second inspection receipt for the same original day cannot earn another review');
assert.equal(old.careers.recordJapanGardenReview({...priorDay,day:1}).code,'review-conflict','replay must preserve the original inspection day');
restored.finish(6,1);assert.equal(restored.careers.state().lastDuty.wage,6);assert.equal(restored.careers.state().lastEvaluation.evaluatorId,'jp-garden-onsen');
restored.failures.bank=true;assert.equal(restored.careers.settle().ok,false);assert.equal(restored.bank.state().balances.japan.bank,0);restored.failures.bank=false;assert(restored.careers.settle().ok);assert.equal(restored.bank.state().balances.japan.bank,6);restored.careers.settle();assert.equal(restored.bank.state().balances.japan.bank,6);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,12);assert.equal(full.careers.state().skillXP.gardening,0);assert(full.careers.settle().ok);assert(full.careers.resign().ok);assert.equal(full.careers.slotHolder(ROLE.id),'jp-garden-onsen');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(rejected.careers.state().tenure,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].gardenReceipt.cycle++,s=>s.lastDuty.customerReviews[0].dishId='jp-garden-pond-2',s=>s.lastDuty.customerReviews[0].gardenReceipt.day=2,s=>s.lastDuty.customerReviews[0].score++,s=>s.lastDuty.customerReviews[0].customerName='替身',s=>s.lastDuty.customerReviews[0].gardenReceipt.extra=true]){const store=clone(restored.store);mutate(store.careers);assert.equal(fixture({store,clock:restored.clock}).careers.state().loadError,'invalid-career-state');}
console.log('PASS garden contract: live original proof, strict original pond/day identity, replay/save rollback, shared study cap, adult hiring, 12/6 Japanese time wages and exactly-once banking');

const e=fixture();e.hire();let dutyState={receiptId:null,status:null},onsite=true,employmentSaved=null;
const duty={registry:[0,0,0],holdDuty:id=>{dutyState={receiptId:id,status:'paused'};return true;},meetingReady:()=>true,canClaimDuty:()=>true,claimDuty:id=>{dutyState={receiptId:id,status:'active'};return true;},dutyState:()=>clone(dutyState),workReceipts:id=>e.proofs.filter(r=>r.workReceiptId===id),releaseDuty:()=>{dutyState={receiptId:null,status:null};return true;},canEndDuty:()=>true,inWorkplace:()=>onsite,dutyActive:id=>dutyState.receiptId===id&&dutyState.status==='active',held:()=>null,workIntent:()=>null,workChoices:()=>[],workLabel:()=> '原件待照料',requestMeeting:()=>{},isActing:()=>false,playerPose:()=>null};
const employment=createJapanGardenEmployment({garden:duty,careers:e.careers,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getClock:()=>e.clock,saveState:s=>{employmentSaved=clone(s);}});
assert(employment.accept());assert.equal(employment.intent('cancel').provider,'japan-garden-employment');for(let n=0;n<11;n++)employment.update(.1);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9);
onsite=false;employment.update(100);assert(Math.abs(employment.state().job.coveredSeconds-1.1)<1e-9,'offsite does not accrue time');e.prove(receipt(e));employment.update(0);assert.equal(e.careers.state().skillXP.gardening,10);assert.equal(employmentSaved.job.completedTasks,1);employment.update(0);assert.equal(e.careers.state().skillXP.gardening,10);employment.dispose();
console.log('PASS garden employment bridge: exact role/provider, original review method, source-only completion and on-site attendance');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},u=fixture(),requests=[];let choices=[{kind:'task:jp-garden-pond-1-cycle-1',action:'原锦鲤映池 · 辨看原水草与水面'}];
const service={atRegistration:()=>true,state:()=>({job:u.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:u.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),taskChoices:()=>choices,intent:(kind='wait')=>kind.startsWith('task:')&&!choices.some(c=>c.kind===kind)?null:({id:kind,intentKey:kind,kind,provider:'japan-garden-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:u.careers,copperLedger:u.bank,getClock:()=>u.clock,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc}),dialog=doc.body.children.find(e=>e.tag==='dialog');
ui.open();assert(text(dialog).includes('庭园原锦鲤映池'));ui.open({scope:'role',roleId:ROLE.id});for(const label of ['12日本券','Akari','园艺','礼仪','原锦鲤映池','9条原锦鲤','3组原水草','石池沿','当日仅一轮'])assert(text(dialog).includes(label),label);
assert(u.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('每天至多开启一轮'));
assert(u.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:u.careers.applicationResult(ROLE.id).id}).ok);assert(u.careers.beginDuty({receiptId:u.receiptId}).ok);
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原池待做巡护'));assert(text(dialog).includes(choices[0].action));
const stale=all(dialog).find(e=>e.tag==='button'&&e.textContent===choices[0].action);choices=[];ui.update('lot');stale.onclick();assert.equal(requests.length,0);
assert(u.careers.recordJapanGardenReview(u.prove(receipt(u))).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('原池巡护完成 +1'));assert(text(dialog).includes('园艺经验 10'));assert(!text(dialog).includes('顾客评价扣薪'));
assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='cancel'));ui.dispose();
console.log('PASS garden handbook: registration/interview, live item choices, stale clicks, safe handoff controls and completion growth');
