import {blocked} from './navigation.js';

// A single reservation, mounted action and durable completion outbox shared by
// regional adapters. Routes remain owned by each actor's existing controller;
// only the final mount/dismount within the authored private enclosure is local.
const copy=x=>JSON.parse(JSON.stringify(x));
const at=(actor,point,r=.12)=>{const p=actor?.root?.position;return !!p&&Math.hypot(p.x-point[0],p.z-point[2])<=r&&Math.abs(p.y-point[1])<.12;};
const finiteSeconds=dt=>Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
const retainReceipts=receipts=>receipts.filter((r,i)=>!r.delivered||i>=receipts.length-64);

/**
 * saveState is a synchronous durable write (false/throw rejects the change).
 * onCompleted must consume the receipt idempotently by id/number. An outbox
 * retries the SAME receipt after a failed callback or interrupted acknowledgement.
 * update advances only the player; visitors use updateActor with their existing
 * travel(targetArray, dt) controller. Both share one reservation and one fixture.
 */
export function createDailyToilet({facility:P,prepareLot=()=>{},lot,doors,getPlayer=()=>null,getActors=()=>[],isActorAlive=()=>true,getBusy=()=>false,getClock=()=>({day:0,hour:12}),saved={},saveState=()=>true,onCompleted=()=>true,notify=()=>{}}){
 const receiptId=number=>P.receiptSource+'-'+number;
 const validReceipt=r=>r&&Number.isSafeInteger(r.number)&&r.number>0&&r.id===receiptId(r.number)&&typeof r.actorId==='string'&&r.source===P.receiptSource&&r.facilityId===P.id&&r.completed===true;
 const target=lot?.explorationTargets?.find(t=>t.id===P.id),room=P.privacyBounds||lot?.interiorRooms?.find(r=>r.id===P.roomId);
 const atApproach=actor=>at(actor,P.approach,P.executionRadius??.12);
 const mountedAt=actor=>at(actor,P.anchor,.2)||(P.legacyAnchors||[]).some(point=>at(actor,point,.2));
 const available=!!target&&target.position.every((v,i)=>Math.abs(v-P.approach[i])<.03)&&!!room;
 if(available)prepareLot(lot);
 const receipts=Array.isArray(saved.receipts)?saved.receipts.filter(validReceipt).map(copy):[];
 const serial=Math.max(Number.isSafeInteger(saved.serial)&&saved.serial>=0?saved.serial:0,...receipts.map(r=>r.number));
 let durable={version:1,serial,receipts:retainReceipts(receipts),pending:saved.pending&&saved.pending.id===receiptId(serial)&&saved.pending.facilityId===P.id?copy(saved.pending):null,lastOutcome:saved.lastOutcome||null,waiters:Array.isArray(saved.waiters)?[...new Set(saved.waiters.filter(id=>typeof id==='string'&&id!=='player'))]:[]};
 let current=null,disposed=false,lastError=null,retryIn=0,recovery=durable.pending,abandonment=null,time=0;
 const cooldowns=new Map(),waitSeen=new Map(durable.waiters.map(id=>[id,0]));let privacyCache=null,exitCache=null;
 const idOf=actor=>actor===getPlayer()?'player':actor?.station?.id||actor?.id||null;
 const people=()=>[...new Set([getPlayer(),...(getActors()||[])].filter(Boolean))];
 const actorById=id=>people().find(a=>idOf(a)===id);
 const containsActor=actor=>{const p=actor?.root?.position;return !!room&&!!p&&Math.abs(p.y-P.approach[1])<1&&p.x>room.minX-.05&&p.x<room.maxX+.05&&p.z>room.minZ-.05&&p.z<room.maxZ+.05;};
 const roomClear=actor=>!people().some(a=>a!==actor&&containsActor(a));
 const availableFor=actor=>available&&!disposed&&!current&&!recovery&&!abandonment&&roomClear(actor)&&(!actor||!durable.waiters.length||durable.waiters[0]===idOf(actor));
 function leaveQueue(id){if(!durable.waiters.includes(id))return true;if(!persist({...durable,waiters:durable.waiters.filter(q=>q!==id)}))return false;waitSeen.delete(id);return true;}
 function waitTurn(actor){const id=idOf(actor);if(id==='player')return false;waitSeen.set(id,time);return durable.waiters.includes(id)||persist({...durable,waiters:[...durable.waiters,id]});}
 const alive=actor=>isActorAlive(actor)!==false;
 const clock=()=>{const c=getClock()||{};return {day:Number.isFinite(c.day)?c.day:0,hour:Number.isFinite(c.hour)?c.hour:12};};
 function persist(next){
  try{const result=saveState(copy(next));if(result===false||result?.then){lastError='save-failed';return false;}durable=next;lastError=null;return true;}catch{lastError='save-failed';return false;}
 }
 // Lifecycle cleanup has no physical exit: the owning population/controller
 // decides what happens to an unavailable actor. Retain the reservation and a
 // motion gate until its cancellation is durable, including before recovery.
 function abandonActor(actorId,reason='actor-unavailable'){
  if(typeof actorId!=='string'||!actorId)return false;
  if(!leaveQueue(actorId))return false;
  const old=[current,recovery,durable.pending].find(row=>row?.actorId===actorId);
  if(!old)return true;
  abandonment??={actorId,id:old.id,reason};
  if(abandonment.actorId!==actorId)return false;
  const status=durable.receipts.some(r=>r.id===old.id)?'completed':'cancelled';
  if(!persist({...durable,pending:null,lastOutcome:{id:old.id,actorId,status,reason:abandonment.reason,...clock()}}))return false;
  if(current?.actorId===actorId)current=null;
  if(recovery?.actorId===actorId)recovery=null;
  cooldowns.delete(actorId);privacyCache=null;abandonment=null;return true;
 }
 function inspectPrivacy(actor){
  if(!available)return {ok:false,reason:'facility-unavailable'};
  const states=doors?.getState?.()||[],closures=P.closures.map(id=>states.find(d=>d.id===id||d.openingId===id));
  if(closures.some((d,i)=>!d||!(P.closureKinds?.[P.closures[i]]||['door','full-curtain']).includes(d.kind)))return {ok:false,reason:'privacy-unavailable'};
  if(closures.some(d=>!Number.isFinite(d.fraction)||d.fraction>.001))return {ok:false,reason:'doors-open'};
  const other=people().find(a=>{if(a===actor)return false;const p=a.root?.position;return p&&Math.abs(p.y-P.approach[1])<1&&p.x>room.minX-.05&&p.x<room.maxX+.05&&p.z>room.minZ-.05&&p.z<room.maxZ+.05;});
  return other?{ok:false,reason:'room-occupied',actorId:idOf(other)}:{ok:true,reason:null};
 }
 // Door/room occupancy is sampled only while this one facility is in use,
 // at 4 Hz. Mount and completion recheck live state at their durable boundary.
 function privacy(actor,force=false){if(!force&&privacyCache?.actor===actor&&time-privacyCache.time<.25)return privacyCache.result;const result=inspectPrivacy(actor);privacyCache={actor,time,result};return result;}
 // The authored dismount is local to the bowl. If its usual landing is
 // occupied, find a genuinely clear landing within this same room. Never drop
 // the reservation while the body is still on the fixture.
 const penetration=(p,b,r,h)=>p[1]>=(b.maxY??Infinity)-.01||p[1]+h<=(b.minY??-Infinity)+.01?0:Math.max(0,Math.min(p[0]-b.minX+r,b.maxX+r-p[0],p[2]-b.minZ+r,b.maxZ+r-p[2]));
 const radius=actor=>actor?.collisionRadius??(actor===getPlayer() ? .34 : .25);
 const position=actor=>{const p=actor.root.position;return [p.x,p.y,p.z];};
 function exitClear(actor,p=P.approach,planning=false){
  const r=radius(actor);
  if(people().some(a=>a!==actor&&a.root?.position&&Math.abs(a.root.position.y-p[1])<1&&Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2])<r+radius(a)+.08))return false;
  return !blocked(p[0],p[2],[...(lot.colliders||[]),...(doors?.cameraColliders||[])],planning?Math.max(.39,r):r,{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,y:p[1],bodyHeight:actor?.bodyHeight??1.95});
 }
 function exitSegment(actor,from,to){
  const r=radius(actor),h=actor.bodyHeight??1.95,solids=[...(lot.colliders||[]),...(doors?.cameraColliders||[])],others=people().filter(a=>a!==actor&&a.root?.position);
  let previous=from;
  const count=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[2]-from[2])/.04));
  for(let i=1;i<=count;i++){
   const p=from.map((v,j)=>v+(to[j]-v)*i/count);p[1]=Math.max(from[1],to[1]);
   // A mounted root starts inside its own bowl/footrest. It may only reduce
   // that existing overlap, never enter another solid or cross a closed leaf.
   // Stay at the supported seat/footrest height until outside its footprint;
   // only lower to the separately validated floor landing at the end.
   if(solids.some(b=>penetration(p,b,r,h)>penetration(previous,b,r,h)+1e-7))return false;
   if(others.some(a=>{const q=position(a),gap=r+radius(a)+.08;return Math.abs(q[1]-p[1])<1&&Math.hypot(q[0]-p[0],q[2]-p[2])<gap&&Math.hypot(q[0]-p[0],q[2]-p[2])<Math.hypot(q[0]-previous[0],q[2]-previous[2])+1e-7;}))return false;
   previous=p;
  }
  return true;
 }
 function exitLanding(actor){
  const from=position(actor),valid=p=>p&&p[0]>room.minX&&p[0]<room.maxX&&p[2]>room.minZ&&p[2]<room.maxZ&&exitClear(actor,p,true)&&exitSegment(actor,from,p);
  if(exitCache?.actor===actor&&time-exitCache.time<.25)return valid(exitCache.point)?exitCache.point:null;
  const candidates=[[...P.approach]];
  for(const radius of [.4,.7,1])for(let i=0;i<40;i++)candidates.push([P.approach[0]+Math.cos(i*Math.PI/20)*radius,P.approach[1],P.approach[2]+Math.sin(i*Math.PI/20)*radius]);
  // New landing points also preserve the existing .39m route-planning
  // clearance, so a safe body cannot be stranded outside the door graph.
  const point=candidates.find(valid)||null;exitCache={actor,time,point};return point;
 }
 function release(){
  if(!current)return true;
  const c=current,{actor,mounted,id}=c;
  if(abandonment||!alive(actor))return abandonActor(c.actorId);
  if(mounted&&mountedAt(actor)){
   const landing=exitClear(actor)?P.approach:exitLanding(actor);
   if(!landing){c.stage='leaving';return false;}
   // This is the existing short, authored seat dismount, confined to the same
   // private room. Ordinary controllers still own every step to/through doors.
   actor.root.position.set(...landing);actor.root.rotation.y=P.exitYaw??-Math.PI/2;c.mounted=false;
  }
  actor.walking=false;c.stage='leaving';
  if(durable.pending?.id===id&&!persist({...durable,pending:null}))return false;
  current=null;return true;
 }
 function recover(){
  if(abandonment)return abandonActor(abandonment.actorId,abandonment.reason);
  if(!recovery)return true;
  const old=recovery,actor=actorById(old.actorId);
  if(actor&&!alive(actor))return abandonActor(old.actorId);
  if(actor&&['using','leaving'].includes(old.stage)&&mountedAt(actor)){
   if(!current)current={actor,actorId:old.actorId,id:old.id,number:old.number,stage:'leaving',mounted:true,elapsed:0,wait:0,cancelled:true,lastDriven:time};
   if(!release())return false;
  }
  const status=durable.receipts.some(r=>r.id===old.id)?'completed':'interrupted';
  if(!persist({...durable,pending:null,lastOutcome:{id:old.id,actorId:old.actorId,status,...clock()}}))return false;
  recovery=null;return true;
 }
 function deliver(){
  for(const r of durable.receipts.filter(r=>!r.delivered)){
   let result;try{const {delivered,...event}=r;result=onCompleted(copy(event));}catch{lastError='completion-not-saved';return false;}
   if(result===false||result?.ok===false||result?.then){lastError='completion-not-saved';return false;}
   const next=copy(durable),receipt=next.receipts.find(q=>q.id===r.id);receipt.delivered=true;
   if(!persist(next))return false;
  }
  return true;
 }
 function reserve(actor){
  if(disposed||!available||!actor?.root||!alive(actor)||!recover())return false;
  if(current?.actor===actor)return true;
  const actorId=idOf(actor);if(!actorId)return false;
  if(getBusy(idOf(actor),actor))return false;
  if(!availableFor(actor)){waitTurn(actor);return false;}
  if((cooldowns.get(actorId)||0)>time)return false;
  const number=durable.serial+1,id=receiptId(number),stage=atApproach(actor)?'waiting-privacy':'approaching';
  const pending={id,number,actorId,facilityId:P.id,stage,...clock()};
  if(!persist({...durable,serial:number,pending,waiters:durable.waiters.filter(id=>id!==actorId)}))return false;
  const p=actor.root.position;
  current={actor,actorId,id,number,stage,mounted:false,elapsed:0,wait:0,cancelled:false,progressPoint:[p.x,p.y,p.z],stalled:0,lastDriven:time};return true;
 }
 function cancel(reason='cancelled',actorId='player'){
  if(actorId&&!leaveQueue(actorId))return false;
  if(!current||actorId&&current.actorId!==actorId)return true;
  if(abandonment||!alive(current.actor))return abandonActor(current.actorId,reason);
  const c=current;if(c.cancelled||c.completed)return release();c.cancelled=true;c.elapsed=0;
  if(c.actorId!=='player')cooldowns.set(c.actorId,time+10);
  // A failed cancel write leaves only an interrupted reservation on disk. It
  // cannot be promoted to a completion by loading or by a later update.
  const pending=c.mounted?{id:c.id,number:c.number,actorId:c.actorId,facilityId:P.id,stage:'leaving',cancelled:true}:null;
  persist({...durable,pending,lastOutcome:{id:c.id,actorId:c.actorId,status:'cancelled',reason,...clock()}});
  return release();
 }
 function mount(){
  const c=current;if(!c)return false;if(abandonment||!alive(c.actor)){abandonActor(c.actorId);return false;}if(!atApproach(c.actor)||!privacy(c.actor,true).ok)return false;
  if(!persist({...durable,pending:{...durable.pending,stage:'using'}}))return false;
  c.stage='using';c.mounted=true;c.elapsed=0;c.actor.root.position.set(...P.anchor);c.actor.root.rotation.y=P.yaw;c.actor.walking=false;c.actor.route=[];return true;
 }
 function complete(){
  const c=current;if(!c)return false;if(abandonment||!alive(c.actor)){abandonActor(c.actorId);return false;}if(c.cancelled||!at(c.actor,P.anchor,.025)||!privacy(c.actor,true).ok)return false;
  const receipt={id:c.id,number:c.number,actorId:c.actorId,source:P.receiptSource,facilityId:P.id,completed:true,...clock(),delivered:false};
  const pending={id:c.id,number:c.number,actorId:c.actorId,facilityId:P.id,stage:'leaving',completed:true};
  const next={...durable,pending,receipts:retainReceipts([...durable.receipts,receipt]),lastOutcome:{id:c.id,actorId:c.actorId,status:'completed',...clock()}};
  if(!persist(next))return false;
  c.stage='leaving';c.completed=true;const delivered=deliver(),isPlayer=c.actorId==='player';release();if(isPlayer)notify(delivered?'如厕结束，身体轻松了一些':'如厕结束，记录正在保存');return true;
 }
 function tick(actor,dt,travel){
  if(disposed||!current||current.actor!==actor)return false;
  if(abandonment||!alive(actor))return abandonActor(current.actorId);
  const c=current;c.lastDriven=time;dt=finiteSeconds(dt);
  if(c.stage==='leaving'){release();return true;}
  if(c.stage==='approaching'){
   if(!atApproach(actor)&&travel)travel([...P.approach],dt);
   if(atApproach(actor)){c.stage='waiting-privacy';c.wait=0;actor.walking=false;actor.route=[];}return true;
  }
  if(c.stage==='waiting-privacy'){
   if(!atApproach(actor)){cancel('left-approach',c.actorId);return true;}
   actor.walking=false;c.wait+=dt;
   if(privacy(actor).ok){mount();return true;}
   if(c.wait>=15){cancel('privacy-unavailable',c.actorId);if(c.actorId==='player')notify('净室还未空闲，请稍后再来');}return true;
  }
  if(c.stage==='using'){
   actor.walking=false;
   if(!at(actor,P.anchor,.025)||!privacy(actor).ok){cancel('privacy-interrupted',c.actorId);if(c.actorId==='player')notify('如厕已中止，尚未完成');return true;}
   c.elapsed=Math.min(P.seconds,c.elapsed+dt);if(c.elapsed>=P.seconds)complete();return true;
  }
  return false;
 }
 function intent(){
  if(disposed||!available)return null;
  return {id:P.intentId,provider:P.provider,kind:'toilet',facilityId:P.id,visualAnchor:{id:P.id,point:[P.anchor[0],P.seatY+.55,P.anchor[2]]},position:[...P.approach],roomId:P.roomId,name:P.name,npcName:'日常起居',action:current?'净室使用中':'如厕',intentKey:'toilet:'+durable.serial+':'+(current?.actorId||'free'),interactionRadius:2.6,executionRadius:P.executionRadius,priority:45};
 }
 const resolveIntent=selected=>{const next=intent();return next&&selected?.provider===next.provider&&selected.id===next.id&&selected.intentKey===next.intentKey?next:null;};
 function pose(actor){return current?.actor===actor&&!abandonment&&alive(actor)&&current.mounted&&at(actor,P.anchor,.025)?{action:'chair-sit',context:{seatHeight:P.seatY-P.anchor[1],visualFloorOffset:0,heldProp:null,handoff:false,seatedMeal:false},seatY:P.seatY,anchor:[...P.anchor],yaw:P.yaw}:null;}
 function label(actorId='player'){
  if(!current||current.actorId!==actorId)return null;
  return current.stage==='approaching'?P.approachLabel:current.stage==='waiting-privacy'?P.privacyLabel:current.stage==='leaving'?'等出口让开':lastError==='save-failed'?'正在保存如厕记录':`如厕中 · ${Math.floor(current.elapsed)}/${P.seconds}秒`;
 }
 return {
  // Restore only the persisted occupant at this exact authored mount. Ordinary
  // world collision recovery must not relocate them out of the bowl first;
  // recover() then performs the original safe interruption/dismount, no relief.
  restorePosition(actorId,position){const pending=durable.pending,actor=actorById(actorId);return available&&!abandonment&&(!actor||alive(actor))&&pending?.actorId===actorId&&['using','leaving'].includes(pending.stage)&&Array.isArray(position)&&[P.anchor,...(P.legacyAnchors||[])].some(a=>a.every((v,i)=>Math.abs(v-position[i])<.025))?position.slice():null;},
  retainQueuePosition(actor){const id=idOf(actor);if(disposed||!actor?.root||!alive(actor)||!durable.waiters.includes(id))return false;waitSeen.set(id,time);return true;},
  containsActor,availableFor,queuePosition:actorId=>durable.waiters.indexOf(actorId)+1,prepareIntent(selected){if(!resolveIntent(selected)||!reserve(getPlayer()))return null;return intent();},
  exitPlan(actor){return current?.actor===actor&&current.mounted?(exitClear(actor)?[...P.approach]:exitLanding(actor)):null;},
  intent,resolveIntent,executeIntent(selected){if(!resolveIntent(selected)||!atApproach(getPlayer()))return false;const ok=reserve(getPlayer());if(!ok)notify(current?'净室有人使用，请稍后再来':'暂时无法使用净室，请稍后再试');return ok;},
  requestActor:reserve,updateActor:(actor,dt,{travel}={})=>tick(actor,dt,travel),ownsActor:actor=>!!current&&current.actor===actor||!!abandonment&&abandonment.actorId===idOf(actor),
  active:(actorId='player')=>!!(current||abandonment)&&(!actorId||(current||abandonment).actorId===actorId),cancel,abandonActor,
  actorPose:pose,playerPose:()=>pose(getPlayer()),playerAction:()=>pose(getPlayer())?.action||null,label,
  update(dt){
   if(disposed)return;dt=finiteSeconds(dt);time+=dt;recover();if(abandonment)return;
   const expired=durable.waiters.filter(id=>time-(waitSeen.get(id)??0)>30||actorById(id)&&!alive(actorById(id)));
   if(expired.length&&persist({...durable,waiters:durable.waiters.filter(id=>!expired.includes(id))}))for(const id of expired)waitSeen.delete(id);
   if(current&&!alive(current.actor)&&!abandonActor(current.actorId))return;
   retryIn-=dt;if(retryIn<=0){retryIn=1;deliver();}
   if(current?.stage==='approaching'){
    const c=current,p=c.actor.root.position;
    if(Math.hypot(p.x-c.progressPoint[0],p.y-c.progressPoint[1],p.z-c.progressPoint[2])>=.18){c.progressPoint=[p.x,p.y,p.z];c.stalled=0;}
    else c.stalled+=dt;
    // Long but progressing stair routes remain valid. A blocked route or a
    // caller that lost ownership releases the one shared fixture after 20s.
    if(c.stalled>=20)cancel('route-stalled',c.actorId);
   }else if(current?.actorId!=='player'&&time-current?.lastDriven>20)cancel('actor-controller-interrupted',current.actorId);
   if(current?.stage==='leaving')release();
   else if(current?.actorId==='player')tick(current.actor,dt);
   for(const[id,until]of cooldowns)if(until<=time)cooldowns.delete(id);
  },
  state(){return {...copy(durable),available,activity:current?{id:current.id,actorId:current.actorId,stage:current.stage,elapsed:current.elapsed,progress:current.elapsed/P.seconds,mounted:current.mounted,privacy:privacy(current.actor),label:label(current.actorId)}:null,cooldowns:[...cooldowns].map(([actorId,until])=>({actorId,seconds:Math.max(0,until-time)})),lastError,approach:[...P.approach],anchor:[...P.anchor]};},
  dispose(){if(disposed)return;if(current)cancel('left-lot',current.actorId);disposed=true;current=null;}
 };
}
