// The new country must not inherit copper salary, fake training, or repeat
// receipts after reload. Exercise those boundaries against the real ledgers.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_RECEPTION_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {createFormalLaborContract} from '../source/game/formal-labor-contract.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},reject=false}={}){
 const failures={career:false,bank:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-reception-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);const pending=careers.applicationResult(ROLE.id);assert.equal(pending.status,'pending');assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:pending.id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish};
}
const receipt=(f,number=1,kind='register',outcome='completed')=>{
 const visitId=`jp-visitor-1-${number}`,waitSeconds=outcome==='late'?61:20,completed=outcome!=='handoff';
 return {source:'japan-reception',id:`${visitId}-${kind}-${f.receiptId}`,workReceiptId:f.receiptId,visitId,number,customerId:visitId,customerName:'旅人',kind,tokenId:`${visitId}:token`,outcome,waitSeconds,completed,accurate:completed,timely:waitSeconds<=60};
};
assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.equal(ROLE.wage,12);assert.equal(ROLE.preparationBonus,0);assert.equal(ROLE.currency,'japan');assert.equal(ROLE.rank,undefined);
assert.deepEqual(ROLE.skillRequirements,{ritual:0,writing:0});
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:ROLE.slotId,roleId:ROLE.id,holderId:'jp-welcome',replacement:true});
const fresh=fixture();assert(fresh.careers.eligibility(ROLE.id,{ageYears:18}).ok);assert.deepEqual(fresh.careers.eligibility(ROLE.id,{ageYears:17}).reasons,['adult-required']);
// Adding the role migrates no invented experience, appointment or funds.
const old=createFormalCareers({getClock:()=>fresh.clock,saveState:()=>{},roles:FORMAL_CAREER_ROLES.filter(r=>r.id!==ROLE.id),slots:FORMAL_CAREER_SLOTS.filter(s=>s.roleId!==ROLE.id)}).state();
const migrated=fixture({store:{careers:old}});assert.equal(migrated.careers.state().loadError,null);assert.deepEqual(migrated.careers.state(),old);assert.equal(migrated.careers.slotHolder(ROLE.id),'jp-welcome');
const legacy=clone(old);legacy.version=7;delete legacy.workExperience;assert.equal(fixture({store:{careers:legacy}}).careers.state().loadError,null);

const pending=fixture();assert(pending.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(pending.careers.apply(ROLE.id,{ageYears:18}).code,'application-pending');
const re=fixture({store:pending.store});assert.equal(re.careers.applicationResult(ROLE.id).status,'pending');assert.equal(re.careers.slotHolder(ROLE.id),'jp-welcome');assert(re.careers.cancelApplication(ROLE.id,re.careers.applicationResult(ROLE.id).id).ok);assert.equal(re.careers.apply(ROLE.id,{ageYears:18}).code,'already-applied-today');assert.equal(fixture({store:re.store}).careers.applicationResult(ROLE.id).status,'cancelled');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(fixture({store:rejected.store}).careers.applicationResult(ROLE.id).status,'rejected');assert.equal(rejected.careers.apply(ROLE.id,{ageYears:18}).code,'already-applied-today');

const f=fixture();f.start();assert.equal(f.careers.slotHolder(ROLE.id),'player');assert.equal(f.careers.catalogue().find(r=>r.id===ROLE.id).vacancy,0);assert.equal(f.careers.state().skillXP.writing,0);
const first=receipt(f);
for(const patch of [{number:2},{tokenId:'another-token'},{id:first.id+'-again'},{accurate:false},{completed:false},{timely:false},{outcome:'invented'},{waitSeconds:-1},{customerId:'player'},{visitId:'jp-visitor-1-01'}])assert.equal(f.careers.recordJapanReceptionReview({...first,...patch}).code,'invalid-work-receipt');
const wrongShift=receipt({...f,receiptId:'jp-reception-labor-2'});assert.equal(f.careers.recordJapanReceptionReview(wrongShift).code,'wrong-duty-source');
f.failures.career=true;assert.equal(f.careers.recordJapanReceptionReview(first).code,'save-failed');assert.equal(f.careers.state().performance,0);assert.equal(f.careers.state().skillXP.writing,0);f.failures.career=false;
assert.equal(f.careers.recordJapanReceptionReview(first).xpGained,10);assert.equal(f.careers.state().performance,1);assert.equal(f.careers.recordJapanReceptionReview(first).xpGained,0);assert.equal(f.careers.recordJapanReceptionReview({...first,waitSeconds:21}).code,'review-conflict');
const live=fixture({store:f.store});assert.equal(live.careers.state().loadError,null);assert.equal(live.careers.state().lastDuty.stage,'working');assert(live.careers.recordJapanReceptionReview(first).replayed);assert.equal(live.careers.state().skillXP.writing,10);
const late=live.careers.recordJapanReceptionReview(receipt(live,1,'checkout','late'));assert.equal(late.review.score,0);assert.equal(late.xpGained,10);assert.equal(live.careers.state().skillXP.ritual,10);
const handoff=live.careers.recordJapanReceptionReview(receipt(live,2,'register','handoff'));assert.equal(handoff.review.score,-1);assert.equal(handoff.xpGained,0);assert.equal(live.careers.state().performance,0);assert.equal(live.careers.state().skillXP.writing,10);
for(let n=3;n<=7;n++)assert(live.careers.recordJapanReceptionReview(receipt(live,n)).ok);
assert.equal(live.careers.state().daily.writing,4);assert.equal(live.careers.state().skills.writing,1);assert.equal(live.careers.state().skillXP.writing,10);
live.finish(6,7);assert.equal(live.careers.state().lastDuty.wage,6,'all outcomes leave six onsite hours worth exactly six Japan coupons');assert(live.careers.state().lastEvaluation.reason.endsWith('6日本券'));assert.equal(live.careers.state().lastEvaluation.servicePenalty,undefined);
const ready=fixture({store:live.store,clock:live.clock});assert.equal(ready.careers.state().loadError,null);ready.failures.bank=true;assert.equal(ready.careers.settle().code,'save-failed');ready.failures.bank=false;ready.failures.career=true;assert(ready.careers.settle().cleanupPending);assert.equal(ready.bank.state().balances.japan.bank,6);assert.equal(ready.bank.state().balances.copper.bank,0);assert.equal(ready.bank.state().balances.france.bank,0);
const paid=fixture({store:ready.store,clock:ready.clock});assert(paid.careers.settle().replayed);assert.equal(paid.bank.state().balances.japan.bank,6);assert.equal(paid.bank.history().filter(t=>t.action==='wage').length,1);assert.equal(fixture({store:paid.store,clock:paid.clock}).careers.state().loadError,null);assert(paid.careers.resign().ok);assert.equal(paid.careers.slotHolder(ROLE.id),'jp-welcome');assert.equal(paid.careers.state().officialCareer.appointments.length,0);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,12,'waiting onsite also counts, with no preparation bonus');assert(full.careers.settle().ok);assert.equal(full.bank.state().balances.japan.bank,12);
const cancelled=fixture();cancelled.start();assert(cancelled.careers.interruptDuty('cancelled').ok);assert.equal(cancelled.careers.beginDuty({receiptId:cancelled.receiptId}).code,'duty-missed');assert.equal(fixture({store:cancelled.store}).careers.state().loadError,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].receptionReceipt.number++,s=>s.lastDuty.customerReviews[0].score++,s=>{s.lastDuty.wage++;s.lastEvaluation.wage++;}]){const store=clone(live.store);mutate(store.careers);assert.equal(fixture({store,clock:live.clock}).careers.state().loadError,'invalid-career-state');}
const bridge=createFormalLaborContract({careers:fresh.careers,role:ROLE,getJob:()=>null,getPlayer:()=>({ageYears:18}),meetHost:()=>true});assert.equal(bridge.unit,'日本券');assert.equal(bridge.salary,'12日本券');
// The real handbook routes all actions through the physical service. Its
// country/currency and neutral-review text cannot fall back to China defaults.
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},uiFixture=fixture(),requests=[];
const service={atRegistration:()=>true,state:()=>({job:uiFixture.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:uiFixture.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),intent:(kind='wait')=>({id:kind,intentKey:kind,kind,provider:'jp-reception-employment',action:kind,position:[-4.2,0,4.8]})};
const ui=createCareerHandbook({careers:uiFixture.careers,copperLedger:uiFixture.bank,getClock:()=>uiFixture.clock,getPlayer:()=>({ageYears:18,root:{position:{x:-4.2,y:0,z:4.8}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc});
const dialog=doc.body.children.find(e=>e.tag==='dialog');ui.open();assert(text(dialog).includes('日本 · 求职场所'));assert(text(dialog).includes('霞汤屋接待台'));assert(!text(dialog).includes('中国'));
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('12日本券'));assert(text(dialog).includes('无技能前置'));assert(text(dialog).includes('Tomo'));const apply=all(dialog).find(e=>e.tag==='button'&&e.textContent==='提交职位申请');assert(apply);apply.onclick();assert.equal(requests.at(-1).kind,'formal-apply');assert.equal(uiFixture.careers.state().tenure,null);
assert(uiFixture.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('Koharu：'));assert(text(dialog).includes('待面谈'));assert(text(dialog).includes('不增扣工资'));
assert(uiFixture.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:uiFixture.careers.applicationResult(ROLE.id).id}).ok);assert(uiFixture.careers.beginDuty({receiptId:uiFixture.receiptId}).ok);assert(uiFixture.careers.recordJapanReceptionReview(receipt(uiFixture,1,'register','late')).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('日本券账户'));assert(text(dialog).includes('准确完成 · 等候较久'));assert(text(dialog).includes('学徒成长'));assert(!text(dialog).includes('铜文账户'));assert(!text(dialog).includes('扣薪'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));ui.dispose();
console.log('PASS Japan apprenticeship applications, migration, one exclusive seat, verified receipt XP/dedupe, actual-hours Japanese bank salary, save failures, cancellation and reload');
