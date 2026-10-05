// Protect real appointment/shift receipts from missing saves, replay and free
// wages while idling. Navigation/rendering is checked by the focused main route.
import assert from 'node:assert/strict';
import {createFormalCareers,PALACE_GUARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createChinaGuardEmployment} from '../source/game/china-guard-employment.js';
import {GUARD_REGISTRATION as REG} from '../source/game/china-guard-routes.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const clock={day:0,hour:10,seconds:0},store={career:null,employment:null,bank:0,receipts:new Set()},flags={rejectEmployment:false,rejectCareer:false},player={ageYears:22,root:{position:{x:REG[0],y:REG[1],z:REG[2]},rotation:{y:0}}};
 let work=null,navigating=false,service;
 const archery={setGuardTenure(){},requestSupervisor(){},supervisorReady:()=>true,requestGuardWork(id){work??={receiptId:id,stage:'requested'};},guardWorkState:()=>work,
 requestGuardReturn(id){if(work?.receiptId!==id)return false;work.stage='returned';return true;},finishGuardWork(){work=null;},cancelGuardWork(){work=null;}};
 const buildCareer=()=>createFormalCareers({saved:store.career,worldSeed:42,getClock:()=>clock,saveState:s=>{if(flags.rejectCareer)return false;store.career=copy(s);},creditWageToBank:d=>{if(!store.receipts.has(d.receiptId)){store.receipts.add(d.receiptId);store.bank+=d.amount;}return {ok:true,receiptId:d.receiptId};}});
 let careers=buildCareer();
 const build=()=>createChinaGuardEmployment({archery,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,isNavigating:()=>navigating,saveState:s=>{if(flags.rejectEmployment)return false;store.employment=copy(s);}});
 service=build();
 const at=q=>Object.assign(player.root.position,{x:q[0],y:q[1],z:q[2]});
 const act=kind=>{const next=service.intent(kind);assert(next,kind);at(next.position);return service.executeIntent(next);};
 const tick=(seconds,moving=false)=>{navigating=moving;for(let i=0;i<seconds*10;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;if(moving)player.root.position.x+=.005;service.update(.1);}navigating=false;};
 return {store,clock,flags,player,archery,at,act,tick,get work(){return work;},get careers(){return careers;},get service(){return service;},reload(){careers=buildCareer();service=build();},qualify(){for(const source of ['cn-rest','cn-archery'])for(let i=0;i<3;i++){const ticket=careers.learningTicket(source).ticket;assert(ticket);assert(careers.completeLearning(ticket,{seconds:8}).ok);}},hire(){assert(act('formal-apply'));assert.equal(careers.applicationResult(ROLE.id).status,'pending');assert(!careers.isHired(ROLE.id));assert(act('formal-review'));assert(careers.isHired(ROLE.id));}};
}
{
 const f=fixture();assert.equal(f.careers.eligibility(ROLE.id,{ageYears:22}).ok,false);f.qualify();assert.equal(f.careers.state().skills.martial,1);f.hire();assert.equal(f.careers.slotHolder(ROLE.id),'player');assert.equal(f.service.state().job,null);
 f.flags.rejectEmployment=true;assert.equal(f.act('accept'),false);const receipt=f.careers.state().lastDuty.workReceiptId;f.flags.rejectEmployment=false;f.tick(.1);assert.equal(f.service.state().job.receiptId,receipt,'recover admitted duty without second receipt');
 f.work.stage='active';f.tick(.1);assert.equal(f.service.state().job.assignment,'patrol');f.tick(10);assert.equal(f.service.state().job.coveredSeconds,0,'idle never earns wages');
 f.act('task');f.tick(.3);assert.equal(f.service.state().job.completedTasks,1);f.tick(70,true);assert(f.service.state().job.coveredSeconds>69);const covered=f.service.state().job.coveredSeconds;f.reload();assert.equal(f.careers.state().loadError,null);assert(f.service.state().job.coveredSeconds>69);f.tick(1);assert(covered-f.service.state().job.coveredSeconds<1.1,'reload never fabricates unwritten attendance');
 assert(f.act('end-shift'));f.tick(.1);assert.equal(f.service.state().job.stage,'ready');assert.equal(f.store.bank,0);const wage=Math.floor(24*f.service.state().job.coveredSeconds*.7/60/12);assert(wage>0);
 // Lost controller state cannot trap durable inspection/ready wages.
 f.store.employment=null;f.reload();f.tick(.1);assert.equal(f.service.state().job.stage,'ready');f.flags.rejectEmployment=true;assert.equal(f.act('claim'),false);assert.equal(f.store.bank,wage);assert.equal(f.careers.state().lastDuty.stage,'paid');f.flags.rejectEmployment=false;assert(f.act('claim'));assert.equal(f.store.bank,wage);assert.equal(f.store.receipts.size,1);assert.equal(f.service.state().job,null);assert.equal(f.service.intent('accept'),null);
 console.log('PASS guard pending approval, unique tenure, explicit start, missing-job recovery, real attendance and exactly-once bank salary');
}
{
 const f=fixture();f.qualify();f.hire();assert(f.act('accept'));f.work.stage='active';f.tick(.1);const manualBefore=f.service.state().job.coveredSeconds;for(let i=0;i<10;i++){f.player.root.position.x-=.01;f.player.root.position.z-=.02;f.tick(.1);}assert(f.service.state().job.coveredSeconds>manualBefore,'manual progress along current patrol leg earns attendance without automatic travel');f.act('task');const before=f.service.state().job.completedTasks;f.service.stopActivity();f.tick(5);assert.equal(f.service.state().job.completedTasks,before);assert(f.act('cancel'));assert.equal(f.store.bank,0);assert.equal(f.careers.state().lastDuty.stage,'missed');assert.equal(f.work,null);
 console.log('PASS interrupted observation earns no checkpoint; canceled duty releases original guard and cannot pay');
}
{
 const f=fixture(),old=copy(f.careers.state());delete old.skills.martial;delete old.skillXP.martial;delete old.daily.martial;delete old.learning['cn-archery'];
 let migrated=createFormalCareers({saved:old,getClock:()=>f.clock,saveState:()=>true});assert.equal(migrated.state().loadError,null);assert.equal(migrated.state().skills.martial,0);
 const legacy={version:1,revision:0,skills:{ritual:2,writing:2},tenure:null,lastDuty:null,lastPaidDay:null,daily:{day:null,ritual:0,writing:0},learning:{'cn-rest':{issued:0,completed:0,issuedDay:null},'cn-calligraphy':{issued:0,completed:0,issuedDay:null}},lowerWork:{'cn-tavern-labor':0},performance:0,promotionProgress:0,lastEvaluatedDay:null,lastEvaluation:null};
 migrated=createFormalCareers({saved:legacy,getClock:()=>f.clock,saveState:()=>true});assert.equal(migrated.state().loadError,null);assert.equal(migrated.state().skills.ritual,2);assert.equal(migrated.state().skills.martial,0);
 console.log('PASS published five-skill and legacy clerk saves preserve earned progress with unearned martial qualification');
}
