// Regression boundary: the existing 43-year-old storyteller must remain
// eligible; commission seats cannot enter daily payroll; receipt-backed growth
// and bank credit must either persist together or remain unchanged.
import assert from 'node:assert/strict';
import {createFormalCareers,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {JAPAN_PERFORMANCE_ROLES,japanPerformanceCommission,japanPerformanceServiceSeconds,validJapanPerformanceReceipt} from '../source/game/japan-performance-role.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const copy=x=>structuredClone(x),clock={day:1,hour:8,seconds:100};
function setup(role,{age=43,saved=null}={}){
 const durable=saved?copy(saved):{},flags={reject:false},credits=[];let current=copy(durable),pending=null,core,writes=0;
 const bank=createGameCurrencyLedger({saved:current,storage:{setItem(key,value){if(flags.reject)return false;Object.assign(durable,JSON.parse(value));writes++;return true;}},transactionParticipant:tx=>{
  if(!tx.roleId?.startsWith('jp-'))return null;
  if(!pending||tx.action!=='wage'||tx.requestId!==pending.id||tx.roleId!==pending.roleId||tx.slotId!==pending.slotId||tx.amount!==pending.amount||tx.day!==pending.day||tx.currency!=='japan')return {ok:false,code:'performance-service-incomplete'};
  return core.prepareJapanPerformanceService(pending);
 }});
 bank.subscribeCommitted(tx=>credits.push(tx));
 let worldSeed=1;while(careerInterviewRoll(worldSeed,role.id,clock.day)>=.5)worldSeed++;
 if(!current.formalCareers){const seed=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();Object.assign(seed.skills,role.skillRequirements);current.formalCareers=seed;}
 core=createFormalCareers({saved:current.formalCareers,worldSeed,getClock:()=>clock,saveState(next){if(flags.reject)return false;current.formalCareers=copy(next);durable.formalCareers=copy(next);writes++;return true;},creditWageToBank:bank.creditWageToBank});
 const hire=()=>{assert(core.apply(role.id,{ageYears:age}).ok);assert.equal(core.workState().tenure,null);assert(core.reviewApplication(role.id,{ageYears:age,applicationId:core.applicationResult(role.id).id}).ok);};
 const pay=receipt=>{pending=receipt;try{return bank.creditWageToBank({amount:receipt.amount,receiptId:receipt.id,currency:'japan',roleId:receipt.roleId,slotId:receipt.slotId,day:receipt.day});}finally{pending=null;}};
 return {core,bank,flags,credits,hire,pay,get saved(){return copy(durable);},get writes(){return writes;}};
}
const receipt=(role,number=1,activity=role.activity,drink=activity==='drink'?'tea':null)=>({version:1,id:`jp-performance-work-${number}`,roleId:role.id,slotId:role.slotId,day:clock.day,orderId:`jp-performance-work-${number}`,customerId:role.id==='jp-salon-mai'?'jp-salon-ichiro':'jp-salon-mai',customerName:role.id==='jp-salon-mai'?'一郎':'舞',artistId:role.incumbentId,activity,drink,currency:'japan',amount:japanPerformanceCommission(role.id,activity,drink),serviceSeconds:japanPerformanceServiceSeconds(activity),completedAt:clock.seconds,sourcePaymentId:`jp-performance-work-${number}`});
for(const role of JAPAN_PERFORMANCE_ROLES){
 assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===role.id).length,1);assert.equal(FORMAL_CAREER_SLOTS.filter(s=>s.roleId===role.id).length,1);
 assert.equal(role.minimumAgeYears,18);assert.equal(role.maximumAgeYears,undefined);assert.equal(role.paymentKind,'commission');
 const f=setup(role);assert(f.core.eligibility(role.id,{ageYears:43}).ok);assert(f.core.eligibility(role.id,{ageYears:80}).ok);assert(f.core.eligibility(role.id,{ageYears:17}).reasons.includes('adult-required'));
 f.hire();assert.equal(f.core.slotHolder(role.id),'player');assert.equal(f.core.catalogue().find(r=>r.id===role.id).vacancy,0);
 assert.equal(f.core.beginDuty({receiptId:role.workSource+'-1'}).code,'commission-service-required');assert.equal(f.core.settle().code,'work-incomplete');
 const before=f.core.state();for(let n=0;n<60;n++){f.core.workState();f.core.beginDutyAvailability(role.id);f.core.observeDay();}
 assert.equal(f.core.workState().lastDuty,null);assert.equal(f.bank.history().length,0);assert.deepEqual(f.core.state(),before);
 const r=receipt(role),initial=f.core.state();assert(validJapanPerformanceReceipt(r));const prepared=f.core.prepareJapanPerformanceService(r);
 assert(prepared.ok);assert.equal(prepared.xpGained,10);assert.deepEqual(f.core.state(),initial,'preparation alone cannot mint XP');assert.equal(f.bank.balances().japan.bank,0);
 assert.equal(f.bank.creditWageToBank({amount:r.amount,receiptId:r.id,currency:'japan',roleId:r.roleId,slotId:r.slotId,day:r.day}).ok,false,'bank participant requires a live pending service');
 f.flags.reject=true;assert.equal(f.pay(r).ok,false);assert.equal(f.bank.balances().japan.bank,0);assert.equal(f.core.state().japanPerformanceServices.length,0);assert.equal(f.credits.length,0);
 f.flags.reject=false;assert(f.pay(r).ok);assert.equal(f.bank.balances().japan.bank,r.amount);assert.equal(f.core.state().japanPerformanceServices.length,1);assert.equal(f.core.state().skillXP[prepared.skill],10);assert.equal(f.credits.length,1);
 assert(f.pay(r).replayed);assert(f.core.prepareJapanPerformanceService(r).replayed);assert.equal(f.core.state().skillXP[prepared.skill],10);assert.equal(f.credits.length,1);
 assert.equal(f.core.prepareJapanPerformanceService({...r,customerName:'另一个人'}).code,'work-receipt-conflict');
 const reload=setup(role,{saved:f.saved});assert.equal(reload.core.state().loadError,null);assert(reload.core.isHired(role.id));assert(reload.pay(r).replayed);assert.equal(reload.bank.balances().japan.bank,r.amount);assert.equal(reload.core.state().skillXP[prepared.skill],10);
 assert(!('japanPerformanceServices' in f.core.workState()),'live polling stays bounded as receipt history grows');
 assert(f.core.resign().ok);assert.equal(f.core.slotHolder(role.id),role.incumbentId);assert(f.core.prepareJapanPerformanceService(r).replayed,'paid old evidence remains idempotent after resignation');
}
console.log('PASS all three finite 18+ jobs, age43/80, interview/approval, no passive salary, bank-only per-service receipt and XP atomicity, save failure/reload/replay');
const [reception,mai,ichiro]=JAPAN_PERFORMANCE_ROLES;
for(const [role,activity,drink,amount] of [[reception,'drink','tea',2],[reception,'drink','sake',4],[mai,'dance',null,8],[mai,'tea',null,6],[ichiro,'story',null,7],[ichiro,'tea',null,6]]){
 const r=receipt(role,1,activity,drink);assert.equal(r.amount,amount);assert(validJapanPerformanceReceipt(r));
 for(const change of [{amount:amount+1},{currency:'copper'},{slotId:'wrong'},{artistId:'player'},{customerId:'invented-guest'},{customerId:role.incumbentId},{sourcePaymentId:'another-order'},{serviceSeconds:r.serviceSeconds-.1},{completedAt:-1},{id:'jp-performance-work-01'},{day:-1},{extra:true}])assert(!validJapanPerformanceReceipt({...r,...change}),JSON.stringify(change));
}
assert.equal(japanPerformanceCommission(mai.id,'story'),null);assert.equal(japanPerformanceCommission(ichiro.id,'dance'),null);assert.equal(japanPerformanceCommission(reception.id,'tea'),null);
const unskilled=createFormalCareers({getClock:()=>clock,saveState:()=>true});assert.deepEqual(unskilled.eligibility(reception.id,{ageYears:18}).reasons,['ritual-required']);assert.deepEqual(unskilled.eligibility(mai.id,{ageYears:18}).reasons,['art-required','ritual-required']);assert.deepEqual(unskilled.eligibility(ichiro.id,{ageYears:43}).reasons,['art-required','writing-required']);
const full=setup(mai);full.hire();for(let n=1;n<=5;n++)assert(full.pay(receipt(mai,n)).ok);assert.equal(full.core.state().daily.art,4);assert.equal(full.core.state().skills.art,2);assert.equal(full.core.state().skillXP.art,0);assert.equal(full.bank.balances().japan.bank,40,'daily skill cap cannot cap rightful completed-service payment');
const old=full.saved.formalCareers;old.version=10;delete old.japanPerformanceServices;const migrated=createFormalCareers({saved:old,getClock:()=>clock,saveState:()=>true});assert.equal(migrated.state().version,13);assert.equal(migrated.state().loadError,null);assert.deepEqual(migrated.state().japanPerformanceServices,[]);assert.equal(migrated.state().skills.art,2);
for(const corrupt of [s=>delete s.japanPerformanceServices,s=>s.japanPerformanceServices.push(copy(s.japanPerformanceServices[0])),s=>s.japanPerformanceServices[0].amount++,s=>s.japanPerformanceServices.reverse()]){const s=full.saved.formalCareers;corrupt(s);assert.equal(createFormalCareers({saved:s,getClock:()=>clock,saveState:()=>true}).state().loadError,'invalid-career-state');}
const stale=full.core.prepareJapanPerformanceService(receipt(mai,6));assert(stale.ok);assert(full.core.resign().ok);assert(!stale.valid());assert(!stale.lock());assert(!stale.committed());
const locked=setup(ichiro);locked.hire();const participant=locked.core.prepareJapanPerformanceService(receipt(ichiro));assert(participant.lock());assert.equal(locked.core.resign().code,'career-busy');participant.release();assert.equal(locked.core.state().japanPerformanceServices.length,0);assert(participant.lock());assert(participant.committed());assert(participant.committed());participant.release();assert.equal(locked.core.state().skillXP.writing,10);
console.log('PASS six activity/price paths, specialty and proof rejection, shared four/day XP cap, v10 migration, corrupt journal rejection and stale/reentrant participant protection');
// Tiny DOM verifies routing/text only; it makes no browser or art-quality claim.
class Element{constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={};this.textContent='';this.open=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(){}showModal(){this.open=true;}close(){this.open=false;}remove(){}}
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(node=>node.textContent).join('\n');
for(const role of JAPAN_PERFORMANCE_ROLES){
 const f=setup(role),doc={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)},sent=[];
 const service={state:()=>({shift:null,order:null,income:0,quote:role.wage}),workChoices:()=>['accept','formal-resign'],atRegistration:()=>true,intent:kind=>({id:role.id+kind,intentKey:role.id+kind,kind,action:kind,position:[0,0,0]})};
 const ui=createCareerHandbook({careers:f.core,copperLedger:f.bank,getClock:()=>clock,getCountry:()=> 'japan',getPlayer:()=>({ageYears:43,root:{position:{x:0,y:0,z:0}}}),getService:id=>JAPAN_PERFORMANCE_ROLES.some(r=>r.id===id)?service:null,onIntent:i=>sent.push(i),document:doc});
 ui.open({roleId:role.id,scope:'catalogue'});assert.equal(all(doc.body).filter(e=>e.className==='career-role-card').length,3);assert(!text(doc.body).includes('40岁'));assert(!text(doc.body).includes('柳清弦'));assert(!text(doc.body).includes('铜文'));
 assert(f.core.apply(role.id,{ageYears:43}).ok);ui.open({roleId:role.id,scope:'role'});assert(text(doc.body).includes(role.employer+'：'));assert(text(doc.body).includes(role.duties));assert(!text(doc.body).includes('温晚'));
 assert(f.core.reviewApplication(role.id,{ageYears:43,applicationId:f.core.applicationResult(role.id).id}).ok);ui.open(false);assert(text(doc.body).includes('未开班 · '+role.incumbentName+'代管'));assert(text(doc.body).includes('日本券'));assert(!text(doc.body).includes('铜文'));
 const start=all(doc.body).find(e=>e.tag==='button'&&e.textContent==='accept');assert(start);start.onclick();assert.equal(sent.at(-1).kind,'accept');assert.equal(f.core.state().lastDuty,null,'UI dispatch does not grant work or pay');ui.dispose();
}
console.log('PASS Japanese venue groups all three jobs, own recruiter and skills, no China/40-year cutoff copy, native currency, physical action dispatch');
