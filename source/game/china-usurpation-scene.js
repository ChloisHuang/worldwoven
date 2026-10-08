import * as THREE from 'three';
import {blocked,resolveSurfaceHeight} from './navigation.js';
import {createChinaUsurpationActions} from './china-usurpation-actions.js';
import {createChinaUsurpationGathering} from './china-usurpation-gathering.js';
import {usurpationBodyId} from './china-usurpation-context.js';
import {ROYAL_KITCHEN_POINTS} from './china-royal-kitchen-service.js';

const copy=value=>structuredClone(value),idOf=actor=>actor?.actorId||actor?.station?.id;
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/.test(value);
const point=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const vector=p=>({x:p[0],y:p[1],z:p[2]});
const near=(p,q,r=.10)=>p&&point(q)&&Math.abs(p.y-q[1])<.3&&Math.hypot(p.x-q[0],p.z-q[2])<=r;
const bindingFields=['orderId','objectId','consumerId','consumerBodyId','workerId','workerBodyId','workReceiptId'];
const sameBinding=(a,b)=>bindingFields.every(key=>a?.[key]===b?.[key]);
const validBinding=b=>b&&bindingFields.every(key=>validId(b[key]))&&b.workerId==='player';
const openTask=task=>task&&['planning','ready-for-investiture'].includes(task.stage);
const safetyFields=['oldWorkSettled','itemsSettled','meetingsSettled','actorTransitionsSafe'];
const names={'political-response':'当面商议本案',guard:'承礼广庭 · 原卫队集结',abdication:'承礼广庭 · 具名联署',
 acclamation:'承礼广庭 · 当面拥立','mechanism-resolution':'承礼广庭 · 当面对峙','investiture-reading':'承礼广庭 · 宣读本案授位原纸'};

/** CR04's scene facade. Main retains every body, route planner and work owner.
 * getScene() supplies current {country,lot,furniture,player,npcs,royalKitchen,
 * royalKitchenEmployment}; getters may also expose the other palace owners.
 * prepareIntent returns an intent/null; request additionally calls onIntent.
 * saveState is synchronous and must capture this snapshot with the core and
 * current kitchen ledger in the same full-world write. No timers resume cold.
 */
export function createChinaUsurpationScene({core,getContext=()=>null,getScene=()=>null,getClock=()=>null,
 planPath,moveActor,doors,isPresent=()=>false,canBorrow=()=>false,shouldYield=()=>true,
 standing=()=>false,canSee=()=>false,getBusy=()=>true,animate=()=>{},saveState,
 onIntent=()=>true,notify=()=>{},saved,enabled=false}={}){
 let disposed=false,loadError=null,actions=null,storyMeals={},candidate=null,prepared=null,lastSaveError=null;
 const sites=new Map(),props=new Map();let propParent=null;
 const scene=()=>getScene()||{},taskNow=()=>core?.currentTask?.()||null;
 const player=()=>scene().player,actors=()=>scene().npcs||[];
 const resolveActor=id=>id==='player'?player():actors().find(actor=>idOf(actor)===id)||null;
 const active=()=>!disposed&&!loadError&&scene().country==='china'&&(typeof enabled==='function'?enabled()===true:enabled===true);
 const actual=actor=>!!actor?.root&&actor.alive!==false&&isPresent(actor)===true&&resolveActor(idOf(actor))===actor;
 const doorAPI=()=>typeof doors==='function'?doors():doors;
 const currentDoors=new Proxy({}, {get(_target,key){const value=doorAPI()?.[key];return typeof value==='function'?value.bind(doorAPI()):value;}});
 const gathering=createChinaUsurpationGathering({getActors:actors,getPlayer:player,isPresent:actual,canBorrow,shouldYield,
  planPath,moveActor,doors:currentDoors,animate});

 function navigation(radius=.34){const lot=scene().lot;return {surfaces:lot?.walkableSurfaces,legacyGround:false,
  bounds:lot?.bounds,bodyHeight:1.95,maxStep:.4,radius};}
 function collisionBoxes(){return [...(scene().lot?.colliders||[]),...(doorAPI()?.cameraColliders||[])];}
 function safePoint(p,radius,participantIds){
  const lot=scene().lot;if(!point(p)||!lot?.walkableSurfaces?.length||!lot.bounds)return null;
  const options=navigation(radius),boxes=collisionBoxes(),height=resolveSurfaceHeight(vector(p),options,boxes);
  if(!Number.isFinite(height)||Math.abs(height-p[1])>.3)return null;
  const q=[p[0],height,p[2]];
  if(blocked(q[0],q[2],boxes,radius,{...options,y:q[1]}))return null;
  // Do not reserve a doorway's operating space even while its leaves are open.
  if((lot.doorways||[]).some(d=>{
   const along=d.axis==='x'?q[0]:q[2],across=d.axis==='x'?q[2]:q[0],bottom=d.bottom??0,top=d.top??bottom+2;
   return q[1]<top&&q[1]+1.95>bottom&&along>=d.from-radius-.20&&along<=d.to+radius+.20&&Math.abs(across-d.at)<radius+.65;
  }))return null;
  if([player(),...actors()].some(a=>actual(a)&&!participantIds.includes(idOf(a))&&
    Math.abs(a.root.position.y-q[1])<1.95&&Math.hypot(a.root.position.x-q[0],a.root.position.z-q[2])<radius+(a.collisionRadius??.25)+.08))return null;
  return q;
 }
 function reachable(actor,p,radius){
  if(!actual(actor))return false;if(near(actor.root.position,p))return true;
  try{const route=planPath?.(actor.root.position,vector(p),radius),end=route?.at(-1);
   return !!end&&near({x:end.x,y:end.y??actor.root.position.y,z:end.z},p);
  }catch{return false;}
 }
 function legalSite(site,ids,{routes=false}={}){
  if(!site||!safePoint(site.position,.34,ids)||!resolveObject(site.objectId))return false;
  const points=[site.position];
  for(const actorId of ids.filter(id=>id!=='player')){
   const p=site.actorPoints?.[actorId];if(!safePoint(p,.25,ids)||!near(vector(p),site.position,2.75))return false;
   if(points.some(q=>near(vector(p),q,.70)))return false;points.push(p);
  }
  return !routes||ids.every(id=>reachable(resolveActor(id),id==='player'?site.position:site.actorPoints[id],id==='player'?.34:.25));
 }
 function privateAt(p){return (scene().lot?.interiorRooms||[]).some(room=>{
  const privateBed=(scene().furniture?.items||[]).some(item=>item.kind==='bed'&&(item.privateRoomId===room.id||item.guestRoomId===room.id));
  if(!privateBed&&!room.privateOwnerId&&!room.ownerId&&!room.privateRoom&&!room.id?.startsWith('consort-')&&room.id!=='bedroom'&&room.id!=='bath'&&room.id!=='washroom'&&!room.id?.includes('toilet')&&!room.id?.startsWith('tavern-guest-'))return false;
  const b=room.bounds||room,y=room.floorY??0;
  return p[0]>=b.minX&&p[0]<=b.maxX&&p[2]>=b.minZ&&p[2]<=b.maxZ&&Math.abs(p[1]-y)<.65;
 });}

 function clearProps(){for(const prop of props.values())prop.dispose();props.clear();propParent=null;}
 function ensureProp(task,charter=false){
  const lot=scene().lot;if(!active()||!openTask(task)||!lot?.group||!actual(player())||charter&&task.stage!=='ready-for-investiture')return null;
  if(propParent&&propParent!==lot.group)clearProps();propParent=lot.group;
  const objectId=`usurpation-${charter?'charter':'notebook'}:${task.id}`;
  let prop=props.get(objectId);
  if(!prop){
   const people=getContext()?.supporters||[],consenters=(task.pledges||[]).filter(p=>p.accepted&&!p.withdrawn).map(p=>people.find(a=>a.id===p.actorId)?.name||p.actorId);
   prop=makePaper(lot.group,{objectId,caseId:task.id,charter,title:charter?'具名拥立授位书':'本案筹谋簿',
    lines:[`案号 ${task.id}`,charter?'同案拥立，宣读后授位。':'当面商议，答复各由本人。',...consenters]});props.set(objectId,prop);
  }
  prop.sync(player());return prop.object;
 }
 function resolveObject(objectId){
  const own=props.get(objectId)?.object;if(own?.parent===scene().lot?.group)return own;
  const task=taskNow();
  if(openTask(task)&&objectId===`usurpation-notebook:${task.id}`)return ensureProp(task,false);
  if(openTask(task)&&objectId===`usurpation-charter:${task.id}`)return ensureProp(task,true);
  const marker=Object.values(storyMeals).find(row=>row.binding.objectId===objectId);
  if(marker){const object=scene().royalKitchen?.mealObject?.(marker.binding.orderId);if(object?.name===objectId&&object.userData?.orderId===marker.binding.orderId)return object;}
  const original=scene().lot?.group?.getObjectByName?.(objectId);
  return original?.userData?.mealId===objectId&&validId(original.userData.orderId)?original:null;
 }
 function sourceOrder(task,{requireDuty=true,orderId=null}={}){
  const s=scene(),kitchen=s.royalKitchen,job=s.royalKitchenEmployment?.state?.()?.job;
  const order=orderId?kitchen?.lookupMeal?.(orderId,task?.emperor?.id):kitchen?.mealFor?.(task?.emperor?.id);
  if(!task||!order||order.actorId!==task.emperor.id||order.workerId!=='player'||!order.mealId||!validId(order.workReceiptId)||
   !actual(player())||usurpationBodyId(player())!==task.playerBodyId||!actual(resolveActor(task.emperor.id))||usurpationBodyId(resolveActor(task.emperor.id))!==task.emperor.bodyId)return null;
  const duty=job?.stage==='working'&&job.receiptId===order.workReceiptId&&kitchen.dutyActive?.(job.receiptId)===true;
  if(requireDuty&&(!duty||!['prepared','cooked'].includes(order.stage)||kitchen.isActing?.()===true))return null;
  const object=kitchen.mealObject?.(order.id)||s.lot?.group?.getObjectByName?.(order.mealId);
  if(!object||object.name!==order.mealId||object.userData?.mealId!==order.mealId||object.userData.orderId!==order.id)return null;
  return {order,binding:{orderId:order.id,objectId:order.mealId,consumerId:order.actorId,consumerBodyId:task.emperor.bodyId,
   workerId:'player',workerBodyId:task.playerBodyId,workReceiptId:order.workReceiptId,dutyActive:duty,stage:order.stage}};
 }
 const getMealBinding=task=>sourceOrder(task)?.binding||null;
 function currentSite(kind,{task,actorId,participantIds:ids}){
  if(!active()||!openTask(task)||!ids.every(id=>actual(resolveActor(id))))return null;
  if(kind==='intrigue'){
   const source=sourceOrder(task);if(!source)return null;
   const p=source.order.stage==='prepared'?ROYAL_KITCHEN_POINTS.prep:ROYAL_KITCHEN_POINTS.stove;
   const position=safePoint(p,.34,ids);return position&&reachable(player(),position,.34)?{
    id:`usurpation-kitchen:${task.id}:${source.order.id}`,objectId:source.binding.objectId,position,actorPoints:{},name:'御膳备餐间 · 原单剧情准备'}:null;
  }
  const object=ensureProp(task,kind==='investiture-reading');if(!object)return null;
  const key=[task.id,kind,actorId,...ids].join('|'),cached=sites.get(key);
  if(cached&&legalSite(cached,ids))return copy(cached);
  sites.delete(key);
  const finish=site=>{if(!legalSite(site,ids,{routes:true}))return null;sites.set(key,copy(site));return site;};
  // A stationary official may talk at their original public post. Only a
  // legal adjacent player stand is used; private chambers are never a shortcut.
  if(kind==='political-response'){
   const actor=resolveActor(actorId),p=actor?.root.position;
   if(actual(actor)&&standing(actor)===true&&!actor.walking&&!privateAt(p.toArray())&&!shouldYield(actor)&&canBorrow(actor,{moving:false,held:false})===true){
    for(let i=0;i<8;i++){
     const angle=i*Math.PI/4,position=safePoint([p.x+Math.cos(angle)*1.25,p.y,p.z+Math.sin(angle)*1.25],.34,ids);
     if(!position)continue;
     const site=finish({id:`usurpation-discussion:${task.id}:${actorId}`,objectId:object.name,position,actorPoints:{[actorId]:p.toArray()},name:`${actor.station?.npcName||actorId} · 当面商议本案`});
     if(site)return site;
    }
   }
  }
  if(ids.some(id=>id!=='player'&&(shouldYield(resolveActor(id))||canBorrow(resolveActor(id),{moving:true,held:false})!==true)))return null;
  const court=scene().lot?.architectureProgram?.courts?.find(c=>c.id==='grand-court'&&c.openToSky===true)?.bounds;
  if(!court)return null;
  // These are clear positions in the already-authored broad courtyard, away
  // from the morning assembly ranks, plinth stairs and the central gate aisle.
  const centers=[[-9,19],[9,19],[-9,25],[9,25],[0,24]],offsets=[[-.9,-.8],[.9,-.8],[-1.4,.45],[1.4,.45],[0,-1.65]];
  for(const [x,z]of centers){
   if(x<court.minX+2||x>court.maxX-2||z<court.minZ+2||z>court.maxZ-2)continue;
   const position=safePoint([x,.14,z],.34,ids);if(!position)continue;
   const actorPoints={};let complete=true;
   for(const [index,id]of ids.filter(id=>id!=='player').entries()){
    const offset=offsets[index];if(!offset){complete=false;break;}
    const destination=safePoint([x+offset[0],position[1],z+offset[1]],.25,ids);if(!destination){complete=false;break;}actorPoints[id]=destination;
   }
   if(!complete)continue;
   const site=finish({id:`usurpation-grand-court:${task.id}:${x}:${z}`,objectId:object.name,position,actorPoints,name:names[kind]||'承礼广庭 · 本案筹谋'});
   if(site)return site;
  }
  return null;
 }

 function snapshot(){
  if(candidate)return copy(candidate);
  if(loadError&&saved!==undefined)return copy(saved);
  const actionState=actions?.snapshot()||{version:1,proofs:{},mealPending:null,activity:null};
  const pending=actionState.mealPending,marker=pending&&storyMeals[pending.storyActionId];
  // The source marker and its bound flag are one checkpoint. A rejected second
  // adapter save cannot lose the first successful original-meal binding.
  if(marker&&pending.caseId===marker.caseId&&sameBinding(pending.meal,marker.binding))pending.bound=true;
  return {version:1,actions:actionState,storyMeals:copy(storyMeals)};
 }
 function persist(){
  if(typeof saveState!=='function'){lastSaveError='persistence-unavailable';return false;}
  candidate=snapshot();
  try{const result=saveState(copy(candidate));if(result?.then){Promise.resolve(result).catch(()=>{});lastSaveError='async-save-unsupported';return false;}
   if(result===false||result?.ok===false){lastSaveError='save-failed';return false;}lastSaveError=null;return true;
  }catch{lastSaveError='save-failed';return false;}finally{candidate=null;}
 }
 function prepareStoryMeal({caseId,storyActionId,binding}){
  const task=taskNow(),source=sourceOrder(task),existing=storyMeals[storyActionId];
  if(!active()||task?.id!==caseId||storyActionId!==`${caseId}:story-package:${binding?.orderId}`||!validBinding(binding))return {ok:false};
  if(existing){if(existing.caseId!==caseId||!sameBinding(existing.binding,binding))return {ok:false};return {ok:persist()};}
  if(!source||!sameBinding(source.binding,binding))return {ok:false};
  const at=getClock();if(!Number.isSafeInteger(at?.day)||!Number.isFinite(at.hour))return {ok:false};
  // A case-local fictional marker only. It never edits the order, advances
  // eating, grants wages/XP, or changes anybody's body/health.
  storyMeals[storyActionId]={caseId,storyActionId,binding:copy(binding),preparedAt:{day:at.day,hour:at.hour}};
  return {ok:persist()};
 }
 function getMealConsumption(request){
  const marker=storyMeals[request?.storyActionId],task=taskNow();
  if(!marker||task?.id!==request.caseId||marker.caseId!==task.id||marker.binding.orderId!==request.orderId||marker.binding.objectId!==request.objectId)return null;
  const source=sourceOrder(task,{requireDuty:false,orderId:request.orderId}),order=source?.order,receipt=order?.receipt;
  if(!source||!sameBinding(source.binding,marker.binding)||order.stage!=='consumed'||order.eatingSeconds<12||
   receipt?.source!=='china-royal-kitchen'||receipt.completed!==true||receipt.orderId!==order.id||receipt.mealId!==order.mealId||
   receipt.actorId!==task.emperor.id||receipt.dishId!=='royal-steamed-meal'||receipt.supplyReceipt!==order.supplyReceipt)return null;
  return {...copy(marker.binding),storyActionId:marker.storyActionId,status:'consumed'};
 }
 function getDocumentBinding(task){
  const object=ensureProp(task,true);if(!object||object.parent!==scene().lot?.group||object.userData.holderId!=='player'||object.userData.holderBodyId!==task.playerBodyId)return null;
  return {caseId:task.id,documentId:object.name,objectId:object.name,holderId:'player',holderBodyId:task.playerBodyId,held:true};
 }
 function getSafeHandoff(task){
  const context=getContext()||{},residences=context.residences;
  if(task?.stage!=='ready-for-investiture'||!safetyFields.every(key=>context.safety?.[key]===true)||
   !validId(residences?.player?.roomId)||!validId(residences.player.bedId)||!validId(residences.formerEmperor?.roomId)||
   !validId(residences.formerEmperor.bedId)||residences.player.roomId===residences.formerEmperor.roomId||residences.player.bedId===residences.formerEmperor.bedId)return null;
  return {safe:true,residences:copy(residences)};
 }
 function available(actor,{leaseId,kind}={}){
  if(!actual(actor)||shouldYield(actor))return false;
  if(actor===player())return true;
  if(gathering.owns(actor))return gathering.state(leaseId).held===true;
  return canBorrow(actor,{moving:kind!=='political-response',held:false})===true;
 }
 function validSaved(value){
  if(value?.version!==1||!value.actions||!value.storyMeals||Array.isArray(value.storyMeals))return false;
  return Object.entries(value.storyMeals).every(([key,row])=>row?.storyActionId===key&&validId(row.caseId)&&
   key===`${row.caseId}:story-package:${row.binding?.orderId}`&&validBinding(row.binding)&&
   Number.isSafeInteger(row.preparedAt?.day)&&row.preparedAt.day>=0&&Number.isFinite(row.preparedAt.hour)&&row.preparedAt.hour>=0&&row.preparedAt.hour<24);
 }
 function reportAction(event){
  if(typeof event==='string'){notify(event);return;}
  const result=event?.result;
  if(result?.ok!==true){notify(['save-failed','save-unavailable','persistence-unavailable','async-save-unsupported'].includes(result?.code)?
   '保存尚未完成，同案原凭据已保留，请稍后继续。':'原人物或现场条件已改变，本案保留，待条件恢复后继续。');return;}
  const text=event.kind==='political-response'?`当面答复已记录：${result.accepted?'同意支持本案。':'暂不支持本案。'}`:
   event.kind==='mechanism-resolution'?(result.passed?'现场局势已形成，仍须具名拥立与宣读原纸。':'此次筹谋未能成功，结果已保存，稍后可再谋划。'):
   event.kind==='investiture-reading'?'原纸已当面宣读，帝位已交接，原帝保留原寝居。':
   event.kind==='intrigue'?'原帝已实际用完同份御膳，剧情凭据已记入本案。':`${names[event.kind]||'现场准备'}已记入本案。`;
  notify(text);
 }
 if(saved!==undefined){if(validSaved(saved))storyMeals=copy(saved.storyMeals);else loadError='invalid-saved-usurpation-scene';}
 actions=createChinaUsurpationActions({core,getTask:taskNow,getContext,getClock,getPlayer:player,resolveActor,resolveObject,
  getSite:currentSite,standing,canSee,isAvailable:available,getBusy,borrowActors:request=>gathering.borrow(request),
  groupState:leaseId=>gathering.state(leaseId),releaseActors:leaseId=>gathering.release(leaseId),getMealBinding,prepareStoryMeal,
  getMealConsumption,getDocumentBinding,getSafeHandoff,saveState:()=>persist(),notify:reportAction,
  enabled:active,...(saved!==undefined&&!loadError?{saved:saved.actions}:{})});
 function intent(input,actorId){if(!active())return null;return actions.intent(input,actorId);}
 function prepareIntent(selected){const next=actions.resolveIntent(selected);if(!next)return null;prepared=copy(next);syncProps();return next;}
 function executeIntent(selected){const next=prepareIntent(selected);if(!next)return false;const result=actions.executeIntent(next);if(result)prepared=null;return result;}
 function cancel(reason='cancelled'){prepared=null;return actions.cancel(reason);}
 function syncProps(){
  const task=taskNow();if(!active()||!openTask(task)){for(const prop of props.values())prop.object.visible=false;return;}
  const action=actions.state().action||prepared?.kind;
  for(const prop of props.values()){
   prop.object.visible=prop.caseId===task.id&&(prop.charter?action==='investiture-reading':!!action&&action!=='intrigue'&&action!=='investiture-reading');
   if(prop.object.visible)prop.sync(player());
  }
 }
 function update(dt,t=0){
  if(disposed)return;
  if(!active()){actions.cancel('scene-unavailable');gathering.release();syncProps();return;}
  gathering.update(dt,t);syncProps();actions.update(dt);syncProps();
 }
 function restore(value){
  if(disposed||!validSaved(value))return false;
  const previous=storyMeals;storyMeals=copy(value.storyMeals);
  if(!actions.restore(value.actions)){storyMeals=previous;return false;}
  loadError=null;prepared=null;sites.clear();syncProps();return true;
 }
 return {intent,prepareIntent,resolveIntent:selected=>actions.resolveIntent(selected),executeIntent,update,snapshot,restore,
  verifyEvidence:(...args)=>actions.verifyEvidence(...args),request(input,actorId){const next=intent(input,actorId);return next&&prepareIntent(next)&&onIntent(next)!==false?next:null;},
  cancel,stopActivity:cancel,cancelApproach:cancel,owns:actor=>gathering.owns(actor),active:()=>actions.active(),isActing:()=>actions.isActing(),
  isWaiting:()=>actions.isWaiting(),playerAction:()=>actions.playerAction(),label:()=>actions.label(),
  syncPlayer:syncProps,state:()=>({...actions.state(),loadError:loadError||actions.state().loadError,lastError:lastSaveError||actions.state().lastError,
   gathering:gathering.active(),preparedIntent:prepared?.id||null,storyMeals:copy(storyMeals),papers:[...props.values()].map(p=>({id:p.object.name,caseId:p.caseId,charter:p.charter,visible:p.object.visible,holderId:p.object.userData.holderId,position:p.object.position.toArray()}))}),
  dispose(){if(disposed)return;actions.dispose();gathering.dispose();clearProps();sites.clear();disposed=true;}};
}

function makePaper(parent,{objectId,caseId,charter,title,lines}){
 const object=new THREE.Group(),geometries=[],materials=[],textures=[];object.name=objectId;
 object.userData={dynamic:true,caseId,documentId:objectId,plotOwned:true};parent.add(object);
 const add=(geometry,color,p=[0,0,0])=>{const material=new THREE.MeshToonMaterial({color});geometries.push(geometry);materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...p);object.add(mesh);return mesh;};
 add(new THREE.BoxGeometry(.48,.018,.34),charter?0xeedda9:0x526c61);
 add(new THREE.BoxGeometry(.43,.010,.30),0xf2e5bc,[0,.014,0]);
 for(const x of[-.24,.24])add(new THREE.CylinderGeometry(.022,.022,.37,8),0x805235,[x,.014,0]).rotation.x=Math.PI/2;
 add(new THREE.BoxGeometry(.065,.006,.058),0x963e35,[.145,.024,.095]);
 let canvas=null;try{canvas=globalThis.document?.createElement?.('canvas');}catch{}
 const context=canvas?.getContext?.('2d');
 if(context){canvas.width=768;canvas.height=512;context.fillStyle='#f2e5bc';context.fillRect(0,0,768,512);context.fillStyle='#393d33';context.textAlign='center';
  context.font='bold 48px serif';context.fillText(title,384,66);context.textAlign='left';context.font='25px serif';
  lines.slice(0,9).forEach((line,index)=>context.fillText(String(line).slice(0,48),36,116+index*41));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),geometry=new THREE.PlaneGeometry(.42,.29);
  materials.push(material);geometries.push(geometry);const ink=new THREE.Mesh(geometry,material);ink.rotation.x=-Math.PI/2;ink.position.y=.021;object.add(ink);
 }else for(let i=0;i<5;i++)add(new THREE.BoxGeometry(.23-(i%2)*.04,.003,.008),0x45463a,[-.035,.022,-.09+i*.035]);
 const v=new THREE.Vector3(),w=new THREE.Vector3();
 function sync(actor){if(!actor?.root)return;actor.root.updateWorldMatrix(true,true);const hands=actor.root.userData.hands;
  if(hands?.length>=2){hands[0].getWorldPosition(v);hands[1].getWorldPosition(w);v.add(w).multiplyScalar(.5);v.y-=.025;}
  else if(hands?.[0])hands[0].getWorldPosition(v);
  else v.set(0,1.05,.40).applyMatrix4(actor.root.matrixWorld);
  parent.worldToLocal(v);object.position.copy(v);object.rotation.set(0,actor.root.rotation.y,0);
  object.userData.holderId=idOf(actor);object.userData.holderBodyId=usurpationBodyId(actor);
 }
 return {object,caseId,charter,sync,dispose(){object.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
