import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P,JAPAN_SERVICE_WORKERS} from './japan-service-orders.js';
import {createJapanVisitorIdentity,isJapanEmployeeInteraction} from './japan-visitors.js';
import {createJapanServiceProps} from './japan-service-props.js';
import {canTraverse} from './navigation.js';

const WORKERS=[...new Set(Object.values(JAPAN_SERVICE_WORKERS).flat())];
const point=a=>({x:a[0],y:a[1],z:a[2]});
const near=(p,a,r=.08)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.35;
const positions=actors=>Object.fromEntries([...actors].map(([id,n])=>[id,(n.serviceMount?n.serviceMount.position:n.root.position.toArray()).slice()]));
const LABELS={arriving:'沿参道来到汤馆','check-in':'等前台登记并发浴牌',changing:'拿着浴牌去更衣',washing:'洗净后再入汤','waiting-bath':'等自己的浴包送到汤室',bathing:'坐进共享池座泡汤',drying:'擦干并换回旅途衣着',resting:'在休息廊坐下歇脚',dining:'点一碗汤面','waiting-meal':'等后厨做好自己的汤面',eating:'吃刚刚送来的汤面',checkout:'向前台归还浴牌','checkout-ready':'等前台收回浴牌',leaving:'沿参道离开汤馆'};
const JOBS={register:{label:'登记来客并递出浴牌',duration:2.5,action:'tidy',workTarget:P.tokenTray},prepare:{label:'按浴牌配制草木浴包',duration:4,action:'herb-mix',workTarget:P.blendWork},deliverMix:{label:'把对应浴包送到汤室',duration:1.3},cook:{label:'为来客煮一碗汤面',duration:6,action:'ramen',workTarget:[2.1,1.47,-13.4]},serve:{label:'把热汤面送给点餐来客',duration:1.5},checkout:{label:'收回浴牌，送别来客',duration:2,action:'tidy',workTarget:P.tokenTray}};

// Replaces (never runs beside) the earlier four-resident demonstration routine.
// The host supplies the existing movement/door/wardrobe code and lifecycle
// callbacks so spawned visitors join the ordinary labels, culling and disposal.
export function createJapanBathhouseOperations({npcs,lot,furniture,planPath,doors,moveActor,poseContext,changeWardrobe,createVisitor,removeVisitor,worldSeed=1,saved={},saveState=()=>{}}) {
 const residents=new Map(npcs.map(n=>[n.station.id,n]));
 if(WORKERS.some(id=>!residents.has(id)))return null;
 if(!furniture.resolveBath||!furniture.facilities)throw new Error('Bathhouse operations require shared pool seats');
 const restSeats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 if(restSeats.length<2)return null;
 const workers=WORKERS.map(id=>residents.get(id)),guests=new Map(),actors=new Map(workers.map(n=>[n.station.id,n])),tasks=new Map(),cooldowns=new Map();
 const board=createJapanServiceOrders({saved,worldSeed,saveState,capacity:2}),props=createJapanServiceProps(lot.group);
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let playerState={},disposed=false,time=0,nextArrival=0,checkpointAt=5;
 const history=[],failures=[];
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const record=(visit,event)=>{history.push({visit,event,time:+time.toFixed(2)});if(history.length>48)history.shift();};
 const restSeat=v=>furniture.items.find(i=>i.id===v.restSeatId)||restSeats[(v.number-1)%2];
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 function unmount(n) {
  if(!n.serviceMount)return true;
  const landing=furniture.standPoint(undefined,safety(n),n.serviceMount);if(!landing)return false;
  n.root.position.copy(landing);n.serviceMount=null;furniture.releaseActor(n.station.id);return true;
 }
 function clear(n,{releaseJob=false}={}) {
  tasks.delete(n.station.id);n.serviceTask=null;n.route=[];
  if(releaseJob)board.releaseWorker(n.station.id);
 }
 function assign(n,to,options={}) {
  const task={actor:n,to:to.slice(),duration:0,elapsed:0,stalled:0,retries:0,arrived:false,routeSet:false,...options};
  tasks.set(n.station.id,task);n.serviceTask=task;n.route=[];tell(n,task.label||'稍作等候');return task;
 }
 function guestEvent(n,event,evidence={}) {
  const ok=board.guestStep(n.station.id,event,{position:n.root.position.toArray(),...evidence});
  if(ok){record(n.station.id,event);clear(n);}
  return ok;
 }
 function outfit(n,v,swimming) {
  const look=swimming?{...v.appearance,wardrobePreset:'onsen-swimwear'}:v.appearance;
  if(n.root.userData.appearance.wardrobePreset!==look.wardrobePreset)changeWardrobe(n,look);
 }
 function addGuest(v) {
  const n=createVisitor(v);guests.set(v.id,n);actors.set(v.id,n);
  // Saves record safe approaches, not a former scene's occupied pool/bench.
  if(['resting','dining','waiting-meal','eating'].includes(v.stage))n.root.position.set(...restSeat(v).position);
  if(['washing','waiting-bath','bathing','drying'].includes(v.stage))outfit(n,v,true);
  if(['check-in','checkout-ready'].includes(v.stage))furniture.facilities.request('japan-service-reception',v.id);
  return n;
 }
 function removeGuest(n) {
  const id=n.station.id;clear(n);furniture.releaseActor(id);guests.delete(id);actors.delete(id);removeVisitor(n);board.forgetFinished([id]);nextArrival=Math.max(nextArrival,time+18);
 }
 for(const v of board.state().visits)addGuest(v);
 function spawn() {
  if(guests.size>=2||time<nextArrival)return;
  if([...guests.values()].some(n=>near(n.root.position,P.arrival,1.1)))return;
  const identity=createJapanVisitorIdentity(board.nextIdentity(),worldSeed);
  const used=new Set(board.state().visits.map(v=>v.restSeatId)),seat=restSeats.find(s=>!used.has(s.id));if(!seat)return;
  const visit=board.spawn({...identity,restPoint:seat.anchor,diningPoint:seat.anchor,servePoint:[seat.position[0]+.7,seat.position[1],seat.position[2]-.12],restSeatId:seat.id});
  if(visit){addGuest(visit);record(visit.id,'spawned');nextArrival=time+14;}
 }
 function abortTask(task,reason) {
  const n=task.actor;failures.push({actor:n.station.id,reason,time:+time.toFixed(2)});if(failures.length>8)failures.shift();
  clear(n,{releaseJob:true});furniture.releaseActor(n.station.id);cooldowns.set(n.station.id,time+3);
 }
 function tickTask(task,dt) {
  const n=task.actor;n.walking=false;
  if(isJapanEmployeeInteraction(n,playerState)){tell(n,'先陪你聊一会儿');return;}
  tell(n,task.label||'稍作等候');
  if(task.after&&!task.after())return;
  if(!task.arrived) {
   if(near(n.root.position,task.to)) {
    n.route=[];task.arrived=true;task.stalled=0;
    if(task.mount) {
     const allowed=task.mount.kind==='bath'?furniture.canUse(navigation,safety(n),task.mount):furniture.canSit(navigation,safety(n),task.mount);
     if(!allowed){task.arrived=false;return;}
     if(task.mount.kind==='bath'&&!furniture.occupyBath(task.mount,n.station.id)){abortTask(task,'seat reservation lost');return;}
     n.root.position.set(...task.mount.anchor);n.root.rotation.y=task.mount.yaw;n.serviceMount=task.mount;
    }
    if(task.onArrive?.()===false){abortTask(task,'arrival precondition changed');return;}
   }else {
    if(!task.routeSet){n.route=planPath(n.root.position,point(task.to),.25);task.routeSet=true;}
    if(task.avoidRoute?.length&&near(n.root.position,task.avoidRoute[0],.08)){
     task.avoidRoute.shift();if(!task.avoidRoute.length){n.route=planPath(n.root.position,point(task.to),.25);task.routeSet=true;}
    }
    const step=task.avoidRoute?.length?{waypoint:point(task.avoidRoute[0])}:doors.routeStep(n.route,n.root.position,.025);
    if(!step.waiting&&step.waypoint) {
     const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
     const obstacles=[...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])];
     const blocker=obstacles.find(p=>Math.abs(p.y-n.root.position.y)<.65&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<.65&&(p.x-n.root.position.x)*dx+(p.z-n.root.position.z)*dz>.005&&Math.abs((p.x-n.root.position.x)*dz-(p.z-n.root.position.z)*dx)/Math.max(d,1e-10)<.52);
     const blockerId=blocker&&npcs.find(a=>a.root.position===blocker)?.station.id;
     if(blocker&&(!blockerId||!tasks.has(blockerId)||tasks.get(blockerId).arrived||n.station.id>blockerId)&&!task.avoidRoute?.length&&d>1e-10&&Math.abs(blocker.y-n.root.position.y)<.15) {
      // A real side-step through checked floor space lets opposite traffic pass
      // at the stair landing. Never change a route by snapping through an actor.
      const colliders=lot.colliders.concat(safety(n));
      for(const side of [1,-1]) {
       const sx=side*dz/d*.83,sz=-side*dx/d*.83,a=[n.root.position.x+sx,n.root.position.y,n.root.position.z+sz],b=[blocker.x+sx+dx/d*.72,n.root.position.y,blocker.z+sz+dz/d*.72];
       if(canTraverse(n.root.position,point(a),colliders,navigation)&&canTraverse(point(a),point(b),colliders,navigation)){task.avoidRoute=[a,b];break;}
      }
     }
     if(d>1e-10&&!blocker){const amount=Math.min(d,dt*n.locomotion.walkSpeed*.82),before=n.root.position.clone();moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-8;n.root.rotation.y=Math.atan2(dx,dz);}
    }
    task.stalled=n.walking?0:task.stalled+dt;
    if(task.stalled>5){task.stalled=0;task.routeSet=false;if(++task.retries>3)abortTask(task,'route temporarily obstructed');}
    return;
   }
  }
  if(task.face)n.root.rotation.y=Math.atan2(task.face[0]-n.root.position.x,task.face[2]-n.root.position.z);
  else if(task.workTarget)n.root.rotation.y=Math.atan2(task.workTarget[0]-n.root.position.x,task.workTarget[2]-n.root.position.z);
  if(task.ready&&!task.ready())return;
  task.elapsed+=dt;
  if(task.elapsed>=task.duration&&task.onDone?.()!==false&&tasks.get(n.station.id)===task)clear(n);
 }
 function workerTask(n,job) {
  const v=board.getVisit(job.visitId),config=JOBS[job.kind],carrying=!!job.itemId;
  const complete=()=>{
   const guest=guests.get(job.visitId),ok=board.complete(job.id,n.station.id,{position:n.root.position.toArray(),guestPosition:guest?.root.position.toArray(),itemId:job.itemId,tokenId:job.tokenId||v.tokenId});
   if(ok){record(job.visitId,job.kind);if(['register','checkout'].includes(job.kind))furniture.facilities.release('japan-service-reception',job.visitId);}
   return ok;
  };
  if(carrying)assign(n,P[job.from],{label:`领取第 ${v.number} 号${job.kind==='serve'?'汤面':'浴包'}`,duration:.8,face:job.kind==='serve'?P.mealTray:P.mixtureTray,onDone:()=>{
   if(!board.pickup(job.id,n.station.id,{position:n.root.position.toArray()}))return false;
   const target=job.to==='dining'?v.servePoint:P[job.to];
   assign(n,target,{...config,label:`${config.label} · ${v.number}号`,handoff:true,face:job.to==='dining'?v.diningPoint:null,ready:()=>job.kind!=='serve'||board.getVisit(v.id)?.stage==='waiting-meal',onDone:complete});
   return true;
  }});
  else assign(n,P[job.to],{...config,label:`${config.label} · ${v.number}号`,ready:()=>!['register','checkout'].includes(job.kind)||near(guests.get(v.id)?.root.position||{},P.reception,.25),onDone:complete});
 }
 function scheduleWorkers() {
  for(const n of workers) {
   if((cooldowns.get(n.station.id)||0)>time)continue;
   const current=tasks.get(n.station.id);
   if(current&&!current.idle)continue;
   const available=board.jobs().filter(j=>!j.workerId),job=available.map(j=>board.claim(j.id,n.station.id)).find(Boolean);
   if(job){clear(n);workerTask(n,job);}
   else if(!current&&!near(n.root.position,n.home.toArray(),.18))assign(n,n.home.toArray(),{idle:true,label:'收好用具，回到岗位'});
  }
 }
 function queueAtReception(n,v,event) {
  if(!furniture.facilities.request('japan-service-reception',v.id)) {
   const to=[-2.7,0,8.2+(v.number%2)*.85];
   if(!near(n.root.position,to,.15))assign(n,to,{label:'等前一位来客办完登记'});
   return;
  }
  assign(n,P.reception,{label:LABELS[v.stage],onDone:event?()=>guestEvent(n,event):()=>true});
 }
 function scheduleGuest(n,v) {
  if(tasks.has(v.id)||(cooldowns.get(v.id)||0)>time)return;
  tell(n,`${v.name} · ${v.number}号 · ${LABELS[v.stage]||''}`);
  const side=v.side,seat=restSeat(v),step=(event,to,options={})=>assign(n,to,{label:LABELS[v.stage],onDone:()=>guestEvent(n,event),...options});
  if(v.stage==='arriving')queueAtReception(n,v,'arrived');
  else if(v.stage==='changing'||v.stage==='drying') {
   if(!furniture.facilities.request(`japan-service-changing-${side}`,v.id))return;
   step(v.stage==='changing'?'changed':'dried',P[side+'Changing'],{duration:3,action:'tidy',held:'cloth',face:side==='men'?[-11.32,3.8,2.4]:[6.3,3.8,2.4],onDone:()=>{
    outfit(n,v,v.stage==='changing');furniture.facilities.release(`japan-service-changing-${side}`,v.id);return guestEvent(n,v.stage==='changing'?'changed':'dried');
   }});
  }else if(v.stage==='washing') {
   if(!furniture.facilities.request(`japan-service-washing-${side}`,v.id))return;
   step('washed',P[side+'Washing'],{duration:3.5,action:'bath-attendant',workTarget:side==='men'?[-10.35,4.6,-3.7]:[4.6,4.6,-4.15],onDone:()=>{furniture.facilities.release(`japan-service-washing-${side}`,v.id);return guestEvent(n,'washed');}});
  }else if(v.stage==='waiting-bath') {
   const mixture=board.state().items.find(i=>i.id===v.mixtureId);
   const pool=furniture.items.find(i=>i.id===v.poolId);
   const bath=mixture?.location.id===side+'Service'?furniture.resolveBath(pool,v.id,s=>!playerState.facilityId||playerState.facilityId!==s.id):null;
   if(!bath){const wait=[(side==='men'?-4.3:1.3)+(v.number%2)*.8,3.8,-4.7];if(!near(n.root.position,wait,.15))assign(n,wait,{label:LABELS[v.stage]});return;}
   assign(n,bath.position,{label:LABELS.bathing,mount:bath,action:'bathe',duration:10,onArrive:()=>{
    const ok=board.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId:bath.id,position:bath.position});if(ok)record(v.id,'bath-mounted');return ok;
   },onDone:()=>{if(!unmount(n)){tell(n,'等池边通道让开再离池');return false;}return guestEvent(n,'bathed',{seatId:bath.id});}});
  }else if(['resting','dining','waiting-meal','eating'].includes(v.stage)) {
   if(!n.serviceMount) {
    if(playerState.facilityId===seat.id||!furniture.facilities.request(seat.id,v.id))return;
    assign(n,seat.position,{label:LABELS[v.stage],mount:seat,action:'chair-sit',duration:0});return;
   }
   if(v.stage==='resting')step('rested',seat.anchor,{duration:4,action:'chair-sit'});
   else if(v.stage==='dining')guestEvent(n,'sat-to-eat');
   else if(v.stage==='eating')step('ate',seat.anchor,{duration:6,action:'chair-sit',handoff:true,onDone:()=>{
    // Consuming the delivered dish is committed before leaving the actual seat.
    if(!unmount(n))return false;return guestEvent(n,'ate',{position:seat.anchor});
   }});
  }else if(v.stage==='checkout')queueAtReception(n,v,'returned-to-desk');
  else if(v.stage==='leaving')step('left',P.departure);
  else if(v.stage==='cancelled')assign(n,P.departure,{label:'收好行李离开汤馆',onDone:()=>{removeGuest(n);return true;}});
 }
 function animate(n,t) {
  const task=tasks.get(n.station.id),v=guests.has(n.station.id)?board.getVisit(n.station.id):null,mount=n.serviceMount;
  const helping=isJapanEmployeeInteraction(n,playerState),chatting=helping&&playerState.conversationActorId===n.station.id,sharedActivity=helping&&!chatting;
  const context=poseContext(n,sharedActivity?n.station:chatting?null:task?.workTarget?{workTarget:task.workTarget}:null);
  if(mount){context.visualFloorOffset=mount.kind==='bath'?0:context.visualFloorOffset;context.seatHeight=mount.seatY===undefined?undefined:mount.seatY-n.root.position.y-context.visualFloorOffset;context.supportY=mount.supportY;context.bathPose=mount.bathPose;context.bathHipHeight=mount.bathHipHeight;}
  context.heldProp=sharedActivity?null:task?.held||null;context.handoff=!sharedActivity&&(!!task?.handoff||v?.stage==='eating');
  context.seatedMeal=!chatting&&v?.stage==='eating'&&mount?.kind==='seat';
  n.animate(t+n.phase,n.walking,sharedActivity?n.station.npcAction:mount?(mount.kind==='bath'?'bathe':'chair-sit'):chatting?null:task?.arrived?task.action:null,context);
 }
 return {
  owns:n=>actors.has(n.station.id),
  update(dt,t,state={}) {
   if(disposed)return;time+=dt;playerState=state;spawn();
   for(const n of actors.values())n.walking=false;
   for(const [id,n]of guests){const v=board.getVisit(id);if(v)scheduleGuest(n,v);}
   scheduleWorkers();for(const task of [...tasks.values()])if(tasks.get(task.actor.station.id)===task)tickTask(task,dt);
   for(const [id,n]of [...guests])if(board.getVisit(id)?.stage==='departed')removeGuest(n);
   for(const n of actors.values())animate(n,t);props.update(board.state(),actors);
   if(time>=checkpointAt){board.checkpoint(positions(guests));checkpointAt=time+5;}
  },
  // Player furniture use may move a waiting guest out of a chair; pools retain
  // per-seat ownership. The host uses the same playerRequest call as before.
  playerRequest(id) {
   for(const n of guests.values())if(n.serviceMount?.id===id&&n.serviceMount.kind!=='bath') {
    if(unmount(n)){clear(n);cooldowns.set(n.station.id,time+2);}
   }
  },
  isYieldingFor:id=>[...guests.values()].some(n=>n.serviceMount?.id===id&&n.serviceMount.kind!=='bath'),
  cancelVisit(id,reason='visit-cancelled') {
   const n=guests.get(id);if(!n||!unmount(n))return false;
   for(const job of board.state().claims)if(job.visitId===id){const worker=actors.get(job.workerId);if(worker)clear(worker,{releaseJob:true});}
   clear(n);furniture.releaseActor(id);board.cancel(id,reason);changeWardrobe(n,board.getVisit(id).appearance);
   scheduleGuest(n,board.getVisit(id));return true;
  },
  state:()=>({...board.state(),history:history.slice(),failures:failures.slice(),actors:[...actors].map(([id,n])=>({id,name:n.station.npcName,position:n.root.position.toArray(),job:n.serviceTask?.label,mounted:n.serviceMount?.id||null,walking:n.walking}))}),
  dispose() {
   if(disposed)return;board.checkpoint(positions(guests));disposed=true;
   for(const n of actors.values()){clear(n,{releaseJob:true});furniture.releaseActor(n.station.id);n.serviceMount=null;}
   board.dispose();props.dispose();for(const n of guests.values())removeVisitor(n);guests.clear();actors.clear();
  },
 };
}
