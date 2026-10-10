// Prevent receipt replay, curator/sale confusion and a missing continuous-shift
// registration from minting art XP or salary. DOM checks cover selectable
// subject/style dispatch without constructing a world or renderer.
import assert from 'node:assert/strict';
import {createFormalCareers,FRANCE_ART_ROLE as ROLE,TEA_SERVER_ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {FRANCE_ART_TIMELY_SECONDS,validFranceArtReceipt} from '../source/game/france-art-role.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {createObjectInteractionAnchors} from '../source/game/object-interaction-anchors.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},art=2,writing=1,reject=false}={}){
 const failures={career:false,bank:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();initial.skills.art=art;initial.skills.writing=writing;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='fr-atelier-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish};
}
const receipt=(f,number=1,outcome='completed',waitSeconds=outcome==='late'?181:180)=>{
 const orderId=`france-art-${number}`,completed=outcome!=='handoff';
 return {source:'france-art',id:`${orderId}-art-${f.receiptId}`,workReceiptId:f.receiptId,orderId,number,customerId:'france-atelier',customerName:'卢西安',itemId:`${orderId}-canvas`,supplyReceipt:`${orderId}-materials`,outcome,waitSeconds,completed,accurate:completed,timely:waitSeconds<=180};
};

assert.equal(ROLE.id,'fr-atelier-artist');assert.equal(ROLE.wage,16);assert.equal(ROLE.currency,'france');assert.equal(ROLE.preparationBonus,0);assert.equal(ROLE.supervisorId,'france-atelier');assert.equal(ROLE.rank,undefined);assert.deepEqual(ROLE.skillRequirements,{art:2,writing:1});assert.deepEqual(ROLE.dutyWindow,{startHour:6,endHour:18});assert.equal(FRANCE_ART_TIMELY_SECONDS,180);
assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===ROLE.id).length,1);assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'fr-atelier-artist-1',roleId:ROLE.id,holderId:'france-atelier',replacement:true});
const fresh=fixture();assert(fresh.careers.eligibility(ROLE.id,{ageYears:18}).ok);assert.deepEqual(fresh.careers.eligibility(ROLE.id,{ageYears:17}).reasons,['adult-required']);assert.deepEqual(fixture({art:1}).careers.eligibility(ROLE.id,{ageYears:18}).reasons,['art-required']);
const old=createFormalCareers({getClock:()=>fresh.clock,saveState:()=>{},roles:FORMAL_CAREER_ROLES.filter(r=>r.id!==ROLE.id),slots:FORMAL_CAREER_SLOTS.filter(s=>s.roleId!==ROLE.id)}).state();assert.deepEqual(fixture({store:{careers:old}}).careers.state(),old,'published career state gains no invented employment or skill');
const pending=fixture();assert(pending.careers.apply(ROLE.id,{ageYears:18}).ok);const resumed=fixture({store:pending.store});assert.equal(resumed.careers.applicationResult(ROLE.id).status,'pending');assert.equal(resumed.careers.slotHolder(ROLE.id),'france-atelier');assert(resumed.careers.cancelApplication(ROLE.id,resumed.careers.applicationResult(ROLE.id).id).ok);assert.equal(fixture({store:resumed.store}).careers.applicationResult(ROLE.id).status,'cancelled');
const rejected=fixture({reject:true});assert(rejected.careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(rejected.careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:rejected.careers.applicationResult(ROLE.id).id}).code,'interview-rejected');assert.equal(fixture({store:rejected.store}).careers.applicationResult(ROLE.id).status,'rejected');
const f=fixture();f.start();assert.equal(f.careers.slotHolder(ROLE.id),'player');assert.equal(f.careers.catalogue().find(r=>r.id===ROLE.id).vacancy,0);assert(f.careers.eligibility(TEA_SERVER_ROLE.id,{ageYears:18}).reasons.includes('already-employed'));
const first=receipt(f);assert(validFranceArtReceipt(first));assert.equal(fresh.careers.recordFranceArtReview(first).code,'wrong-duty-source');
for(const patch of [{number:2},{itemId:'other-dish'},{supplyReceipt:'france-art-2-materials'},{source:'france-pastry'},{id:first.id+'-again'},{accurate:false},{completed:false},{timely:false},{outcome:'invented'},{waitSeconds:-1},{waitSeconds:Infinity},{number:Number.MAX_SAFE_INTEGER+1},{customerId:'player'},{customerName:'另一位居民'},{orderId:'france-art-01'},{workReceiptId:'fr-pastry-labor-1'},{workReceiptId:'fr-atelier-labor-9007199254740992'}])assert.equal(f.careers.recordFranceArtReview({...first,...patch}).code,'invalid-work-receipt');
assert.equal(f.careers.recordFranceArtReview(receipt({...f,receiptId:'fr-atelier-labor-2'})).code,'wrong-duty-source');
f.failures.career=true;assert.equal(f.careers.recordFranceArtReview(first).code,'save-failed');assert.equal(f.careers.state().performance,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);assert.equal(f.careers.state().skillXP.art,0);f.failures.career=false;
assert.equal(f.careers.recordFranceArtReview(first).xpGained,10);assert.equal(f.careers.state().performance,1);assert.equal(f.careers.recordFranceArtReview(first).xpGained,0);assert.equal(f.careers.recordFranceArtReview({...first,waitSeconds:119}).code,'review-conflict');
const live=fixture({store:f.store});assert.equal(live.careers.state().loadError,null);assert(live.careers.recordFranceArtReview(first).replayed);assert.equal(live.careers.state().skillXP.art,10);
assert.equal(live.careers.recordFranceArtReview(receipt(live,2,'late')).review.score,0);assert.equal(live.careers.state().skillXP.art,20);assert.equal(live.careers.recordFranceArtReview(receipt(live,3,'handoff')).xpGained,0);assert.equal(live.careers.state().performance,0);assert.equal(live.careers.recordFranceArtReview(receipt(live,3)).code,'review-conflict','unfinished handoff cannot be upgraded into later NPC success');
for(let n=4;n<=6;n++)assert(live.careers.recordFranceArtReview(receipt(live,n)).ok);assert.equal(live.careers.state().daily.art,4);assert.equal(live.careers.state().skills.art,2);assert.equal(live.careers.state().skillXP.art,40);assert.equal(live.careers.state().skillXP.cooking,0);
live.finish(6,5);assert.equal(live.careers.state().lastDuty.wage,8,'late and unfinished work never add or deduct attendance wages');assert.equal(live.careers.state().lastEvaluation.evaluatorId,'france-atelier');
const ready=fixture({store:live.store,clock:live.clock});assert.equal(ready.careers.state().loadError,null);ready.failures.bank=true;assert.equal(ready.careers.settle().code,'save-failed');ready.failures.bank=false;ready.failures.career=true;assert(ready.careers.settle().cleanupPending);assert.equal(ready.bank.state().balances.france.bank,8);
const paid=fixture({store:ready.store,clock:ready.clock});assert(paid.careers.settle().replayed);assert.equal(paid.bank.state().balances.france.bank,8);assert.equal(paid.bank.history().filter(t=>t.action==='wage').length,1);assert.equal(paid.bank.state().balances.copper.bank,0);assert(paid.careers.resign().ok);assert.equal(paid.careers.slotHolder(ROLE.id),'france-atelier');assert.equal(paid.careers.state().officialCareer.appointments.length,0);assert.equal(fixture({store:paid.store,clock:paid.clock}).careers.state().loadError,null);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,16);assert.equal(full.careers.state().skillXP.art,0,'onsite waiting pays time but never grows skills');assert(full.careers.settle().ok);assert.equal(full.bank.state().balances.france.bank,16);
for(const mutate of [s=>s.lastDuty.customerReviews[0].franceArtReceipt.itemId+='-wrong',s=>s.lastDuty.customerReviews[0].dishId='ramen',s=>s.lastDuty.customerReviews[0].score++,s=>{s.lastDuty.wage++;s.lastEvaluation.wage++;}]){const store=clone(live.store);mutate(store.careers);assert.equal(fixture({store,clock:live.clock}).careers.state().loadError,'invalid-career-state');}
const shared=fixture();shared.start();for(let i=0;i<3;i++){const lesson=shared.careers.learningTicket('france-salon','fr-art-intro');assert(lesson.ok);assert.equal(shared.careers.completeLearning(lesson.ticket,{seconds:8}).xpGained,10);}assert.equal(shared.careers.recordFranceArtReview(receipt(shared)).xpGained,10);assert.equal(shared.careers.recordFranceArtReview(receipt(shared,2)).limited,'daily-skill-limit');


assert.deepEqual(fixture({writing:0}).careers.eligibility(ROLE.id,{ageYears:18}).reasons,['writing-required']);
console.log('PASS France exhibition art role: exclusive adult admission, same-number acceptance, capped art XP, immutable replay, restore rejection and one fixed French attendance wage');

// The generic salaried handbook must name this workplace, preserve local
// dispatch and show acceptance scores without inventing any salary penalty.
const {createCareerHandbook}=await import('../source/game/career-handbook.js');
const element=tag=>({tag,children:[],attributes:{},classList:{add(){}},textContent:'',open:false,hidden:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
function panel(f){
 const doc={head:element('head'),body:element('body'),createElement:element},sent=[],player={ageYears:18,root:{position:{x:0,y:0,z:0}}};
 const service={taskChoices:()=>[{kind:'task:subject:garden',action:'题材 · 宫苑花园',detail:'原展览 · 同号画布'},{kind:'task:style:dawn',action:'画风 · 晨光',detail:'描稿与冷暖配色'}],state:()=>({job:f.careers.state().lastDuty?.stage==='working'?{formalRoleId:ROLE.id,receiptId:f.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),intent:(kind='work')=>({id:'exhibition-'+kind,kind,intentKey:'exhibition-'+kind,position:[0,0,0],action:kind==='end-shift'?'交回卢西安':kind==='cancel'?'取消当前动作':'核对同号原画'})};
 const ui=createCareerHandbook({careers:f.careers,copperLedger:{state:()=>({cash:0})},getClock:()=>f.clock,getPlayer:()=>player,getCountry:()=> 'france',getService:id=>id===ROLE.id?service:null,document:doc,onIntent:i=>sent.push(i)});
 return {ui,doc,sent,service};
}
const pendingUI=fixture();assert(pendingUI.careers.apply(ROLE.id,{ageYears:18}).ok);const applicationPanel=panel(pendingUI);applicationPanel.ui.open({roleId:ROLE.id});assert(text(applicationPanel.doc.body).includes('卢西安：需满18岁、艺术2级、文书1级'));assert(text(applicationPanel.doc.body).includes('16法国券'));assert(!text(applicationPanel.doc.body).includes('卢西安卸任'));applicationPanel.ui.dispose();
const uiWork=fixture();uiWork.start();const workPanel=panel(uiWork);workPanel.ui.open({roleId:ROLE.id});assert(text(workPanel.doc.body).includes('皇家艺术书斋 · 原画展览'));assert(text(workPanel.doc.body).includes('卢西安验收同号原画并归档陈列'));assert(text(workPanel.doc.body).includes('原画题材与画风'));assert(text(workPanel.doc.body).includes('画风 · 晨光'));assert(text(workPanel.doc.body).includes('描稿与冷暖配色'));const subject=all(workPanel.doc.body).find(e=>e.tag==='button'&&e.textContent==='题材 · 宫苑花园');assert(subject);subject.onclick();assert.equal(workPanel.sent.at(-1).kind,'task:subject:garden');workPanel.ui.open({roleId:ROLE.id});const end=all(workPanel.doc.body).find(e=>e.tag==='button'&&e.textContent==='交回卢西安');assert(end);end.onclick();assert.equal(workPanel.sent.at(-1).kind,'end-shift');
for(const [number,outcome,label]of [[1,'completed','原画验收及时 +1'],[2,'late','原画已验收 · 用时较久'],[3,'handoff','原画未完交接 −1']]){assert(uiWork.careers.recordFranceArtReview(receipt(uiWork,number,outcome)).ok);workPanel.ui.open({roleId:ROLE.id});assert(text(workPanel.doc.body).includes(label));assert(!text(workPanel.doc.body).includes('扣薪'));assert(!text(workPanel.doc.body).includes('尚未开放'));}
const stale=all(workPanel.doc.body).find(e=>e.tag==='button'&&e.textContent==='交回卢西安');workPanel.ui.close();stale.onclick();assert.equal(workPanel.sent.length,2,'closed handbook cannot dispatch stale work');workPanel.ui.dispose();
console.log('PASS France exhibition art handbook: named local application, fixed salary, art growth, neutral review wages and close-safe end-shift dispatch');

const curator={actorId:'france-atelier',root:{position:{x:1,y:0,z:2}}};
const anchors=createObjectInteractionAnchors({actors:()=>[curator]});
assert.equal(anchors.resolve({provider:'france-art-employment',kind:'formal-review',position:[0,0,0]}).actor,curator);
assert.equal(anchors.resolve({provider:'france-art-employment',kind:'work',position:[0,0,0],work:{}}),null,'missing object metadata must not label the curator');
assert.deepEqual(anchors.resolve({provider:'france-art-employment',kind:'work',position:[0,0,0],work:{visualAnchor:{id:'canvas',point:[1,.8,2]}}}).point,[1,.8,2]);
console.log('PASS France art markers: original curator identity, explicit canvas surface and no misleading employer fallback');
