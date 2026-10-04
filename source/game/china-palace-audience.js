import {createCourtReports} from './china-court-reports.js';
import {attachCourtOfficialCostume} from './china-court-official-costume.js';
import {createChinaOfficialLife} from './china-official-life.js';
import {CHINA_OFFICIAL_BUREAU as B} from './china-official-bureau.js';
import {canTraverse} from './navigation.js';

// Fictional adult officials retain the same seeded identities on every visit.
export const CHINA_COURT_OFFICIALS=Object.freeze([
 {id:'cn-minister-works',npcName:'顾衡 · 工部官',ageYears:47,npcPosition:B.offices[0],gender:'male',privateRoomId:B.roomIds[0],courtRole:'works',color:'#697f87'},
 {id:'cn-minister-granary',npcName:'许知远 · 仓务官',ageYears:39,npcPosition:B.offices[1],gender:'male',privateRoomId:B.roomIds[1],courtRole:'granary',color:'#90635b'}
]);
export function courtOfficialAppearance(region,id,look){
 if(region!=='china'||!CHINA_COURT_OFFICIALS.some(r=>r.id===id))return look;
 return {...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'court-official-long-robe',clothes:id==='cn-minister-works'?0x526e7b:0x814b45,accent:0xb49c65};
}
export const chinaCourtOfficialStations=()=>CHINA_COURT_OFFICIALS.map(r=>({...r,npcOnly:true,name:'承务官署 · 值宿与办公',action:'官署起居与朝议',npcAction:'court-duty',npcLabel:'在自己的案边处理来文',npcRotation:Math.PI,position:r.npcPosition.slice()}));
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.075)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const OWNER='china-morning-audience',REPORT=[0,1.415,-3.25];
const court=i=>[i?5.2:-4.6,.13,i?16.2:13.2],hall=i=>[i?2.3:-2.3,1.415,.1];
const enterHall=i=>[[i?2:-2,.13,11],[i?2:-2,1.415,6],[i?1.6:-1.6,1.415,3],hall(i)];
const departure=i=>[...enterHall(i).slice().reverse(),court(i)];

// The display clock is session-based. A saved, observed midnight advances this
// small schedule; reopening at the default 10:00 cannot invent a new court day.
export function createAudienceSchedule(saved={}){
 let day=Math.max(0,Math.floor(saved.day||0)),calledDay=Number.isInteger(saved.calledDay)?saved.calledDay:-1,lastHour=null;
 let lastCompletedDay=Number.isInteger(saved.lastCompletedDay)?saved.lastCompletedDay:saved.outcome==='completed'?calledDay:-1;
 let outcome=calledDay===day?(saved.outcome==='completed'?'completed':'interrupted'):'waiting';
 return {
  observe(hour){if(!Number.isFinite(hour))return;if(lastHour!==null&&lastHour>18&&hour<6){day++;outcome='waiting';}lastHour=hour;},
  due(hour,night=false){return !night&&hour>=6&&hour<12&&calledDay!==day;},
  call(){calledDay=day;outcome='called';},finish(value){outcome=value;if(value==='completed')lastCompletedDay=calledDay;},
  snapshot:()=>({version:1,day,calledDay,outcome,lastCompletedDay,completionId:lastCompletedDay>=0?'cn-morning-audience:'+lastCompletedDay:null})
 };
}

export function createChinaPalaceAudience({npcs,palace,lot,doors,planPath,moveActor,poseContext,furniture,worldSeed=1,readEdict=()=>null,saved={},saveState=()=>{},notify=()=>{}}){
 const officials=CHINA_COURT_OFFICIALS.map(r=>npcs.find(n=>n.station.id===r.id)),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!palace||!emperor||officials.some(n=>!n))return null;
 const owned=new Set(officials),schedule=createAudienceSchedule(saved),caps=officials.map(attachCourtOfficialCostume),tasks=new Map(),history=[],failures=[];
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let phase='waiting',time=0,phaseTime=0,disposed=false,state={},speaker=null,utterance='',reported=0,life=null,reports=null,currentReport=null;
 const tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=text;};
 const record=(event,actor)=>{history.push({event,actor:actor?.station.id||null,time:+time.toFixed(2),position:actor?.root.position.toArray()});if(history.length>64)history.shift();};
 const save=()=>saveState({...schedule.snapshot(),life:life?.snapshot()||saved.life,reports:reports?.snapshot()||saved.reports});
 function setPhase(value){phase=value;phaseTime=0;record(value);}
 function silence(){speaker=null;utterance='';palace.setDutyLine(OWNER,null);}
 function say(n,text){speaker=n;utterance=text;palace.setDutyLine(OWNER,n===emperor?text:null);tell(n,text);record('speech:'+text,n);const p=state.position;if(p&&Math.abs(p.y-n.root.position.y)<2&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<19)notify(n.station.npcName+'：'+text);}
 function task(n,id,path,label){tasks.set(n,{id,path,label,index:0,arrived:false,planned:false,stalled:0,retries:0,yieldPoint:null});n.route=[];record(id,n);}
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(state.position?[state.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function travel(n,s,dt){
  if(s.arrived)return true;
  const target=s.yieldPoint||s.path[s.index];
  if(near(n.root.position,target)){
   if(s.yieldPoint){const p=s.yieldTo?.root.position||state.position;if(p&&Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<1.1)return false;s.yieldPoint=null;s.yieldTo=null;s.planned=false;return false;}
   n.route=[];s.planned=false;s.retries=0;if(++s.index===s.path.length){s.arrived=true;record(s.id+':arrived',n);return true;}return false;
  }
  if(!s.planned){n.route=planPath(n.root.position,point(target),.25);s.planned=true;}
  const direct=near(n.root.position,target,.45)&&canTraverse(n.root.position,point(target),lot.colliders.concat(safety(n)),navigation);
  const step=direct?{waypoint:point(target)}:doors.routeStep(n.route,n.root.position,.025);
  if(!step.waiting&&step.waypoint){
   const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
   const others=npcs.filter(a=>a!==n).map(a=>({actor:a,position:a.root.position}));if(state.position)others.push({position:state.position});
   const block=others.find(({position:p})=>Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<.76&&(p.x-n.root.position.x)*dx+(p.z-n.root.position.z)*dz>.001&&Math.abs((p.x-n.root.position.x)*dz-(p.z-n.root.position.z)*dx)/Math.max(d,1e-10)<.55);
   if(block){
    // Give the existing guards, royals and player the passage. The two court
    // lanes are separate, with a checked side-step for unforeseen encounters.
    if(!s.yieldPoint&&(!owned.has(block.actor)||n.station.id>block.actor.station.id))for(const sign of[1,-1]){const aside=[n.root.position.x+sign*dz/d*.85,n.root.position.y,n.root.position.z-sign*dx/d*.85];if(canTraverse(n.root.position,point(aside),lot.colliders.concat(safety(n)),navigation)){s.yieldPoint=aside;s.yieldTo=block.actor;s.planned=false;record('yield-passage',n);break;}}
    s.stalled=0;return false;
   }
   if(d>1e-10){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-9;n.root.rotation.y=Math.atan2(dx,dz);}
  }
  s.stalled=n.walking||step.waiting?0:s.stalled+dt;if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,stage:s.id,target,position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  return false;
 }
 const allArrived=()=>officials.every(n=>tasks.get(n)?.arrived),paused=n=>!!n&&state.conversationActorId===n.station.id;
 function depart(reason){const outside=phase==='arriving';schedule.finish(reason);save();palace.releaseDuty(OWNER);silence();officials.forEach((n,i)=>task(n,'leave-court',outside?[court(i)]:departure(i),'散朝 · 回到公共庭院后自行安排'));setPhase('departing');}
 reports=createCourtReports({readEdict,saved:saved.reports,saveState:()=>save()});
 life=createChinaOfficialLife({officials,npcs,lot,furniture,doors,planPath,poseContext,travel,safety,reports,worldSeed,saved:saved.life,saveState:()=>save(),record});
 save();
 return {
  owns:n=>owned.has(n),
  socialStatus(n){return owned.has(n)?{busy:false,attention:true,job:tasks.get(n)?.label||life?.label(n)||'承务官署 · 日常起居'}:null;},
  playerRequest(id){life?.playerRequest(id);},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;life?.tick(dt,state);schedule.observe(state.hour??10);
   const duty=palace.dutyState(OWNER);
   if(phase==='waiting'&&schedule.due(state.hour??10,state.night)){
    reported=0;schedule.call();save();officials.forEach((n,i)=>{if(life)life.request(n);else task(n,'leave-office',[court(i)],'从官署出发 · 前往候朝位置');});setPhase('arriving');
   }
   const speakingPaused=paused(speaker)||state.conversationActorId===emperor.station.id;
   for(const [i,n]of officials.entries()){
    if(life&&!tasks.has(n)){life.update(n,dt,t);if(phase==='arriving'&&life.ready(n))task(n,'leave-office',[court(i)],'应召赴朝 · 从当前位置沿通道入庭');else continue;}
    n.walking=false;const s=tasks.get(n),label=s?.label||'本日朝议已毕 · 官署日常';tell(n,n===speaker?utterance:label);
    if(paused(n)){tell(n,label+' · 停步与你交谈');if(state.position)n.root.rotation.y=Math.atan2(state.position.x-n.root.position.x,state.position.z-n.root.position.z);}
    else if(s)travel(n,s,dt);
    if(s?.arrived&&!paused(n)){const facing=n===speaker?emperor.root.position:phase==='waiting'||phase==='departing'?point([0,.115,35]):point([0,1.415,-8]);n.root.rotation.y=Math.atan2(facing.x-n.root.position.x,facing.z-n.root.position.z);}
    const c=poseContext(n,null);c.handoff=n===speaker&&!paused(n)&&phase==='report';c.heldProp=null;c.seatedMeal=false;
    n.animate(t+n.phase,n.walking,n===speaker&&!paused(n)&&phase==='report'?'read':null,c);
   }
   if(speakingPaused||(['report','response','dismissal'].includes(phase)&&!duty?.ready))return;
   phaseTime+=dt;
   if(phase==='arriving'&&allArrived()){
    if(state.night||(state.hour??10)>=12){depart('interrupted');return;}
    say(officials[0],'朝议时辰已至，二臣候奏，请陛下临殿。');palace.requestDuty(OWNER);setPhase('await-emperor');
   }else if(phase==='await-emperor'&&duty?.ready){
    silence();task(officials[0],'enter-hall',enterHall(0),'闻召先行入殿 · 在侧席候奏');setPhase('entering-hall');
   }else if(phase==='entering-hall'&&tasks.get(officials[0])?.arrived&&tasks.get(officials[1])?.id!=='enter-hall'&&duty?.ready){
    task(officials[1],'enter-hall',enterHall(1),'依次入殿 · 等同僚通过后进门');
   }else if(phase==='entering-hall'&&allArrived()&&duty?.ready){
    task(officials[0],'approach-report',[REPORT],'工部进前奏报');setPhase('approaching');
   }else if(phase==='approaching'&&tasks.get(officials[reported])?.arrived&&duty?.ready){
    currentReport=reports.report(officials[reported].station.courtRole,schedule.snapshot().day);say(officials[reported],currentReport.text);setPhase('report');
   }else if(phase==='report'&&phaseTime>=6&&duty?.ready){
    if(currentReport?.issueId)reports.decide(currentReport.issueId,currentReport.action,emperor.station.id);say(emperor,currentReport?.response||'待有实据再报。');setPhase('response');
   }else if(phase==='response'&&phaseTime>=5&&duty?.ready){
    silence();task(officials[reported],'step-back',[hall(reported)],'奏毕退回侧席 · 留出进言通道');setPhase('returning-line');
   }else if(phase==='returning-line'&&tasks.get(officials[reported])?.arrived&&duty?.ready){
    if(++reported<officials.length){task(officials[reported],'approach-report',[REPORT],'仓务进前奏报');setPhase('approaching');}
    else{say(emperor,'今日朝议到此，诸位各归其职。');setPhase('dismissal');}
   }else if(phase==='dismissal'&&phaseTime>=4)depart('completed');
   else if(phase==='departing'){for(const n of officials)if(tasks.get(n)?.arrived){tasks.delete(n);life?.resume(n);record('released-to-personal-life',n);}if(!tasks.size&&!palace.dutyState(OWNER))setPhase('waiting');}
  },
  state:()=>({phase,time,phaseTime,life:life?.state()||null,reports:reports?.state()||null,currentReport,schedule:schedule.snapshot(),reported,speaker:speaker?.station.id||null,utterance,history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:officials.map(n=>({id:n.station.id,ageYears:n.station.ageYears,position:n.root.position.toArray(),stage:tasks.get(n)?.id||life?.label(n)||'waiting',waypoint:tasks.get(n)?.index||0,arrived:tasks.get(n)?.arrived||false,walking:n.walking,paused:paused(n)}))}),
  dispose(){if(disposed)return;disposed=true;if(!['waiting','departing'].includes(phase)){schedule.finish('interrupted');save();}palace.releaseDuty(OWNER);life?.dispose();for(const n of officials)n.route=[];for(const costume of caps)costume?.dispose();}
 };
}
