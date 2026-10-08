// Actual audience phase controller, real stable actor IDs and source result.
// Travel is staged at the existing hall places; no world-route/visual claim.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,context,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,context);}});
const T=await import('three');
const {createChinaPalaceAudience,CHINA_COURT_OFFICIALS,chinaCourtAssemblyRoute}=await import('../source/game/china-palace-audience.js');
const {createCourtReports}=await import('../source/game/china-court-reports.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const source={ledger:{lastDay:0,lastReceipt:'cn-morning-audience:0',outcome:'completed',completedReceipt:'cn-morning-audience:0'},order:null,props:{workProgress:1}};
function inspectedCases(){const r=createCourtReports({readEdict:()=>source});const draft=r.report('works',0);assert(r.decide(draft.issueId,'approve','cn-emperor'));const job=r.inspection();assert(r.inspected(job.id,{actorId:'cn-minister-works',position:job.point,place:job.place}));return r.snapshot();}
function fixture({continuity=null,reports=inspectedCases(),day=1,mode='accept'}={}){
 let service,duty=!!continuity,ready=true,time=0,attempts=0,accepted=0,durable=null;
 const actors=[...CHINA_COURT_OFFICIALS,{id:'cn-emperor',npcPosition:[0,1.415,-8]}].map((station,i)=>{const root=new T.Group(),head=new T.Group();root.userData.head=head;root.userData.hands=[new T.Group(),new T.Group()];root.add(head,...root.userData.hands);root.position.set(...(i<6?chinaCourtAssemblyRoute(i).hall:station.npcPosition));return {station,root,home:new T.Vector3(...station.npcPosition),phase:0,route:[],locomotion:{walkSpeed:1.5},animate(){}};});
 const palace={dutyPlan:()=>({reachable:true,seconds:42.5}),requestDuty(){duty=true;},dutyState:()=>duty?{ready}:null,setDutyLine(){},releaseDuty(){duty=false;}};
 const getResult=state=>state.cases.find(c=>c.result)?.result;
 service=createChinaPalaceAudience({npcs:actors,palace,readEdict:()=>source,getClock:()=>({day}),
  saved:continuity?{continuity}: {reports},
  lot:{colliders:[],walkableSurfaces:[{minX:-30,maxX:30,minZ:-40,maxZ:40,y:1.415}],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},
  furniture:{items:[],facilities:createFacilityQueue()},doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({}),
  saveState(next){
   if(!service)return true;
   const projected=copy(service.snapshot()),candidate=getResult(next.reports),live=getResult(service.state().reports);
   assert.deepEqual(projected.reports,copy(next.reports),'Top-level and continuity serialize the identical reports candidate');
   if(candidate?.received&&!live?.received){
    attempts++;assert.equal(live?.reportedDay,undefined,'Live report ledger stays unconsumed until successful storage');
    const before=copy(projected);service.update(.25,0,{hour:11.6,day});assert.deepEqual(copy(service.snapshot()),before,'Save callback cannot reenter the receipt phase');
    if(mode==='false')return false;
    if(mode==='object')return {ok:false};
    if(mode==='throw')throw Error('quota');
    if(mode==='promise')return Promise.reject(Error('quota'));
    accepted++;
   }
   durable={top:copy(next),continuity:projected};return true;
  }});
 if(continuity)assert(service.restore(continuity));
 const step=(count=1,{hour=11.6,conversationActorId}={})=>{for(let i=0;i<count;i++){time+=.1;service.update(.1,time,{hour,day,conversationActorId});}};
 const until=(test,label,max=250)=>{for(let i=0;i<max&&!test();i++)step();assert(test(),label+' '+JSON.stringify(service.state()));};
 return {service,actors,step,until,getResult:()=>getResult(service.state().reports),get attempts(){return attempts;},get accepted(){return accepted;},get durable(){return copy(durable);},set mode(v){mode=v;},set ready(v){ready=v;},begin(){step(1,{hour:11.2});assert.equal(service.state().phase,'holding');step(1,{hour:11.5});until(()=>service.state().phase==='report','Original kneel/report entry');},dispose(){service.dispose({suspend:true});}};
}
function reachReceipt(f){
 f.begin();assert(f.service.state().currentReport.resultReport);assert.equal(f.getResult().reportedDay,undefined);
 f.step(59);assert.equal(f.service.state().phase,'report');assert.equal(f.getResult().reportedDay,undefined);
 const paused=copy(f.service.snapshot());f.step(60,{conversationActorId:'cn-minister-works'});
 assert.equal(f.service.state().phaseTime,paused.runtime.phaseTime);assert.equal(f.getResult().reportedDay,undefined,'Talking pause cannot consume a prepared report');
 f.until(()=>f.service.state().phase==='response','Gu actually finishes six report seconds');
 assert.equal(f.service.state().currentReport.resultDelivery.reportSeconds,6);assert.equal(f.getResult().reportedDay,undefined);
 f.step(39);assert.equal(f.service.state().phase,'response');assert.equal(f.attempts,0,'Emperor has not yet completed four response seconds');
 const imperialPause=f.service.state().phaseTime;f.step(60,{conversationActorId:'cn-emperor'});assert.equal(f.service.state().phaseTime,imperialPause);assert.equal(f.getResult().reportedDay,undefined);
 f.until(()=>f.attempts>0,'Receipt attempted only after actual emperor response');
}
for(const mode of ['false','object','throw','promise']){
 const f=fixture({mode});reachReceipt(f);
 assert.equal(f.getResult().reportedDay,undefined);assert.equal(f.getResult().received,undefined);
 assert.equal(f.service.state().phase,'response');assert.equal(f.accepted,0);
 const pending=copy(f.service.snapshot());assert.equal(pending.runtime.currentReport.resultDelivery.reportSeconds,6);assert(pending.runtime.phaseTime>=4);
 f.dispose();
 const restored=fixture({continuity:pending,mode:'accept'});
 assert.equal(restored.getResult().reportedDay,undefined);assert.equal(restored.service.state().phase,'response');
 restored.until(()=>restored.accepted===1,'Restored same result receives one atomic acknowledgement');
 const record=restored.getResult();assert.equal(record.reportedDay,1);assert(record.received);
 assert.equal(record.received.reporterId,'cn-minister-works');assert.equal(record.received.recipientId,'cn-emperor');
 assert.equal(record.received.reportSeconds,6);assert.equal(record.received.responseSeconds,4);
 const saved=restored.durable;assert.deepEqual(saved.top.reports,saved.continuity.reports);
 assert.equal(saved.continuity.runtime.phase,'response','Receipt checkpoint precedes advancement and must be replay-safe');
 restored.dispose();
 const replay=fixture({continuity:saved.continuity});replay.step(2);
 assert.equal(replay.accepted,0);assert.equal(replay.attempts,0,'Exact already-received boundary advances without saving a second receipt');
 assert.deepEqual(copy(replay.getResult()),copy(record));replay.dispose();
}
await Promise.resolve();
// Partial report and response checkpoints keep only their actual elapsed
// seconds. Reload neither consumes the result nor restarts an already heard part.
const partial=fixture();partial.begin();partial.step(20);
const reportCheckpoint=copy(partial.service.snapshot()),reportElapsed=partial.service.state().phaseTime;partial.dispose();
const resumedReport=fixture({continuity:reportCheckpoint});assert.equal(resumedReport.service.state().phase,'report');assert.equal(resumedReport.service.state().phaseTime,reportElapsed);assert.equal(resumedReport.getResult().reportedDay,undefined);
resumedReport.until(()=>resumedReport.service.state().phase==='response','Partial report resumes its remaining valid seconds');resumedReport.step(20);
const replyCheckpoint=copy(resumedReport.service.snapshot()),replyElapsed=resumedReport.service.state().phaseTime;resumedReport.dispose();
const resumedReply=fixture({continuity:replyCheckpoint});assert.equal(resumedReply.service.state().phase,'response');assert.equal(resumedReply.service.state().phaseTime,replyElapsed);assert.equal(resumedReply.getResult().reportedDay,undefined);
resumedReply.until(()=>resumedReply.accepted===1,'Partial response receives the same result only after its remaining seconds');resumedReply.dispose();

// Short readiness/body gaps below the postponement threshold contribute no
// report/response seconds. Time spent waiting cannot certify real delivery.
const gaps=fixture();gaps.begin();gaps.step(20);const reportAt=gaps.service.state().phaseTime;
gaps.ready=false;gaps.step(10);assert.equal(gaps.service.state().phaseTime,reportAt);gaps.ready=true;
gaps.actors[0].alive=false;gaps.step(5);assert.equal(gaps.service.state().phaseTime,reportAt);gaps.actors[0].alive=true;
const post=gaps.actors[0].root.position.clone();gaps.actors[0].root.position.x+=1;gaps.step(5);assert.equal(gaps.service.state().phaseTime,reportAt);gaps.actors[0].root.position.copy(post);
gaps.step(39);assert.equal(gaps.service.state().phase,'report');assert.equal(gaps.getResult().reportedDay,undefined);
gaps.until(()=>gaps.service.state().phase==='response','Six actual valid report seconds after short gaps');gaps.step(10);const replyAt=gaps.service.state().phaseTime;
gaps.ready=false;gaps.step(10);assert.equal(gaps.service.state().phaseTime,replyAt);gaps.ready=true;
gaps.step(29);assert.equal(gaps.attempts,0);gaps.until(()=>gaps.accepted===1,'Four actual valid reply seconds after short gap');gaps.dispose();

// Lost royal readiness interrupts this real ceremony. It cannot close a report
// merely because its text was prepared, and the next court can still receive it.
const interrupted=fixture();interrupted.begin();interrupted.step(5);interrupted.ready=false;interrupted.step(35);
assert.equal(interrupted.service.state().schedule.outcome,'postponed');assert.equal(interrupted.getResult().reportedDay,undefined);
const unreceived=copy(interrupted.service.state().reports);interrupted.dispose();
const next=fixture({reports:unreceived,day:2});reachReceipt(next);assert.equal(next.getResult().reportedDay,2);assert.equal(next.accepted,1);next.dispose();
console.log('PASS actual Gu6s + emperor4s receipt gate, talk/interruption pauses, atomic top/continuity candidate, save failure/reentry, cold resume and exact-once acknowledgement');
