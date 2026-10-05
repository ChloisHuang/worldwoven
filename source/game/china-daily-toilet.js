import {blocked} from './navigation.js';
import {THREE,box} from './geometry.js';

// This is the existing second-floor washroom and its existing porcelain fixture.
// Ordinary routes end at its clear west-side approach. Only the final short seat
// mount is owned here; neither player nor visitors are moved across rooms/floors.
export const CHINA_DAILY_TOILET = Object.freeze({
 id:'cn-bath-toilet',provider:'china-daily-toilet',roomId:'washroom',
 approach:Object.freeze([-18.6,4.015,-6.6]),anchor:Object.freeze([-17,4.265,-6.53]),
 seatY:4.87,yaw:0,seconds:8,executionRadius:.12,
 closures:Object.freeze(['cn-bath-east','cn-bath-west','cn-bath-washroom'])
});
const P=CHINA_DAILY_TOILET,copy=x=>JSON.parse(JSON.stringify(x));
const at=(actor,point,r=.12)=>{const p=actor?.root?.position;return !!p&&Math.hypot(p.x-point[0],p.z-point[2])<=r&&Math.abs(p.y-point[1])<.12;};
const finiteSeconds=dt=>Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
const receiptId=number=>'china-toilet-'+number;
const retainReceipts=receipts=>receipts.filter((r,i)=>!r.delivered||i>=receipts.length-64);
const validReceipt=r=>r&&Number.isSafeInteger(r.number)&&r.number>0&&r.id===receiptId(r.number)&&typeof r.actorId==='string'&&r.source==='china-toilet'&&r.facilityId===P.id&&r.completed===true;
const legacyAnchor=Object.freeze([-17,4.015,-6.6]);
function addFootrest(lot){
 // The retained porcelain seat is 85.5cm above the floor. This low, solid
 // timber footrest supports the usual seated rig instead of lengthening legs
 // through the rim. It is a lot-owned furnishing, installed once per lot.
 if(lot.group.getObjectByName('China washroom seated footrest'))return;
 const g=new THREE.Group();g.name='China washroom seated footrest';lot.group.add(g);
 box(g,-17,4.1325,-6.08,.92,.235,.68,0x715741);
 box(g,-17,4.25,-6.08,.96,.03,.72,0xb19365);
 const solid={minX:-17.48,maxX:-16.52,minY:4.015,maxY:4.265,minZ:-6.44,maxZ:-5.72,chinaToiletFootrest:true};
 lot.colliders.push(solid);lot.cameraColliders?.push(solid);
 lot.walkableSurfaces.push({minX:solid.minX,maxX:solid.maxX,minZ:solid.minZ,maxZ:solid.maxZ,y:4.265,owner:g.name});
}

/**
 * saveState is a synchronous durable write (false/throw rejects the change).
 * onCompleted must consume the receipt idempotently by id/number. An outbox
 * retries the SAME receipt after a failed callback or interrupted acknowledgement.
 * update advances only the player; visitors use updateActor with their existing
 * travel(targetArray, dt) controller. Both share one reservation and one fixture.
 */
export function createChinaDailyToilet({lot,doors,getPlayer=()=>null,getActors=()=>[],getBusy=()=>false,getClock=()=>({day:0,hour:12}),saved={},saveState=()=>true,onCompleted=()=>true,notify=()=>{}}){
 const target=lot?.explorationTargets?.find(t=>t.id===P.id),room=lot?.interiorRooms?.find(r=>r.id===P.roomId);
 const available=!!target&&target.position.every((v,i)=>Math.abs(v-P.approach[i])<.03)&&!!room;
 if(available)addFootrest(lot);
 const receipts=Array.isArray(saved.receipts)?saved.receipts.filter(validReceipt).map(copy):[];
 const serial=Math.max(Number.isSafeInteger(saved.serial)&&saved.serial>=0?saved.serial:0,...receipts.map(r=>r.number));
 let durable={version:1,serial,receipts:retainReceipts(receipts),pending:saved.pending&&saved.pending.id===receiptId(serial)&&saved.pending.facilityId===P.id?copy(saved.pending):null,lastOutcome:saved.lastOutcome||null};
 let current=null,disposed=false,lastError=null,retryIn=0,recovery=durable.pending,time=0;
 const cooldowns=new Map();let privacyCache=null;
 const idOf=actor=>actor===getPlayer()?'player':actor?.station?.id||actor?.id||null;
 const people=()=>[...new Set([getPlayer(),...(getActors()||[])].filter(Boolean))];
 const actorById=id=>people().find(a=>idOf(a)===id);
 const clock=()=>{const c=getClock()||{};return {day:Number.isFinite(c.day)?c.day:0,hour:Number.isFinite(c.hour)?c.hour:12};};
 function persist(next){
  try{const result=saveState(copy(next));if(result===false||result?.then){lastError='save-failed';return false;}durable=next;lastError=null;return true;}catch{lastError='save-failed';return false;}
 }
 function inspectPrivacy(actor){
  if(!available)return {ok:false,reason:'facility-unavailable'};
  const states=doors?.getState?.()||[],closures=P.closures.map(id=>states.find(d=>d.id===id||d.openingId===id));
  if(closures.some((d,i)=>!d||!['door','full-curtain'].includes(d.kind)||i===2&&d.kind!=='full-curtain'))return {ok:false,reason:'privacy-unavailable'};
  if(closures.some(d=>!Number.isFinite(d.fraction)||d.fraction>.001))return {ok:false,reason:'doors-open'};
  const other=people().find(a=>{if(a===actor)return false;const p=a.root?.position;return p&&Math.abs(p.y-P.approach[1])<1&&p.x>room.minX-.05&&p.x<room.maxX+.05&&p.z>room.minZ-.05&&p.z<room.maxZ+.05;});
  return other?{ok:false,reason:'room-occupied',actorId:idOf(other)}:{ok:true,reason:null};
 }
 // Door/room occupancy is sampled only while this one facility is in use,
 // at 4 Hz. Mount and completion recheck live state at their durable boundary.
 function privacy(actor,force=false){if(!force&&privacyCache?.actor===actor&&time-privacyCache.time<.25)return privacyCache.result;const result=inspectPrivacy(actor);privacyCache={actor,time,result};return result;}
 function exitClear(actor){
  const p=P.approach,r=actor?.collisionRadius??.34;
  if(people().some(a=>a!==actor&&a.root?.position&&Math.abs(a.root.position.y-p[1])<1&&Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2])<r+(a.collisionRadius??.34)+.08))return false;
  return !blocked(p[0],p[2],[...(lot.colliders||[]),...(doors?.cameraColliders||[])],r,{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,y:p[1],bodyHeight:actor?.bodyHeight??1.95});
 }
 function release(){
  if(!current)return true;
  const {actor,mounted,id}=current;
  // A concurrent controller that already moved this actor must never be snapped
  // back. The mounted comparison also makes stale saves safe on lot re-entry.
  if(mounted&&(at(actor,P.anchor,.2)||at(actor,legacyAnchor,.2))){
   if(!exitClear(actor)){current.stage='leaving';return false;}
   actor.root.position.set(...P.approach);actor.root.rotation.y=-Math.PI/2;
  }
  actor.walking=false;current=null;
  if(durable.pending?.id===id)persist({...durable,pending:null});
  return true;
 }
 function recover(){
  if(!recovery)return true;
  const old=recovery,actor=actorById(old.actorId);
  if(actor&&['using','leaving'].includes(old.stage)&&(at(actor,P.anchor,.2)||at(actor,legacyAnchor,.2))){
   current={actor,actorId:old.actorId,id:old.id,number:old.number,stage:'leaving',mounted:true,elapsed:0,wait:0,cancelled:true};
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
  if(disposed||!available||!actor?.root||!recover()||current||getBusy(idOf(actor),actor))return false;
  const actorId=idOf(actor);if(!actorId||(cooldowns.get(actorId)||0)>time)return false;
  const number=durable.serial+1,id=receiptId(number),stage=at(actor,P.approach)?'waiting-privacy':'approaching';
  const pending={id,number,actorId,facilityId:P.id,stage,...clock()};
  if(!persist({...durable,serial:number,pending}))return false;
  const p=actor.root.position;
  current={actor,actorId,id,number,stage,mounted:false,elapsed:0,wait:0,cancelled:false,progressPoint:[p.x,p.y,p.z],stalled:0,lastDriven:time};return true;
 }
 function cancel(reason='cancelled',actorId='player'){
  if(!current||actorId&&current.actorId!==actorId)return true;
  const c=current;if(c.cancelled||c.completed)return release();c.cancelled=true;c.elapsed=0;
  if(c.actorId!=='player')cooldowns.set(c.actorId,time+10);
  // A failed cancel write leaves only an interrupted reservation on disk. It
  // cannot be promoted to a completion by loading or by a later update.
  const pending=c.mounted?{id:c.id,number:c.number,actorId:c.actorId,facilityId:P.id,stage:'leaving',cancelled:true}:null;
  persist({...durable,pending,lastOutcome:{id:c.id,actorId:c.actorId,status:'cancelled',reason,...clock()}});
  return release();
 }
 function mount(){
  const c=current;if(!c||!at(c.actor,P.approach)||!privacy(c.actor,true).ok)return false;
  if(!persist({...durable,pending:{...durable.pending,stage:'using'}}))return false;
  c.stage='using';c.mounted=true;c.elapsed=0;c.actor.root.position.set(...P.anchor);c.actor.root.rotation.y=P.yaw;c.actor.walking=false;c.actor.route=[];return true;
 }
 function complete(){
  const c=current;if(!c||c.cancelled||!at(c.actor,P.anchor,.025)||!privacy(c.actor,true).ok)return false;
  const receipt={id:c.id,number:c.number,actorId:c.actorId,source:'china-toilet',facilityId:P.id,completed:true,...clock(),delivered:false};
  const pending={id:c.id,number:c.number,actorId:c.actorId,facilityId:P.id,stage:'leaving',completed:true};
  const next={...durable,pending,receipts:retainReceipts([...durable.receipts,receipt]),lastOutcome:{id:c.id,actorId:c.actorId,status:'completed',...clock()}};
  if(!persist(next))return false;
  c.stage='leaving';c.completed=true;const delivered=deliver(),isPlayer=c.actorId==='player';release();if(isPlayer)notify(delivered?'如厕结束，身体轻松了一些':'如厕结束，记录正在保存');return true;
 }
 function tick(actor,dt,travel){
  if(disposed||!current||current.actor!==actor)return false;
  const c=current;c.lastDriven=time;dt=finiteSeconds(dt);
  if(c.stage==='leaving'){release();return true;}
  if(c.stage==='approaching'){
   if(!at(actor,P.approach)&&travel)travel([...P.approach],dt);
   if(at(actor,P.approach)){c.stage='waiting-privacy';c.wait=0;actor.walking=false;actor.route=[];}return true;
  }
  if(c.stage==='waiting-privacy'){
   if(!at(actor,P.approach)){cancel('left-approach',c.actorId);return true;}
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
  return {id:'cn-daily-toilet',provider:P.provider,kind:'toilet',facilityId:P.id,position:[...P.approach],roomId:P.roomId,name:'后宫二层 · 净室',npcName:'日常起居',action:current?'净室使用中':'如厕',intentKey:'toilet:'+durable.serial+':'+(current?.actorId||'free'),interactionRadius:2.6,executionRadius:P.executionRadius,priority:45};
 }
 const resolveIntent=selected=>{const next=intent();return next&&selected?.provider===next.provider&&selected.id===next.id&&selected.intentKey===next.intentKey?next:null;};
 function pose(actor){return current?.actor===actor&&current.mounted&&at(actor,P.anchor,.025)?{action:'chair-sit',context:{seatHeight:P.seatY-P.anchor[1],visualFloorOffset:0,heldProp:null,handoff:false,seatedMeal:false},seatY:P.seatY,anchor:[...P.anchor],yaw:P.yaw}:null;}
 function label(actorId='player'){
  if(!current||current.actorId!==actorId)return null;
  return current.stage==='approaching'?'正前往后宫净室':current.stage==='waiting-privacy'?'等净室门帘合好':current.stage==='leaving'?'等出口让开':lastError==='save-failed'?'正在保存如厕记录':`如厕中 · ${Math.floor(current.elapsed)}/${P.seconds}秒`;
 }
 return {
  intent,resolveIntent,executeIntent(selected){if(!resolveIntent(selected)||!at(getPlayer(),P.approach))return false;const ok=reserve(getPlayer());if(!ok)notify(current?'净室有人使用，请稍后再来':'暂时无法使用净室，请稍后再试');return ok;},
  requestActor:reserve,updateActor:(actor,dt,{travel}={})=>tick(actor,dt,travel),ownsActor:actor=>!!current&&current.actor===actor,
  active:(actorId='player')=>!!current&&(!actorId||current.actorId===actorId),cancel,
  actorPose:pose,playerPose:()=>pose(getPlayer()),playerAction:()=>pose(getPlayer())?.action||null,label,
  update(dt){
   if(disposed)return;dt=finiteSeconds(dt);time+=dt;recover();retryIn-=dt;if(retryIn<=0){retryIn=1;deliver();}
   if(current?.stage==='approaching'){
    const c=current,p=c.actor.root.position;
    if(Math.hypot(p.x-c.progressPoint[0],p.y-c.progressPoint[1],p.z-c.progressPoint[2])>=.18){c.progressPoint=[p.x,p.y,p.z];c.stalled=0;}
    else c.stalled+=dt;
    // Long but progressing stair routes remain valid. A blocked route or a
    // caller that lost ownership releases the one shared fixture after 20s.
    if(c.stalled>=20)cancel('route-stalled',c.actorId);
   }else if(current?.actorId!=='player'&&time-current?.lastDriven>20)cancel('actor-controller-interrupted',current.actorId);
   if(current?.actorId==='player')tick(current.actor,dt);
   for(const[id,until]of cooldowns)if(until<=time)cooldowns.delete(id);
  },
  state(){return {...copy(durable),available,activity:current?{id:current.id,actorId:current.actorId,stage:current.stage,elapsed:current.elapsed,progress:current.elapsed/P.seconds,mounted:current.mounted,privacy:privacy(current.actor),label:label(current.actorId)}:null,cooldowns:[...cooldowns].map(([actorId,until])=>({actorId,seconds:Math.max(0,until-time)})),lastError,approach:[...P.approach],anchor:[...P.anchor]};},
  dispose(){if(disposed)return;if(current)cancel('left-lot',current.actorId);disposed=true;current=null;}
 };
}
