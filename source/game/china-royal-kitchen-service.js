import * as THREE from 'three';
import {followActorRoute} from './actor-navigation.js';
import {createRoyalKitchenOrders,ROYAL_DINERS,ROYAL_MEAL_SEATS,royalPlayerEligibilityEvidence,sameRoyalPlayerEligibility} from './china-royal-kitchen-orders.js';
import {createRoyalKitchenLife} from './china-royal-kitchen-life.js';
export const ROYAL_KITCHEN_POINTS=Object.freeze({registry:[23.6,4.015,-5.9],host:[22.7,4.015,-5.9],prep:[20,4.015,-6.11],prepTop:[20,5,-6.7],stove:[17.8,4.015,-5.95],stoveTop:[19.1,5.73,-4.5]});
const P=ROYAL_KITCHEN_POINTS,copy=x=>JSON.parse(JSON.stringify(x)),point=p=>({x:p[0],y:p[1],z:p[2]}),near=(n,p,r=.10)=>!!n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.35;
const open=o=>!['consumed','cancelled'].includes(o.stage),production=o=>['ordered','prepared','cooked','carrying'].includes(o.stage);
const servePoint=o=>[o.seatId.endsWith('19.8')?18.25:23.75,.215,-6.25],tablePoint=o=>[o.seatId.endsWith('19.8')?19.9:22.1,1.18,-6.25];
const label=o=>o?`第${o.number}号 · ${o.actorName} · ${({ordered:'待备料',prepared:'待蒸制',cooked:'待取原膳',carrying:'送原膳到席',served:'等本人到席',eating:'正在用膳',consumed:'同份膳已用完',cancelled:'已取消'})[o.stage]}`:'现场候单 · 等皇家本人择时用膳';

// Jia is the only kitchen actor. Palace life retains every diner, duty, route
// and seat. The kitchen owns original orders, one physical dish per order and
// the finite opening pantry; employment only leases its producer role.
export function createChinaRoyalKitchenService({npcs,lot,doors,planPath,moveActor,poseContext,getPlayer=()=>null,getMounted=()=>null,getMountedActor=()=>null,
 getPlayerMealEligibility=()=>null,getPlayerSeat=()=>getMounted(),getSeatOccupant=()=>null,
 getClock=()=>({day:0,hour:10}),getEmployment=()=>null,isHired=()=>false,sharedNeeds=null,worldSeed=1,saved=null,saveState=()=>true,notify=()=>{},beginInteraction=()=>null,onInteraction=()=>{}}){
 const jia=npcs.find(n=>n.station.id==='cn-cooking');if(!jia)return null;
 const actors=new Map(npcs.map(n=>[n.station.id,n])),props=new Map(),travelState=new Map(),history=[],failures=[];
 let state={},layoutReseat=false,time=0,disposed=false,meeting=false,workAction=null,phase=null,duty=null,nextSave=0,life=null,orders=null,playerState={};
 const prior=saved?.continuity?.version===1&&saved.continuity.orders?.revision>=(saved.orders?.revision??-1)?saved.continuity:saved;
 if(prior?.version===1){time=prior.time||0;duty=copy(prior.duty||null);phase=copy(prior.phase||null);workAction=copy(prior.workAction||null);history.push(...(prior.history||[]).slice(-36));}
 const durable=(model=orders?.snapshot())=>({version:1,layoutRevision:1,layoutReseat,orders:model,time,duty:copy(duty),phase:copy(phase),workAction:copy(workAction),life:life?.snapshot()||prior?.life||{},eating:copy(state.eating||{}),history:copy(history)});
 const persist=()=>{if(!orders)return true;try{const ok=saveState(durable());return ok!==false&&!ok?.then;}catch{return false;}};
 const record=(event,o=null)=>{history.push({event,orderId:o?.id||null,mealId:o?.mealId||null,time:+time.toFixed(2)});if(history.length>36)history.shift();};
 orders=createRoyalKitchenOrders({saved:prior?.orders||null,getClock,getPlayerMealEligibility:playerEligibility,saveState:model=>{try{const ok=saveState(durable(model));return ok!==false&&!ok?.then;}catch{return false;}}});
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
  if(!playerEligibility())return blocked('not-appointed','册封尚未生效，暂不能用膳');
  if(activeJob()||playerOwns())return blocked('finish-kitchen-duty','请先与Jia真实交班，再用膳');
  const own=orders.active().find(o=>o.actorId==='player');
  if(own&&!sameRoyalPlayerEligibility(own.eligibility,playerEligibility()))return blocked('appointment-changed','暂不能用膳，请取消后重试');
  if(own&&seatId&&own.seatId!==seatId)return blocked('original-seat-required','请回到本次餐席');
  if(!own&&!orders.available('player'))return blocked('supply-empty','储备已用完或已有餐单预留');
  const free=id=>ROYAL_MEAL_SEATS.includes(id)&&availableSeat(id,'player')&&!orders.active().some(o=>o.seatId===id&&o.actorId!=='player');
  if(seatId?!free(seatId):!ROYAL_MEAL_SEATS.some(free))return blocked('seat-busy','餐席正在使用，请稍候');
  return {ok:true,code:null,reason:null,eligibility:playerEligibility(),order:own||null};
 }
 const talkingDiner=id=>id==='player'?!!playerState.conversationActorId:playerState.conversationActorId===id;
 function deliverMealReceipts(){const receipts=orders.receipts();if(!receipts.length)return false;
  if(sharedNeeds?.royalMealReceipts)return sharedNeeds.royalMealReceipts(receipts,orders.snapshot());
  return sharedNeeds?.mealReceipts(receipts.filter(r=>r.actorId!=='player'||sameRoyalPlayerEligibility(playerEligibility(),r.eligibility)));
 }
 const actualActor=id=>id==='player'?getPlayer():actors.get(id);
 const mealFor=id=>orders.forActor(id),lookupMeal=(id,actorId)=>{const o=orders.lookup(id);return o?.actorId===actorId?o:null;};
 const mealReady=(id,actorId)=>{const o=lookupMeal(id,actorId);return !!o&&['served','eating'].includes(o.stage);};
 function travel(n,to,dt){
  n.walking=false;if(near(n,to,.065)){n.route=[];travelState.delete(n);return true;}if(playerState.conversationActorId===n.station.id)return false;
  let s=travelState.get(n);if(!s||s.key!==to.join(',')){s={key:to.join(','),retryAt:0};travelState.set(n,s);n.route=[];}
  if(!n.route.length&&time>=s.retryAt){s.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);if(!n.route.length&&!s.reported){failures.push({actor:n.station.id,to:to.slice(),position:n.root.position.toArray()});if(failures.length>8)failures.shift();s.reported=true;}}
  followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to,.065);
 }
 life=createRoyalKitchenLife({actor:jia,worldSeed,planPath,travel,near,saved:prior?.life});
 function requestMeal({actorId,seatId}){
  const n=actualActor(actorId);if(!n||!((n.ageYears??n.station?.ageYears)>=18)||!(ROYAL_DINERS.includes(actorId)||actorId==='player'&&playerMealAvailability(seatId).ok))return null;
  if(actorId==='player'&&(!seated({actorId,seatId})||!availableSeat(seatId,actorId)))return null;
  const job=playerOwns()?activeJob():null,o=orders.request({actorId,seatId,name:n.station?.npcName||'你',workerId:job?'player':'cn-cooking',workReceiptId:job?.receiptId||null,workDay:job?.day??getClock().day});if(o){record('requested',o);persist();}return o;
 }
 function cancelMeal(actorId,reason){const old=mealFor(actorId);if(!old||!open(old))return true;if(!orders.cancel(actorId,reason))return false;if(phase?.orderId===old.id)phase=null;if(workAction?.orderId===old.id)workAction=null;record('cancelled',old);persist();return true;}
 function startMeal(id,actorId){const o=lookupMeal(id,actorId);if(!o||!seated(o)||talkingDiner(actorId)||actorId==='player'&&(!playerCanDine()||!availableSeat(o.seatId,actorId)))return false;if(o.stage==='eating')return true;return o.stage==='served'&&orders.change(id,'served','eating');}
 function completeMeal(id,actorId){const o=lookupMeal(id,actorId);if(o?.stage==='consumed'){deliverMealReceipts();return true;}if(actorId==='player'&&!playerCanDine())return false;if(!o||!seated(o)||!availableSeat(o.seatId,actorId)||talkingDiner(actorId))return false;
  const elapsed=state.eating?.[id]??o.eatingSeconds;if(!orders.consume(id,actorId,elapsed))return false;record('consumed',orders.lookup(id));deliverMealReceipts();persist();return true;
 }
 function meetingReady(){return near(jia,P.host,.12)&&!orders.active().some(o=>o.workerId==='cn-cooking'&&['prepared','cooked','carrying'].includes(o.stage));}
 function claimDuty(receiptId){
  if(orders.active().some(o=>o.actorId==='player'))return false;
  if(playerOwns())return duty.receiptId===receiptId;const job=activeJob();if(job?.receiptId!==receiptId||!meetingReady())return false;
  // Persist the producer lease and all unstarted original slips together.
  // A failed save leaves Jia responsible and cannot split the unique role.
  const before=duty;duty={receiptId,status:'active'};if(!orders.claim(receiptId,job.day)){duty=before;return false;}
  jia.route=[];travelState.delete(jia);record('jia-handed-over');persist();return true;
 }
 function canEndDuty(receiptId){return !orders.active().some(o=>o.workReceiptId===receiptId);}
 function releaseDuty(receiptId,{cancel=false}={}){if(duty?.receiptId!==receiptId)return true;if(!canEndDuty(receiptId)&&!cancel)return false;
  if(cancel)for(const o of orders.active())if(o.workReceiptId===receiptId&&!cancelMeal(o.actorId,'当班中断 · 原膳注销'))return false;
  const before=duty;duty=null;workAction=null;if(!persist()){duty=before;return false;}life.recall();record('jia-recalled');return true;
 }
 const pending=()=>orders.active().filter(o=>production(o)&&(o.actorId!=='player'||playerCanDine()&&seated(o)&&availableSeat(o.seatId,o.actorId)));
 function stepFor(o){if(!o)return null;const kind=({ordered:'prep',prepared:'heat',cooked:'take',carrying:'serve'})[o.stage];if(!kind)return null;
  return {key:[o.id,o.stage,o.workerId,o.workReceiptId||'-'].join(':'),kind,orderId:o.id,number:o.number,mealId:o.mealId,actorId:o.actorId,position:(kind==='prep'?P.prep:kind==='heat'||kind==='take'?P.stove:servePoint(o)).slice(),target:(kind==='prep'?P.prepTop:kind==='heat'||kind==='take'?P.stoveTop:tablePoint(o)).slice(),executionRadius:.27,action:`第${o.number}号 · ${o.actorName} · ${({prep:'按原单备料',heat:'蒸制原膳',take:'核对并取同份膳',serve:'把同份膳放到原席'})[kind]}`,duration:({prep:3.2,heat:4.5,take:1,serve:1.4})[kind]};
 }
 function workIntent(receiptId){if(!playerOwns()||duty.receiptId!==receiptId||workAction)return null;return stepFor(pending().find(o=>o.workReceiptId===receiptId));}
 function executeWork(choice,receiptId,p=getPlayer()){
  const current=workIntent(receiptId);if(!current||!p||getMounted()||!near(p,current.position,.27)||current.key!==choice?.key)return false;workAction={...current,receiptId,elapsed:0};persist();return true;
 }
 function finishStep(step){const o=orders.lookup(step.orderId);if(!o||step.key!==stepFor(o)?.key)return false;
  const ok=step.kind==='prep'?orders.prepare(o.id):step.kind==='heat'?orders.change(o.id,'prepared','cooked'):step.kind==='take'?orders.change(o.id,'cooked','carrying'):orders.change(o.id,'carrying','served');if(ok){record(step.kind,o);persist();}return ok;
 }
 function contact(step,dt){const o=orders.lookup(step.orderId);if(step.kind!=='serve'||!o||!seated(o))return;
  if(!step.interaction){const token=beginInteraction([o.workerId,o.actorId]);if(token){step.interaction={...token,participants:[...token.participants],duration:0};persist();}}
  if(step.interaction){step.interaction.duration+=dt;onInteraction({...step.interaction,participants:[...step.interaction.participants]});}
 }
 function animate(n,t,action=null,target=null,held=false){const context=poseContext(n,null);context.handoff=held;context.heldProp=null;if(target){context.workHeight=(target[1]-n.root.position.y)/(n.characterScale||1);context.workDistance=Math.hypot(target[0]-n.root.position.x,target[2]-n.root.position.z)/(n.characterScale||1);if(!n.walking)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);}n.animate(t+n.phase,n.walking,action,context);}
 const pose=step=>step?{action:step.kind==='prep'?'knead':step.kind==='heat'?'herb-mix':null,station:{position:step.position,playerWorkTarget:step.target},heldProp:null,handoff:step.kind==='take'||step.kind==='serve'}:null;
 function propsSync(){
  const all=orders.snapshot().orders;for(const o of all){let prop=props.get(o.id);if(!o.mealId||['consumed','cancelled'].includes(o.stage)){if(prop)prop.group.visible=false;continue;}
   if(!prop){prop=makeMeal(lot.group,o.mealId);props.set(o.id,prop);}const g=prop.group;g.visible=true;g.userData.mealId=o.mealId;g.userData.orderId=o.id;g.rotation.set(0,0,0);
   const holder=o.stage==='carrying'?actualActor(o.workerId):o.stage==='eating'&&seated(o)?actualActor(o.actorId):null;
   if(holder){holder.root.updateMatrixWorld(true);const hand=holder.root.userData.hands?.[0];if(hand){hand.getWorldPosition(g.position);lot.group.worldToLocal(g.position);g.position.y+=.02;}else{g.position.copy(holder.root.position);g.position.y+=1.0;}g.userData.holderId=o.stage==='carrying'?o.workerId:o.actorId;}
   else{g.position.set(...(o.stage==='prepared'?P.prepTop:o.stage==='cooked'?P.stoveTop:tablePoint(o)));g.userData.holderId=o.stage==='prepared'?'prep':o.stage==='cooked'?'stove':o.seatId;}
  }
 }
 function update(dt,t,s={}){
  if(disposed)return;playerState=s;time+=dt;const job=activeJob();
  if(duty&&job?.receiptId!==duty.receiptId)releaseDuty(duty.receiptId,{cancel:true});
  // A failed cancellation save keeps the original numbered order, but cannot
  // continue production or eating while identity/seat ownership is invalid.
  for(const o of orders.active())if(o.actorId==='player'&&(!playerCanDine()||!layoutReseat&&!seated(o)||!availableSeat(o.seatId,'player')))cancelMeal('player','离席或御膳资格已改变');
  if(layoutReseat&&orders.active().some(o=>o.actorId==='player'&&seated(o)))layoutReseat=false;
  deliverMealReceipts();state.eating??={};
  for(const o of orders.active())if(o.stage==='eating'&&seated(o)&&(o.actorId!=='player'||playerCanDine()&&availableSeat(o.seatId,'player'))&&!talkingDiner(o.actorId))state.eating[o.id]=(state.eating[o.id]??o.eatingSeconds)+dt;
  if(workAction){const step=workAction,o=orders.lookup(step.orderId);if(!playerOwns()||o?.workReceiptId!==step.receiptId||step.key!==stepFor(o)?.key||getMounted()||!near(getPlayer(),step.position,.30)){workAction=null;persist();}
   else if(!getPlayer().walking){step.elapsed+=dt;contact(step,dt);if(step.elapsed>=step.duration&&finishStep(step)){workAction=null;persist();}}
  }
  jia.walking=false;let action=null,target=null;const pause=s.conversationActorId===jia.station.id;
  const npc=pending().find(o=>o.workerId==='cn-cooking'&&(!meeting||o.stage!=='ordered'));
  const released=playerOwns()&&!meeting&&!npc;
  const leisure=life.update(dt,{released,paused:pause,hour:getClock().hour});
  if(!pause){
   if(npc){const step=stepFor(npc);if(!phase||phase.key!==step.key)phase={...step,elapsed:0};if(travel(jia,step.position,dt)){action=pose(step).action;target=step.target;phase.elapsed+=dt;contact(phase,dt);if(phase.elapsed>=step.duration&&finishStep(phase)){phase=null;persist();}}}
   else if(released){action=leisure?.action||null;target=leisure?.target||null;}
   else{life.recall();travel(jia,P.host,dt);phase=null;}
  }
  const held=orders.active().some(o=>o.workerId==='cn-cooking'&&o.stage==='carrying');animate(jia,t,action,target,held);
  const text=pause?'Jia · 停步交谈':released?life.label():meeting&&!npc?'Jia · 本人办理御膳技术岗':npc?label(npc):isHired()&&!playerOwns()?'Jia · 未开班代管御膳':label(null);const el=jia.label?.querySelector?.('small');if(el)el.textContent=text;
  propsSync();if(time>=nextSave){nextSave=time+2;persist();}
 }
 function snapshot(){const s=durable();s.eating=copy(state.eating||{});return s;}
 function restore(s){if(s?.version!==1||s.orders?.revision!==orders.snapshot().revision)return false;time=s.time||time;phase=s.layoutRevision===1?copy(s.phase||null):null;workAction=s.layoutRevision===1?copy(s.workAction||null):null;layoutReseat=!!s.layoutReseat||s.layoutRevision!==1&&orders.active().some(o=>o.actorId==='player');duty=copy(s.duty||null);state.eating=copy(s.eating||{});life.restore(s.life);for(const o of orders.active())if(o.actorId==='player'&&!playerCanDine())cancelMeal('player','恢复时御膳资格不可用');jia.route=[];travelState.clear();propsSync();return true;}
 if(prior?.eating)state.eating=copy(prior.eating);
 const workReceipts=receiptId=>orders.snapshot().orders.filter(o=>o.stage==='consumed'&&o.workerId==='player'&&(!receiptId||o.workReceiptId===receiptId)).map(o=>({source:'china-royal-kitchen',number:o.number,orderId:o.id,mealId:o.mealId,actorId:o.actorId,actorName:o.actorName,day:o.workDay,workReceiptId:o.workReceiptId,completed:true}));
 return {requestMeal,playerMealAvailability,waitingForSeat:()=>layoutReseat,canRequestMeal:id=>id==='player'?playerMealAvailability().ok:!!actors.get(id)&&(!meeting||!playerOwns())&&orders.available(id),mealFor,lookupMeal,mealReady,startMeal,completeMeal,cancelMeal,isEatingMeal:(id,actorId)=>{const o=lookupMeal(id,actorId);return o?.stage==='eating'&&seated(o)&&!talkingDiner(actorId)&&(actorId!=='player'||playerCanDine());},mealProgress:id=>state.eating?.[id]??orders.lookup(id)?.eatingSeconds??0,mealReceipts:()=>orders.receipts(),update,snapshot,restore,
  supplyState:()=>orders.snapshot().supply,held:()=>orders.active().some(o=>o.workerId==='player'&&o.stage==='carrying'),registry:P.registry,meetingReady,requestMeeting:value=>{meeting=!!value;},claimDuty,canEndDuty,releaseDuty,workIntent,executeWork,workReceipts,
  owns:n=>n===jia,ownsStation:id=>id==='cn-cooking',socialStatus:n=>n===jia?{busy:!!pending().find(o=>o.workerId==='cn-cooking'),canPause:!pending().some(o=>o.workerId==='cn-cooking'),attention:!pending().some(o=>o.workerId==='cn-cooking'),job:playerOwns()?life.label():'御膳厨役 · 原单供膳'}:null,
  workLabel:()=>label(orders.active().find(o=>o.workerId==='player')),
  dutyActive:receiptId=>playerOwns()&&duty.receiptId===receiptId,
  playerPose:()=>pose(workAction)|| (orders.active().some(o=>o.workerId==='player'&&o.stage==='carrying')?{handoff:true}:null),isActing:()=>!!workAction,stopWorkAction(){workAction=null;persist();},syncPlayer:propsSync,
  state:()=>({...snapshot(),loadError:orders.loadError(),pending:pending(),supply:orders.snapshot().supply,heldMeals:[...props.values()].filter(p=>p.group.visible).map(p=>({...p.group.userData,position:p.group.position.toArray()})),jia:{id:jia.station.id,position:jia.root.position.toArray(),released:playerOwns()&&!meeting},failures:copy(failures)}),
  dispose({suspend=false}={}){if(disposed)return;if(suspend)persist();else for(const o of orders.active())cancelMeal(o.actorId,'场景结束');disposed=true;jia.route=[];for(const p of props.values())p.dispose();props.clear();}
 };
}
function makeMeal(parent,id){const group=new THREE.Group();group.name=id;parent.add(group);const mats=[],mat=c=>{const m=new THREE.MeshToonMaterial({color:c});mats.push(m);return m;},porcelain=mat(0xc3d1bd),dough=mat(0xf0dfbd),greens=mat(0x648969);
 const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);group.add(o);return o;};
 add(new THREE.CylinderGeometry(.23,.16,.07,16),porcelain,0,0,0);for(const [x,z]of[[-.09,0],[.06,-.07],[.06,.08]])add(new THREE.SphereGeometry(.07,10,7),dough,x,.065,z).scale.set(.9,.55,1.1);add(new THREE.SphereGeometry(.06,8,6),greens,-.05,.048,-.10).scale.set(1,.3,1);
 return {group,dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of mats)m.dispose();}};
}
