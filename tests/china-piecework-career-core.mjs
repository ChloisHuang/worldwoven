// Protect the original-order boundary: neither an NPC proof, duplicate source,
// failed bank save nor an idle shift may mint player wages or career growth.
import assert from 'node:assert/strict';
import {createFormalCareers,FORMAL_CAREER_ROLES,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {CHINA_PIECEWORK_ROLES,chinaPieceworkSkill,validChinaPieceworkReceipt} from '../source/game/china-piecework-career-proof.js';
import {PALACE_TEA_GUESTS,PALACE_TEA_STEPS,palaceTeaRequestId} from '../source/game/china-palace-tea-orders.js';
import {archivePlayerContract,archiveProof} from '../source/game/china-archive-catalogue.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const copy=structuredClone;
const proofFor=(role,day,guest=PALACE_TEA_GUESTS[0])=>{
 if(role.id==='cn-archive-inspector')return archiveProof(archivePlayerContract(day,1));
 const requestId=palaceTeaRequestId(guest,day);
 return {kind:'player-palace-tea-piecework',version:1,actorId:'player',roleId:role.id,slotId:role.slotId,holderRevision:1,requestId,guestId:guest,visitId:`visit-${guest}-${day}`,day,cupId:requestId+':cup',trayId:requestId+':tray',amount:8,contractVersion:role.contractVersion,steps:[...PALACE_TEA_STEPS]};
};
function fixture(role,saved=null){
 const clock={day:3,hour:8,seconds:300},store=copy(saved||{}),flags={fail:false};let core,pending;
 const bank=createGameCurrencyLedger({saved:store,storage:{setItem(key,value){if(flags.fail)return false;Object.assign(store,JSON.parse(value));return true;}},transactionParticipant:tx=>{
  if(!pending||tx.requestId!==pending.id||tx.roleId!==pending.roleId||tx.slotId!==pending.slotId||tx.amount!==8||tx.day!==pending.day||tx.currency!=='copper')return {ok:false,code:'original-work-required'};
  return core.prepareChinaPieceworkService(pending);
 }});
 if(!store.formalCareers){const seed=createFormalCareers({saveState:()=>true,getClock:()=>clock}).state();Object.assign(seed.skills,role.skillRequirements);seed.tenure={roleId:role.id,slotId:role.slotId,sinceDay:3,sinceHour:8};store.formalCareers=seed;}
 core=createFormalCareers({saved:store.formalCareers,getClock:()=>clock,saveState:next=>{if(flags.fail)return false;store.formalCareers=copy(next);return true;}});
 const receipt=(guest=PALACE_TEA_GUESTS[0])=>{const proof=proofFor(role,clock.day,guest);return {version:1,id:proof.requestId||proof.orderId,roleId:role.id,slotId:role.slotId,day:clock.day,amount:8,currency:'copper',proof,completedAt:clock.seconds};};
 const pay=r=>{pending=r;try{return bank.creditWageToBank({amount:r.amount,receiptId:r.id,roleId:r.roleId,slotId:r.slotId,day:r.day,currency:r.currency});}finally{pending=null;}};
 return {core,bank,clock,store,flags,receipt,pay};
}
for(const role of CHINA_PIECEWORK_ROLES){
 assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.id===role.id).length,1);assert.equal(FORMAL_CAREER_SLOTS.find(r=>r.roleId===role.id).replacement,true);
 const empty=createFormalCareers({saveState:()=>true,getClock:()=>({day:3,hour:8,seconds:300})});assert(empty.eligibility(role.id,{ageYears:17}).reasons.includes('adult-required'));assert(empty.eligibility(role.id,{ageYears:18}).reasons.includes(chinaPieceworkSkill(role.id)+'-required'));
 const f=fixture(role),r=f.receipt(),before=f.core.state();assert.equal(before.loadError,null);assert(validChinaPieceworkReceipt(r));assert.equal(f.core.beginDuty({receiptId:role.workSource+'-1'}).code,'commission-service-required');assert.equal(f.core.settle().code,'work-incomplete');
 const candidate=f.core.prepareChinaPieceworkService(r);assert(candidate.ok);assert.equal(candidate.xpGained,10);assert.equal(candidate.review.score,1);assert.equal(f.core.state().performance,0);
 f.flags.fail=true;assert.equal(f.pay(r).ok,false);assert.equal(f.core.state().chinaPieceworkServices.length,0);assert.equal(f.bank.balances().copper.bank,0);
 f.flags.fail=false;assert(f.pay(r).ok);assert.equal(f.bank.balances().copper.bank,8);assert.equal(f.core.state().performance,1);assert.equal(f.core.state().skillXP[chinaPieceworkSkill(role.id)],10);assert.equal(f.core.state().lastDuty,null);assert.equal(f.core.state().promotionProgress,0);
 assert(f.pay(r).replayed);assert(f.core.prepareChinaPieceworkService(r).replayed);assert.equal(f.core.state().performance,1);
 const reload=fixture(role,f.store);assert.equal(reload.core.state().loadError,null);assert(reload.pay(r).replayed);assert.equal(reload.core.workState().latestChinaPieceworkReview.score,1);assert(!('chinaPieceworkServices' in reload.core.workState()));
 for(const change of [{amount:9},{currency:'japan'},{extra:true},{id:r.id+'-duplicate'},{proof:{...r.proof,actorId:role.incumbentId}},{proof:{...r.proof,steps:[]}}])assert(!validChinaPieceworkReceipt({...r,...change}));
 const altered={...r,completedAt:r.completedAt-1};assert.equal(f.core.prepareChinaPieceworkService(altered).code,'work-receipt-conflict');
 const bad=copy(f.store.formalCareers);bad.chinaPieceworkServices.push(copy(r));assert.equal(createFormalCareers({saved:bad,saveState:()=>true,getClock:()=>f.clock}).state().loadError,'invalid-career-state');
 const old=copy(before);old.version=11;delete old.chinaPieceworkServices;const migrated=createFormalCareers({saved:old,saveState:()=>true,getClock:()=>f.clock}).state();assert.equal(migrated.loadError,null);assert.equal(migrated.version,12);assert.deepEqual(migrated.chinaPieceworkServices,[]);assert.deepEqual(migrated.skills,before.skills);
 assert(f.core.resign().ok);assert(f.core.prepareChinaPieceworkService(r).replayed);assert.equal(f.core.slotHolder(role.id),role.incumbentId);
}
// Reading consumes the same skill allowance as paid work, but never caps pay.
for(const role of CHINA_PIECEWORK_ROLES){const f=fixture(role),saved=copy(f.core.state()),skill=chinaPieceworkSkill(role.id);saved.daily={...saved.daily,day:3,[skill]:4};f.store.formalCareers=saved;const capped=fixture(role,f.store);assert(capped.pay(capped.receipt()).ok);assert.equal(capped.core.state().skillXP[skill],0);assert.equal(capped.core.state().daily[skill],4);assert.equal(capped.bank.balances().copper.bank,8);assert.equal(capped.core.state().performance,1);}
console.log('PASS both finite adult roles, original-only proofs, exact 8 copper bank pay, save failure/reload/replay, performance and capped shared XP, v11 migration and journal rejection');
class Element{constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={};this.textContent='';this.open=false;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(){}showModal(){this.open=true;}close(){this.open=false;}remove(){}}
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(n=>n.textContent).join('\n');
for(const role of CHINA_PIECEWORK_ROLES){const f=fixture(role),doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)},sent=[];
 const service={state:()=>({shift:null,order:null,income:0}),workChoices:()=>['accept','formal-resign'],atRegistration:()=>true,intent:kind=>({id:role.id+kind,intentKey:kind,kind,action:kind,position:[0,0,0]})};
 const ui=createCareerHandbook({careers:f.core,copperLedger:f.bank,getClock:()=>f.clock,getCountry:()=> 'china',getPlayer:()=>({ageYears:20,root:{position:{x:0,y:0,z:0}}}),getService:id=>id===role.id?service:null,onIntent:i=>sent.push(i),document:doc});ui.open(false);
 assert(text(doc.body).includes('8 铜文 / 单'));assert(text(doc.body).includes(role.id==='cn-archive-inspector'?'六册原藏书':'原杯、原托盘'));assert(!text(doc.body).includes('日本券'));assert(!text(doc.body).includes('温晚'));assert(!text(doc.body).includes('台班'));
 const start=all(doc.body).find(n=>n.tag==='button'&&n.textContent==='accept');assert(start);start.onclick();assert.equal(sent.at(-1).kind,'accept');assert.equal(f.core.state().chinaPieceworkServices.length,0);ui.dispose();
}
console.log('PASS original China piecework handbook, physical intent routing, retained free chat/read and no salary or salon copy');
