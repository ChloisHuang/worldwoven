import {createFacilityQueue} from './npc-facilities.js';

// A single, authored bathhouse visit. The engine still owns doors, collision,
// navigation, generated identity, mounted poses, and player activities.
export const JAPAN_SERVICE_ROLES=['jp-welcome','jp-balcony','jp-onsen','jp-women-onsen'];
const point=a=>({x:a[0],y:a[1],z:a[2]});
const distance=(p,a)=>Math.hypot(p.x-a[0],p.z-a[2]);
const near=(p,a,r=.18)=>distance(p,a)<r&&Math.abs(p.y-a[1])<.3;

export function createJapanServiceRoutine({npcs,furniture,planPath,doors,moveActor,poseContext,changeWardrobe,saveState=()=>{},saved={}}) {
 const byId=new Map(npcs.map(n=>[n.station.id,n]));
 if(JAPAN_SERVICE_ROLES.some(id=>!byId.has(id)))return null;
 const host=byId.get('jp-welcome'),guest=byId.get('jp-balcony');
 const men=guest.root.userData.appearance.bodyPreset.startsWith('masculine');
 const cleaner=byId.get(men?'jp-onsen':'jp-women-onsen'),porter=byId.get(men?'jp-women-onsen':'jp-onsen');
 const actors=[host,guest,cleaner,porter],owned=new Set(actors),facilities=furniture.facilities||createFacilityQueue();
 const bath=furniture.items.find(i=>i.id===`japan-furniture-bath-${men?1:2}`);
 const bench=furniture.items.find(i=>i.kind==='seat'&&i.center[2]===7.55&&(men?i.center[0]<0:i.center[0]>0));
 if(!bath||!bench)return null;
 const change=men?[-9.92,3.8,2.4]:[4.8,3.8,1.4],wash=men?[-9.15,3.8,-3.7]:[3,3.8,-4.4];
 const wait=men?[-3.3,3.8,6.55]:[.25,3.8,6.55],meet=[wait[0]+(men?.82:-.82),3.8,wait[2]],reception=[-4.22,0,5.7];
 const cleanPoint=[bath.position[0]-.16,3.8,bath.position[2]],cleanTarget=[bath.center[0],4.57,bath.position[2]],cleanerWait=[wait[0]+(men?-1.7:1.15),3.8,7.2];
 const porterSupply=men?[.15,3.8,2.72]:[-3.55,3.8,2.72],cleanSupply=men?[-3.55,3.8,2.72]:[.15,3.8,2.72];
 const changingId=men?'japan-furniture-wardrobe':'japan-service-women-changing';
 const home=n=>n.home.toArray(),visitorLook={...guest.root.userData.appearance};
 let stage='',jobs=[],stageTime=0,cycles=Math.max(0,saved?.cycles|0),disposed=false,interruption=null,playerState={},lastPlayerId=null;
 const history=[],failures=[];
 const job=(actor,to,options={})=>({actor,to,duration:0,label:'稍作等候',...options});
 const tell=(n,text)=>{const label=n.label?.querySelector?.('small');if(label)label.textContent=text;};
 function outfit(preset){if(guest.root.userData.appearance.wardrobePreset!==preset)changeWardrobe(guest,{...visitorLook,wardrobePreset:preset});}
 function unmount(){for(const n of actors){if(!n.serviceMount)continue;n.root.position.set(...n.serviceMount.position);n.serviceMount=null;}}
 function release(){for(const n of actors){facilities.releaseActor(n.station.id);n.route=[];n.serviceTask=null;}jobs=[];}
 function checkpoint(){saveState({version:1,cycles,checkpoint:'welcome'});}
 function enter(next){
  unmount();release();stage=next;stageTime=0;history.push(next);if(history.length>48)history.shift();
  if(next==='arrival'){
   outfit(visitorLook.wardrobePreset);
   jobs=[job(host,home(host),{duration:2,action:'tidy',held:'cloth',face:reception,label:'为旅人登记钥匙'}),job(guest,reception,{duration:2,face:home(host),label:'向 Koharu 领取浴衣钥匙'})];
  }else if(next==='guide'){
   jobs=[job(host,[-5.4,0,4.35],{duration:.5,face:[9.1,0,-1],label:'绕到通道前方为旅人引路'}),job(guest,reception,{duration:.5,label:'等接待走到前方'})];
  }else if(next==='escorting'){
   jobs=[job(host,[5.9,0,6.9],{duration:1,face:[9.1,0,-1],label:'引导旅人前往二层'}),job(guest,[4.65,0,5.7],{duration:1,label:'跟随接待前往楼梯',follow:host,after:()=>host.root.position.x>guest.root.position.x+.9||host.serviceTask?.done})];
  }else if(next==='upstairs'){
   jobs=[job(host,home(host),{action:'tidy',label:'回前台迎接下一位旅人'}),job(guest,wait,{label:'沿楼梯前往温泉接待处'}),job(porter,porterSupply,{duration:2.5,action:'tidy',workTarget:[porterSupply[0],4.7,2.1],label:'从木篮取出干净手巾'}),job(cleaner,cleanPoint,{duration:3,action:'bath-attendant',held:'bathBucket',workTarget:cleanTarget,claim:bath.id,label:'检查并擦拭池边座位'})];
  }else if(next==='towels'){
   jobs=[job(guest,wait,{duration:2,face:meet,handoff:true,label:'接过入浴手巾'}),job(porter,meet,{duration:2,held:'cloth',face:wait,handoff:true,label:'把干净手巾交给 Ren'}),job(cleaner,cleanerWait,{label:'检查完毕，先让出洗浴通道'})];
  }else if(next==='handoff-clear'){
   jobs=[job(guest,wait,{held:'cloth',label:'收好手巾，准备更衣'}),job(porter,[meet[0],3.8,men?5.8:7.25],{label:'交接完毕，侧身让出通道'})];
  }else if(next==='changing'){
   jobs=[job(guest,change,{duration:3,action:'tidy',held:'cloth',claim:changingId,face:men?[-11.32,3.8,2.4]:[6.3,3.8,1.4],label:'在更衣柜前整理入浴衣着',onDone:()=>outfit('onsen-swimwear')}),job(porter,home(porter),{label:'返回手巾木篮'}),job(cleaner,cleanerWait,{label:'在休息廊等候清洁交接'})];
  }else if(next==='washing'){
   jobs=[job(guest,wash,{duration:3.5,action:'bath-attendant',face:men?[-10.35,3.8,-3.7]:[4.6,3.8,-4.15],workTarget:men?[-10.35,4.6,-3.7]:[4.6,4.6,-4.15],label:'洗净后再入汤'})];
  }else if(next==='bathing'){
   jobs=[job(guest,bath.position,{duration:8,action:'bathe',claim:bath.id,mount:bath,label:'坐在温泉池座上泡汤'})];
  }else if(next==='drying'){
   jobs=[job(guest,change,{duration:3,action:'tidy',held:'cloth',claim:changingId,face:men?[-11.32,3.8,2.4]:[6.3,3.8,1.4],label:'擦干并换回旅途衣着',onDone:()=>outfit(visitorLook.wardrobePreset)}),job(cleaner,cleanPoint,{duration:4,action:'bath-attendant',held:'bathBucket',workTarget:cleanTarget,after:()=>guest.root.position.z>-.1,claim:bath.id,label:'旅人离池后擦洗座位'})];
  }else if(next==='resting'){
   jobs=[job(guest,bench.position,{duration:6,action:'chair-sit',claim:bench.id,mount:bench,label:'在休息廊坐下歇脚'}),job(cleaner,cleanSupply,{duration:2.5,action:'tidy',held:'cloth',workTarget:[cleanSupply[0],4.7,2.1],label:'补齐下一位旅人的手巾与木桶'})];
  }else if(next==='returning'||next==='recovering'){
   outfit(visitorLook.wardrobePreset);
   jobs=actors.map(n=>job(n,n===guest?reception:home(n),{duration:n===guest?2:0,label:n===guest?'回前台归还钥匙':n===host?'等候旅人归还钥匙':'收好用具，准备下一轮'}));
  }else if(next==='yielding'){
   const destination=interruption?.wait||wait;
   jobs=[job(guest,destination,{exitTo:interruption?.exitTo,label:'先让客人使用，稍后再来'}),...actors.filter(n=>n!==guest).map(n=>job(n,interruption?.clearing?.includes(n)?cleanerWait:n.root.position.toArray(),{label:'让出设施与通道'}))];
  }
  for(const task of jobs){task.actor.serviceTask=task;task.actor.route=[];task.elapsed=0;task.stalled=0;task.retries=0;task.done=false;task.arrived=false;task.routeSet=false;tell(task.actor,task.label);}
 }
 function nextStage(){
  const next={arrival:'guide',guide:'escorting',escorting:'upstairs',upstairs:'towels',towels:'handoff-clear','handoff-clear':'changing',changing:'washing',washing:'bathing',bathing:'drying',drying:'resting',resting:'returning',returning:'arrival',recovering:'arrival'}[stage];
  if(stage==='returning'){cycles++;checkpoint();}
  if(next)enter(next);
 }
 function blockedByPlayer(id){return id&&playerState.facilityId===id;}
 function interrupt(id){
  if(disposed||furniture.items.some(i=>i.id===id&&i.seats))return;
  const relevant=jobs.some(j=>j.claim===id)||guest.serviceMount?.id===id;
  facilities.prioritize(id,true);
  if(!relevant||stage==='yielding')return;
  const resume=stage,mounted=guest.serviceMount;
  // Walk one body-length along the real poolside aisle before coarse routing.
  // Otherwise its first grid link can turn back into the waiting player.
  const exitTo=mounted?.kind==='bath'?[mounted.position[0],mounted.position[1],mounted.position[2]+(playerState.position?.z>mounted.position[2]+.05?-1.1:1.1)]:null;
  unmount();interruption={id,resume,exitTo,wait:wait.slice(),clearing:jobs.filter(j=>j.claim===id).map(j=>j.actor)};enter('yielding');
 }
 function fail(task,reason){
  failures.push({stage,actor:task.actor.station.id,reason});if(failures.length>8)failures.shift();
  // A bad route is cancelled rather than snapping through walls. Recovery
  // starts from each real position; a further failure waits briefly and replans.
  if(stage==='recovering'){task.routeSet=false;task.retries=0;task.stalled=-4;}
  else enter('recovering');
 }
 function tickTask(task,dt){
  const n=task.actor;n.walking=false;
  if(task.done)return;
  if(task.after&&!task.after())return;
  if(playerState.performing===n.station.id){tell(n,'先陪你一起体验');return;}
  tell(n,task.label);
  if(task.claim&&furniture.items.some(i=>i.id===task.claim&&i.seats)){
   const pool=furniture.items.find(i=>i.id===task.claim),seat=furniture.resolveBath(pool,n.station.id,()=>true,task.mount?'bathe':'clean-seat');
   if(!seat){tell(n,'池中座位已满，在通道外等空位');return;}
   if(!task.reservedSeat){task.reservedSeat=seat.id;task.to=seat.position.slice();if(task.mount)task.mount=seat;else{task.to[0]-=.16;task.workTarget=[seat.anchor[0],seat.bathPose.backTopY+.07,seat.anchor[2]];}task.routeSet=false;}
  }else if(task.claim&&!facilities.request(task.claim,n.station.id)){task.waited=(task.waited||0)+dt;if(task.waited>25){interruption={id:task.claim,resume:stage,wait:wait.slice()};enter('yielding');}return;}
  if(task.exitTo){
   if(near(n.root.position,task.exitTo,.08))task.exitTo=null;
   else{const dx=task.exitTo[0]-n.root.position.x,dz=task.exitTo[2]-n.root.position.z,d=Math.hypot(dx,dz),amount=Math.min(d,dt*n.locomotion.walkSpeed*.82),before=n.root.position.clone();
    moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-8;n.root.rotation.y=Math.atan2(dx,dz);task.stalled=n.walking?0:task.stalled+dt;if(task.stalled>4)fail(task,'poolside exit temporarily obstructed');return;
   }
  }
  if(!task.arrived){
   if(near(n.root.position,task.to,task.handoff||task.action==='bath-attendant'?.025:.18)){task.arrived=true;n.route=[];
    if(task.mount){n.serviceMount=task.mount;n.root.position.set(...task.mount.anchor);n.root.rotation.y=task.mount.yaw;if(task.mount.poolId)furniture.occupyBath(task.mount,n.station.id);}
   }else{
    if(!task.routeSet){n.route=planPath(n.root.position,point(task.to),.25);task.routeSet=true;}
    const step=doors.routeStep(n.route,n.root.position,task.handoff||task.action==='bath-attendant'?.018:.12);
    if(!step.waiting&&step.waypoint){const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
     const player=playerState.position,playerAhead=player&&Math.abs(player.y-n.root.position.y)<.6&&Math.hypot(player.x-n.root.position.x,player.z-n.root.position.z)<.68&&(player.x-n.root.position.x)*dx+(player.z-n.root.position.z)*dz>0;
     const leader=task.follow?.root.position,followGap=leader&&leader.distanceTo(n.root.position)<1.05&&(leader.x-n.root.position.x)*dx+(leader.z-n.root.position.z)*dz>0;
     if(d>1e-10&&!playerAhead&&!followGap){const amount=Math.min(d,dt*n.locomotion.walkSpeed*.82),before=n.root.position.clone();moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-8;n.root.rotation.y=Math.atan2(dx,dz);}
    }
    task.stalled=n.walking?0:task.stalled+dt;
    if(task.stalled>4){task.retries++;task.stalled=0;task.routeSet=false;if(task.retries>3)fail(task,'route temporarily obstructed');}
    return;
   }
  }
  if(task.face)n.root.rotation.y=Math.atan2(task.face[0]-n.root.position.x,task.face[2]-n.root.position.z);
  else if(task.workTarget)n.root.rotation.y=Math.atan2(task.workTarget[0]-n.root.position.x,task.workTarget[2]-n.root.position.z);
  // Exchanges start only after both people have reached the shared work point.
  if(task.handoff&&!jobs.every(j=>!j.handoff||j.arrived))return;
  task.elapsed+=dt;
  if(task.elapsed>=task.duration){
   if(n.serviceMount?.poolId){
    const others=npcs.filter(a=>a!==n).map(a=>a.root.position);if(playerState.position)others.push(playerState.position);
    const safety=[...(doors.cameraColliders||[]),...others.map(p=>({minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}))];
    const landing=furniture.standPoint(undefined,safety,n.serviceMount);if(!landing){tell(n,'等池边通道让开后离池');return;}
    n.root.position.copy(landing);n.serviceMount=null;
   }
   if(task.reservedSeat)facilities.release(task.claim,n.station.id);
   task.done=true;task.onDone?.();
  }
 }
 function animateActor(n,t){
  const task=n.serviceTask,helping=playerState.performing===n.station.id;
  const pose=task?.arrived&&!task.done?task.action:null;
  const context=poseContext(n,helping?n.station:task?.workTarget?{workTarget:task.workTarget}:null);
  const mount=n.serviceMount;
  if(mount){context.visualFloorOffset=mount.kind==='bath'?0:context.visualFloorOffset;context.seatHeight=mount.seatY===undefined?undefined:mount.seatY-n.root.position.y-context.visualFloorOffset;context.supportY=mount.supportY;context.bathPose=mount.bathPose;context.bathHipHeight=mount.bathHipHeight;}
  context.heldProp=helping?null:task?.held||null;context.handoff=!!(!helping&&task?.handoff&&task.arrived);
  n.animate(t+n.phase,n.walking,helping?n.station.npcAction:pose,context);
 }
 // Fresh scene placement, not a live route teleport. Saved appearance is kept.
 guest.root.position.set(-2.7,0,8.2);guest.route=[];
 enter('arrival');
 return {
  owns:n=>owned.has(n),
  update(dt,t,state={}){
   if(disposed)return;playerState=state;
   if(lastPlayerId&&lastPlayerId!==state.facilityId)facilities.prioritize(lastPlayerId,false);
   if(state.facilityId){interrupt(state.facilityId);lastPlayerId=state.facilityId;}else lastPlayerId=null;
   stageTime+=dt;const before=stage;
   for(const task of jobs.slice()){tickTask(task,dt);if(stage!==before)break;}
   if(stage==='yielding'){
    if(!blockedByPlayer(interruption?.id)&&jobs.every(j=>j.done)){const resume=interruption?.resume||'arrival';interruption=null;enter(resume);}
    else if(stageTime>25&&jobs.every(j=>j.done)){interruption=null;enter('recovering');}
   }else if(jobs.length&&jobs.every(j=>j.done))nextStage();
   for(const n of actors)animateActor(n,t);
  },
  playerRequest(id){if(lastPlayerId&&lastPlayerId!==id)facilities.prioritize(lastPlayerId,false);interrupt(id);lastPlayerId=id;},
  isYieldingFor:id=>!disposed&&stage==='yielding'&&interruption?.id===id,
  state:()=>({stage,stageTime,cycles,side:men?'men':'women',history:history.slice(),failures:failures.slice(),facilities:facilities.state(),actors:actors.map(n=>({id:n.station.id,name:n.station.npcName,position:n.root.position.toArray(),walking:n.walking,job:n.serviceTask?.label,action:n.serviceMount?'mounted':n.serviceTask?.arrived?n.serviceTask.action:null,held:n.serviceTask?.held||null,mounted:n.serviceMount?.id||null,route:n.route.length}))}),
  dispose(){if(disposed)return;disposed=true;unmount();release();if(!furniture.facilities)facilities.dispose();checkpoint();for(const n of actors){n.serviceMount=null;n.serviceTask=null;}},
 };
}
