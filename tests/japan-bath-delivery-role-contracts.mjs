// Same-number delivery, atomic review/XP and Japanese bank settlement are
// durable boundaries: an interrupted save must never duplicate XP or salary.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_BATH_DELIVERY_ROLE as ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {JAPAN_BATH_DELIVERY_TIMELY_SECONDS,validJapanBathDeliveryReceipt} from '../source/game/japan-bath-delivery-role.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createFormalLaborContract} from '../source/game/formal-labor-contract.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},reject=false,ritual=1}={}){
 const failures={career:false,bank:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();initial.skills.ritual=ritual;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-bath-delivery-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish};
}
const receipt=(f,number=1,outcome='completed',waitSeconds=outcome==='late'?181:180)=>{
 const visitId=`jp-visitor-1-${number}`,completed=outcome!=='handoff';
 return {source:'japan-bath-delivery',id:`${visitId}-deliverMix-${f.receiptId}`,workReceiptId:f.receiptId,visitId,number,customerId:visitId,customerName:'旅人',kind:'deliverMix',tokenId:`${visitId}:token`,itemId:`${visitId}:mixture`,side:'men',outcome,waitSeconds,completed,accurate:completed,timely:waitSeconds<=180};
};
assert.equal(JAPAN_BATH_DELIVERY_TIMELY_SECONDS,180);assert.equal(ROLE.wage,14);assert.equal(ROLE.preparationBonus,0);assert.equal(ROLE.currency,'japan');assert.equal(ROLE.rank,undefined);assert.equal(ROLE.supervisorId,'jp-onsen');assert.deepEqual(ROLE.skillRequirements,{ritual:1});
assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);
assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'jp-bath-delivery-1',roleId:ROLE.id,holderId:'jp-onsen',replacement:true});
const fresh=fixture();assert(fresh.careers.eligibility(ROLE.id,{ageYears:18}).ok);assert.deepEqual(fresh.careers.eligibility(ROLE.id,{ageYears:17}).reasons,['adult-required']);assert.deepEqual(fixture({ritual:0}).careers.eligibility(ROLE.id,{ageYears:18}).reasons,['ritual-required']);
const old=createFormalCareers({getClock:()=>fresh.clock,saveState:()=>{},roles:FORMAL_CAREER_ROLES.filter(r=>r.id!==ROLE.id),slots:FORMAL_CAREER_SLOTS.filter(s=>s.roleId!==ROLE.id)}).state();
assert.deepEqual(fixture({store:{careers:old}}).careers.state(),old,'published saves gain no invented qualification, appointment or money');
const pending=fixture();assert(pending.careers.apply(ROLE.id,{ageYears:18}).ok);const resumed=fixture({store:pending.store});assert.equal(resumed.careers.applicationResult(ROLE.id).status,'pending');assert.equal(resumed.careers.slotHolder(ROLE.id),'jp-onsen');assert.equal(resumed.careers.apply(ROLE.id,{ageYears:18}).code,'application-pending');assert(resumed.careers.cancelApplication(ROLE.id,resumed.careers.applicationResult(ROLE.id).id).ok);assert.equal(fixture({store:resumed.store}).careers.applicationResult(ROLE.id).status,'cancelled');assert.equal(resumed.careers.apply(ROLE.id,{ageYears:18}).code,'already-applied-today');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(fixture({store:rejected.store}).careers.applicationResult(ROLE.id).status,'rejected');

const f=fixture();f.start();assert.equal(f.careers.slotHolder(ROLE.id),'player');assert.equal(f.careers.catalogue().find(r=>r.id===ROLE.id).vacancy,0);assert.equal(f.careers.state().skillXP.care,0);
const first=receipt(f);assert(validJapanBathDeliveryReceipt(first));
for(const patch of [{number:2},{tokenId:'another-token'},{itemId:'another-mixture'},{side:'women'},{kind:'collectMix'},{id:first.id+'-again'},{accurate:false},{completed:false},{timely:false},{outcome:'invented'},{waitSeconds:-1},{customerId:'player'},{visitId:'jp-visitor-1-01'}])assert.equal(f.careers.recordJapanBathDeliveryReview({...first,...patch}).code,'invalid-work-receipt');
assert.equal(f.careers.recordJapanBathDeliveryReview(receipt({...f,receiptId:'jp-bath-delivery-labor-2'})).code,'wrong-duty-source');
f.failures.career=true;assert.equal(f.careers.recordJapanBathDeliveryReview(first).code,'save-failed');assert.equal(f.careers.state().performance,0);assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);f.failures.career=false;
assert.equal(f.careers.recordJapanBathDeliveryReview(first).xpGained,10);assert.equal(f.careers.state().performance,1);assert.equal(f.careers.recordJapanBathDeliveryReview(first).xpGained,0);assert.equal(f.careers.recordJapanBathDeliveryReview({...first,waitSeconds:179}).code,'review-conflict');
const live=fixture({store:f.store});assert.equal(live.careers.state().loadError,null);assert(live.careers.recordJapanBathDeliveryReview(first).replayed);assert.equal(live.careers.state().skillXP.care,10);
const late=live.careers.recordJapanBathDeliveryReview(receipt(live,2,'late'));assert.equal(late.review.score,0);assert.equal(late.xpGained,10);
const handoff=live.careers.recordJapanBathDeliveryReview(receipt(live,3,'handoff'));assert.equal(handoff.review.score,-1);assert.equal(handoff.xpGained,0);assert.equal(live.careers.state().performance,0);
for(let n=4;n<=8;n++)assert(live.careers.recordJapanBathDeliveryReview(receipt(live,n)).ok);
assert.equal(live.careers.state().daily.care,4);assert.equal(live.careers.state().skills.care,1);assert.equal(live.careers.state().skillXP.care,10);assert.equal(live.careers.state().skillXP.ritual,0);
live.finish(6,7);assert.equal(live.careers.state().lastDuty.wage,7,'late service and handoff leave six onsite hours worth seven Japanese coupons');assert.equal(live.careers.state().lastEvaluation.evaluatorId,'jp-onsen');assert.equal(live.careers.state().lastEvaluation.servicePenalty,undefined);
const ready=fixture({store:live.store,clock:live.clock});assert.equal(ready.careers.state().loadError,null);ready.failures.bank=true;assert.equal(ready.careers.settle().code,'save-failed');ready.failures.bank=false;ready.failures.career=true;assert(ready.careers.settle().cleanupPending);assert.equal(ready.bank.state().balances.japan.bank,7);assert.equal(ready.bank.state().balances.copper.bank,0);assert.equal(ready.bank.state().balances.france.bank,0);
const paid=fixture({store:ready.store,clock:ready.clock});assert(paid.careers.settle().replayed);assert.equal(paid.bank.state().balances.japan.bank,7);assert.equal(paid.bank.history().filter(t=>t.action==='wage').length,1);assert(paid.careers.resign().ok);assert.equal(paid.careers.slotHolder(ROLE.id),'jp-onsen');assert.equal(paid.careers.state().officialCareer.appointments.length,0);assert.equal(fixture({store:paid.store,clock:paid.clock}).careers.state().loadError,null);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,14,'waiting onsite counts but grants no XP');assert.equal(full.careers.state().skillXP.care,0);assert(full.careers.settle().ok);assert.equal(full.bank.state().balances.japan.bank,14);
const cancelled=fixture();cancelled.start();assert(cancelled.careers.interruptDuty('cancelled').ok);assert.equal(cancelled.careers.beginDuty({receiptId:cancelled.receiptId}).code,'duty-missed');assert.equal(fixture({store:cancelled.store}).careers.state().loadError,null);
for(const mutate of [s=>s.lastDuty.customerReviews[0].bathDeliveryReceipt.itemId+='-wrong',s=>s.lastDuty.customerReviews[0].score++,s=>{s.lastDuty.wage++;s.lastEvaluation.wage++;}]){const store=clone(live.store);mutate(store.careers);assert.equal(fixture({store,clock:live.clock}).careers.state().loadError,'invalid-career-state');}
const bridge=createFormalLaborContract({careers:fresh.careers,role:ROLE,getJob:()=>null,getPlayer:()=>({ageYears:18}),meetHost:()=>true});assert.equal(bridge.unit,'日本券');assert.equal(bridge.salary,'14日本券');

// The handbook must route to Sora's physical service and expose handover,
// neutral late reviews and care growth without a copper/official-rank fallback.
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},uiFixture=fixture(),requests=[];
const service={atRegistration:()=>true,state:()=>({job:uiFixture.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:uiFixture.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),intent:(kind='wait')=>({id:kind,intentKey:kind,kind,provider:'jp-bath-delivery-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:uiFixture.careers,copperLedger:uiFixture.bank,getClock:()=>uiFixture.clock,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc});
const dialog=doc.body.children.find(e=>e.tag==='dialog');ui.open();assert(text(dialog).includes('霞汤屋男汤配送处'));assert(!text(dialog).includes('中国'));
ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('14日本券'));assert(text(dialog).includes('照护经验'));assert(text(dialog).includes('泡汤与点餐另按原服务办理，值班须先交接'));const apply=all(dialog).find(e=>e.tag==='button'&&e.textContent==='提交职位申请');assert(apply);apply.onclick();assert.equal(requests.at(-1).kind,'formal-apply');assert.equal(uiFixture.careers.state().tenure,null);
assert(uiFixture.careers.apply(ROLE.id,{ageYears:18}).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('Sora：'));assert(text(dialog).includes('待面谈'));
assert(uiFixture.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:uiFixture.careers.applicationResult(ROLE.id).id}).ok);assert(uiFixture.careers.beginDuty({receiptId:uiFixture.receiptId}).ok);assert(uiFixture.careers.recordJapanBathDeliveryReview(receipt(uiFixture,1,'late')).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('日本券账户'));assert(text(dialog).includes('准确完成 · 等候较久'));assert(text(dialog).includes('照护经验 10'));assert(!text(dialog).includes('铜文账户'));assert(!text(dialog).includes('扣薪'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));ui.dispose();
console.log('PASS Japan bath delivery role: persistent Sora hiring, same-number receipts, capped atomic care XP, Japanese bank salary, reload/failures and physical handbook routes');
