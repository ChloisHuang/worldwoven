import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {createCourtReports,formatCourtEdictText} from './china-court-reports.js';
import {attachCourtOfficialCostume} from './china-court-official-costume.js';
import {createChinaOfficialLife} from './china-official-life.js';
import {CHINA_OFFICIAL_BUREAU as B} from './china-official-bureau.js';
import {followActorRoute} from './actor-navigation.js';
import {createAudienceSchedule,courtRouteBudget,cachedCourtPlanner} from './china-court-schedule.js';
import {createCourtPosture} from './china-court-posture.js';
import {getChinaCourtOfficialRank,CHINA_OFFICIAL_RANK_CONTEXT} from './china-official-ranks.js';
export {createAudienceSchedule} from './china-court-schedule.js';

// Fictional adult officials retain the same seeded identities on every visit.
export const CHINA_COURT_OFFICIALS=Object.freeze([
 {id:'cn-minister-works',npcName:'顾衡 · 工部官',ageYears:47,npcPosition:B.offices[0],gender:'male',privateRoomId:B.roomIds[0],courtRole:'works',color:'#697f87'},
 {id:'cn-minister-granary',npcName:'许知远 · 仓务官',ageYears:39,npcPosition:B.offices[1],gender:'male',privateRoomId:B.roomIds[1],courtRole:'granary',color:'#90635b'},
 {id:'cn-official-rites',npcName:'沈叙 · 礼仪官',ageYears:46,npcPosition:B.offices[2],gender:'male',courtRole:'rites',workLabel:'整理朝仪名册 · 核对班位',color:'#667583'},
 {id:'cn-official-personnel',npcName:'陆谦 · 吏务官',ageYears:42,npcPosition:B.offices[3],gender:'male',courtRole:'personnel',workLabel:'整理署内值勤名册',color:'#72564f'},
 {id:'cn-official-justice',npcName:'周惟正 · 刑名官',ageYears:51,npcPosition:B.offices[4],gender:'male',courtRole:'justice',workLabel:'静读律例 · 未有案件不作案报',color:'#4f6962'},
 {id:'cn-official-records',npcName:'宋承简 · 文书官',ageYears:35,npcPosition:B.offices[5],gender:'male',courtRole:'records',workLabel:'抄录官署来文 · 整理案卷',color:'#78624f'}
].map(official=>{
 const rank=getChinaCourtOfficialRank(official.id);
 return Object.freeze({...official,gradeId:rank.gradeId,gradeLabel:rank.gradeLabel,gradeOrder:rank.gradeOrder,
  currentWage:rank.currentWage,automaticPromotion:rank.automaticPromotion,officialRankContext:CHINA_OFFICIAL_RANK_CONTEXT,
  npcName:official.npcName+'（'+rank.gradeLabel+'）'});
}));
export function courtOfficialAppearance(region,id,look){
 if(region!=='china'||!CHINA_COURT_OFFICIALS.some(r=>r.id===id))return look;
 return {...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'court-official-long-robe',clothes:[0x526e7b,0x814b45,0x546371,0x765049,0x476259,0x79634a][CHINA_COURT_OFFICIALS.findIndex(r=>r.id===id)],accent:0xb49c65};
}
export const chinaCourtOfficialStations=()=>CHINA_COURT_OFFICIALS.map(r=>({...r,npcOnly:true,name:'承务官署 · 值宿与办公',action:'官署起居与朝议',npcAction:'court-duty',npcLabel:'在自己的案边处理来文',npcRotation:Math.PI,position:r.npcPosition.slice()}));
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.075)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const OWNER='china-morning-audience',FORMAL=new Set(['kneeling','report','response','dismissal','rising']);
// Two longitudinal ranks leave the central imperial approach unobstructed.
const side=i=>i%2?1:-1,rank=i=>Math.floor(i/2);
const court=i=>[side(i)*(4.6+rank(i)*1.1),.13,13.2+rank(i)*1.35];
const hall=i=>[side(i)*2.35,1.415,-2.1+rank(i)*1.75];
const enterHall=i=>[[side(i)*2,.13,11],[side(i)*2,1.415,6],[side(i)*2.35,1.415,3],hall(i)];
const departure=i=>[...enterHall(i).slice().reverse(),court(i)];
export const chinaCourtAssemblyRoute=i=>({court:court(i),hall:hall(i),entry:enterHall(i)});

export function chinaCourtStatusSummary(schedule,phase='waiting'){
 const name=id=>CHINA_COURT_OFFICIALS.find(n=>n.id===id)?.npcName||(id==='cn-emperor'?'景珩 · 皇帝':id),day='第'+(schedule.day+1)+'日';
 if(schedule.calledDay===schedule.day&&schedule.outcome==='postponed'){
  const e=schedule.exception||{},details=[];
  if(Array.isArray(e.absent))details.push(e.absent.length?'当时未到班位：'+e.absent.map(name).join('、'):'当时官员均已到班位');
  if(typeof e.emperorReady==='boolean')details.push(e.emperorReady?'御驾当时已就位':'御驾当时未就位');
  if(e.conversations?.length)details.push('当时交谈未结束：'+e.conversations.map(name).join('、'));
  return day+'11:30朝会延期。'+(details.length?details.join('；')+'。':'旧记录未保存具体未到人员。')+'诸官今日各归其职，明日11:30再赴班。';
 }
 if(schedule.calledDay===schedule.day&&schedule.outcome==='interrupted')return day+(schedule.lastStartedDay===schedule.day?'朝会开场后已中断，本日不重开；明日再赴班。':'朝会已中断；若尚未到11:30会重新召集，否则明日再赴班。');
 if(schedule.calledDay===schedule.day&&schedule.outcome==='completed')return day+'朝会已完成，诸官各归其职。下次朝会在明日11:30。';
 if(schedule.calledDay===schedule.day&&schedule.outcome==='missed')return day+'11:30朝会已错过。下次朝会在明日11:30。';
 if(FORMAL.has(phase))return day+(schedule.startedAt<schedule.courtStart?'朝班齐集，朝会已提前开始。':'朝会正在举行。')+'诸官依班跪奏。';
 return day+'朝会最迟11:30按原到场规则办理，齐班可提前开朝。'+(phase==='holding'?'官员已到班位，持笏候齐。':phase==='assembling'?'官员正从各自所在处赴班。':'官员按各自实际路程提前赴班。');
}

export function createChinaPalaceAudience({npcs,palace,lot,doors,planPath,moveActor,poseContext,furniture,economy=null,sharedNeeds=null,getTavern=()=>null,getClock=()=>({day:0}),worldSeed=1,readEdict=()=>null,reissueEdict=()=>false,saved={},saveState=()=>{},beginInteraction=()=>null,onInteraction=()=>{},notify=()=>{},canStartEarly=()=>true}){
 if(saved.continuity?.version===1)saved={...saved,...saved.continuity.schedule,life:saved.continuity.life,reports:saved.continuity.reports,preservePhysical:true};
 const officials=CHINA_COURT_OFFICIALS.map(r=>npcs.find(n=>n.station.id===r.id)),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!palace||!emperor||officials.some(n=>!n))return null;
 let schedule=createAudienceSchedule(saved);
 const owned=new Set(officials),caps=officials.map(attachCourtOfficialCostume),tasks=new Map(),postures=officials.map(n=>n.root.userData.body?createCourtPosture(n):null),history=[],failures=[];
 const planBudgetPath=cachedCourtPlanner(planPath);
 let phase='waiting',time=0,phaseTime=0,disposed=false,state={},speaker=null,utterance='',reported=0,life=null,reports=null,currentReport=null,budget=null,nextBudgetAt=0,exception=saved.exception||null,disruption=0,departureReason=null,interruptedToday=false,interruptionNotified=false,postponementNotified=false;
 const interruptedLabel='今日朝会已中断 · 明日11:30再赴班';
 const tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=formatCourtEdictText(text);};
 const record=(event,actor)=>{history.push({event,actor:actor?.station.id||null,time:+time.toFixed(2),position:actor?.root.position.toArray()});if(history.length>64)history.shift();};
 const save=()=>saveState({...schedule.snapshot(),life:life?.snapshot()||saved.life,reports:reports?.snapshot()||saved.reports});
 function setPhase(value){phase=value;phaseTime=0;record(value);}
 function silence(){speaker=null;utterance='';palace.setDutyLine(OWNER,null);}
 function say(n,text){text=formatCourtEdictText(text);speaker=n;utterance=text;palace.setDutyLine(OWNER,n===emperor?text:null);tell(n,text);record('speech:'+text,n);const p=state.position;if(p&&Math.abs(p.y-n.root.position.y)<2&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<19)notify(n.station.npcName+'：'+text);}
 function task(n,id,path,label){tasks.set(n,{id,path,label,index:0,arrived:false,planned:false,stalled:0,retries:0});n.route=[];record(id,n);}
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(state.position?[state.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function travel(n,s,dt){
  if(s.arrived)return true;
  const target=s.path[s.index];
  if(near(n.root.position,target)){
   n.route=[];s.planned=false;s.retries=0;if(++s.index===s.path.length){s.arrived=true;record(s.id+':arrived',n);return true;}return false;
  }
  if(!s.planned){n.route=planPath(n.root.position,point(target),.25);s.planned=true;}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:state.position,speedScale:.78});
  s.travel={waiting:!!step.waiting,blocked:!!step.blocked,body:step.body||null};
  s.stalled=n.walking||step.waiting?0:s.stalled+dt;if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,stage:s.id,target,position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  return false;
 }
 // The palace owner verifies its actual mounted anchor, not just a duty flag.
 const emperorInPlace=duty=>!!duty?.ready&&duty.owner===OWNER&&duty.mounted==='china-furniture-throne';
 const allInLine=()=>officials.every((n,i)=>tasks.get(n)?.id==='enter-hall'&&tasks.get(n).arrived&&!n.walking&&near(n.root.position,hall(i))),paused=n=>!!n&&state.conversationActorId===n.station.id;
 function routeBudgets(){
  const actors=officials.map((n,i)=>{const exit=life?.courtPlan(n)||{reachable:true,position:n.root.position,path:[],safeExitSeconds:0,doorSeconds:4};return {actor:n.station.id,...(exit.reachable?courtRouteBudget({...exit,path:near(exit.position,hall(i))?[]:[...exit.path,court(i),...enterHall(i)],walkSpeed:n.locomotion.walkSpeed,planPath:planBudgetPath,doorways:lot.doorways}):{reachable:false,seconds:Infinity,reason:'safe-exit-blocked'})};});
  const royal=palace.dutyPlan?.(OWNER)||{reachable:false,seconds:Infinity,reason:'royal-route-unavailable'};
  actors.push({actor:emperor.station.id,...royal});return {actors,seconds:Math.max(...actors.map(a=>a.seconds)),measuredAt:time};
 }
 function depart(reason){
  departureReason=reason;schedule.finish(reason,exception);if(reason==='completed')life?.courtCompleted(schedule.snapshot().day);palace.releaseDuty(OWNER);silence();
  officials.forEach((n,i)=>{postures[i]?.stop();const s=tasks.get(n);if(s?.id==='enter-hall'&&s.arrived)task(n,'wait-dismissal',[n.root.position.toArray()],'散朝 · 在班位等前方通道腾出');else{tasks.delete(n);if(s)life?.resume(n);else life?.cancelCourt(n);record('released-to-personal-life',n);}});setPhase('departing');save();
 }
 function postpone(reason){
  const absent=officials.filter(n=>!(tasks.get(n)?.id==='enter-hall'&&tasks.get(n).arrived)),duty=palace.dutyState(OWNER),royal=palace.state?.(),remaining=palace.dutyPlan?.(OWNER),conversations=[...officials,emperor].filter(paused);
  const progress=n=>{const task=tasks.get(n),door=doors?.getRouteState?.(n.route);return {id:n.station.id,position:n.root.position.toArray(),stage:task?.id||life?.label(n)||null,waypoint:task?.index??null,target:task?.path[task.index]?.slice()||null,arrived:!!task?.arrived,paused:paused(n),walking:n.walking,routeRemaining:n.route.length,nextRoutePoint:n.route[0]?[n.route[0].x,n.route[0].y,n.route[0].z]:null,travel:task?.travel?{...task.travel}:null,door:door?{phase:door.phase,doorId:door.doorId,target:door.target,waitPoint:door.waitPoint}:null};};
  // Capture before depart replaces the live tasks. This exact failed boundary
  // survives reload; the message distinguishes missing officials from御驾.
  exception={reason,atHour:state.hour??10,courtStart:schedule.snapshot().courtStart,worldSeed,absent:absent.map(n=>n.station.id),emperorReady:!!duty?.ready,conversations:conversations.map(n=>n.station.id),actors:officials.map(progress),emperor:{...progress(emperor),owner:royal?.duty?.owner||null,duty:duty?{...duty}:null,life:royal?.actors?.find(n=>n.id===emperor.station.id)||null,remainingSeconds:Number.isFinite(remaining?.seconds)?remaining.seconds:null,routeReachable:remaining?.reachable??null,routeReason:remaining?.reason||null},calledAt:schedule.snapshot().calledAt,leadSeconds:schedule.snapshot().leadSeconds};
  const detail=[absent.length?'未到班位：'+absent.map(n=>n.station.npcName).join('、'):null,!duty?.ready?'御驾尚未就位':null,conversations.length?'交谈未结束：'+conversations.map(n=>n.station.npcName).join('、'):null].filter(Boolean).join('；');
  record('court-postponed:'+reason);postponementNotified=true;notify('11:30 朝会延期：'+(detail||'现场通路或职责受到阻断')+'。诸官今日各归其职。');depart('postponed');
 }
 function admit(){for(let lane=0;lane<2;lane++){const row=officials.map((n,i)=>({n,i})).filter(a=>a.i%2===lane);const next=row.find(({n})=>tasks.get(n)?.id!=='enter-hall'||!tasks.get(n).arrived);if(next&&tasks.get(next.n)?.id==='to-court'&&tasks.get(next.n).arrived)task(next.n,'enter-hall',enterHall(next.i),'朝前入班 · 到既定班位候齐');}}
 function beginReport(){const n=officials[reported];currentReport=reports.report(n.station.courtRole,schedule.snapshot().day);say(n,currentReport.text);setPhase('report');}
 function repairRestoredPhase(){
  // Older boundary saves wrote the new schedule before the matching runtime
  // phase. Resume that same transition without moving anyone or replaying a
  // completed ceremony. A stored opening still belongs to this one day's court.
  const outcome=schedule.snapshot().outcome;
  if(outcome==='called'&&phase==='waiting'){setPhase('assembling');for(const n of officials)if(!tasks.has(n))life?.request(n);palace.requestDuty(OWNER);}
  else if(outcome==='in-session'&&phase==='holding'&&allInLine())setPhase('kneeling');
  else if(['completed','postponed','missed'].includes(outcome)&&(['assembling','holding'].includes(phase)||FORMAL.has(phase)))depart(outcome);
 }
 reports=createCourtReports({readEdict,reissueEdict,saved:saved.reports,saveState:()=>save()});
 life=createChinaOfficialLife({officials,npcs,lot,furniture,doors,planPath,poseContext,travel,safety,reports,economy,sharedNeeds,getTavern,getClock,worldSeed,saved:saved.life,saveState:()=>save(),beginInteraction,onInteraction,record});
 save();
 return {
  courtStatus:()=>({phase,schedule:schedule.snapshot()}),
  mountForActor:n=>life?.mountForActor(n)||null,
  owns:n=>owned.has(n),
  summary:()=>chinaCourtStatusSummary(schedule.snapshot(),phase),
  labelVisible(n,player){return !owned.has(n)||!FORMAL.has(phase)&&phase!=='holding'||n===speaker||!!player&&n.root.position.distanceTo(player)<1.8;},
  socialProfile:id=>life?.socialProfile(id),
  socialStatus(n){return owned.has(n)?{busy:FORMAL.has(phase)||['assembling','holding'].includes(phase)||!!life?.socialBusy(n.station.id),canPause:!!life?.socialCanPause(n),attention:!FORMAL.has(phase)&&!['assembling','holding'].includes(phase),job:interruptedToday?interruptedLabel:tasks.get(n)?.label||life?.label(n)||'承务官署 · 日常起居'}:null;},
  meetingAvailable:n=>owned.has(n)&&!FORMAL.has(phase)&&!['assembling','holding','departing'].includes(phase)&&!tasks.has(n)&&!!life?.meetingAvailable(n),
  playerRequest(id){life?.playerRequest(id);},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;life?.tick(dt,state);const hour=state.hour??10;schedule.observe(hour,state.day);
   interruptedToday=phase==='waiting'&&schedule.snapshot().outcome==='interrupted'&&(hour>=schedule.snapshot().courtStart||schedule.snapshot().lastStartedDay===schedule.snapshot().day);
   if(interruptedToday&&!interruptionNotified){interruptionNotified=true;record('court-interrupted-on-reentry');notify('今日11:30朝会已中断，诸官继续各自事务；下次朝会在明日11:30。');}
   if(phase==='waiting'&&schedule.snapshot().outcome==='postponed'&&!postponementNotified){postponementNotified=true;notify(chinaCourtStatusSummary(schedule.snapshot(),phase));}
   if(phase==='waiting'&&schedule.snapshot().outcome==='completed'&&reports.hasPending())setPhase('followup');
   if(phase==='waiting'&&schedule.snapshot().calledDay!==schedule.snapshot().day){
    if(schedule.missed(hour)){schedule.finish('missed',{reason:'entered-after-court-start',atHour:hour});save();record('court-missed');}
    else{
     if(time>=nextBudgetAt){budget=routeBudgets();nextBudgetAt=time+8;}
     if(budget&&schedule.due(hour,state.night,budget.seconds)){
      reported=0;exception=null;schedule.call(hour,budget.seconds);setPhase('assembling');officials.forEach((n,i)=>{if(life)life.request(n);else task(n,'to-court',[court(i)],'共同召集 · 11:30前到班');});palace.requestDuty(OWNER);save();notify('承务官署朝前召集：最迟11:30办理缩略朝会，御驾与诸官齐至可提前开朝。');
     }
    }
   }
   const duty=palace.dutyState(OWNER),speakingPaused=paused(speaker)||state.conversationActorId===emperor.station.id;
   for(const [i,n]of officials.entries()){
    if(life&&!tasks.has(n)){life.update(n,dt,t);if(phase==='assembling'&&life.ready(n)){const exit=life.courtPlan(n);if(near(n.root.position,hall(i))){task(n,'enter-hall',[hall(i)],'已在班位 · 持笏候齐');tasks.get(n).arrived=true;}else task(n,'to-court',[...exit.path,court(i)],'共同召集 · 从当前位置提前赴班');}else{postures[i]?.stop();if(interruptedToday)tell(n,life.label(n)+' · '+interruptedLabel);continue;}}
    n.walking=false;const s=tasks.get(n),label=s?.label||(interruptedToday?interruptedLabel:'承务官署 · 日常起居');tell(n,n===speaker?utterance:label);
    if(paused(n)&&!FORMAL.has(phase))tell(n,label+' · 交谈尚未结束');
    else if(s&&!FORMAL.has(phase))travel(n,s,dt);
    if(s?.arrived&&!n.walking)n.root.rotation.y=Math.PI;
    const c=poseContext(n,null);c.handoff=false;c.heldProp=null;c.seatedMeal=false;n.animate(t+n.phase,n.walking,null,c);
    const kneeling=phase==='kneeling'?Math.min(1,(phaseTime+dt)/1.8):phase==='rising'?Math.max(0,1-(phaseTime+dt)/1.8):['report','response','dismissal'].includes(phase)?1:0;
    postures[i]?.apply({kneeling,holding:phase==='holding'||tasks.get(n)?.id==='enter-hall'&&tasks.get(n).arrived,raised:n===speaker&&phase==='report'?1:.20+(i%3)*.07,time:t,phase:n.phase});
   }
   phaseTime+=dt;
   if(['assembling','holding'].includes(phase)){
    admit();if(allInLine()&&phase!=='holding')setPhase('holding');
    const assembled=allInLine()&&emperorInPlace(duty)&&!officials.some(paused)&&!speakingPaused;
    if(schedule.atStart(hour)||assembled&&canStartEarly()){
     if(!assembled){postpone('assembly-incomplete');return;}
     const prior=schedule.snapshot(),priorPhase=phase,priorTime=phaseTime,priorHistory=history.slice();
     if(!schedule.start(hour,{assembled}))return;
     setPhase('kneeling');
     // Commit the same day's opening and matching physical phase before its
     // first announcement/report. A failed write may retry, never give credit.
     let stored;try{stored=save();}catch{stored=false;}
     if(stored===false||stored?.ok===false||stored&&typeof stored.then==='function'){
      if(stored&&typeof stored.then==='function')Promise.resolve(stored).catch(()=>{});
      schedule=createAudienceSchedule({...prior,preservePhysical:true});phase=priorPhase;phaseTime=priorTime;history.splice(0,history.length,...priorHistory);return;
     }
     say(emperor,hour<prior.courtStart?'御驾与诸官已齐，提前行礼，依班奏事。':'时辰已到，诸官行礼，依班奏事。');
    }
   }else if(FORMAL.has(phase)){
    disruption=(!duty?.ready||speakingPaused||officials.some(paused))?disruption+dt:0;
    if(disruption>=3){postpone('ceremony-obstructed');return;}
    if(disruption>0)return;
    if(phase==='kneeling'&&phaseTime>=1.8){silence();beginReport();}
    else if(phase==='report'&&phaseTime>=6){if(currentReport?.issueId)reports.decide(currentReport.issueId,currentReport.action,emperor.station.id);say(emperor,currentReport?.response||'待有实据再报。');setPhase('response');}
    else if(phase==='response'&&phaseTime>=4){silence();if(++reported<Math.min(2,officials.length))beginReport();else{say(emperor,'今日奏事毕，诸官起身，依班退朝，各归其职。');setPhase('dismissal');}}
    else if(phase==='dismissal'&&phaseTime>=3){silence();setPhase('rising');}
    else if(phase==='rising'&&phaseTime>=1.8)depart('completed');
   }else if(phase==='departing'){
    for(let lane=0;lane<2;lane++){const row=officials.map((n,i)=>({n,i})).filter(a=>a.i%2===lane).reverse(),next=row.find(({n})=>tasks.has(n));if(next&&tasks.get(next.n)?.id==='wait-dismissal')task(next.n,'leave-court',departure(next.i),'依班退朝 · 回到公共庭院再自行安排');}
    for(const n of officials)if(tasks.get(n)?.id==='leave-court'&&tasks.get(n).arrived){tasks.delete(n);life?.resume(n);record('released-to-personal-life',n);}
    if(!tasks.size&&!palace.dutyState(OWNER))setPhase(reports.hasPending()?'followup':'waiting');
   }else if(phase==='followup'&&!reports.hasPending())setPhase('waiting');
  },
  snapshot:()=>({version:1,schedule:schedule.snapshot(),life:life?.snapshot(),reports:reports?.snapshot(),runtime:captureWorldRuntime({phase,time,phaseTime,speakerId:speaker?.station.id||null,utterance,reported,currentReport,nextBudgetAt,exception,disruption,departureReason,interruptedToday,interruptionNotified,postponementNotified,history,tasks:[...tasks].map(([n,s])=>[n.station.id,s])})}),
  restore(snapshot){if(snapshot?.version!==1)return false;const s=restoreWorldRuntime(snapshot.runtime,{npcs,furniture});if(!s||!['waiting','assembling','holding','kneeling','report','response','dismissal','rising','departing','followup'].includes(s.phase))return false;phase=s.phase;time=Math.max(0,s.time||0);phaseTime=Math.max(0,s.phaseTime||0);speaker=npcs.find(n=>n.station.id===s.speakerId)||null;utterance=formatCourtEdictText(s.utterance)||'';reported=Math.max(0,s.reported||0);currentReport=s.currentReport?{...s.currentReport,text:formatCourtEdictText(s.currentReport.text),response:formatCourtEdictText(s.currentReport.response)}:null;nextBudgetAt=Math.max(time,s.nextBudgetAt||0);exception=s.exception;disruption=Math.max(0,s.disruption||0);departureReason=s.departureReason;interruptedToday=!!s.interruptedToday;interruptionNotified=!!s.interruptionNotified;postponementNotified=!!s.postponementNotified;history.splice(0,history.length,...(s.history||[]));tasks.clear();for(const[id,t]of s.tasks||[]){const n=officials.find(n=>n.station.id===id);if(n){tasks.set(n,{...t,planned:false,stalled:0});n.route=[];}}life?.restore(snapshot.life);repairRestoredPhase();if(speaker===emperor)palace.setDutyLine(OWNER,utterance);return true;},
  state:()=>({phase,time,phaseTime,budget,exception,departureReason,life:life?.state()||null,reports:reports?.state()||null,currentReport,schedule:schedule.snapshot(),reported,speaker:speaker?.station.id||null,utterance,history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:officials.map(n=>({id:n.station.id,ageYears:n.station.ageYears,position:n.root.position.toArray(),stage:tasks.get(n)?.id||life?.label(n)||'waiting',waypoint:tasks.get(n)?.index||0,arrived:tasks.get(n)?.arrived||false,walking:n.walking,paused:paused(n)}))}),
  dispose({suspend=false}={}){if(disposed)return;disposed=true;if(!suspend&&!['waiting','departing','followup'].includes(phase)){schedule.finish('interrupted');save();}if(!suspend)palace.releaseDuty(OWNER);life?.dispose({suspend});for(const n of officials)n.route=[];for(const p of postures)p?.dispose();for(const costume of caps)costume?.dispose();}
 };
}
