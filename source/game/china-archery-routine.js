import {continuityCopy} from './world-continuity.js';
import * as G from './geometry.js';
import {attachJinyiCostume} from './jinyi-costume.js';
import {CHINA_GUARD_ROUTES} from './china-guard-routes.js';
import {CHINA_ARCHERY as A,buildPracticeBow,buildPracticeArrow} from './china-archery-court.js';
const {THREE}=G,point=a=>({x:a[0],y:a[1],z:a[2]}),gap=(p,a)=>Math.hypot(p.x-a[0],p.z-a[2]);
const labels={fetch:'在弓架取弓',line:'持弓走向金线',aim:'定步 · 引弓 · 瞄准',flight:'放箭 · 保持站位',cease:'收弓停射 · 确认箭已落靶',retrieve:'停射后沿靶道取箭',collect:'从草靶取回练习箭',return:'持弓返回金线',rack:'归还弓箭',relief:'射圃留守 · 等巡查同伴归来',handover:'当面交班 · 互报巡查与弓箭情况',release:'留步让行 · 同伴出圃后取弓', 'player-take':'接过练习弓','player-aim':'定步引弓 · 瞄准草靶','player-flight':'放箭 · 保持站位','player-cease':'收弓停射 · 练习完成'};

// Keep the two visible guards and their physical, staged range handoff.
const HANDOFF=[[-17.65,A.floorY,18.45],[-17.65,A.floorY,19.8]];

function makeKit(parent){
 const bow=buildPracticeBow(G),nocked=buildPracticeArrow(G);parent.add(bow.group,nocked);bow.group.visible=nocked.visible=false;
 const left=new THREE.Vector3(),right=new THREE.Vector3(),local=new THREE.Vector3(),dir=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1);
 return {bow:bow.group,nocked,update(actor,pose,target){
  const shown=!!pose?.held;bow.group.visible=shown;nocked.visible=shown&&!!pose.nocked;if(!shown)return;
  actor.root.updateMatrixWorld(true);actor.root.userData.hands[0].getWorldPosition(left);actor.root.userData.hands[1].getWorldPosition(right);
  bow.group.position.copy(left);bow.group.rotation.set(0,actor.root.rotation.y,0);bow.group.updateMatrixWorld(true);
  local.copy(right);bow.group.worldToLocal(local);const attr=bow.string.geometry.attributes.position;attr.setXYZ(1,...(pose.nocked?[local.x,local.y,local.z]:[0,0,-.08]));attr.needsUpdate=true;bow.string.geometry.computeBoundingSphere();
  if(pose.nocked){dir.set(...target).sub(right).normalize();nocked.quaternion.setFromUnitVectors(forward,dir);nocked.position.copy(right).addScaledVector(dir,.29);}
 },hide(){bow.group.visible=nocked.visible=false;},dispose(){for(const q of[bow.group,nocked]){q.removeFromParent();q.traverse(o=>o.geometry?.dispose());}bow.string.material.dispose();}};
}

// All routines use the existing path planner and movement/collision function.
// Only one bow may fire; a visible cease-fire precedes every retrieval.
export function createChinaArcheryRoutine({npcs,lot,planPath,moveActor,poseContext}){
 const guards=A.roles.map(id=>npcs.find(n=>n.station.id===id));if(guards.some(n=>!n)||!lot.archery)return null;
 const owned=new Set(guards),kits=new Map(guards.map(n=>[n,makeKit(lot.group)]));const costumes=guards.map(attachJinyiCostume);
 const flying=buildPracticeArrow(G);flying.visible=false;lot.group.add(flying);
 const impacts=A.targets.map(()=>{const q=buildPracticeArrow(G);q.visible=false;lot.group.add(q);return q;});
 const shots=[],history=[],failures=[],forward=new THREE.Vector3(0,0,1),start=new THREE.Vector3(),end=new THREE.Vector3();
 let active=0,phase='handover',phaseTime=0,rounds=0,retrieveLane=0,player=null,playerKit=null,request=false,complete=false,playerShot=false,flightTime=0,flightLane=0,blocked=false,disposed=false,shiftPending=false,handoffs=0,conversationActorId=null;
 const patrol=new Map(guards.map((n,i)=>[n,{routeId:i?'west':'east',stage:'ready',index:0,time:0,paused:false,yielding:false,visited:[]}]));
 const shooter=()=>guards[active],tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=text;};
 function resetTravel(n){n.route=[];n.archeryDestination=null;n.archeryStall=0;}
 function enter(next){phase=next;phaseTime=0;resetTravel(shooter());history.push(next);if(history.length>64)history.shift();tell(shooter(),labels[next]||next);}
 function travel(n,to,dt){
  n.walking=false;if(gap(n.root.position,to)<.055)return true;
  const key=to.join(',');if(n.archeryDestination!==key){n.route=planPath(n.root.position,point(to),.25);n.archeryDestination=key;}
  while(n.route.length&&gap(n.root.position,[n.route[0].x,n.route[0].y,n.route[0].z])<.05)n.route.shift();
  const next=n.route[0];if(!next){if(n.archeryStall++===0)failures.push({phase,actor:n.station.id,reason:'route did not reach authored point'});return false;}
  const dx=next.x-n.root.position.x,dz=next.z-n.root.position.z,d=Math.hypot(dx,dz),before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);
  moveActor(n,dx/d*amount,dz/d*amount,.25);n.root.rotation.y=Math.atan2(dx,dz);n.walking=before.distanceToSquared(n.root.position)>1e-9;
  if(!n.walking){n.archeryStall+=dt;if(n.archeryStall>2){n.archeryDestination=null;n.archeryStall=0;}}else n.archeryStall=0;
  return gap(n.root.position,to)<.055;
 }
 function beginPatrol(n){const p=patrol.get(n);Object.assign(p,{stage:'travel',index:0,time:0,paused:false,yielding:false,visited:[]});resetTravel(n);}
 function patrolLabel(n){const p=patrol.get(n);return p.stage==='ready'?'巡查完毕 · 在射圃候交班':CHINA_GUARD_ROUTES[p.routeId][p.index].label;}
 function updatePatrol(n,dt,position){
  const p=patrol.get(n);p.paused=conversationActorId===n.station.id&&phase!=='handover';p.yielding=false;
  if(p.paused){tell(n,patrolLabel(n)+' · 稍停交谈');if(position)n.root.rotation.y=Math.atan2(position.x-n.root.position.x,position.z-n.root.position.z);return;}
  if(p.stage==='ready'){tell(n,'巡查完毕 · 在射圃候交班');travel(n,HANDOFF[guards.indexOf(n)],dt);return;}
  const route=CHINA_GUARD_ROUTES[p.routeId],stop=route[p.index];tell(n,stop.label);
  // A person met in a narrow public lane gets space to pass. Keep the same
  // route/checkpoint so a short stop never skips a hidden corner or a shift.
  if(p.stage==='travel'&&position&&Math.abs(position.y-n.root.position.y)<1.5){
   const dx=position.x-n.root.position.x,dz=position.z-n.root.position.z,next=n.route[0]||point(stop.at),tx=next.x-n.root.position.x,tz=next.z-n.root.position.z;
   if(Math.hypot(dx,dz)<1.05&&dx*tx+dz*tz>-.02){p.yielding=true;tell(n,stop.label+' · 留步让行');return;}
  }
  if(p.stage==='travel'&&travel(n,stop.at,dt)){p.stage='observe';p.time=0;}
  if(p.stage==='observe'){
   if(stop.look)n.root.rotation.y=Math.atan2(stop.look[0]-n.root.position.x,stop.look[1]-n.root.position.z);
   p.time+=dt;if(p.time>=(stop.hold||0)){p.visited.push(stop.id);p.time=0;p.index++;if(p.index===route.length){p.stage='ready';p.index=0;}else p.stage='travel';}
  }
 }
 function socialStatus(n){
  if(!owned.has(n))return null;
  if(n!==shooter()&&phase!=='handover')return {busy:false,attention:true,job:patrolLabel(n)};
  return {busy:true,attention:phase==='relief',job:phase==='handover'?'当面交接巡查和射圃值守':phase==='relief'?'射圃留守，等巡查同伴归来':'照看射场和弓箭，请先留在靶道外'};
 }
 function clearRange(position){
  const inside=p=>p&&p.x<A.range.maxX+.30&&p.x>A.range.minX-.30&&p.z>A.range.minZ-.30&&p.z<A.range.maxZ+.30&&Math.abs(p.y-A.floorY)<2;
  return !inside(position)&&!npcs.some(n=>!owned.has(n)&&inside(n.root.position));
 }
 const hold={held:true,nocked:false,hands:[[-.24,1.04,.21],[.27,.96,.07]]};
 function poseFor(stage,time){
  if(stage==='fetch'&&time<.5)return null;
  if(stage==='collect')return {held:true,nocked:false,hands:[[-.24,1.04,.21],[-.10,1.34,.48]]};
  if(stage==='aim'||stage==='player-aim'){const f=Math.min(1,time/1.1);return {held:true,nocked:true,hands:[[-.17,1.08+.27*f,.21+.23*f],[-.12,1.08+.29*f,.25-.19*f]]};}
  if(stage==='flight'||stage==='player-flight')return {held:true,nocked:false,hands:[[-.17,1.35,.44],[.13,1.38,-.04]]};
  return ['fetch','line','cease','retrieve','collect','return','rack','player-take','player-cease'].includes(stage)?hold:null;
 }
 function launch(actor,lane){
  const kit=actor===player?playerKit:kits.get(actor);kit?.update(actor,poseFor('aim',2.2),A.targets[lane]);
  start.copy(kit.nocked.position);end.set(...A.targets[lane]);end.x+=.16;flightTime=0;flightLane=lane;flying.position.copy(start);flying.quaternion.setFromUnitVectors(forward,end.clone().sub(start).normalize());flying.visible=true;
  shots.push({actor:actor===player?'player':actor.station.id,lane,from:start.toArray(),to:end.toArray(),rangeClear:true});if(shots.length>12)shots.shift();
 }
 function updateFlight(dt){if(!flying.visible)return;flightTime+=dt;const f=Math.min(1,flightTime/.55);flying.position.copy(start).lerp(end,f);flying.position.y+=Math.sin(Math.PI*f)*.055;if(f===1){flying.visible=false;const q=impacts[flightLane];q.visible=true;q.position.copy(end);q.quaternion.copy(flying.quaternion);}}
 function animateGuard(n,t){
  let pose=n===shooter()&&!phase.startsWith('player-')?poseFor(phase,phaseTime):null;if(n===shooter()&&blocked&&['aim','flight'].includes(phase))pose=hold;
  if(phase==='handover'&&phaseTime>0){const f=Math.sin(Math.min(1,phaseTime/2.4)*Math.PI);pose={held:false,hands:[[-.30+.20*f,.96+.23*f,.10+.16*f],[.30-.20*f,.96+.20*f,.10+.20*f]]};}
  if(!n.walking&&pose&&['aim','flight','cease'].includes(phase))n.root.rotation.y=-Math.PI/2;
  const c=poseContext(n,null);c.archery=pose;n.animate(t+n.phase,n.walking,null,c);kits.get(n).update(n,pose,A.targets[retrieveLane]);
 }
 enter('handover');
 return {
  owns:n=>owned.has(n),ownsStation:id=>A.roles.includes(id),socialStatus,
  startPlayer(actor){if(player!==actor){playerKit?.dispose();playerKit=makeKit(lot.group);player=actor;}request=true;complete=false;playerShot=false;},
  stopPlayer(){request=false;complete=false;playerKit?.hide();if(phase.startsWith('player-')){retrieveLane=playerShot?1:0;enter(playerShot?'cease':'relief');}player=null;},
  playerPose(){return request&&phase.startsWith('player-')?poseFor(phase,phaseTime):null;},
  syncPlayer(){if(player)playerKit?.update(player,this.playerPose(),A.targets[1]);},
  playerStatus(){return request?{complete,label:blocked?'前方有人 · 收弓停射':phase.startsWith('player-')?labels[phase]:'等待本轮停射取箭，再接过练习弓',progress:phase==='player-take'?.1:phase==='player-aim'?.2+Math.min(1,phaseTime/2.8)*.45:phase==='player-flight'?.78:phase==='player-cease'?1:0}:null;},
  update(dt,t,{position,conversationActorId:talking=null}={}){
   if(disposed)return;conversationActorId=talking;updateFlight(dt);blocked=!clearRange(position);for(const n of guards)n.walking=false;
   const n=shooter(),other=guards[1-active];
   // Range phases never reset the partner's route or observation timer.
   // A talk can delay relief, but may not hand the absent guard a new shift.
   updatePatrol(other,dt,position);
   const timed=()=>{phaseTime+=dt;};
   if(phase==='handover'){
    const here=travel(n,HANDOFF[active],dt),there=patrol.get(other).stage==='ready'&&gap(other.root.position,HANDOFF[1-active])<.065;
    if(here&&there){
     for(const actor of guards){const partner=actor===n?other:n;actor.root.rotation.y=Math.atan2(partner.root.position.x-actor.root.position.x,partner.root.position.z-actor.root.position.z);tell(actor,rounds?'当面交班 · 门廊、殿前与侧巷已巡，弓箭已归架':'当面分值 · 一人巡查，一人照看射圃');}
     timed();if(phaseTime>2.4){if(request)enter('player-take');else{if(shiftPending){active=1-active;handoffs++;shiftPending=false;}beginPatrol(guards[1-active]);retrieveLane=0;enter('release');}}
    }else phaseTime=0;
   }else if(phase==='release'){
    // Let the outgoing guard clear the rear opening before the new trainer
    // walks up the same strip. Their bodies never trade places through each other.
    tell(n,'留步让行 · 同伴出圃后取弓');
    const p=patrol.get(other);if(p.index>=2||p.stage==='ready')enter(request?'player-take':'fetch');
   }else if(phase==='relief'){
    tell(n,'射圃留守 · 等巡查同伴归来');
    if(travel(n,HANDOFF[active],dt)){
     n.root.rotation.y=-Math.PI/2;
     if(request)enter('player-take');
     else if(!patrol.get(other).paused&&patrol.get(other).stage==='ready'&&gap(other.root.position,HANDOFF[1-active])<.065)enter('handover');
    }
   }else if(phase==='fetch'){
    if(travel(n,A.rack,dt)){n.root.rotation.y=Math.PI/2;timed();if(phaseTime>1.2)enter('line');}
   }else if(phase==='line'){
    if(travel(n,A.line,dt)){n.root.rotation.y=-Math.PI/2;enter('aim');}
   }else if(phase==='aim'){
    if(!blocked){timed();if(phaseTime>2.8){launch(n,0);enter('flight');}}else tell(n,'前方有人 · 收弓等候');
   }else if(phase==='flight'){
    timed();if(!flying.visible)enter('cease');
   }else if(phase==='cease'){
    timed();if(phaseTime>1.4&&!flying.visible)enter('retrieve');
   }else if(phase==='retrieve'){
    if(travel(n,[-24.0,A.floorY,A.targets[retrieveLane][2]],dt)){n.root.rotation.y=-Math.PI/2;enter('collect');}
   }else if(phase==='collect'){
    timed();if(phaseTime>1.2){impacts[retrieveLane].visible=false;enter('return');}
   }else if(phase==='return'){
    if(travel(n,[-19.5,A.floorY,A.targets[retrieveLane][2]],dt))enter('rack');
   }else if(phase==='rack'){
    if(travel(n,A.rack,dt)){timed();if(phaseTime>1){rounds++;shiftPending=true;enter('relief');}}
   }else if(phase==='player-take'){
    timed();if(phaseTime>1.1)enter('player-aim');
   }else if(phase==='player-aim'){
    if(!blocked){timed();if(phaseTime>2.8&&player){launch(player,1);playerShot=true;enter('player-flight');}}
   }else if(phase==='player-flight'){
    if(!flying.visible)enter('player-cease');
   }else if(phase==='player-cease'){
    timed();if(phaseTime>1.5)complete=true;
   }
   for(const actor of guards)animateGuard(actor,t);
  },
  snapshot:()=>({version:1,activeId:shooter().station.id,phase,phaseTime,rounds,retrieveLane,request,complete,playerShot,flightTime,flightLane,shiftPending,handoffs,start:start.toArray(),end:end.toArray(),flying:flying.visible,impacts:impacts.map(q=>({visible:q.visible,position:q.position.toArray(),quaternion:q.quaternion.toArray()})),patrol:[...patrol].map(([n,p])=>[n.station.id,continuityCopy(p)]),shots:continuityCopy(shots),history:[...history]}),
  restore(s,{player:restoredPlayer}={}){const index=guards.findIndex(n=>n.station.id===s?.activeId);if(s?.version!==1||index<0||!labels[s.phase])return false;active=index;phase=s.phase;phaseTime=Math.max(0,s.phaseTime||0);rounds=Math.max(0,s.rounds||0);retrieveLane=s.retrieveLane||0;request=!!s.request;complete=!!s.complete;playerShot=!!s.playerShot;flightTime=Math.max(0,s.flightTime||0);flightLane=s.flightLane||0;shiftPending=!!s.shiftPending;handoffs=Math.max(0,s.handoffs||0);if(request&&restoredPlayer){player=restoredPlayer;playerKit??=makeKit(lot.group);}start.fromArray(s.start);end.fromArray(s.end);flying.visible=!!s.flying;flying.quaternion.setFromUnitVectors(forward,end.clone().sub(start).normalize());updateFlight(0);for(const [i,p]of(s.impacts||[]).entries()){if(!impacts[i])continue;impacts[i].visible=!!p.visible;impacts[i].position.fromArray(p.position);impacts[i].quaternion.fromArray(p.quaternion);}for(const[id,p]of s.patrol||[]){const n=guards.find(n=>n.station.id===id);if(n&&CHINA_GUARD_ROUTES[p.routeId]?.[p.index])patrol.set(n,continuityCopy(p));}shots.splice(0,shots.length,...continuityCopy(s.shots||[]));history.splice(0,history.length,...(s.history||[]));for(const n of guards)resetTravel(n);return true;},
  state(){return {phase,phaseTime,rounds,handoffs,active:shooter().station.id,blocked,playerRequested:request,playerComplete:complete,shots:shots.map(s=>({...s})),history:[...history],failures:[...failures],guards:guards.map(n=>({id:n.station.id,position:n.root.position.toArray(),walking:n.walking,route:n.route.length,patrol:{...patrol.get(n),visited:[...patrol.get(n).visited],checkpoint:patrol.get(n).stage==='ready'?'handoff':CHINA_GUARD_ROUTES[patrol.get(n).routeId][patrol.get(n).index].id},social:socialStatus(n)})),arrows:impacts.map(q=>q.visible),flying:flying.visible};},
  dispose(){disposed=true;for(const costume of costumes)costume.dispose();for(const kit of kits.values())kit.dispose();playerKit?.dispose();for(const q of [flying,...impacts]){q.removeFromParent();q.traverse(o=>o.geometry?.dispose());}for(const n of guards){n.route=[];if(n.poseContext)n.poseContext.archery=null;}}
 };
}
