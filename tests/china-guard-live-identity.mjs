// Protect real appointment/shift receipts from missing saves, replay and free
// wages while idling. Navigation/rendering is checked by the focused main route.
import assert from 'node:assert/strict';
import {createFormalCareers,PALACE_GUARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createChinaGuardEmployment} from '../source/game/china-guard-employment.js';
import {GUARD_REGISTRATION as REG} from '../source/game/china-guard-routes.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const clock={day:0,hour:10,seconds:0},store={career:null,employment:null,bank:0,receipts:new Set()},flags={rejectEmployment:false,rejectCareer:false},player={ageYears:22,root:{position:{x:REG[0],y:REG[1],z:REG[2]},rotation:{y:0}}};
 let work=null,navigating=false,service;const wardrobeChanges=[];
 const archery={reviewerContext:()=>({actorId:'cn-range-warden',name:'陆衡'}),patrolHolderContext:()=>({actorId:'cn-archery',name:'沈砚',revision:0}),setGuardTenure(){},requestSupervisor(){},supervisorReady:()=>true,requestGuardWork(id){work??={receiptId:id,stage:'requested'};},guardWorkState:()=>work,
 requestGuardReturn(id){if(work?.receiptId!==id)return false;work.stage='returned';return true;},finishGuardWork(){work=null;},cancelGuardWork(){work=null;}};
 const buildCareer=()=>createFormalCareers({saved:store.career,worldSeed:42,getClock:()=>clock,saveState:s=>{if(flags.rejectCareer)return false;store.career=copy(s);},creditWageToBank:d=>{if(!store.receipts.has(d.receiptId)){store.receipts.add(d.receiptId);store.bank+=d.amount;}return {ok:true,receiptId:d.receiptId};}});
 let careers=buildCareer();
 const build=()=>createChinaGuardEmployment({archery,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,onWardrobeChange:preset=>wardrobeChanges.push(preset),isNavigating:()=>navigating,saveState:s=>{if(flags.rejectEmployment)return false;store.employment=copy(s);}});
 service=build();
 const at=q=>Object.assign(player.root.position,{x:q[0],y:q[1],z:q[2]});
 const act=kind=>{const next=service.intent(kind);assert(next,kind);at(next.position);return service.executeIntent(next);};
 const tick=(seconds,moving=false)=>{navigating=moving;for(let i=0;i<seconds*10;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;if(moving)player.root.position.x+=.005;service.update(.1);}navigating=false;};
 return {store,clock,flags,player,archery,wardrobeChanges,at,act,tick,get work(){return work;},get careers(){return careers;},get service(){return service;},reload(){careers=buildCareer();service=build();},qualify(){for(const source of ['cn-rest','cn-archery'])for(let i=0;i<3;i++){const ticket=careers.learningTicket(source).ticket;assert(ticket);assert(careers.completeLearning(ticket,{seconds:8}).ok);}},hire(){assert(act('formal-apply'));assert.equal(careers.applicationResult(ROLE.id).status,'pending');assert(!careers.isHired(ROLE.id));assert(act('formal-review'));assert(careers.isHired(ROLE.id));}};
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
 const f=fixture(),old=f.service.intent('formal-apply');assert.equal(old.visualAnchor.actorId,'cn-range-warden');assert.equal(old.npcName,'陆衡');
 f.archery.patrolHolderContext=()=>({actorId:'cn-new-guard',name:'新巡卫',revision:1});assert.equal(f.service.resolveIntent(old),null);assert.equal(f.service.holderName(),'新巡卫');const same=f.service.intent('formal-apply');f.archery.patrolHolderContext=()=>({actorId:'cn-new-guard',name:'新巡卫',revision:2});assert.equal(f.service.resolveIntent(same),null);
 f.archery.reviewerContext=()=>null;assert.equal(f.service.intent('formal-apply'),null);assert.equal(f.service.reviewerName(),'射圃审核人暂缺');assert(f.service.intent('formal-view'));assert.deepEqual(f.service.intent('formal-view').visualAnchor,{});
 console.log('PASS live reviewer separate from replacement patrol holder and stale same-person tenure clicks');
}
{
 const f=fixture();let revision=0;f.archery.reviewerContext=()=>({actorId:'cn-range-warden',name:'陆衡',revision});
 const old=f.service.intent('formal-apply'),identity=f.service.identityKey();revision++;
 assert.equal(f.service.resolveIntent(old),null);assert.equal(f.service.executeIntent(old),false);assert.notEqual(f.service.identityKey(),identity);
 f.qualify();f.archery.supervisorReady=()=>false;assert(f.act('formal-apply'));assert.equal(f.service.state().waiting,'formal-apply');
 revision++;f.archery.supervisorReady=()=>true;f.tick(.1);assert.equal(f.service.state().waiting,null);assert.equal(f.careers.applicationResult(ROLE.id),null);
 console.log('PASS same-person reviewer appointment revision invalidates selected and queued applications');
}
{
 const f=fixture();f.qualify();f.hire();assert(f.act('accept'));f.archery.reviewerContext=()=>null;assert.equal(f.service.intent('claim'),null);assert(f.act('cancel'));assert.equal(f.service.state().job,null);assert.equal(f.store.bank,0);
 console.log('PASS missing reviewer does not trap manual player cancellation or create a wage');
}

{
 const {createObjectInteractionAnchors}=await import('../source/game/object-interaction-anchors.js');const f=fixture(),reviewer={station:{id:'cn-range-warden'},root:{position:{x:1,y:0,z:2}}},oldGuard={station:{id:'cn-archery'},root:{position:{x:9,y:0,z:9}}},anchors=createObjectInteractionAnchors({actors:()=>[reviewer,oldGuard]});anchors.refresh();assert.equal(anchors.resolve(f.service.intent('formal-apply')).actor,reviewer);assert.equal(anchors.resolve(f.service.intent('formal-view')),null);f.archery.reviewerContext=()=>null;assert.equal(f.service.intent('formal-apply'),null);
 console.log('PASS original reviewer anchor, no unrelated patrol-body or absent-person fallback');
}
{
 const fs=await import('node:fs'),vm=await import('node:vm');const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),start=source.indexOf('getHiringContext:role=>')+'getHiringContext:'.length,end=source.indexOf(',creditWageToBank,getClock',start);let present=true;const looked=[];const callback=new vm.Script('('+source.slice(start,end)+')').runInNewContext({chinaArchery:{reviewerContext:()=>present?{actorId:'cn-range-warden'}:null},playerSocialContext:{profileFor:id=>{looked.push(id);return {traits:{quiet:.4}};}},getNPCProfile:()=>({traits:{}})});assert.equal(callback(ROLE).recruiterTraits.quiet,.4);present=false;assert.equal(callback(ROLE).recruiterTraits,undefined);assert.deepEqual(looked,['cn-range-warden']);
 console.log('PASS actual main recruitment traits use only the live fixed reviewer');
}
{
 const {createCareerHandbook}=await import('../source/game/career-handbook.js'),f=fixture();f.archery.patrolHolderContext=()=>({actorId:'cn-new-guard',name:'新巡卫',revision:1});f.archery.reviewerContext=()=>null;
 const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}}),doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)];
 const ui=createCareerHandbook({careers:f.careers,copperLedger:{balance:()=>0},getClock:()=>f.clock,getService:id=>id===ROLE.id?f.service:null,getCountry:()=> 'china',getPlayer:()=>f.player,document:doc});const before=JSON.stringify(f.careers.state());ui.open({scope:'role',roleId:ROLE.id});const text=all(doc.body).map(e=>e.textContent).join('\n');assert(text.includes('新巡卫'));assert(text.includes('射圃审核人暂缺'));assert(!text.includes('沈砚'));assert(!text.includes('陆衡'));assert.equal(JSON.stringify(f.careers.state()),before);ui.dispose();
 console.log('PASS actual handbook replacement helper and absent reviewer, historical career state unchanged');
}
