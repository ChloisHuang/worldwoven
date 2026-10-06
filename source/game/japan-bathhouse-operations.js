import {reserveNpcBed,occupyNpcBed} from './npc-bed-occupancy.js';
import {createJapanTableServiceDuty} from './japan-table-service-duty.js';
import {createJapanKitchenDuty} from './japan-kitchen-duty.js';
import {createJapanBathMixingDuty} from './japan-bath-mixing-duty.js';
import {createJapanBathDeliveryDuty} from './japan-bath-delivery-duty.js';
import {createJapanReceptionDuty} from './japan-reception-duty.js';
import {createOnsenTransition} from './onsen-transitions.js';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P,JAPAN_SERVICE_WORKERS,JAPAN_LOCAL_WORKERS,japanReceptionReady} from './japan-service-orders.js';
import {createJapanVisitorIdentity,isJapanEmployeeInteraction} from './japan-visitors.js';
import {createJapanServiceProps} from './japan-service-props.js';
import {followActorRoute,findActorStandPoint} from './actor-navigation.js';
import {createJapanStaffLife} from './japan-staff-life.js';
import {createJapanPlayerService} from './japan-player-service.js';

const WORKERS=[...new Set(Object.values(JAPAN_SERVICE_WORKERS).flat())];
const point=a=>({x:a[0],y:a[1],z:a[2]});
const near=(p,a,r=.08)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.35;
const positions=actors=>Object.fromEntries([...actors].map(([id,n])=>[id,(n.serviceMount?n.serviceMount.position:n.root.position.toArray()).slice()]));
const LABELS={arriving:'沿参道来到汤馆','check-in':'等前台登记并发浴牌',changing:'拿着浴牌去更衣',washing:'洗净后再入汤','waiting-bath':'等自己的浴包送到汤室',bathing:'坐进共享池座泡汤',drying:'擦干并换回旅途衣着',resting:'在休息廊坐下歇脚',dining:'点一碗汤面','waiting-meal':'等后厨做好自己的汤面',eating:'吃刚刚送来的汤面',checkout:'向前台归还浴牌','checkout-ready':'等前台收回浴牌',leaving:'沿参道离开汤馆'};
const JOBS={register:{label:'记入客簿并递出浴牌',duration:2.5,action:'calligraphy',receptionWriting:true,workTarget:P.receptionLedger},prepare:{label:'按浴牌配制草木浴包',duration:4,action:'herb-mix',workTarget:P.blendWork},deliverMix:{label:'把对应浴包送到汤室',duration:1.3},cook:{label:'为来客煮一碗汤面',duration:6,action:'ramen',workTarget:[2.1,1.47,-13.4]},wash:{label:'收回原客餐盘并在厨房清洗',duration:2,action:'tidy',workTarget:P.mealTray},serve:{label:'把热汤面送给点餐来客',duration:1.5},checkout:{label:'在客簿销号并收回浴牌',duration:2,action:'calligraphy',receptionWriting:true,workTarget:P.receptionLedger}};

// Replaces (never runs beside) the earlier four-resident demonstration routine.
// The host supplies the existing movement/door/wardrobe code and lifecycle
// callbacks so spawned visitors join the ordinary labels, culling and disposal.
export function createJapanBathhouseOperations({npcs,lot,furniture,planPath,doors,moveActor,poseContext,changeWardrobe,createVisitor,removeVisitor,worldSeed=1,npcShapeVersion=1,saved={},saveState=()=>{},sharedNeeds=null,getToilet=()=>null,beginInteraction=()=>null,onInteraction=()=>{}}) {
 const checkpoint=saved.continuity?.version===1?saved.continuity:null;if(checkpoint?.board)saved={...saved,...checkpoint.board,staffLife:{...(checkpoint.staffLife||saved.staffLife),...(saved.staffLife?.mealSerial!==undefined?{mealSerial:saved.staffLife.mealSerial,mealReceipts:saved.staffLife.mealReceipts}: {})}};
 const residents=new Map(npcs.map(n=>[n.station.id,n]));
 if(WORKERS.some(id=>!residents.has(id)))return null;
 if(!furniture.resolveBath||!furniture.facilities)throw new Error('Bathhouse operations require shared pool seats');
 const restSeats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 if(restSeats.length<2)return null;
 const workers=[...WORKERS,...JAPAN_LOCAL_WORKERS].map(id=>residents.get(id)).filter(Boolean),guests=new Map(),actors=new Map(workers.map(n=>[n.station.id,n])),tasks=new Map(),cooldowns=new Map();
 let staffLife=null,receptionDuty=null,deliveryDuty=null,womenDeliveryDuty=null,mixingDuty=null,kitchenDuty=null,tableServiceDuty=null;
 const board=createJapanServiceOrders({saved,worldSeed,preservePhysical:!!checkpoint,saveState:state=>saveState({...state,staffLife:staffLife?.snapshot()||saved.staffLife}),capacity:2}),props=createJapanServiceProps(lot.group);
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let playerState={},playerCustomerService=null,disposed=false,time=0,nextArrival=0,checkpointAt=5;
 const history=[],failures=[];
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const record=(visit,event)=>{history.push({visit,event,time:+time.toFixed(2)});if(history.length>48)history.shift();};
 const restSeat=v=>furniture.items.find(i=>i.id===v.restSeatId)||restSeats[(v.number-1)%2];
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 function unmount(n) {
  if(n.bathTransition){n.bathTransition.requestExit();return false;}
  if(!n.serviceMount)return true;
  const landing=findActorStandPoint(n,n.serviceMount,({ignoreDynamicBodies})=>furniture.standPoint(undefined,ignoreDynamicBodies?[...(doors?.cameraColliders||[])]:safety(n),n.serviceMount,n.collisionRadius??.25));if(!landing)return false;
  if(n.serviceMount.bathEntry){n.bathTransition=createOnsenTransition({item:n.serviceMount,position:n.root.position,yaw:n.root.rotation.y,direction:'exit',landing});return false;}
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
  if(!checkpoint&&['resting','dining','waiting-meal','eating'].includes(v.stage))n.root.position.set(...restSeat(v).position);
  if(['washing','waiting-bath','bathing','drying'].includes(v.stage))outfit(n,v,true);
  if(['check-in','checkout-ready'].includes(v.stage))furniture.facilities.request('japan-service-reception',v.id);
  return n;
 }
 function removeGuest(n) {
  const id=n.station.id;clear(n);furniture.releaseActor(id);guests.delete(id);actors.delete(id);removeVisitor(n);board.forgetFinished([id]);nextArrival=Math.max(nextArrival,time+18);
 }
 for(const v of board.state().visits)if(v.customerType!=='player')addGuest(v);
 const customerActor=id=>guests.get(id)||(board.getVisit(id)?.customerType==='player'?playerCustomerService?.actor():null);
 function spawn() {
  if(guests.size>=2||time<nextArrival)return;
  if([...guests.values()].some(n=>near(n.root.position,P.arrival,1.1)))return;
  const identity=createJapanVisitorIdentity(board.nextIdentity(),worldSeed,npcShapeVersion);
  const used=new Set(board.state().visits.filter(v=>v.customerType!=='player').map(v=>v.restSeatId)),seat=restSeats.find(s=>!used.has(s.id));if(!seat)return;
  const visit=board.spawn({...identity,restPoint:seat.anchor,diningPoint:seat.anchor,servePoint:[seat.position[0]+.7,seat.position[1],seat.position[2]-.12],restSeatId:seat.id});
  if(visit){addGuest(visit);record(visit.id,'spawned');nextArrival=time+14;}
 }
 function abortTask(task,reason) {
  const n=task.actor;failures.push({actor:n.station.id,reason,time:+time.toFixed(2),position:n.root.position.toArray(),destination:task.to.slice(),next:n.route[0]||null,player:playerState.position?.toArray?.()||null});if(failures.length>8)failures.shift();
  if(task.staffLife){clear(n);staffLife?.abort(n);cooldowns.set(n.station.id,time+3);return;}
  clear(n,{releaseJob:true});furniture.releaseActor(n.station.id);cooldowns.set(n.station.id,time+3);
 }
 function tickTask(task,dt) {
  const n=task.actor;n.walking=false;
  if(n.bathTransition){
   const crossing=n.bathTransition,pose=crossing.update(dt);n.root.position.fromArray(pose.position);n.root.rotation.y=pose.yaw;
   if(crossing.done){
    n.bathTransition=null;
    if(crossing.endpoint==='seat'){n.serviceMount=crossing.item;task.arrived=true;if(task.onArrive?.()===false)abortTask(task,'arrival precondition changed');}
    else{n.serviceMount=null;furniture.releaseActor(n.station.id);if(n.cancelVisitReason)finishVisitCancellation(n,n.cancelVisitReason);}
   }
   return;
  }
  if(task.orderJobId&&!board.state().claims.some(j=>j.id===task.orderJobId&&j.workerId===n.station.id)){clear(n);return;}
  if(isJapanEmployeeInteraction(n,playerState)){tell(n,'先陪你聊一会儿');return;}
  tell(n,task.label||'稍作等候');
  if(task.after&&!task.after())return;
  if(!task.arrived) {
   if(near(n.root.position,task.to,task.arrivalRadius??.08)) {
    n.route=[];task.arrived=true;task.stalled=0;
    if(task.mount) {
     if(task.mount.kind==='bed'){const bed=reserveNpcBed(furniture,task.mount,n.station.id);if(!bed){task.arrived=false;return;}task.mount=bed;}
     const allowed=task.mount.kind!=='seat'?furniture.canUse(navigation,safety(n),task.mount):furniture.canSit(navigation,safety(n),task.mount);
     if(!allowed){task.arrived=false;return;}
     if(task.mount.kind==='bed'&&!occupyNpcBed(furniture,task.mount,n.station.id)){abortTask(task,'bed reservation lost');return;}
     if(task.mount.kind==='bath'&&!furniture.occupyBath(task.mount,n.station.id)){abortTask(task,'seat reservation lost');return;}
     if(task.mount.bathEntry){n.bathTransition=createOnsenTransition({item:task.mount,position:n.root.position,yaw:n.root.rotation.y});task.arrived=false;return;}
     n.root.position.set(...task.mount.anchor);n.root.rotation.y=task.mount.yaw;n.serviceMount=task.mount;
    }
    if(task.onArrive?.()===false){abortTask(task,'arrival precondition changed');return;}
   }else {
    if(!task.routeSet){n.route=planPath(n.root.position,point(task.to),.25);task.routeSet=true;}
    // Jobs own destinations/timing; ordinary walking shares the same full-body
    // route follower and local grid rejoin as every other actor.
    const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:playerState.position,radius:.25,speedScale:.82,arrivalTolerance:.025});
    if(step.waiting&&!step.blocked){task.stalled=0;return;}
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
  const v=board.getVisit(job.visitId),dish=v.dishId==='sushi'?'寿司拼盘':'汤面',config={...JOBS[job.kind],...(job.kind==='cook'&&v.dishId==='sushi'?{label:'为来客制作寿司拼盘',action:'sushi',workTarget:[-6.6,1.18,-13.65]}:{}),...(job.kind==='serve'?{label:`把${dish}送给点餐来客`}:{})},carrying=!!job.itemId;
  const complete=()=>{
   const guest=customerActor(job.visitId),ok=board.complete(job.id,n.station.id,{position:n.root.position.toArray(),guestPosition:guest?.root.position.toArray(),itemId:job.itemId,tokenId:job.tokenId||v.tokenId});
   if(ok){staffLife?.workCompleted(n.station.id,job,v);record(job.visitId,job.kind);if(job.kind==='wash')board.forgetFinished([job.visitId]);if(['register','checkout'].includes(job.kind))furniture.facilities.release('japan-service-reception',job.visitId);}
   return ok;
  };
  const held=carrying&&board.state().items.some(i=>i.id===job.itemId&&i.location.type==='worker'&&i.location.id===n.station.id);
  if(held){const target=job.to==='dining'?v.servePoint:P[job.to];assign(n,target,{...config,orderJobId:job.id,label:`${config.label} · ${v.number}号`,handoff:true,face:job.to==='dining'?v.diningPoint:null,ready:()=>job.kind!=='serve'||board.getVisit(v.id)?.stage==='waiting-meal',onDone:complete});}
  else if(carrying)assign(n,job.from==='dining'?v.servePoint:board.state().items.find(i=>i.id===job.itemId)?.location.id==='wrong-table'?board.getVisit(board.state().items.find(i=>i.id===job.itemId).location.targetVisitId).servePoint:P[job.from],{orderJobId:job.id,label:`领取第 ${v.number} 号${job.kind==='serve'?dish:'浴包'}`,duration:.8,face:job.kind==='wash'?v.diningPoint:job.kind==='serve'?(v.dishId==='sushi'?P.sushiTray:P.mealTray):P.mixtureTray,onDone:()=>{
   if(!board.pickup(job.id,n.station.id,{position:n.root.position.toArray()}))return false;
   const target=job.to==='dining'?v.servePoint:P[job.to];
   assign(n,target,{...config,orderJobId:job.id,label:`${config.label} · ${v.number}号`,handoff:true,face:job.to==='dining'?v.diningPoint:null,ready:()=>job.kind!=='serve'||board.getVisit(v.id)?.stage==='waiting-meal',onDone:complete});
   return true;
  }});
  else assign(n,P[job.to],{...config,orderJobId:job.id,label:`${config.label} · ${v.number}号`,ready:()=>!['register','checkout'].includes(job.kind)||japanReceptionReady(customerActor(v.id)?.root.position,v.customerType),onDone:complete});
 }
 function scheduleWorkers() {
  for(const n of workers) {
   if((cooldowns.get(n.station.id)||0)>time||(staffLife&&!staffLife.canWork(n.station.id)))continue;
   let current=tasks.get(n.station.id);
   if(current&&!current.idle)continue;
   if(tableServiceDuty?.holdsHost()&&n.station.id==='jp-ramen'||kitchenDuty?.holdsHost()&&n.station.id==='jp-sushi'||receptionDuty?.holdsHost()&&n.station.id==='jp-welcome'||deliveryDuty?.holdsHost()&&n.station.id==='jp-onsen'||womenDeliveryDuty?.holdsHost()&&n.station.id==='jp-women-onsen'||mixingDuty?.holdsHost()&&n.station.id==='jp-incense')continue;
   const available=board.jobs().filter(j=>!j.workerId&&!tableServiceDuty?.blocksWorker(n.station.id,j.kind)&&!kitchenDuty?.blocksWorker(n.station.id,j.kind)&&!receptionDuty?.blocksWorker(n.station.id)&&!deliveryDuty?.blocksWorker(n.station.id)&&!womenDeliveryDuty?.blocksWorker(n.station.id)&&!mixingDuty?.blocksWorker(n.station.id)&&(!staffLife||staffLife.canClaim(n.station.id,j.kind))),job=available.map(j=>board.claim(j.id,n.station.id)).find(Boolean);
   if(job){clear(n);workerTask(n,job);}
   else {
    const home=tableServiceDuty?.idlePoint(n.station.id)||kitchenDuty?.idlePoint(n.station.id)||staffLife?.idlePoint(n.station.id)||n.home.toArray(),target=n.station.workTarget;
    // Work only at this resident's authored post. Shift waiting/relief points
    // may be in the same room, but do not put their original tools there.
    const ownPost=near(point(home),n.home.toArray(),.08),validTarget=Array.isArray(target)&&target.length===3&&target.every(Number.isFinite);
    const idle=tableServiceDuty?.idleTask(n.station.id)||kitchenDuty?.idleTask(n.station.id)||staffLife?.idleTask(n.station.id)||(validTarget?{duration:4,face:target,...(ownPost?{action:n.station.npcAction,workTarget:target,label:n.station.id==='jp-welcome'?'整理柜台钥匙与客簿':n.station.npcLabel}:{label:n.station.id==='jp-welcome'?'查看柜台钥匙与客簿':'查看药房称量台与浴包'})}:null);
    // Coverage ending or displacement immediately releases the old idle.
    if(current&&(!near(point(current.to),home,.08)||(current.arrived&&!near(n.root.position,current.mount?.anchor||home,.18)))){if(!unmount(n))continue;clear(n);furniture.releaseActor(n.station.id);current=null;}
    // Keep the pose across its work cycle boundary; orders/handoffs above own
    // interruption, so clearing every four seconds would only flicker tools.
    if(!current&&(!near(n.root.position,home,.18)||idle)){
     if(idle?.mount&&!furniture.facilities.request(idle.mount.id,n.station.id))continue;
     assign(n,home,{idle:true,arrived:!!idle?.mount&&n.serviceMount?.id===idle.mount.id,onDone:()=>false,label:'收好用具，回到值班岗位',...idle});
    }
   }
  }
 }
 function queueAtReception(n,v,event) {
  if(!furniture.facilities.request('japan-service-reception',v.id)) {
   const to=[restSeat(v).center[0]<0?-2.7:-1.6,0,8.2];
   if(!near(n.root.position,to,.15))assign(n,to,{label:'等前一位来客办完登记'});
   return;
  }
  assign(n,P.reception,{label:LABELS[v.stage],onDone:event?()=>guestEvent(n,event):()=>true});
 }
 function scheduleGuest(n,v) {
  if(tasks.has(v.id)||(cooldowns.get(v.id)||0)>time)return;
  const dish=v.dishId==='sushi'?'寿司拼盘':'热汤拉面',label=({dining:`点好${dish}，等候上菜`,'waiting-meal':`等厨房做好自己的${dish}`,eating:`吃刚送来的${dish}`})[v.stage]||LABELS[v.stage];
  tell(n,`${v.name} · ${v.number}号 · ${label||''}`);
  const side=v.side,seat=restSeat(v),step=(event,to,options={})=>assign(n,to,{label,onDone:()=>guestEvent(n,event),...options});
  if(v.stage==='arriving')queueAtReception(n,v,'arrived');
  else if(v.stage==='changing'||v.stage==='drying') {
   if(!furniture.facilities.request(`japan-service-changing-${side}`,v.id))return;
   step(v.stage==='changing'?'changed':'dried',P[side+'Changing'],{duration:3,action:'tidy',held:'cloth',face:side==='men'?[-11.32,3.8,2.4]:[6.3,3.8,2.4],onDone:()=>{
    outfit(n,v,v.stage==='changing');furniture.facilities.release(`japan-service-changing-${side}`,v.id);return guestEvent(n,v.stage==='changing'?'changed':'dried');
   }});
  }else if(v.stage==='washing') {
   if(!furniture.facilities.request(`japan-service-washing-${side}`,v.id))return;
   step('washed',P[side+'Washing'],{duration:3.5,action:'bath-attendant',workTarget:side==='men'?[-10.35,4.6,-3.7]:[4.6,4.6,-4.15],onDone:()=>{furniture.facilities.release(`japan-service-washing-${side}`,v.id);return guestEvent(n,'washed');}});
  }else if(v.stage==='waiting-bath'||v.stage==='bathing') {
   if(v.stage==='waiting-bath'&&(side==='women'?womenDeliveryDuty:deliveryDuty)?.awaitsGuest(v.id)){const receive=P[side+'Receive'];if(!near(n.root.position,receive,.15))assign(n,receive,{label:`在${side==='women'?'女汤':'男汤'}服务交接点等自己的原号浴包`});return;}
   const mixture=board.state().items.find(i=>i.id===v.mixtureId);
   const pool=furniture.items.find(i=>i.id===v.poolId);
   const bath=v.stage==='bathing'&&n.serviceMount?.id===v.seatId?n.serviceMount:mixture?.location.id===side+'Service'?furniture.resolveBath(pool,v.id,s=>!playerState.facilityId||playerState.facilityId!==s.id):null;
   if(!bath){const wait=[(side==='men'?-4.3:1.3)+(v.number%2)*.8,3.8,-4.7];if(!near(n.root.position,wait,.15))assign(n,wait,{label:LABELS[v.stage]});return;}
   assign(n,bath.position,{label:LABELS.bathing,mount:bath,action:'bathe',duration:10,arrived:v.stage==='bathing'&&!!n.serviceMount,onArrive:()=>{
    const ok=board.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId:bath.id,position:bath.position});if(ok)record(v.id,'bath-mounted');return ok;
   },onDone:()=>{if(!unmount(n)){tell(n,'等池边通道让开再离池');return false;}return guestEvent(n,'bathed',{seatId:bath.id});}});
  }else if(['resting','dining','waiting-meal','eating'].includes(v.stage)) {
   if(!n.serviceMount) {
    if(playerState.facilityId===seat.id||!furniture.facilities.request(seat.id,v.id))return;
    assign(n,seat.position,{label,mount:seat,action:'chair-sit',duration:0});return;
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
 function finishVisitCancellation(n,reason){
  const id=n.station.id;n.cancelVisitReason=null;
  for(const job of board.state().claims)if(job.visitId===id){const worker=actors.get(job.workerId);if(worker)clear(worker,{releaseJob:true});}
  clear(n);furniture.releaseActor(id);board.cancel(id,reason);changeWardrobe(n,board.getVisit(id).appearance);
  scheduleGuest(n,board.getVisit(id));return true;
 }
 function animate(n,t) {
  const toiletPose=getToilet()?.actorPose(n);
  if(toiletPose){tell(n,getToilet().label(n.station.id));n.animate(t+n.phase,false,toiletPose.action,{...poseContext(n,null),...toiletPose.context});return;}
  const task=tasks.get(n.station.id),v=guests.has(n.station.id)?board.getVisit(n.station.id):null,mount=n.serviceMount||n.bathTransition?.item;
  const helping=isJapanEmployeeInteraction(n,playerState),chatting=helping&&playerState.conversationActorId===n.station.id,sharedActivity=helping&&!chatting;
  const context=poseContext(n,sharedActivity?n.station:chatting?null:task?.workTarget?{workTarget:task.workTarget}:null);
  context.bathTransition=n.bathTransition?.sample()||null;
  if(mount){context.visualFloorOffset=['bath','bed'].includes(mount.kind)?0:context.visualFloorOffset;context.seatHeight=mount.seatY===undefined?undefined:mount.seatY-n.root.position.y-context.visualFloorOffset;context.supportY=mount.supportY;context.bathPose=mount.bathPose;context.bathHipHeight=mount.bathHipHeight;context.lieSupport=mount.lieSupport;context.lieOffset=mount.lieOffset;context.liePillowZ=mount.liePillowZ;context.lieSurfaceHeightAt=mount.kind==='bed'?(x,z)=>furniture.bedSupportAt(mount,x,z):undefined;}
  context.receptionWriting=!helping&&!!task?.arrived&&!!task?.receptionWriting;
  context.heldProp=sharedActivity?null:task?.held||null;context.handoff=!sharedActivity&&(!!task?.handoff||v?.stage==='eating');
  context.seatedMeal=!chatting&&(v?.stage==='eating'||task?.seatedMeal)&&mount?.kind==='seat';
  const working=!n.walking&&task?.arrived&&(!task.idle||near(n.root.position,mount?.anchor||task.to,.18));
  n.animate(t+n.phase,n.walking,sharedActivity?n.station.npcAction:mount?(mount.kind==='bath'?'bathe':mount.kind==='bed'?'lie-rest':mount.poseAction||'chair-sit'):chatting?null:working?task.action:null,context);
 }
 staffLife=createJapanStaffLife({beginInteraction,onInteraction,getMeetingHeld:id=>id==='jp-ramen'&&tableServiceDuty?.holdsHost()||id==='jp-sushi'&&kitchenDuty?.holdsHost()||id==='jp-welcome'&&receptionDuty?.holdsHost()||id==='jp-onsen'&&deliveryDuty?.holdsHost()||id==='jp-women-onsen'&&womenDeliveryDuty?.holdsHost()||id==='jp-incense'&&mixingDuty?.holdsHost(),getReceptionCoverage:()=>receptionDuty?.isCovering()||false,getExternalCoverage:(id,kind)=>tableServiceDuty?.coversWorker(id,kind)||kitchenDuty?.coversWorker(id,kind)||deliveryDuty?.coversWorker(id,kind)||womenDeliveryDuty?.coversWorker(id,kind)||['jp-incense','jp-herb-workshop'].includes(id)&&mixingDuty?.isCovering()||false,sharedNeeds,getToilet,saveState:state=>saveState({...board.state(),staffLife:state}),onMealReceipt:receipt=>!sharedNeeds||sharedNeeds.mealReceipts([receipt])||(sharedNeeds.snapshot().people[receipt.actorId]?.receipts['japan-staff-meal']||0)>=receipt.number,actors,board,furniture,assign,clear,unmount,taskOf:n=>tasks.get(n.station.id),changeWardrobe,worldSeed,canReach:(n,to)=>near(n.root.position,to)||planPath(n.root.position,point(to),.25).length>0,saved:saved.staffLife});
 return {
  owns:n=>actors.has(n.station.id),
  socialStatus(n){const task=tasks.get(n.station.id),need=sharedNeeds?.status(n.station.id),busy=!!(n.serviceMount||n.bathTransition||task&&!task.idle||task?.held||task?.handoff||need?.seekMeal||need?.seekToilet||board.workerBusy(n.station.id));return {busy,canPause:!busy,attention:!busy,job:task?.label||n.station.npcLabel};},
  connectPlayerService(options) {return playerCustomerService??=createJapanPlayerService({...options,board,furniture,continuity:checkpoint?.playerService});},
  connectTableServiceDuty(options){return tableServiceDuty??=createJapanTableServiceDuty({...options,board,actors,assign,clear,unmount,planPath,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>staffLife,customerActor,onComplete:record});},
  connectKitchenDuty(options){return kitchenDuty??=createJapanKitchenDuty({...options,board,actors,assign,clear,unmount,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>staffLife,onComplete:record});},
  connectMixingDuty(options){return mixingDuty??=createJapanBathMixingDuty({...options,board,actors,assign,clear,unmount,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>staffLife,onComplete:record});},
  connectDeliveryDuty(options){const side=options.side||'men',existing=side==='women'?womenDeliveryDuty:deliveryDuty;if(existing)return existing;const duty=createJapanBathDeliveryDuty({...options,side,board,actors,assign,clear,unmount,planPath,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>staffLife,customerActor,onComplete:record});if(side==='women')womenDeliveryDuty=duty;else deliveryDuty=duty;return duty;},
  connectReceptionDuty(options){return receptionDuty??=createJapanReceptionDuty({...options,board,actors,assign,clear,unmount,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>staffLife,customerActor,furniture,onComplete:record});},
  update(dt,t,state={}) {
   if(disposed)return;time+=dt;playerState=state;playerCustomerService?.update(dt);spawn();
   for(const n of actors.values())n.walking=false;
   for(const [id,n]of guests){const v=board.getVisit(id);if(v)scheduleGuest(n,v);}
   receptionDuty?.update(dt);deliveryDuty?.update(dt);womenDeliveryDuty?.update(dt);mixingDuty?.update(dt);kitchenDuty?.update(dt);tableServiceDuty?.update(dt);staffLife?.update(dt,playerState);scheduleWorkers();for(const task of [...tasks.values()])if(tasks.get(task.actor.station.id)===task)tickTask(task,dt);
   for(const [id,n]of [...guests])if(board.getVisit(id)?.stage==='departed')removeGuest(n);
   for(const n of actors.values())animate(n,t);
   const propActors=new Map(actors),playerVisit=playerCustomerService?.state().visit;
   if(playerVisit?.present&&playerCustomerService.actor())propActors.set(playerVisit.id,playerCustomerService.actor());
   if(deliveryDuty?.actor())propActors.set('player',deliveryDuty.actor());
   if(womenDeliveryDuty?.actor())propActors.set('player',womenDeliveryDuty.actor());
   if(tableServiceDuty?.actor())propActors.set('player',tableServiceDuty.actor());
   if(kitchenDuty?.actor())propActors.set('player',kitchenDuty.actor());
   if(mixingDuty?.actor())propActors.set('player',mixingDuty.actor());
   props.update(board.state(),propActors,staffLife?.meals());
   if(time>=checkpointAt){board.checkpoint(positions(guests));checkpointAt=time+5;}
  },
  // Player furniture use may move a waiting guest out of a chair; pools retain
  // per-seat ownership. The host uses the same playerRequest call as before.
  playerRequest(id) {
   staffLife?.playerRequest(id);
   for(const n of guests.values())if(n.serviceMount?.id===id&&!['bath','bed'].includes(n.serviceMount.kind)) {
    if(unmount(n)){clear(n);cooldowns.set(n.station.id,time+2);}
   }
  },
  isYieldingFor:id=>[...actors.values()].some(n=>n.serviceMount?.id===id&&!['bath','bed'].includes(n.serviceMount.kind)),
  cancelVisit(id,reason='visit-cancelled') {
   const n=guests.get(id);if(!n)return false;n.cancelVisitReason=reason;
   if(!unmount(n))return false;
   return finishVisitCancellation(n,reason);
  },
  socialProfile:id=>staffLife?.socialProfile(id),
  snapshot:()=>({version:1,board:board.state(),time,nextArrival,checkpointAt,staffLife:staffLife?.snapshot(),staffRuntime:staffLife?.continuity(),playerService:playerCustomerService?.snapshot(),receptionDuty:receptionDuty?.snapshot(),deliveryDuty:deliveryDuty?.snapshot(),womenDeliveryDuty:womenDeliveryDuty?.snapshot(),mixingDuty:mixingDuty?.snapshot(),kitchenDuty:kitchenDuty?.snapshot(),tableServiceDuty:tableServiceDuty?.snapshot(),cooldowns:[...cooldowns],tasks:[...tasks].map(([id,t])=>({id,to:t.to.slice(),orderJobId:t.orderJobId||null,staffLife:!!t.staffLife,idle:!!t.idle,elapsed:t.elapsed,arrived:t.arrived,mountId:t.mount?.id||null,mountBerthId:t.mount?.berthId||null})),transitions:[...actors].filter(([,n])=>n.bathTransition).map(([id,n])=>[id,n.bathTransition.snapshot()]),history:history.slice()}),
  restore(s){
   if(s?.version!==1)return false;time=Math.max(0,s.time||0);nextArrival=Math.max(time,s.nextArrival||0);checkpointAt=Math.max(time,s.checkpointAt||0);cooldowns.clear();for(const [id,t]of s.cooldowns||[])if(actors.has(id)&&Number.isFinite(t))cooldowns.set(id,t);history.splice(0,history.length,...(s.history||[]));
   playerCustomerService?.restore(s.playerService);board.restoreClaims(s.board?.claims);staffLife?.restore(s.staffRuntime);receptionDuty?.restore(s.receptionDuty);deliveryDuty?.restore(s.deliveryDuty);womenDeliveryDuty?.restore(s.womenDeliveryDuty);mixingDuty?.restore(s.mixingDuty);kitchenDuty?.restore(s.kitchenDuty);tableServiceDuty?.restore(s.tableServiceDuty);
   for(const job of board.state().claims){const n=actors.get(job.workerId);if(n)workerTask(n,job);}
   for(const [id,n]of guests){const v=board.getVisit(id);if(v)scheduleGuest(n,v);}
   staffLife?.update(0,{night:!!s.staffRuntime?.night});scheduleWorkers();
   for(const previous of s.tasks||[]){const t=tasks.get(previous.id);if(!t||t.orderJobId!==(previous.orderJobId||undefined)||t.to.some((v,i)=>Math.abs(v-previous.to[i])>.05))continue;t.elapsed=Math.max(0,previous.elapsed||0);t.arrived=!!previous.arrived&&(t.mount?.kind!=='bed'||t.actor.serviceMount?.id===t.mount.id&&t.actor.serviceMount?.berthId===t.mount.berthId&&(!previous.mountBerthId||previous.mountBerthId===t.mount.berthId)&&occupyNpcBed(furniture,t.mount,t.actor.station.id));t.routeSet=false;t.stalled=0;t.actor.route=[];}
   for(const [id,state]of s.transitions||[]){const n=actors.get(id),item=furniture.items.flatMap(i=>[i,...(i.seats||[])]).find(i=>i.id===state.seatId);if(n&&item?.bathEntry){furniture.facilities.reserve(item.poolId||item.id,id,{eligible:seat=>seat===item.id});furniture.occupyBath(item,id);n.bathTransition=createOnsenTransition({item,saved:state});}}
   return true;
  },
  state:()=>({...board.state(),receptionDuty:receptionDuty?.dutyState()||null,deliveryDuty:deliveryDuty?.dutyState()||null,womenDeliveryDuty:womenDeliveryDuty?.dutyState()||null,mixingDuty:mixingDuty?.dutyState()||null,kitchenDuty:kitchenDuty?.dutyState()||null,tableServiceDuty:tableServiceDuty?.dutyState()||null,staffLife:staffLife?.state()||null,history:history.slice(),failures:failures.slice(),actors:[...actors].map(([id,n])=>({id,name:n.station.npcName,position:n.root.position.toArray(),job:n.serviceTask?.label,mounted:n.serviceMount?.id||null,bathTransition:n.bathTransition?.state()||null,walking:n.walking}))}),
  dispose({suspend=false}={}) {
   if(disposed)return;receptionDuty?.dispose();deliveryDuty?.dispose();womenDeliveryDuty?.dispose();mixingDuty?.dispose();kitchenDuty?.dispose();tableServiceDuty?.dispose();playerCustomerService?.suspend({preserve:suspend});if(!suspend)board.checkpoint(positions(guests));disposed=true;
   for(const n of actors.values()){clear(n,{releaseJob:!suspend});furniture.releaseActor(n.station.id);n.serviceMount=null;n.bathTransition=null;}
   board.dispose({suspend});staffLife?.dispose();props.dispose();for(const n of guests.values())removeVisitor(n);guests.clear();actors.clear();
  },
 };
}
