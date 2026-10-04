import {canTraverse} from './navigation.js';
import {attachPalaceCostume} from './china-palace-costume.js';

export const CHINA_PALACE_ROLES=Object.freeze([
 {id:'cn-emperor',npcName:'景珩 · 皇帝',royalRole:'emperor',ageYears:36,privateRoomId:'bedroom',npcPosition:[-21.7,7.815,-4.6]},
 {id:'cn-consort-yue',npcName:'月容 · 妃嫔',royalRole:'consort',ageYears:29,privateRoomId:'guest',npcPosition:[-23.5,.215,-2.2]}
]);
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.065)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const HALL=[[-18,.215,-13.35],[-15.1,.215,-13.35]],GUEST=[[-21.65,.215,-4.5],[-21.65,.215,-10.5],[-23.5,.215,-10.6],[-23.5,.215,-13.35]],SHORE=[[-13.7,.145,-14.5],[-13.7,.145,-20.85],[-9.1,.145,-20.85]],TEA=[[-13.7,.115,-24.5],[-14.4,.115,-28.5],[-10.3,.815,-28.5],[-3.1,.815,-25.0],[2.9,.815,-28.25]];
const STAIRS=[[-17.7,7.815,-10.5],[-17.7,7.815,-13.35],[-22,7.815,-13.35],[-22,5.915,-18.65],[-24.5,5.915,-18.65],[-24.5,4.015,-13.35],[-22,4.015,-13.35],[-22,2.115,-18.65],[-24.5,2.115,-18.65],[-24.5,.215,-13.35],...HALL];
const COURT=[[-14.4,.115,-10],[-14.4,.115,.4],[-8,.13,11],[-3,.13,11],[-3,1.415,6],[0,1.415,3],[0,1.415,-4.3]];
const reverse=a=>a.slice().reverse().map(p=>p.slice());

// Royal routes are authored through the public stair hall. The first consort
// has her own guest suite; Lin remains the tea host and keeps the original job.
export function createChinaPalaceLife({npcs,lot,furniture,doors,planPath,moveActor,poseContext}){
 const actors=CHINA_PALACE_ROLES.map(r=>npcs.find(n=>n.station.id===r.id)),host=npcs.find(n=>n.station.id==='cn-tea');
 if(actors.some(n=>!n)||!host)return null;
 const [emperor,consort]=actors,owned=new Set(actors),costumes=actors.map(attachPalaceCostume),seat=id=>furniture.items.find(i=>i.id===id);
 const throne=seat('china-furniture-throne'),privateSeat=seat('china-furniture-seat');if(!throne||!privateSeat){for(const c of costumes)c?.dispose();return null;}
 const stages=new Map(),history=[],failures=[],navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let time=0,disposed=false,playerState={},hostHeld=false,hostPreviousYaw=0,hostHeldAt=0;
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const record=(n,event)=>{history.push({actor:n.station.id,event,time:+time.toFixed(2),position:n.root.position.toArray()});if(history.length>80)history.shift();};
 const stage=(id,label,path,duration=0,options={})=>({id,label,path,duration,...options});
 const consortSteps=[
  stage('private-morning','在自己的客居整理书卷',[consort.home.toArray()],5,{action:'read'}),
  stage('leave-suite','出客居私门 · 经过公共通廊',[...GUEST,...HALL]),
  stage('garden-view','荷庭驻足 · 看花与水色',SHORE,7,{look:[-5,.3,-18]}),
  stage('visit-tea','前往雅集茶厅拜访 Lin',TEA),
  stage('tea-conversation','在茶案前等 Lin 忙完',[TEA.at(-1)],7,{pair:true}),
  stage('return-suite','告别茶席 · 沿公共通廊回客居',[...reverse(TEA).slice(1),...reverse(SHORE),...reverse(HALL),...reverse(GUEST),consort.home.toArray()]),
  stage('private-rest','回到自己的客居静读',[consort.home.toArray()],10,{action:'read'})
 ];
 const emperorSteps=[
  stage('private-reading','寝殿晨读 · 看一页书',[emperor.home.toArray()],8,{action:'read'}),
  stage('public-stairs','离开寝殿 · 沿公共梯厅下楼',STAIRS),
  stage('hall-arrival','穿过仪庭 · 上正殿前阶',COURT),
  stage('hall-rest','在正殿御座稍坐',[throne.position],8,{mount:throne}),
  stage('return-residence','离殿回居 · 沿原路上公共楼梯',[...reverse(COURT),...reverse(STAIRS),[-18.2,7.815,-5],privateSeat.position]),
  stage('private-rest','在寝殿阅读椅休息',[privateSeat.position],10,{mount:privateSeat})
 ];
 const scripts=new Map([[emperor,emperorSteps],[consort,consortSteps]]);
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function releaseHost(){if(!hostHeld)return;host.root.rotation.y=hostPreviousYaw;host.breakAt+=time-hostHeldAt;hostHeld=false;tell(host,host.station.npcLabel);}
 function enter(n,index){const steps=scripts.get(n);stages.set(n,{index:index%steps.length,waypoint:0,elapsed:0,arrived:false,planned:false,stalled:0,retries:0,mount:null,cycles:stages.get(n)?.cycles+(index===steps.length?1:0)||0});n.route=[];record(n,steps[index%steps.length].id);}
 function unmount(n,s){if(!s.mount)return true;const landing=furniture.standPoint(navigation,safety(n),s.mount);if(!landing)return false;n.root.position.copy(landing);s.mount=null;furniture.releaseActor(n.station.id);return true;}
 function advance(n,s){if(!unmount(n,s))return false;if(n===consort)releaseHost();enter(n,s.index+1);return true;}
 function travel(n,s,to,dt){
  if(near(n.root.position,to)){n.route=[];s.planned=false;return true;}
  if(!s.planned){n.route=planPath(n.root.position,point(to),.25);s.planned=true;}
  const direct=near(n.root.position,to,.45)&&canTraverse(n.root.position,point(to),lot.colliders.concat(safety(n)),navigation);
  const step=direct?{waypoint:point(to)}:doors.routeStep(n.route,n.root.position,.025);
  if(!step.waiting&&step.waypoint){
   const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
   const obstacles=[...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])];
   const blocked=obstacles.some(p=>Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<.70&&(p.x-n.root.position.x)*dx+(p.z-n.root.position.z)*dz>.001&&Math.abs((p.x-n.root.position.x)*dz-(p.z-n.root.position.z)*dx)/Math.max(d,1e-10)<.55);
   if(d>1e-10&&!blocked){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-9;n.root.rotation.y=Math.atan2(dx,dz);}
  }
  s.stalled=n.walking||step.waiting?0:s.stalled+dt;
  if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,stage:scripts.get(n)[s.index].id,to:to.slice(),position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  return near(n.root.position,to);
 }
 function interrupted(n){return playerState.conversationActorId===n.station.id;}
 function animate(n,s,t){
  const stop=scripts.get(n)[s.index],context=poseContext(n,null);context.handoff=false;context.heldProp=null;
  if(s.mount)context.seatHeight=s.mount.seatY-n.root.position.y-context.visualFloorOffset;
  if(stop.pair&&hostHeld&&!interrupted(n)&&!interrupted(host))context.handoff=true;
  n.animate(t+n.phase,n.walking,s.mount?'chair-sit':s.arrived&&!interrupted(n)?stop.action||null:null,context);
 }
 for(const n of actors)enter(n,0);
 return {
  owns:n=>owned.has(n)||hostHeld&&n===host,
  socialStatus(n){if(!owned.has(n)&&!(hostHeld&&n===host))return null;return {busy:false,attention:true,job:n===host?'与月容在茶席叙话':scripts.get(n)[stages.get(n).index].label};},
  playerRequest(id){for(const n of actors){const s=stages.get(n);if(s.mount?.id===id)advance(n,s);}},
  update(dt,t,state={}){
   if(disposed)return;playerState=state;time+=dt;
   for(const n of actors){
    n.walking=false;const s=stages.get(n),stop=scripts.get(n)[s.index];tell(n,stop.label);
    if(interrupted(n)){tell(n,stop.label+' · 停步与你交谈');if(!s.mount&&state.position)n.root.rotation.y=Math.atan2(state.position.x-n.root.position.x,state.position.z-n.root.position.z);animate(n,s,t);continue;}
    if(!s.arrived){if(travel(n,s,stop.path[s.waypoint],dt)){s.waypoint++;if(s.waypoint===stop.path.length){s.arrived=true;record(n,stop.id+':arrived');}}}
    if(s.arrived){
     if(stop.mount&&!s.mount){
      if(state.facilityId!==stop.mount.id&&furniture.canSit(navigation,safety(n),stop.mount)){n.root.position.set(...stop.mount.anchor);n.root.rotation.y=stop.mount.yaw;s.mount=stop.mount;record(n,stop.id+':seated');}
      else{animate(n,s,t);continue;}
     }
     if(stop.look)n.root.rotation.y=Math.atan2(stop.look[0]-n.root.position.x,stop.look[2]-n.root.position.z);
     if(stop.pair){
      const ready=near(host.root.position,host.home.toArray(),.18)&&!host.walking&&!host.route.length;
      if(!hostHeld&&ready&&!interrupted(host)&&state.performing!==host.station.id){hostHeld=true;hostPreviousYaw=host.root.rotation.y;hostHeldAt=time;record(n,'tea-host-present');}
      if(!hostHeld||interrupted(host)||state.performing===host.station.id){animate(n,s,t);continue;}
      n.root.rotation.y=Math.atan2(host.root.position.x-n.root.position.x,host.root.position.z-n.root.position.z);host.root.rotation.y=Math.atan2(n.root.position.x-host.root.position.x,n.root.position.z-host.root.position.z);tell(n,'与 Lin 聊今日荷色和茶香');tell(host,'接待月容 · 茶案前叙话');
     }
     s.elapsed+=dt;if(s.elapsed>=stop.duration)advance(n,s);
    }
    animate(n,stages.get(n),t);
   }
   if(hostHeld){host.walking=false;const c=poseContext(host,null);c.handoff=!interrupted(host)&&!interrupted(consort);host.animate(t+host.phase,false,null,c);}
  },
  state(){return {time,hostHeld,history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:actors.map(n=>{const s=stages.get(n);return {id:n.station.id,role:n.station.royalRole,ageYears:n.station.ageYears,privateRoomId:n.station.privateRoomId,stage:scripts.get(n)[s.index].id,waypoint:s.waypoint,elapsed:s.elapsed,arrived:s.arrived,mounted:s.mount?.id||null,cycles:s.cycles,position:n.root.position.toArray(),walking:n.walking,paused:interrupted(n)};})};},
  dispose(){if(disposed)return;disposed=true;releaseHost();for(const n of actors){n.route=[];furniture.releaseActor(n.station.id);if(n.poseContext){n.poseContext.handoff=false;n.poseContext.seatHeight=undefined;}}for(const c of costumes)c?.dispose();}
 };
}
