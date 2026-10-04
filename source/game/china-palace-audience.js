import * as THREE from 'three';
import {canTraverse} from './navigation.js';

// Fictional adult officials retain the same seeded identities on every visit.
export const CHINA_COURT_OFFICIALS=Object.freeze([
 {id:'cn-minister-works',npcName:'顾衡 · 工部官',ageYears:47,npcPosition:[-2,.115,39],courtRole:'works',color:'#697f87'},
 {id:'cn-minister-granary',npcName:'许知远 · 仓务官',ageYears:39,npcPosition:[2,.115,39],courtRole:'granary',color:'#90635b'}
]);
export function courtOfficialAppearance(region,id,look){
 if(region!=='china'||!CHINA_COURT_OFFICIALS.some(r=>r.id===id))return look;
 return {...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe',clothes:id==='cn-minister-works'?0x526e7b:0x814b45,accent:0xb49c65};
}
export const chinaCourtOfficialStations=()=>CHINA_COURT_OFFICIALS.map(r=>({...r,npcOnly:true,name:'承礼门 · 入宫候朝',action:'入宫与朝议',npcAction:'court-duty',npcLabel:'在承礼门外等候朝议',npcRotation:Math.PI,position:r.npcPosition.slice()}));
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.075)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const OWNER='china-morning-audience',REPORT=[0,1.415,-3.25];
const court=i=>[i?5:-5,.13,14],hall=i=>[i?2.3:-2.3,1.415,.1];
const entry=i=>[[i?1.8:-1.8,.115,35],[i?1.8:-1.8,.115,31],court(i)];
const enterHall=i=>[[i?2:-2,.13,11],[i?2:-2,1.415,6],[i?1.6:-1.6,1.415,3],hall(i)];
const departure=i=>[...enterHall(i).slice().reverse(),court(i),[i?1.8:-1.8,.115,31],[i?1.8:-1.8,.115,35],CHINA_COURT_OFFICIALS[i].npcPosition];

function attachOfficialCap(actor){
 const root=new THREE.Group();root.name='Original court official folded cap';actor.root.userData.head.add(root);
 const material=new THREE.MeshToonMaterial({color:0x343637}),edge=new THREE.MeshToonMaterial({color:0x8c794e});
 const add=(geometry,mat,x,y,z)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);root.add(m);return m;};
 add(new THREE.SphereGeometry(.113,12,8),material,0,.264,-.022).scale.set(1,.78,.85);
 add(new THREE.CylinderGeometry(.113,.113,.022,16),edge,0,.218,-.014).scale.z=.86;
 for(const side of[-1,1]){const wing=add(new THREE.BoxGeometry(.135,.032,.035),material,side*.159,.245,-.061);wing.rotation.z=side*.10;}
 return ()=>{root.removeFromParent();root.traverse(o=>o.geometry?.dispose());material.dispose();edge.dispose();};
}

// The display clock is session-based. A saved, observed midnight advances this
// small schedule; reopening at the default 10:00 cannot invent a new court day.
export function createAudienceSchedule(saved={}){
 let day=Math.max(0,Math.floor(saved.day||0)),calledDay=Number.isInteger(saved.calledDay)?saved.calledDay:-1,lastHour=null;
 let outcome=calledDay===day?(saved.outcome==='completed'?'completed':'interrupted'):'waiting';
 return {
  observe(hour){if(!Number.isFinite(hour))return;if(lastHour!==null&&lastHour>18&&hour<6){day++;outcome='waiting';}lastHour=hour;},
  due(hour,night=false){return !night&&hour>=6&&hour<12&&calledDay!==day;},
  call(){calledDay=day;outcome='called';},finish(value){outcome=value;},
  snapshot:()=>({version:1,day,calledDay,outcome})
 };
}

export function createChinaPalaceAudience({npcs,palace,lot,doors,planPath,moveActor,poseContext,saved={},saveState=()=>{},notify=()=>{}}){
 const officials=CHINA_COURT_OFFICIALS.map(r=>npcs.find(n=>n.station.id===r.id)),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!palace||!emperor||officials.some(n=>!n))return null;
 const owned=new Set(officials),schedule=createAudienceSchedule(saved),caps=officials.map(attachOfficialCap),tasks=new Map(),history=[],failures=[];
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let phase='waiting',time=0,phaseTime=0,disposed=false,state={},speaker=null,utterance='',reported=0;
 const tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=text;};
 const record=(event,actor)=>{history.push({event,actor:actor?.station.id||null,time:+time.toFixed(2),position:actor?.root.position.toArray()});if(history.length>64)history.shift();};
 const save=()=>saveState(schedule.snapshot());
 function setPhase(value){phase=value;phaseTime=0;record(value);}
 function say(n,text){speaker=n;utterance=text;tell(n,text);record('speech:'+text,n);const p=state.position;if(p&&Math.abs(p.y-n.root.position.y)<2&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<19)notify(n.station.npcName+'：'+text);}
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
 const allArrived=()=>officials.every(n=>tasks.get(n)?.arrived),paused=n=>state.conversationActorId===n.station.id;
 function depart(reason){schedule.finish(reason);save();palace.releaseDuty(OWNER);speaker=null;utterance='';officials.forEach((n,i)=>task(n,'leave-court',departure(i),'散朝 · 沿正门返回承礼门外'));setPhase('departing');}
 save();
 return {
  owns:n=>owned.has(n),
  socialStatus(n){return owned.has(n)?{busy:false,attention:true,job:tasks.get(n)?.label||'承礼门外等候下一场朝议'}:null;},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;schedule.observe(state.hour??10);
   const duty=palace.dutyState(OWNER);
   if(phase==='waiting'&&schedule.due(state.hour??10,state.night)){
    schedule.call();save();officials.forEach((n,i)=>task(n,'enter-gate',entry(i),'由承礼门入宫 · 前往各自候朝位置'));setPhase('arriving');
   }
   const speakingPaused=paused(speaker)||state.conversationActorId===emperor.station.id;
   for(const [i,n]of officials.entries()){
    n.walking=false;const s=tasks.get(n),label=s?.label||(schedule.snapshot().outcome==='completed'?'本日朝议已毕 · 门外待归':schedule.snapshot().outcome==='interrupted'?'本日朝议已中断 · 等待下次召集':state.night?'夜间不朝议 · 在门外等候':'未到朝议时段 · 在门外等候');tell(n,n===speaker?utterance:label);
    if(paused(n)){tell(n,label+' · 停步与你交谈');if(state.position)n.root.rotation.y=Math.atan2(state.position.x-n.root.position.x,state.position.z-n.root.position.z);}
    else if(s)travel(n,s,dt);
    if(s?.arrived&&!paused(n)){const facing=n===speaker?emperor.root.position:phase==='waiting'||phase==='departing'?point([0,.115,35]):point([0,1.415,-8]);n.root.rotation.y=Math.atan2(facing.x-n.root.position.x,facing.z-n.root.position.z);}
    const c=poseContext(n,null);c.handoff=n===speaker&&!paused(n)&&phase==='report';c.heldProp=null;c.seatedMeal=false;
    n.animate(t+n.phase,n.walking,n===speaker&&!paused(n)&&phase==='report'?'read':null,c);
   }
   if(speakingPaused)return;
   phaseTime+=dt;
   if(phase==='arriving'&&allArrived()){
    if(state.night||(state.hour??10)>=12){depart('interrupted');return;}
    say(officials[0],'朝议时辰已至，二臣候奏，请陛下临殿。');palace.requestDuty(OWNER);setPhase('await-emperor');
   }else if(phase==='await-emperor'&&duty?.ready){
    speaker=null;utterance='';officials.forEach((n,i)=>task(n,'enter-hall',enterHall(i),'闻召入殿 · 在侧席依次候奏'));setPhase('entering-hall');
   }else if(phase==='entering-hall'&&allArrived()&&duty?.ready){
    task(officials[0],'approach-report',[REPORT],'工部进前奏报');setPhase('approaching');
   }else if(phase==='approaching'&&tasks.get(officials[reported])?.arrived&&duty?.ready){
    say(officials[reported],reported?'禀陛下，仓中存粮已清点，街坊日用供应如常。':'禀陛下，宫苑雨后石阶已巡查，松动处已安排修整。');setPhase('report');
   }else if(phase==='report'&&phaseTime>=6&&duty?.ready){
    say(emperor,reported?'按册照料，留足雨天所需，勿扰街坊。':'修整时留下通行小路，照顾往来行人。');setPhase('response');
   }else if(phase==='response'&&phaseTime>=5&&duty?.ready){
    speaker=null;utterance='';task(officials[reported],'step-back',[hall(reported)],'奏毕退回侧席 · 留出进言通道');setPhase('returning-line');
   }else if(phase==='returning-line'&&tasks.get(officials[reported])?.arrived&&duty?.ready){
    if(++reported<officials.length){task(officials[reported],'approach-report',[REPORT],'仓务进前奏报');setPhase('approaching');}
    else{say(emperor,'今日朝议到此，诸位各归其职。');setPhase('dismissal');}
   }else if(phase==='dismissal'&&phaseTime>=4)depart('completed');
   else if(phase==='departing'&&allArrived()&&!palace.dutyState(OWNER)){tasks.clear();setPhase('waiting');}
  },
  state:()=>({phase,time,phaseTime,schedule:schedule.snapshot(),reported,speaker:speaker?.station.id||null,utterance,history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:officials.map(n=>({id:n.station.id,ageYears:n.station.ageYears,position:n.root.position.toArray(),stage:tasks.get(n)?.id||'waiting',waypoint:tasks.get(n)?.index||0,arrived:tasks.get(n)?.arrived||false,walking:n.walking,paused:paused(n)}))}),
  dispose(){if(disposed)return;disposed=true;if(!['waiting','departing'].includes(phase)){schedule.finish('interrupted');save();}palace.releaseDuty(OWNER);for(const n of officials)n.route=[];for(const dispose of caps)dispose();}
 };
}
