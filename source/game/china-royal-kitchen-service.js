import {PANTRY} from './china-royal-pantry.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {createServiceRelationshipOutbox,serviceRelationshipEvent} from './service-relationship-outbox.js';
import {createNPCPersonalTrip} from './npc-personal-trip.js';
import {ROYAL_KITCHEN_ROLE as ROLE} from './china-royal-kitchen-role.js';
import {royalKitchenHandoffBoundary} from './china-royal-kitchen-slot.js';
import * as THREE from 'three';
import {followActorRoute} from './actor-navigation.js';
import {createRoyalKitchenOrders,ROYAL_DINERS,ROYAL_MEAL_SEATS,royalPlayerEligibilityEvidence,sameRoyalPlayerEligibility} from './china-royal-kitchen-orders.js';
import {createRoyalKitchenLife} from './china-royal-kitchen-life.js';
export const ROYAL_KITCHEN_POINTS=Object.freeze({registry:[23.6,4.015,-5.9],host:[22.7,4.015,-5.9],prep:[20,4.015,-6.11],prepTop:[20,5,-6.7],stove:[17.8,4.015,-5.95],stoveTop:[19.1,5.73,-4.5]});
const P=ROYAL_KITCHEN_POINTS,copy=x=>JSON.parse(JSON.stringify(x)),point=p=>({x:p[0],y:p[1],z:p[2]}),near=(n,p,r=.10)=>!!n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.35;
const open=o=>!['consumed','cancelled'].includes(o.stage),production=o=>['ordered','prepared','cooked','carrying'].includes(o.stage);
const servePoint=o=>[o.seatId.endsWith('19.8')?18.25:23.75,.215,-6.25],tablePoint=o=>[o.seatId.endsWith('19.8')?19.9:22.1,1.18,-6.25];
const label=o=>o?`第${o.number}号 · ${o.actorName} · ${({ordered:'待备料',prepared:'待蒸制',cooked:'待取原膳',carrying:'送原膳到席',served:'等本人到席',eating:'正在用膳',consumed:'同份膳已用完',cancelled:'已取消'})[o.stage]}`:'现场候单 · 等皇家本人择时用膳';

// One assigned kitchen actor owns production. Palace life retains every diner, duty, route
// and seat. The kitchen owns original orders, one physical dish per order and
// the finite opening pantry; employment only leases its producer role.
export function createChinaRoyalKitchenService({npcs,lot,doors,planPath,moveActor,poseContext,getPlayer=()=>null,getMounted=()=>null,getMountedActor=()=>null,
 getPlayerMealEligibility=()=>null,getPlayerSeat=()=>getMounted(),getSeatOccupant=()=>null,
 enablePantry=false,getHolder=null,canControlActor=()=>true,npcEconomy=null,getTavern=()=>null,getToilet=()=>null,enablePersonalNeeds=false,
 getClock=()=>({day:0,hour:10}),getEmployment=()=>null,isHired=()=>false,sharedNeeds=null,worldSeed=1,saved=null,saveState=()=>true,notify=()=>{},beginInteraction=()=>null,onInteraction=()=>{},onRelationshipEvent=()=>({ok:false})}){
 let jia=npcs.find(n=>n.station.id==='cn-cooking');if(!jia)return null;
 const relationshipOutbox=createServiceRelationshipOutbox(onRelationshipEvent);
 const people=new Map([[jia.station.id,jia]]),lives=new Map();let needsLife=null;
 const holder=()=>getHolder?.()||{holderId:jia.station.id,roleId:ROLE.id,slotId:ROLE.slotId,status:'npc',available:true,alive:jia.alive!==false,revision:0};
 const npcAvailable=()=>{const r=holder();return r.status==='npc'&&r.available&&r.alive&&r.holderId===jia.station.id&&jia.alive!==false&&canControlActor(jia);};
 const actors=new Map(npcs.map(n=>[n.station.id,n])),props=new Map(),supplyProps=new Map(),travelState=new Map(),history=[],failures=[];
 let state={},layoutReseat=false,time=0,disposed=false,meeting=false,workAction=null,phase=null,duty=null,nextSave=0,life=null,orders=null,playerState={};
 const prior=saved?.continuity?.version===1&&saved.continuity.orders?.revision>=(saved.orders?.revision??-1)?saved.continuity:saved;
 const relationshipTimes={...(prior?.relationshipTimes||{})};
 const restoredHolder=actors.get(prior?.boundPersonId);if(restoredHolder&&holder().holderId===restoredHolder.station.id&&canControlActor(restoredHolder)){jia=restoredHolder;people.set(jia.station.id,jia);}
 if(prior?.version===1){time=prior.time||0;duty=copy(prior.duty||null);phase=copy(prior.phase||null);workAction=copy(prior.workAction||null);history.push(...(prior.history||[]).slice(-36));}
 const durable=(model=orders?.snapshot())=>{for(const o of model?.orders||[])if(['consumed','cancelled'].includes(o.stage)&&relationshipTimes[o.id]===undefined)relationshipTimes[o.id]=time;return {version:1,relationshipTimes:copy(relationshipTimes),layoutRevision:1,layoutReseat,orders:model,time,duty:copy(duty),phase:copy(phase),workAction:copy(workAction),life:life?.snapshot()||prior?.life||{},boundPersonId:jia.station.id,people:[...people.keys()],personalLives:Object.fromEntries([...lives].map(([id,l])=>[id,l.snapshot()])),personalNeeds:needsLife?.snapshot()||prior?.personalNeeds||{},eating:copy(state.eating||{}),history:copy(history)};};
 const persist=()=>{if(!orders)return true;try{const ok=saveState(durable());return ok!==false&&!ok?.then;}catch{return false;}};
 const record=(event,o=null)=>{history.push({event,orderId:o?.id||null,mealId:o?.mealId||null,time:+time.toFixed(2)});if(history.length>36)history.shift();};
 orders=createRoyalKitchenOrders({enablePantry,saved:prior?.orders||null,getClock,getPlayerMealEligibility:playerEligibility,saveState:model=>{try{const ok=saveState(durable(model));return ok!==false&&!ok?.then;}catch{return false;}}});
 layoutReseat=!!prior?.layoutReseat||!!prior&&prior.layoutRevision!==1&&orders.active().some(o=>o.actorId==='player');
 // Old physical actions are not resumed at their former ground-level board.
 if(prior&&prior.layoutRevision!==1){phase=null;workAction=null;}
 const activeJob=()=>{const j=getEmployment();return j?.stage==='working'&&isHired()?j:null;};
 const playerOwns=()=>!!duty&&duty.status==='active'&&activeJob()?.receiptId===duty.receiptId;
 function playerEligibility(){const p=getPlayer();if(!p||!Number.isFinite(p.ageYears)||p.ageYears<18)return null;try{return royalPlayerEligibilityEvidence(getPlayerMealEligibility());}catch{return null;}}
 const seated=o=>{const n=o.actorId==='player'?getPlayer():actors.get(o.actorId),s=o.actorId==='player'?getPlayerSeat():getMountedActor(n);return s?.id===o.seatId&&!!s.anchor&&near(n,s.anchor,.35);};
 const playerCanDine=()=>{const e=playerEligibility(),o=orders.active().find(o=>o.actorId==='player');return !!e&&(!o||sameRoyalPlayerEligibility(o.eligibility,e))&&!activeJob()&&!playerOwns();};
 const availableSeat=(id,actorId)=>{const owner=getSeatOccupant(id)||npcs.find(n=>getMountedActor(n)?.id===id)?.station.id;return !owner||owner===actorId;};
 function playerMealAvailability(seatId=null){
  const blocked=(code,reason)=>({ok:false,code,reason});
  if(orders.loadError())return blocked('invalid-state','御膳记录暂不可用');
  if(!Number.isFinite(getPlayer()?.ageYears)||getPlayer().ageYears<18)return blocked('adult-required','仅限已满18岁的受册皇室成员');
  if(!playerEligibility())return blocked('not-appointed','皇室身份尚未正式生效，暂不能用膳');
  if(activeJob()||playerOwns())return blocked('finish-kitchen-duty','请先与Jia真实交班，再用膳');
  const own=orders.active().find(o=>o.actorId==='player');
  if(own&&!sameRoyalPlayerEligibility(own.eligibility,playerEligibility()))return blocked('appointment-changed','暂不能用膳，请取消后重试');
  if(own&&seatId&&own.seatId!==seatId)return blocked('original-seat-required','请回到本次餐席');
  if(!own&&!orders.available('player'))return blocked('supply-empty','储备已用完或已有餐单预留');
  const free=id=>ROYAL_MEAL_SEATS.includes(id)&&availableSeat(id,'player')&&!orders.active().some(o=>o.seatId===id&&o.actorId!=='player');
  if(seatId?!free(seatId):!ROYAL_MEAL_SEATS.some(free))return blocked('seat-busy','餐席正在使用，请稍候');
  return {ok:true,code:null,reason:null,eligibility:playerEligibility(),order:own||null};
 }
 const talkingDiner=id=>id==='player'?!!playerState.conversationActorId:isSociallyHeld(id,playerState.conversationActorId);
 function deliverMealReceipts(){const receipts=orders.receipts();if(!receipts.length)return false;
  if(sharedNeeds?.royalMealReceipts)return sharedNeeds.royalMealReceipts(receipts,orders.snapshot());
  return sharedNeeds?.mealReceipts(receipts.filter(r=>r.actorId!=='player'||sameRoyalPlayerEligibility(playerEligibility(),r.eligibility)));
 }
 const actualActor=id=>id==='player'?getPlayer():actors.get(id);
 const mealFor=id=>orders.forActor(id),lookupMeal=(id,actorId)=>{const o=orders.lookup(id);return o?.actorId===actorId?o:null;};
 const mealReady=(id,actorId)=>{const o=lookupMeal(id,actorId);return !!o&&['served','eating'].includes(o.stage);};
 function travel(n,to,dt){
  n.walking=false;if(near(n,to,.065)){n.route=[];travelState.delete(n);return true;}if(isSociallyHeld(n.station.id,playerState.conversationActorId))return false;
  let s=travelState.get(n);if(!s||s.key!==to.join(',')){s={key:to.join(','),retryAt:0};travelState.set(n,s);n.route=[];}
  if(!n.route.length&&time>=s.retryAt){s.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);if(!n.route.length&&!s.reported){failures.push({actor:n.station.id,to:to.slice(),position:n.root.position.toArray()});if(failures.length>8)failures.shift();s.reported=true;}}
  followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to,.065);
 }
 function personLife(n){let l=lives.get(n.station.id);if(!l){l=createRoyalKitchenLife({actor:n,worldSeed,planPath,travel,near,saved:prior?.personalLives?.[n.station.id]||(n.station.id==='cn-cooking'?prior?.life:null)||{}});lives.set(n.station.id,l);}return l;}
 life=personLife(jia);
 const handoffBoundary=()=>royalKitchenHandoffBoundary({orders:orders.active(),workAction:workAction||orders.snapshot().pantry?.allocations.find(a=>['picked','return-pending','return-carrying'].includes(a.stage)),meeting,personalTrip:needsLife?.blocks(),playerDuty:playerOwns()});
 function rebind(){const r=holder(),n=actors.get(r.holderId);if(r.status!=='npc'||!r.available||!r.alive||!n||n.alive===false||!canControlActor(n)||n===jia)return false;if(!handoffBoundary().ok)return false;life.recall();jia.route=[];travelState.delete(jia);jia=n;people.set(n.station.id,n);life=personLife(n);phase=null;return true;}
 if(prior?.boundPersonId!==jia.station.id)rebind();
 for(const id of prior?.people||[]){const n=actors.get(id);if(n&&canControlActor(n)){people.set(id,n);personLife(n);}}
 const resetRoute=n=>{n.route=[];n.walking=false;travelState.delete(n);};
 const upper=[[24.8,4.015,-8.7],[24.8,4.015,-10.6],[17.2,.215,-10.6],[17.2,.215,-8.7]];
 const corridor=[[18.2,.215,-4],[21,.215,-2],[16.9,.215,9.1]];
 const reverse=p=>p.slice().reverse().map(v=>v.slice());
 const atWork=n=>n===jia&&npcAvailable()&&!playerOwns();
 const returnTarget=n=>atWork(n)?P.host:[24.25,.215,-4.9];
 const returnRoute=n=>[...reverse(corridor),...(returnTarget(n)[1]>3?reverse(upper):[]),returnTarget(n)];
 if(enablePersonalNeeds&&npcEconomy&&sharedNeeds)needsLife=createNPCPersonalTrip({saved:prior?.personalNeeds,getCandidates:()=>[...people.values()],getActor:id=>people.get(id),canControl:canControlActor,canStart:n=>n.alive!==false&&canControlActor(n)&&!meeting&&!isSociallyHeld(n.station.id,playerState.conversationActorId)&&(n!==jia||!phase)&&near(n,returnTarget(n),.4),canDepart:n=>!meeting&&!workAction&&!orders.snapshot().pantry?.allocations.some(a=>['return-pending','return-carrying'].includes(a.stage))&&!orders.active().some(o=>o.workerId===n.station.id&&production(o)&&!!stepFor(o))&&!phase,
  getReturnTarget:returnTarget,getExitRoute:n=>[...(n.root.position.y>3?upper:[]),...corridor],getReturnRoute:returnRoute,economy:npcEconomy,sharedNeeds,getTavern,getToilet,travel,resetRoute,pose:(n,t,mounted)=>{if(mounted)n.animate(t+n.phase,false,mounted.action,{...poseContext(n,null),...mounted.context});else animate(n,t,null,null,false);},saveState:()=>persist()});
 function requestMeal({actorId,seatId}){
  const n=actualActor(actorId);if(!playerOwns()&&(!npcAvailable()||needsLife?.blocks()))return null;
  if(!n||!((n.ageYears??n.station?.ageYears)>=18)||!(ROYAL_DINERS.includes(actorId)||actorId==='player'&&playerMealAvailability(seatId).ok))return null;
  if(actorId==='player'&&(!seated({actorId,seatId})||!availableSeat(seatId,actorId)))return null;
  const job=playerOwns()?activeJob():null,o=orders.request({actorId,seatId,name:n.station?.npcName||'你',workerId:job?'player':jia.station.id,workReceiptId:job?.receiptId||null,workDay:job?.day??getClock().day});if(o){record('requested',o);persist();}return o;
 }
 function cancelMeal(actorId,reason){const old=mealFor(actorId);if(!old||!open(old))return true;if(!orders.cancel(actorId,reason,actualActor(old.workerId)?.root.position.toArray()))return false;if(phase?.orderId===old.id)phase=null;if(workAction?.orderId===old.id)workAction=null;record('cancelled',old);persist();return true;}
 function startMeal(id,actorId){const o=lookupMeal(id,actorId);if(!o||!seated(o)||talkingDiner(actorId)||actorId==='player'&&(!playerCanDine()||!availableSeat(o.seatId,actorId)))return false;if(o.stage==='eating')return true;return o.stage==='served'&&orders.change(id,'served','eating');}
 function completeMeal(id,actorId){const o=lookupMeal(id,actorId);if(o?.stage==='consumed'){deliverMealReceipts();return true;}if(actorId==='player'&&!playerCanDine())return false;if(!o||!seated(o)||!availableSeat(o.seatId,actorId)||talkingDiner(actorId))return false;
  const elapsed=state.eating?.[id]??o.eatingSeconds;if(!orders.consume(id,actorId,elapsed))return false;record('consumed',orders.lookup(id));deliverMealReceipts();persist();return true;
 }
 function meetingReady(){return npcAvailable()&&!needsLife?.blocks()&&near(jia,P.host,.12)&&!orders.active().some(o=>o.workerId===jia.station.id&&(['prepared','cooked','carrying'].includes(o.stage)||orders.pantryAllocation(o.id)?.stage==='picked'))&&!orders.snapshot().pantry?.allocations.some(a=>['return-pending','return-carrying'].includes(a.stage));}
 function claimDuty(receiptId){
  if(orders.active().some(o=>o.actorId==='player'))return false;
  if(playerOwns())return duty.receiptId===receiptId;const job=activeJob();if(job?.receiptId!==receiptId||!meetingReady())return false;
  // Persist the producer lease and all unstarted original slips together.
  // A failed save leaves Jia responsible and cannot split the unique role.
  const before=duty;duty={receiptId,status:'active'};if(!orders.claim(receiptId,job.day,jia.station.id)){duty=before;return false;}
  jia.route=[];travelState.delete(jia);record('jia-handed-over');persist();return true;
 }
 function canEndDuty(receiptId){return !orders.active().some(o=>o.workReceiptId===receiptId)&&!orders.snapshot().pantry?.allocations.some(a=>a.stage==='return-carrying'&&a.returnHolderId==='player');}
 function releaseDuty(receiptId,{cancel=false}={}){if(duty?.receiptId!==receiptId)return true;if(!canEndDuty(receiptId)&&!cancel)return false;
  if(cancel)for(const o of orders.active())if(o.workReceiptId===receiptId&&!cancelMeal(o.actorId,'当班中断 · 原膳注销'))return false;
  if(cancel&&orders.snapshot().pantry?.allocations.some(a=>a.stage==='return-carrying'&&a.returnHolderId==='player')&&!orders.dropReturns('player',getPlayer()?.root.position.toArray()))return false;
  const before=duty;duty=null;workAction=null;if(!persist()){duty=before;return false;}life.recall();record('jia-recalled');return true;
 }
 const pending=()=>orders.active().filter(o=>production(o)&&!!stepFor(o)&&(o.actorId!=='player'||playerCanDine()&&seated(o)&&availableSeat(o.seatId,o.actorId)));
 function stepFor(o){if(!o)return null;const allocation=orders.pantryAllocation(o.id);if(o.stage==='ordered'&&allocation&&['requested','approved'].includes(allocation.stage)){if(allocation.stage==='requested')return null;return supplyStep(o,allocation,'pick');}const kind=({ordered:'prep',prepared:'heat',cooked:'take',carrying:'serve'})[o.stage];if(!kind)return null;
  return {key:[o.id,o.stage,o.workerId,o.workReceiptId||'-'].join(':'),kind,orderId:o.id,number:o.number,mealId:o.mealId,actorId:o.actorId,position:(kind==='prep'?P.prep:kind==='heat'||kind==='take'?P.stove:servePoint(o)).slice(),target:(kind==='prep'?P.prepTop:kind==='heat'||kind==='take'?P.stoveTop:tablePoint(o)).slice(),executionRadius:.27,action:`第${o.number}号 · ${o.actorName} · ${({prep:'按原单备料',heat:'蒸制原膳',take:'核对并取同份膳',serve:'把同份膳放到原席'})[kind]}`,duration:({prep:3.2,heat:4.5,take:1,serve:1.4})[kind]};
 }
 function supplyStep(o,a,kind){const recovery=kind==='recover',position=recovery?a.returnPoint:PANTRY.point,target=recovery?[position[0],position[1]+.25,position[2]]:PANTRY.target;return {key:[o.id,a.stage,kind,kind==='pick'?o.workerId:a.returnHolderId||'-'].join(':'),kind,orderId:o.id,number:o.number,itemId:a.itemId,workerId:kind==='pick'?o.workerId:a.returnHolderId,position:position.slice(),target:target.slice(),executionRadius:.27,action:`第${o.number}号 · ${kind==='pick'?'核准领出同份原料':recovery?'拾回中断原料':'将同份原料归还储架'}`,duration:1.6};}
 const returnStep=workerId=>{const a=orders.snapshot().pantry?.allocations.find(a=>a.stage==='return-carrying'&&a.returnHolderId===workerId)||orders.snapshot().pantry?.allocations.find(a=>a.stage==='return-pending');return a?supplyStep(orders.lookup(a.orderId),a,a.stage==='return-pending'?'recover':'return'):null;};
 function workIntent(receiptId){if(!playerOwns()||duty.receiptId!==receiptId||workAction)return null;return returnStep('player')||stepFor(pending().find(o=>o.workReceiptId===receiptId));}
 function executeWork(choice,receiptId,p=getPlayer()){
  const current=workIntent(receiptId);if(!current||!p||getMounted()||!near(p,current.position,.27)||current.key!==choice?.key)return false;workAction={...current,receiptId,elapsed:0};persist();return true;
 }
 function finishStep(step){if(['recover','return'].includes(step.kind)){const workerId=step.receiptId?'player':jia.station.id,current=returnStep(workerId);if(current?.key!==step.key)return false;return step.kind==='recover'?orders.recoverSupply(step.orderId,workerId):orders.returnSupply(step.orderId,workerId);}const o=orders.lookup(step.orderId);if(!o||step.key!==stepFor(o)?.key)return false;
  const ok=step.kind==='pick'?orders.pickSupply(o.id,o.workerId):step.kind==='prep'?orders.prepare(o.id):step.kind==='heat'?orders.change(o.id,'prepared','cooked'):step.kind==='take'?orders.change(o.id,'cooked','carrying'):orders.change(o.id,'carrying','served');if(ok){record(step.kind,o);persist();}return ok;
 }
 function contact(step,dt){const o=orders.lookup(step.orderId);if(step.kind!=='serve'||!o||!seated(o))return;
  if(!step.interaction){const token=beginInteraction([o.workerId,o.actorId]);if(token){step.interaction={...token,participants:[...token.participants],duration:0};persist();}}
  if(step.interaction){step.interaction.duration+=dt;onInteraction({...step.interaction,participants:[...step.interaction.participants]});}
 }
 function animate(n,t,action=null,target=null,held=false){const context=poseContext(n,null);context.handoff=held;context.heldProp=null;if(target){context.workHeight=(target[1]-n.root.position.y)/(n.characterScale||1);context.workDistance=Math.hypot(target[0]-n.root.position.x,target[2]-n.root.position.z)/(n.characterScale||1);if(!n.walking)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);}n.animate(t+n.phase,n.walking,action,context);}
 const pose=step=>step?{action:step.kind==='prep'?'knead':step.kind==='heat'?'herb-mix':null,station:{position:step.position,playerWorkTarget:step.target},heldProp:null,handoff:step.kind==='take'||step.kind==='serve'}:null;
 function propsSync(){
  const model=orders.snapshot(),batch=lot.group.getObjectByName?.(PANTRY.id);if(batch&&model.pantry)Object.assign(batch.userData,{batchId:PANTRY.id,quantity:model.pantry.quantity,remaining:model.supply.remaining,counted:!!model.pantry.counted});
  for(const a of model.pantry?.allocations||[]){let prop=supplyProps.get(a.orderId);if(!['picked','return-pending','return-carrying'].includes(a.stage)){if(prop)prop.group.visible=false;continue;}if(!prop){prop=makeSupply(lot.group,a.itemId);supplyProps.set(a.orderId,prop);}const o=orders.lookup(a.orderId),g=prop.group,holderId=a.stage==='picked'?o.workerId:a.stage==='return-carrying'?a.returnHolderId:null,holder=actualActor(holderId);g.visible=true;Object.assign(g.userData,{itemId:a.itemId,orderId:o.id,batchId:PANTRY.id,holderId});if(holder){holder.root.updateMatrixWorld(true);const hand=holder.root.userData.hands?.[0];if(hand){hand.getWorldPosition(g.position);lot.group.worldToLocal(g.position);}else{g.position.copy(holder.root.position);g.position.y+=1;}}else g.position.set(a.returnPoint[0],a.returnPoint[1]+.12,a.returnPoint[2]);
  }

  const all=orders.snapshot().orders;for(const o of all){let prop=props.get(o.id);if(!o.mealId||['consumed','cancelled'].includes(o.stage)){if(prop)prop.group.visible=false;continue;}
   if(!prop){prop=makeMeal(lot.group,o.mealId);props.set(o.id,prop);}const g=prop.group;g.visible=true;g.userData.mealId=o.mealId;g.userData.orderId=o.id;g.userData.itemId=orders.pantryAllocation(o.id)?.itemId||null;g.rotation.set(0,0,0);
   const holder=o.stage==='carrying'?actualActor(o.workerId):o.stage==='eating'&&seated(o)?actualActor(o.actorId):null;
   if(holder){holder.root.updateMatrixWorld(true);const hand=holder.root.userData.hands?.[0];if(hand){hand.getWorldPosition(g.position);lot.group.worldToLocal(g.position);g.position.y+=.02;}else{g.position.copy(holder.root.position);g.position.y+=1.0;}g.userData.holderId=o.stage==='carrying'?o.workerId:o.actorId;}
   else{g.position.set(...(o.stage==='prepared'?P.prepTop:o.stage==='cooked'?P.stoveTop:tablePoint(o)));g.userData.holderId=o.stage==='prepared'?'prep':o.stage==='cooked'?'stove':o.seatId;}
  }
 }
 // A pending source-bound story may be retried after this original meal was
 // eaten and the world was reloaded. Rehydrate only that requested original
 // receipt's hidden bowl, never every historical dish or a replacement order.
 function mealObject(orderId){
  const o=orders.lookup(orderId);if(!o?.mealId)return null;
  let prop=props.get(orderId);
  if(!prop&&o.stage==='consumed'&&o.receipt?.completed===true&&o.receipt.orderId===o.id&&o.receipt.mealId===o.mealId){
   prop=makeMeal(lot.group,o.mealId);prop.group.visible=false;
   Object.assign(prop.group.userData,{orderId:o.id,mealId:o.mealId,holderId:o.actorId});props.set(orderId,prop);
  }
  return prop?.group||null;
 }
 function replayRelationships(){relationshipOutbox.deliver(orders.snapshot().orders.filter(o=>['consumed','cancelled'].includes(o.stage)).map(o=>serviceRelationshipEvent('china-royal-kitchen',o.id,o.stage==='consumed'?'completed':'cancelled',o.workerId,o.actorId,relationshipTimes[o.id]??0)));}
 function update(dt,t,s={}){replayRelationships();
  if(disposed)return;playerState=s;time+=dt;rebind();const job=activeJob();
  if(duty&&job?.receiptId!==duty.receiptId)releaseDuty(duty.receiptId,{cancel:true});
  // A failed cancellation save keeps the original numbered order, but cannot
  // continue production or eating while identity/seat ownership is invalid.
  for(const o of orders.active())if(o.actorId==='player'&&(!playerCanDine()||!layoutReseat&&!seated(o)||!availableSeat(o.seatId,'player')))cancelMeal('player','离席或御膳资格已改变');
  if(layoutReseat&&orders.active().some(o=>o.actorId==='player'&&seated(o)))layoutReseat=false;
  deliverMealReceipts();state.eating??={};
  for(const o of orders.active())if(o.stage==='eating'&&seated(o)&&(o.actorId!=='player'||playerCanDine()&&availableSeat(o.seatId,'player'))&&!talkingDiner(o.actorId))state.eating[o.id]=(state.eating[o.id]??o.eatingSeconds)+dt;
  if(workAction){const step=workAction,o=orders.lookup(step.orderId);if(!playerOwns()||(!['recover','return'].includes(step.kind)&&o?.workReceiptId!==step.receiptId)||step.key!==(['recover','return'].includes(step.kind)?returnStep('player'):stepFor(o))?.key||getMounted()||!near(getPlayer(),step.position,.30)){workAction=null;persist();}
   else if(!getPlayer().walking){step.elapsed+=dt;contact(step,dt);if(step.elapsed>=step.duration&&finishStep(step)){workAction=null;persist();}}
  }
  needsLife?.update(dt,t);
  for(const [id,n] of people){if(n===jia||n.alive===false||needsLife?.owns(n))continue;const l=personLife(n),choice=l.update(dt,{released:true,paused:isSociallyHeld(id,s.conversationActorId),hour:getClock().hour});animate(n,t,choice?.action||null,choice?.target||null,false);}
  if(needsLife?.away(jia.station.id)||!npcAvailable()){if(!needsLife?.owns(jia)&&jia.alive!==false&&canControlActor(jia)){const choice=life.update(dt,{released:true,paused:isSociallyHeld(jia.station.id,s.conversationActorId),hour:getClock().hour});animate(jia,t,choice?.action||null,choice?.target||null,false);}propsSync();if(time>=nextSave){nextSave=time+2;persist();}return;}
  jia.walking=false;let action=null,target=null;const pause=isSociallyHeld(jia.station.id,s.conversationActorId);
  const recovery=!playerOwns()&&!meeting?returnStep(jia.station.id):null;
  const npc=pending().find(o=>o.workerId===jia.station.id&&(!meeting||o.stage!=='ordered'));
  const released=playerOwns()&&!meeting&&!npc&&!recovery;
  const leisure=life.update(dt,{released,paused:pause,hour:getClock().hour});
  if(!pause){
   if(npc||recovery){const step=recovery||stepFor(npc);if(!phase||phase.key!==step.key)phase={...step,elapsed:0};if(travel(jia,step.position,dt)){action=pose(step).action;target=step.target;phase.elapsed+=dt;contact(phase,dt);if(phase.elapsed>=step.duration&&finishStep(phase)){phase=null;persist();}}}
   else if(released){action=leisure?.action||null;target=leisure?.target||null;}
   else{life.recall();travel(jia,P.host,dt);phase=null;}
  }
  const held=orders.active().some(o=>o.workerId===jia.station.id&&(o.stage==='carrying'||orders.pantryAllocation(o.id)?.stage==='picked'))||orders.snapshot().pantry?.allocations.some(a=>a.stage==='return-carrying'&&a.returnHolderId===jia.station.id);animate(jia,t,action,target,held);
  const text=pause?'Jia · 停步交谈':released?life.label():meeting&&!npc?'Jia · 本人办理御膳技术岗':recovery?recovery.action:npc?label(npc):isHired()&&!playerOwns()?'Jia · 未开班代管御膳':label(null);const el=jia.label?.querySelector?.('small');if(el)el.textContent=text;
  propsSync();if(time>=nextSave){nextSave=time+2;persist();}
 }
 function snapshot(){const s=durable();s.eating=copy(state.eating||{});return s;}
 function restore(s){if(s?.version!==1||s.orders?.revision!==orders.snapshot().revision)return false;time=s.time||time;phase=s.layoutRevision===1?copy(s.phase||null):null;workAction=s.layoutRevision===1?copy(s.workAction||null):null;layoutReseat=!!s.layoutReseat||s.layoutRevision!==1&&orders.active().some(o=>o.actorId==='player');duty=copy(s.duty||null);state.eating=copy(s.eating||{});life.restore(s.personalLives?.[jia.station.id]||s.life);if(s.personalNeeds)needsLife?.restore(s.personalNeeds);for(const o of orders.active())if(o.actorId==='player'&&!playerCanDine())cancelMeal('player','恢复时御膳资格不可用');jia.route=[];travelState.clear();propsSync();return true;}
 if(prior?.eating)state.eating=copy(prior.eating);
 const workReceipts=receiptId=>orders.snapshot().orders.filter(o=>o.stage==='consumed'&&o.workerId==='player'&&(!receiptId||o.workReceiptId===receiptId)).map(o=>({source:'china-royal-kitchen',number:o.number,orderId:o.id,mealId:o.mealId,actorId:o.actorId,actorName:o.actorName,day:o.workDay,workReceiptId:o.workReceiptId,completed:true}));
 return {reviewer:()=>{const r=holder();return npcAvailable()?{actorId:jia.station.id,name:jia.station.npcName||jia.station.id,revision:r.revision}:null;},roleHandoffBoundary:handoffBoundary,rebind,acceptsActor:n=>people.has(n?.station.id),personalNeedsState:()=>needsLife?.state()||null,canBorrowMeal:id=>!!needsLife?.canBorrowMeal(id),npcDutyCoverage:()=>{const r=holder(),p=jia.root.position;return npcAvailable()&&!playerOwns()&&!needsLife?.away(jia.station.id)&&!isSociallyHeld(jia.station.id,playerState.conversationActorId)&&(near(jia,P.host,.15)||phase&&p.x>=16&&p.x<=26&&p.z>=-12&&p.z<=-3)?[{actorId:jia.station.id,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:r.revision}]:[];},requestMeal,playerMealAvailability,waitingForSeat:()=>layoutReseat,canRequestMeal:id=>id==='player'?playerMealAvailability().ok:!!actors.get(id)&&(playerOwns()||npcAvailable()&&!needsLife?.blocks())&&(!meeting||!playerOwns())&&orders.available(id),mealFor,lookupMeal,mealReady,startMeal,completeMeal,cancelMeal,isEatingMeal:(id,actorId)=>{const o=lookupMeal(id,actorId);return o?.stage==='eating'&&seated(o)&&!talkingDiner(actorId)&&(actorId!=='player'||playerCanDine());},mealProgress:id=>state.eating?.[id]??orders.lookup(id)?.eatingSeconds??0,mealReceipts:()=>orders.receipts(),update,snapshot,restore,
  pantryTask:orders.pantryTask,completePantryTask:orders.completePantryTask,
  supplyState:()=>orders.snapshot().supply,mealObject,held:()=>orders.active().some(o=>o.workerId==='player'&&(o.stage==='carrying'||orders.pantryAllocation(o.id)?.stage==='picked'))||orders.snapshot().pantry?.allocations.some(a=>a.stage==='return-carrying'&&a.returnHolderId==='player'),registry:P.registry,meetingReady,requestMeeting:value=>{meeting=!!value;},claimDuty,canEndDuty,releaseDuty,workIntent,executeWork,workReceipts,
  canTalkAtPost:n=>people.has(n?.station.id)&&!meeting&&!workAction&&!pending().some(o=>o.workerId===n.station.id)&&!n.walking&&!n.route?.length&&!n.serviceMount,
  canBorrowForSocial:n=>people.has(n?.station.id)&&!needsLife?.owns(n)&&!meeting&&!pending().some(o=>o.workerId===n.station.id)&&(n!==jia||playerOwns()),
  owns:n=>people.has(n?.station.id),ownsStation:id=>people.has(id),socialStatus:n=>needsLife?.owns(n)?{busy:true,canPause:false,attention:false,job:needsLife.label()}:n!==jia&&people.has(n?.station.id)?{busy:false,canPause:true,attention:true,job:personLife(n).label()}:n===jia?{busy:!!pending().find(o=>o.workerId===jia.station.id),canPause:!pending().some(o=>o.workerId===jia.station.id),attention:!pending().some(o=>o.workerId===jia.station.id),job:playerOwns()?life.label():'御膳厨役 · 原单供膳'}:null,
  workLabel:()=>{const o=orders.active().find(o=>o.workerId==='player');return o&&orders.pantryAllocation(o.id)?.stage==='requested'?`第${o.number}号 · 等许知远核准原储备领料`:label(o);},
  dutyActive:receiptId=>playerOwns()&&duty.receiptId===receiptId,
  playerPose:()=>pose(workAction)|| (orders.active().some(o=>o.workerId==='player'&&(o.stage==='carrying'||orders.pantryAllocation(o.id)?.stage==='picked'))||orders.snapshot().pantry?.allocations.some(a=>a.stage==='return-carrying'&&a.returnHolderId==='player')?{handoff:true}:null),isActing:()=>!!workAction,stopWorkAction(){workAction=null;persist();},syncPlayer:propsSync,
  state:()=>({...snapshot(),loadError:orders.loadError(),pending:pending(),supply:orders.snapshot().supply,heldSupplies:[...supplyProps.values()].filter(p=>p.group.visible).map(p=>({...p.group.userData,position:p.group.position.toArray()})),heldMeals:[...props.values()].filter(p=>p.group.visible).map(p=>({...p.group.userData,position:p.group.position.toArray()})),jia:{id:jia.station.id,position:jia.root.position.toArray(),released:playerOwns()&&!meeting},failures:copy(failures)}),
  dispose({suspend=false}={}){if(disposed)return;needsLife?.dispose({suspend});if(suspend)persist();else for(const o of orders.active())cancelMeal(o.actorId,'场景结束');disposed=true;jia.route=[];for(const p of props.values())p.dispose();props.clear();for(const p of supplyProps.values())p.dispose();supplyProps.clear();}
 };
}
function makeMeal(parent,id){const group=new THREE.Group();group.name=id;parent.add(group);const mats=[],mat=c=>{const m=new THREE.MeshToonMaterial({color:c});mats.push(m);return m;},porcelain=mat(0xc3d1bd),dough=mat(0xf0dfbd),greens=mat(0x648969);
 const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);group.add(o);return o;};
 add(new THREE.CylinderGeometry(.23,.16,.07,16),porcelain,0,0,0);for(const [x,z]of[[-.09,0],[.06,-.07],[.06,.08]])add(new THREE.SphereGeometry(.07,10,7),dough,x,.065,z).scale.set(.9,.55,1.1);add(new THREE.SphereGeometry(.06,8,6),greens,-.05,.048,-.10).scale.set(1,.3,1);
 return {group,dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of mats)m.dispose();}};
}

function makeSupply(parent,id){const group=new THREE.Group();group.name=id;parent.add(group);const material=new THREE.MeshToonMaterial({color:0xb69d6a}),geometry=new THREE.SphereGeometry(.17,10,8),parcel=new THREE.Mesh(geometry,material);parcel.scale.set(1,.8,.85);group.add(parcel);return {group,dispose(){group.removeFromParent();geometry.dispose();material.dispose();}};}
