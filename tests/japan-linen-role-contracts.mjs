// Rejected service and later corrected service must survive failed saves,
// reload and repeated clicks without duplicating growth or bank wages.
import assert from 'node:assert/strict';
import {createFormalCareers,JAPAN_LINEN_ROLE as ROLE,JAPAN_KITCHEN_ROLE,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {validJapanLinenReceipt} from '../source/game/japan-linen-role.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,secondsFor=hours=>hours*60/GAME_MINUTES_PER_SECOND;
function fixture({store={},clock={day:1,hour:6,seconds:0},ritual=1,reject=false}={}){
 const failures={career:false,bank:false};let seed=1;
 while((careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)!==reject)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();initial.skills.ritual=ritual;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{if(failures.bank)return false;store.currency=clone(s);}});
 const careers=createFormalCareers({saved:store.careers??initial,worldSeed:seed,getClock:()=>clock,saveState:s=>{if(failures.career)return false;store.careers=clone(s);},creditWageToBank:bank.creditWageToBank});
 const receiptId='jp-linen-labor-1';
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert.equal(careers.state().tenure,null);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert.equal(careers.state().lastDuty,null);};
 const start=()=>{hire();assert(careers.beginDuty({receiptId}).ok);assert.equal(careers.state().lastDuty.shiftKind,'continuous');};
 const finish=(hours=6,tasks=0)=>{clock.hour=6+hours;clock.seconds=secondsFor(hours);assert(careers.laborEvent('completed',{roleId:ROLE.id,receiptId,coveredSeconds:secondsFor(hours),completedTasks:tasks}).ok);assert(careers.laborEvent('inspected',{roleId:ROLE.id,receiptId}).ok);};
 return {careers,bank,store,clock,failures,receiptId,hire,start,finish};
}
const receipt=(f,cycle=1)=>({source:'japan-linen',id:`jp-linen-1-cycle-${cycle}-${f.receiptId}`,workReceiptId:f.receiptId,linenId:'jp-linen-1',cycle,visitId:`jp-visitor-1-${cycle}`,customerName:'旅人',completed:true,accurate:true,outcome:'completed'});
assert.equal(ROLE.id,'jp-linen-service');assert.equal(ROLE.wage,14);assert.equal(ROLE.supervisorId,'jp-rest');assert.deepEqual(ROLE.skillRequirements,{ritual:1});assert.deepEqual(FORMAL_CAREER_SLOTS.find(s=>s.roleId===ROLE.id),{id:'jp-linen-service-1',roleId:ROLE.id,holderId:'jp-rest',replacement:true});
const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:17}).ok,false);assert.equal(fixture({ritual:0}).careers.eligibility(ROLE.id,{ageYears:18}).ok,false);f.start();
const r=receipt(f);assert(validJapanLinenReceipt(r));for(const patch of [{cycle:0},{cycle:1.5},{cycle:Number.MAX_SAFE_INTEGER+1},{linenId:'jp-linen-7'},{visitId:'jp-player-1-1'},{visitId:'jp-visitor-4294967296-1'},{visitId:'jp-visitor-1-01'},{completed:false},{accurate:false},{outcome:'washing'},{source:'japan-table-service'},{customerName:''},{id:r.id+'-replay'}])assert.equal(f.careers.recordJapanLinenReview({...r,...patch}).code,'invalid-work-receipt');
f.failures.career=true;assert.equal(f.careers.recordJapanLinenReview(r).code,'save-failed');assert.equal(f.careers.state().skillXP.ritual,0);f.failures.career=false;assert.equal(f.careers.recordJapanLinenReview(r).xpGained,10);assert.equal(f.careers.recordJapanLinenReview(r).xpGained,0);assert.equal(f.careers.recordJapanLinenReview({...r,customerName:'另一客'}).code,'review-conflict');
const restored=fixture({store:f.store});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.recordJapanLinenReview(r).replayed);for(let n=2;n<=4;n++)assert.equal(restored.careers.recordJapanLinenReview(receipt(restored,n)).xpGained,10);assert.equal(restored.careers.recordJapanLinenReview(receipt(restored,5)).limited,'daily-skill-limit');restored.finish(6,5);assert.equal(restored.careers.state().lastDuty.wage,7);assert.equal(restored.careers.state().lastEvaluation.evaluatorId,'jp-rest');assert(restored.careers.settle().ok);assert.equal(restored.bank.state().balances.japan.bank,7);restored.careers.settle();assert.equal(restored.bank.state().balances.japan.bank,7);
const full=fixture();full.start();full.finish(12);assert.equal(full.careers.state().lastDuty.wage,14);assert.equal(full.careers.state().skillXP.ritual,0);assert(full.careers.settle().ok);assert(full.careers.resign().ok);assert.equal(full.careers.slotHolder(ROLE.id),'jp-rest');
for(const mutate of [s=>s.lastDuty.customerReviews[0].linenReceipt.cycle++,s=>s.lastDuty.customerReviews[0].dishId='jp-linen-2',s=>s.lastDuty.customerReviews[0].score++]){const store=clone(restored.store);mutate(store.careers);assert.equal(fixture({store,clock:restored.clock}).careers.state().loadError,'invalid-career-state');}
console.log('PASS Japan linen role: original cycle proofs, safe replay and save failure, capped ritual XP, adult hiring, existing time-based Japanese payroll');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,classList:{add(){}},setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element},u=fixture(),requests=[];let choices=[{kind:'task:wash-1',action:'原号布草 · 亲手洗涤'}];
const service={atRegistration:()=>true,state:()=>({job:u.careers.state().lastDuty?{formalRoleId:ROLE.id,receiptId:u.receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0}:null}),taskChoices:()=>choices,intent:(kind='wait')=>kind.startsWith('task:')&&!choices.some(c=>c.kind===kind)?null:({id:kind,intentKey:kind,kind,provider:'japan-linen-employment',action:kind,position:[0,0,0]})};
const ui=createCareerHandbook({careers:u.careers,copperLedger:u.bank,getClock:()=>u.clock,getPlayer:()=>({ageYears:18,root:{position:{x:0,y:0,z:0}}}),getCountry:()=> 'japan',getService:id=>id===ROLE.id?service:null,onIntent:r=>requests.push(r),document:doc}),dialog=doc.body.children.find(e=>e.tag==='dialog');ui.open();assert(text(dialog).includes('霞汤屋四层洗衣间布草登记处'));ui.open({scope:'role',roleId:ROLE.id});for(const label of ['14日本券','Yuki','礼仪','折叠','不按件加钱'])assert(text(dialog).includes(label),label);u.start();ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes(choices[0].action));const stale=all(dialog).find(e=>e.tag==='button'&&e.textContent===choices[0].action);choices=[];ui.update('lot');stale.onclick();assert.equal(requests.length,0);assert(u.careers.recordJapanLinenReview(receipt(u)).ok);ui.open({scope:'role',roleId:ROLE.id});assert(text(dialog).includes('布草折叠归库 +1'));assert(text(dialog).includes('礼仪经验 10'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='end-shift'));assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='cancel'));ui.dispose();
console.log('PASS linen handbook registration, current original task choices, stale intent rejection and completion growth');
