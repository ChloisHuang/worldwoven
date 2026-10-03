import * as G from './geometry.js';
import {CHINA_ARCHERY as A,buildPracticeBow,buildPracticeArrow} from './china-archery-court.js';
const {THREE}=G,point=a=>({x:a[0],y:a[1],z:a[2]}),gap=(p,a)=>Math.hypot(p.x-a[0],p.z-a[2]);
const labels={fetch:'在弓架取弓',line:'持弓走向金线',aim:'定步 · 引弓 · 瞄准',flight:'放箭 · 保持站位',cease:'收弓停射 · 确认箭已落靶',retrieve:'停射后沿靶道取箭',collect:'从草靶取回练习箭',return:'持弓返回金线',rack:'归还弓箭',handover:'换班 · 后方巡查', 'player-take':'接过练习弓','player-aim':'定步引弓 · 瞄准草靶','player-flight':'放箭 · 保持站位','player-cease':'收弓停射 · 练习完成'};

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

function dressGuard(actor){
 const head=actor.root.userData.head,hat=new THREE.Group();hat.name='Original imperial duty cap';head.add(hat);
 // Each kit owns its materials; character disposal never disposes G's cache.
 const materials=new Map(),part=(geo,c,x,y,z)=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));const m=new THREE.Mesh(geo,materials.get(c));m.position.set(x,y,z);m.castShadow=true;hat.add(m);return m;};
 part(new THREE.CylinderGeometry(.105,.111,.115,10),0x292b2b,0,.29,-.007);
 part(new THREE.CylinderGeometry(.116,.116,.025,12),0x933e31,0,.232,-.007);
 const badge=part(new THREE.BoxGeometry(.048,.065,.014),0xd2b367,0,.286,.103);badge.rotation.z=Math.PI/4;
 part(new THREE.BoxGeometry(.15,.027,.039),0x292b2b,0,.35,-.01);
 const chest=actor.root.getObjectByName('chest'),insignia=new THREE.Group();insignia.name='Imperial training sash badge';chest.add(insignia);
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.105,.14,.018),materials.get(0xd2b367));panel.position.set(0,-.12,.108);panel.rotation.z=Math.PI/4;insignia.add(panel);
 return [hat,insignia];
}

// All routines use the existing path planner and movement/collision function.
// Only one bow may fire; a visible cease-fire precedes every retrieval.
export function createChinaArcheryRoutine({npcs,lot,planPath,moveActor,poseContext}){
 const guards=A.roles.map(id=>npcs.find(n=>n.station.id===id));if(guards.some(n=>!n)||!lot.archery)return null;
 const owned=new Set(guards),kits=new Map(guards.map(n=>[n,makeKit(lot.group)]));guards.forEach(dressGuard);
 const flying=buildPracticeArrow(G);flying.visible=false;lot.group.add(flying);
 const impacts=A.targets.map(()=>{const q=buildPracticeArrow(G);q.visible=false;lot.group.add(q);return q;});
 const shots=[],history=[],failures=[],forward=new THREE.Vector3(0,0,1),start=new THREE.Vector3(),end=new THREE.Vector3();
 let active=0,phase='handover',phaseTime=0,rounds=0,retrieveLane=0,player=null,playerKit=null,request=false,complete=false,playerShot=false,flightTime=0,flightLane=0,blocked=false,disposed=false,patrolIndex=0;
 const shooter=()=>guards[active],tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=text;};
 function enter(next){phase=next;phaseTime=0;for(const n of guards){n.route=[];n.archeryDestination=null;n.archeryStall=0;}history.push(next);if(history.length>64)history.shift();tell(shooter(),labels[next]||next);}
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
  let pose=n===shooter()&&!phase.startsWith('player-')?poseFor(phase,phaseTime):null;if(blocked&&['aim','flight'].includes(phase))pose=hold;
  if(!n.walking&&pose&&['aim','flight','cease'].includes(phase))n.root.rotation.y=-Math.PI/2;
  const c=poseContext(n,null);c.archery=pose;n.animate(t+n.phase,n.walking,null,c);kits.get(n).update(n,pose,A.targets[retrieveLane]);
 }
 enter('handover');
 return {
  owns:n=>owned.has(n),ownsStation:id=>A.roles.includes(id),
  startPlayer(actor){if(player!==actor){playerKit?.dispose();playerKit=makeKit(lot.group);player=actor;}request=true;complete=false;playerShot=false;},
  stopPlayer(){request=false;complete=false;playerKit?.hide();if(phase.startsWith('player-')){retrieveLane=playerShot?1:0;enter(playerShot?'cease':'handover');}player=null;},
  playerPose(){return request&&phase.startsWith('player-')?poseFor(phase,phaseTime):null;},
  syncPlayer(){if(player)playerKit?.update(player,this.playerPose(),A.targets[1]);},
  playerStatus(){return request?{complete,label:blocked?'前方有人 · 收弓停射':phase.startsWith('player-')?labels[phase]:'等待本轮停射取箭，再接过练习弓',progress:phase==='player-take'?.1:phase==='player-aim'?.2+Math.min(1,phaseTime/2.8)*.45:phase==='player-flight'?.78:phase==='player-cease'?1:0}:null;},
  update(dt,t,{position}={}){
   if(disposed)return;updateFlight(dt);blocked=!clearRange(position);for(const n of guards)n.walking=false;
   const n=shooter(),other=guards[1-active];
   // The other guard checks the rear entrance, then returns to the waiting mark.
   const rear=patrolIndex%2?A.waits[1-active]:[-17.55,A.floorY,18.6];
   if(!request&&['fetch','line','aim','flight','cease'].includes(phase)){tell(other,'巡看后方入口 · 不入靶道');if(travel(other,rear,dt))patrolIndex++;}
   else{tell(other,'金线后候令 · 等待换班');travel(other,A.waits[1-active],dt);}
   const timed=()=>{phaseTime+=dt;};
   if(phase==='handover'){
    if(travel(n,A.waits[active],dt)){timed();if(phaseTime>1.2){if(request){enter('player-take');}else{retrieveLane=0;enter('fetch');}}}
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
    if(travel(n,A.rack,dt)){timed();if(phaseTime>1){rounds++;active=1-active;enter('handover');}}
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
  state(){return {phase,phaseTime,rounds,active:shooter().station.id,blocked,playerRequested:request,playerComplete:complete,shots:shots.map(s=>({...s})),history:[...history],failures:[...failures],guards:guards.map(n=>({id:n.station.id,position:n.root.position.toArray(),walking:n.walking,route:n.route.length})),arrows:impacts.map(q=>q.visible),flying:flying.visible};},
  dispose(){disposed=true;for(const kit of kits.values())kit.dispose();playerKit?.dispose();for(const q of [flying,...impacts]){q.removeFromParent();q.traverse(o=>o.geometry?.dispose());}for(const n of guards){n.route=[];if(n.poseContext)n.poseContext.archery=null;}}
 };
}
