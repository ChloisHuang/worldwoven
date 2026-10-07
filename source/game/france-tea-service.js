import {isSociallyHeld,isPlayerConversationHeld} from './npc-social-ownership.js';
import {createServiceRelationshipOutbox,serviceRelationshipEvent} from './service-relationship-outbox.js';
import {followActorRoute,findActorStandPoint} from './actor-navigation.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {createFranceTeaConversations} from './france-tea-conversations.js';
import {franceTeaStaffChoices} from './france-tea-staff-life.js';
import {createFranceTeaProps} from './france-tea-props.js';
import {visualSupportHeight} from './floor-support.js';

// One real place setting, one order, and the existing three palace residents.
// None of these transient claims or scene objects survive a region unload.
export const FRANCE_TEA={cook:'france-bakery',host:'france-salon',guest:'france-cafe',table:[6.4,1.230,11.24],
 report:[-5.05,.258,-8.50],prep:[-5.9,.258,-9.03],prepTop:[-5.9,1.270,-9.65],cookAside:[-6.95,.258,-10.55],hostHome:[-6.5,.302,-4.45],
 serve:[5.65,.16,11.88],guestHome:[7.1,.16,8.92],seatCenter:[6.6,.16,12.5]};
const P=FRANCE_TEA,copy=x=>JSON.parse(JSON.stringify(x)),gap=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2]);
const serialNumber=n=>Number.isSafeInteger(n)&&n>0?n:0;
const orderNumber=id=>serialNumber(Number(/^france-tea-(\d+)$/.exec(id||'')?.[1]));
export const FRANCE_MEAL=Object.freeze({id:'country-soup-bread',name:'乡蔬浓汤与面包',price:4,currency:'france',seconds:12});
const fullMeal=o=>o?.dishId===FRANCE_MEAL.id;
const paymentId=id=>id+'-meal';
const validReceipt=r=>['france-tea-food','france-full-meal'].includes(r?.source)&&r.actorId==='player'&&r.completed===true&&serialNumber(r.number)&&r.orderId==='france-tea-'+r.number&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-tray'&&(r.source==='france-tea-food'?r.dishId==='tea-cake'&&r.supplyReceipt===r.orderId:r.dishId===FRANCE_MEAL.id&&r.supplyReceipt===r.orderId+'-prepared'&&r.paymentReceipt===paymentId(r.orderId));
const latestReceipts=(...sets)=>{const rows=sets.flatMap(s=>Array.isArray(s)?s:[]).filter(validReceipt).sort((a,b)=>b.number-a.number);return [...new Map(rows.map(r=>[r.source,rows.find(x=>x.source===r.source)])).values()].map(copy);};
const MEAL_LABEL={requested:'玛农过来记下正餐',accepted:'玛农记下浓汤与面包',ticket:'玛农将正餐单送进厨房',preparing:'卡米耶切配蔬菜与面包',brewing:'卡米耶煨好浓汤并装碗',pickup:'玛农接过这份正餐',carrying:'玛农把正餐送往茶廊',serving:'玛农把汤碗与面包放上桌',ready:'正餐已上桌',drinking:'坐着享用浓汤与面包',lowering:'放下汤匙',clearing:'玛农过来收拾餐具',lifting:'玛农收起汤碗与餐盘',returning:'玛农把餐具送回厨房',washing:'玛农清洗餐具'};
const LABEL={receiving:'核对玛农的同号茶点单',plating:'核对热茶与蛋糕并装盘',releasing:'让开案边，将原茶盘交给玛农',seating:'加布里埃尔正在茶桌入座',requested:'玛农过来记下下午茶',accepted:'玛农记下茶与小蛋糕',ticket:'玛农去糕点房传话',preparing:'卡米耶切好一小份蛋糕',brewing:'卡米耶备好热茶',pickup:'玛农在糕点案边接过茶盘',carrying:'玛农把茶盘送往茶廊',serving:'玛农轻轻把茶盘放上桌',ready:'茶与小蛋糕已上桌',drinking:'坐着慢慢品茶',lowering:'把茶杯放回茶碟',clearing:'玛农过来收拾杯碟',lifting:'玛农收起用过的杯碟',returning:'玛农把杯碟送回糕点房',washing:'玛农清理杯碟',leaving:'加布里埃尔起身让出茶位'};

export function createFranceTeaService({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,getPendingSeat=null,onSeat=()=>{},notify=()=>{},onComplete=()=>{},onRelationshipEvent=()=>({ok:false}),onMealReceipts=()=>{},worldSeed=1,ledger=null,sharedNeeds=null,beginInteraction=()=>null,onInteraction=()=>{},saved={},saveState=()=>{},isServerHired=()=>false,isCookHired=()=>false,propsFactory=createFranceTeaProps}){
 const cook=npcs.find(n=>n.station.id===P.cook),host=npcs.find(n=>n.station.id===P.host),guest=npcs.find(n=>n.station.id===P.guest);
 const seat=furniture.items.find(i=>i.kind==='seat'&&Math.hypot(i.center[0]-P.seatCenter[0],i.center[2]-P.seatCenter[2])<.05);
 if(!cook||!host||!guest||!seat)return null;
 const actors=[cook,host,guest],owned=new Set(actors),routes=new Map(),history=[],props=propsFactory(lot.group),navigation={bounds:lot.bounds,multilevel:false};
 let duty=null,meeting={host:false,cook:false},step=null,workReceipts=copy(saved.workReceipts||saved.continuity?.workReceipts||[]);
 const relationshipOutbox=createServiceRelationshipOutbox(onRelationshipEvent);
 let relationshipEvents=copy(saved.relationshipEvents||saved.continuity?.relationshipEvents||[]);
 let committedRelationshipEvents=relationshipEvents;
 let mealReceipts=latestReceipts(saved.mealReceipts,saved.continuity?.mealReceipts);
 let pendingDish='tea-cake',stageAge=0,orphanRetry=0,paidOrder=copy(saved.paidOrder||null),mealClosed=serialNumber(saved.mealClosed);
 let time=0,phase=0,serial=Math.max(serialNumber(saved.serial),serialNumber(saved.continuity?.serial),orderNumber(saved.continuity?.order?.id),orderNumber(saved.paidOrder?.id),mealClosed,...(ledger?.reservations()||[]).map(h=>orderNumber(h.id?.replace(/-meal$/,''))),...mealReceipts.map(r=>r.number)),order=null,intent=false,choice=null,choiceTime=0,nextChoice=8,disposed=false,conversation=null,stationBusy=null,playerSocial=null;
 const {continuity:ignoredContinuity,...aggregate}=saved;
 const staff={host,cook},offDuty={host:null,cook:null},staffNext={host:0,cook:0},standby={host:null,cook:null};
 const life=createLifeDecisions({worldSeed,actorIds:[P.guest,P.host,P.cook],saved:saved.continuity?.life||saved.life,onChange:life=>{const ok=persist({life});if(ok)deliverReceipts();return ok;}});
 // Keep the source receipt after cleanup and failed downstream relief. A life
 // save or unload must never overwrite the serial/receipt with a life-only save.
 function persist(next={}){try{const state=copy({...aggregate,life:life.snapshot(),serial,mealReceipts,relationshipEvents:relationshipOutbox.merge(relationshipEvents),workReceipts,paidOrder:fullMeal(order)?{...order,phase,stageAge}:null,mealClosed,...next});const result=saveState(state);if(result===false||result?.then)return false;relationshipEvents=state.relationshipEvents;committedRelationshipEvents=relationshipEvents;relationshipOutbox.deliver(committedRelationshipEvents);paidOrder=copy(state.paidOrder);mealClosed=state.mealClosed;return true;}catch{return false;}}
 const holdFor=o=>(ledger?.reservations()||[]).find(h=>h.id===paymentId(o?.id));
 function reconcileHolds(){let ok=true;for(const h of ledger?.reservations()||[]){if(/^france-tea-[1-9][0-9]*-meal$/.test(h.id)&&h.status==='reserved'&&h.id!==paymentId(order?.id)&&h.id!==paymentId(paidOrder?.id))ok=!!ledger.refund(h.id).ok&&ok;}return ok;}
 function payment(o,action){if(!fullMeal(o))return true;const h=holdFor(o);if(!h){o.payment='unpaid';return action==='refund';}if(h.currency!=='france'||h.amount!==FRANCE_MEAL.price)return false;if(h.status==='settled'){o.payment='settled';return true;}if(h.status==='refunded'){o.payment='refunded';return action==='refund';}const result=ledger[action](h.id);if(result.ok)o.payment=action==='refund'?'refunded':'settled';return !!result.ok;}
 function deliverReceipts(){relationshipOutbox.deliver(committedRelationshipEvents);if(mealReceipts.length)try{onMealReceipts(copy(mealReceipts));}catch{/* A later save or restore can replay the durable receipt. */}}
 const record=(event,extra={})=>{history.push({event,time:+time.toFixed(2),orderId:order?.id,customer:order?.customer,...extra});if(history.length>64)history.shift();};
 const near=(n,p,r=.07)=>gap(n,p)<r;
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(getPlayer()?[getPlayer().root.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 const atSeat=()=>getMounted()?.id===seat.id&&getPlayer()&&gap(getPlayer(),seat.anchor)<.4;
 const playerRole=role=>duty?.status==='active'&&duty.role===role&&order?.dutyId===duty.id;
 const playerServing=()=>playerRole('host'),playerPreparing=()=>playerRole('cook');
 const released=role=>duty?.status==='active'&&duty.role===role;
 const server=()=>playerServing()?getPlayer():host;
 const customer=()=>order?.customer==='player'?getPlayer():guest;
 const seatedCustomer=()=>order?.customer==='player'?atSeat():guest.serviceMount?.id===seat.id;
 const busy=n=>isSociallyHeld(n.station.id,conversation)||stationBusy===n.station.id;
 function enter(stage){if(fullMeal(order))order.revision=(order.revision||0)+1;order.stage=stage;phase=0;stageAge=0;record(stage);if(fullMeal(order))persist();}
 function travel(n,to,dt){
  n.walking=false;if(busy(n)||n.serviceMount)return false;if(near(n,to)){n.route=[];routes.delete(n);return true;}
  const key=to.join(',');let s=routes.get(n);if(!s||s.key!==key){s={key,stalled:0};routes.set(n,s);n.route=planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25);}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8,arrivalTolerance:.045});if(step.waiting){s.stalled=0;return false;}
  const p=step.waypoint;if(!p){s.stalled+=dt;if(s.stalled>2){routes.delete(n);n.route=[];}return false;}
  s.stalled=n.walking?0:s.stalled+dt;if(s.stalled>2){routes.delete(n);n.route=[];}return near(n,to);
 }
 const urgent=n=>{const need=sharedNeeds?.status(n.station.id);return need?.seekMeal||need?.seekToilet||life.fatigued(n.station.id);};
 const socialAvailable=(n,{ignorePlayerConversation=false}={})=>{const held=ignorePlayerConversation&&isPlayerConversationHeld(n?.station.id);return !!n&&!order&&!intent&&!Object.values(meeting).some(Boolean)&&!isSociallyHeld(n.station.id,held?null:conversation)&&stationBusy!==n.station.id&&(held||playerSocial!==n.station.id)&&!n.serviceMount&&!urgent(n);};
 const talks=createFranceTeaConversations({actors,brain:life,claims:furniture.facilities,available:socialAvailable,
  canReach:(n,p)=>near(n,p)||planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25).length>0,travel,
  clear:n=>{n.route=[];routes.delete(n);},save:()=>persist(),beginInteraction,onInteraction,note:record,
  onRelease:n=>{if(n===guest){choice=null;choiceTime=0;nextChoice=time+3;}else staffNext[n===host?'host':'cook']=time+3;}});
 function beginTalk(n,selected){if(!talks.invite(n,selected)){life.complete(n.station.id,selected,{fulfilled:false});life.defer(n.station.id,12);}return null;}
 function updateStandby(role,dt,hour){
  const n=staff[role];if(talks.owns(n)||released(role)||busy(n)||playerSocial===n.station.id)return;
  let s=standby[role];if(!socialAvailable(n)){if(s){life.complete(n.station.id,s.choice,{fulfilled:false});standby[role]=null;}return;}
  if(s){s.elapsed+=dt;if(s.elapsed>=s.choice.duration){life.complete(n.station.id,s.choice);standby[role]=null;life.defer(n.station.id,12);}return;}
  if(time<staffNext[role]||!life.experience(n.station.id)||!life.decisionDue(n.station.id))return;
  const selected=life.choose(n.station.id,[{id:'pause',base:.18,traits:{quiet:.4},needs:{fatigue:.4},duration:[8,13],cooldown:20},talks.candidate(n)],hour);
  if(!selected)return;if(selected.id==='conversation')beginTalk(n,selected);else standby[role]={choice:staffChoice(selected),elapsed:0};
 }
 function sourceExperiences(){
  if(!order?.finished||order.cancelled)return true;
  const sources=[[P.guest,order.customer==='guest','刚喝完那杯热茶，也尝过小蛋糕'],[P.host,order.npcServed&&order.npcCleaned,fullMeal(order)?'刚送过浓汤与面包，也收妥了原餐具':'把刚才那席热茶送好，也收妥了原杯碟'],[P.cook,order.npcPrepared,fullMeal(order)?'刚按原单备好浓汤与面包':'刚按原单备好热茶与小蛋糕']];
  for(const[id,done,label]of sources)if(done&&!life.recordExperience(id,{id:order.id+(id===P.guest?':drank':':'+id),kind:id===P.guest?'staff-rest':'staff-work',label,completed:true}).ok)return false;
  return true;
 }
 const staffChoice=c=>Object.fromEntries(['id','targetId','duration','startedAt','point','target','label','action','cooldown','relief'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));
 function endLeisure(role,fulfilled=false){
  const s=offDuty[role],n=staff[role];if(!s)return;
  offDuty[role]=null;staffNext[role]=time+2;n.route=[];routes.delete(n);
  if(s.choice){life.complete(n.station.id,s.choice,{fulfilled});record(fulfilled?'staff-rested':'staff-recalled',{actorId:n.station.id,activity:s.choice.id,targetId:s.choice.targetId});}
 }
 function updateLeisure(role,dt,hour){
  const n=staff[role];
  if(talks.owns(n))return null;
  if(!released(role)){endLeisure(role);return null;}
  if(meeting[role]){endLeisure(role);travel(n,role==='cook'?P.cookAside:P.hostHome,dt);return null;}
  if(busy(n))return offDuty[role]&&near(n,offDuty[role].choice.point)?offDuty[role].choice:null;
  let s=offDuty[role];
  if(!s){
   if(time<staffNext[role])return null;
   // Reachability is checked only at a decision boundary. The selected route
   // is reused by the existing follower, never a second movement controller.
   const planned=new Map(),candidates=franceTeaStaffChoices().map(c=>({...c,targets:c.targets.map(target=>{
    const point=target.choice.point,key=point.join(',');
    if(!planned.has(key))planned.set(key,near(n,point)?[]:planPath(n.root.position,{x:point[0],y:point[1],z:point[2]},.25));
    return {...target,reachable:near(n,point)||planned.get(key).length>0};
   })}));
   candidates.push(talks.candidate(n));
   const selected=life.choose(n.station.id,candidates,hour);if(!selected){staffNext[role]=time+6;return null;}
   if(selected.id==='conversation'){beginTalk(n,selected);return null;}
   s=offDuty[role]={choice:staffChoice(selected),elapsed:0,travelTime:0};
   n.route=planned.get(selected.point.join(','));routes.set(n,{key:selected.point.join(','),stalled:0});
   record('staff-choice',{actorId:n.station.id,activity:selected.id,targetId:selected.targetId});
  }
  const arrived=travel(n,s.choice.point,dt);
  if(arrived)s.elapsed+=dt;else s.travelTime+=dt;
  const selected=s.choice;
  if(s.elapsed>=selected.duration)endLeisure(role,true);
  else if(s.travelTime>=75)endLeisure(role,false);
  return arrived?selected:null;
 }
 function mountGuest(dt){
  if(guest.serviceMount)return true;if(!furniture.facilities.reservation(seat.id,P.guest)||!travel(guest,seat.position,dt)||!furniture.canSit(navigation,safety(guest),seat))return false;
  if(!furniture.facilities.occupy(seat.id,P.guest))return false;guest.root.position.set(...seat.anchor);guest.root.rotation.y=seat.yaw;guest.serviceMount=seat;record('guest-seated',{seatId:seat.id});return true;
 }
 function unmountGuest(){if(!guest.serviceMount)return true;const landing=findActorStandPoint(guest,guest.serviceMount,({ignoreDynamicBodies})=>furniture.standPoint(navigation,ignoreDynamicBodies?[...(doors?.cameraColliders||[])]:safety(guest),guest.serviceMount,guest.collisionRadius??.25));if(!landing)return false;guest.root.position.copy(landing);guest.serviceMount=null;furniture.releaseActor(P.guest);return true;}
 function finish(){const o=order;if(o&&(o.finished||o.cancelled)){const event=serviceRelationshipEvent('france-tea',o.id,o.cancelled?'cancelled':'completed',o.npcServed?P.host:o.dutyId&&!o.preparation?'player':P.host,o.customer==='guest'?P.guest:'player',time);const cookEvent=!o.cancelled&&o.finished&&(o.npcPrepared||o.preparation?.cut&&o.preparation?.brewed)?serviceRelationshipEvent('france-kitchen',o.id,'completed',o.npcPrepared?P.cook:'player',o.npcServed?P.host:o.dutyId&&!o.preparation?'player':P.host,time):null;relationshipEvents=relationshipOutbox.merge(relationshipEvents,[event,cookEvent]);if(!persist())return false;}if(!sourceExperiences())return false;if(fullMeal(order)){if(order.cancelled&&!payment(order,'refund'))return false;const closed=orderNumber(order.id);if(!persist({paidOrder:null,mealClosed:Math.max(mealClosed,closed)}))return false;}const cancelled=order.cancelled,completed=order.customer==='player'&&order.finished&&!cancelled;record(cancelled?'cancel-cleared':'complete');props.clear();order=null;phase=0;intent=false;furniture.releaseActor(P.guest);for(const n of actors){if(n===staff[duty?.role]&&released(duty.role))continue;n.route=[];routes.delete(n);}if(choice){life.complete(P.guest,choice,{fulfilled:!cancelled});choice=null;}nextChoice=time+12;if(completed)onComplete();return true;}
 function cancel(reason='取消下午茶'){
  intent=false;if(!order||order.customer!=='player'||order.cancelled)return false;order.cancelled=true;if(fullMeal(order))order.revision=(order.revision||0)+1;record('cancel',{reason});if(fullMeal(order)){payment(order,'refund');persist();notify(order.payment==='settled'?'已停止用餐；开吃后餐费不退':order.payment==='refunded'?'已取消正餐，4法国券已退回':'已取消正餐，退款将在保存恢复后重试');}else notify('已取消，玛农会收回已备好的杯碟');
  if(!order.trayId){finish();return true;}
  if(order.stage==='drinking'||order.stage==='lowering'){order.returnCupFrom=props.state().cupPosition;enter('lowering');}
  else if(order.stage==='serving'||order.stage==='pickup'&&phase>0){order.recallFrom=props.state().trayPosition;order.holder='host';enter('recalling');}
  else if(order.holder==='table')enter('clearing');else if(order.holder==='host')enter('returning');else enter('pickup');return true;
 }
 function begin(who,dishId='tea-cake'){
  talks.cancel('新餐单优先');
  const paid=who==='player'&&dishId===FRANCE_MEAL.id;
  if(paid&&(!reconcileHolds()||!ledger||ledger.balances()?.france.cash<FRANCE_MEAL.price)){notify('法国券余额不足或餐费记录待恢复，请先去钱庄查看');return false;}
  const nextSerial=serial+1;if(!persist({serial:nextSerial})){if(who==='player')notify('暂时无法记下餐单，请稍后再试');return false;}serial=nextSerial;
  const id='france-tea-'+serial;if(paid&&!ledger.reserve(FRANCE_MEAL.price,paymentId(id),'france').ok){notify('餐费未能预留，请稍后再试');return false;}
  order={id,customer:who,stage:who==='player'?'requested':'seating',...(paid?{dishId:FRANCE_MEAL.id,payment:'reserved',price:FRANCE_MEAL.price,revision:1}:{}),...(who==='guest'&&duty?.status==='active'?{dutyId:duty.id}:{}),seatId:seat.id,holder:'kitchen',trayId:null,cancelled:false,tablePoint:P.table.slice()};phase=0;stageAge=0;
  if(paid&&!persist()){order.cancelled=true;payment(order,'refund');persist();notify('餐单未能保存，餐费将按原单退回');return false;}
  record('requested');return true;
 }
 function request(dishId='tea-cake'){
  if(disposed||!['tea-cake',FRANCE_MEAL.id].includes(dishId))return false;
  if(dishId===FRANCE_MEAL.id&&(!ledger||ledger.balances()?.france.cash<FRANCE_MEAL.price||!reconcileHolds())){notify('需随身4法国券，余额不足时不会占用茶席');return false;}

  if(duty){notify('当班中不能给自己点餐，请先当面交班');return false;}
  if(order){notify(order.cancelled?'杯碟还在收拾，请稍候':order.customer==='player'?'这份下午茶已经记下了':'加布里埃尔正在用茶，请等这桌收拾完');return false;}
  if(intent){notify('正在走向茶位，可按 E 或移动取消');return false;}
  talks.cancel('来客准备点餐，先回岗位');
  if(!atSeat()){
   if(guest.serviceMount||furniture.facilities.reservation(seat.id,P.guest)){notify('这张茶椅有人，请稍候');return false;}
   // Existing player furniture navigation remains responsible for approach,
   // swept transfer and cancellation. Mark intent after its cancelAction hook.
   pendingDish=dishId;onSeat(seat);intent=atSeat()||!getPendingSeat||getPendingSeat()===seat.id;if(!intent){notify('茶椅入口暂时走不过去，请从通道靠近后再试');return false;}notify(fullMeal({dishId})?'先到茶椅坐好，玛农会过来记正餐':'先到茶椅坐好，玛农会过来记下午茶');return true;
  }
  return begin('player',dishId);
 }
 function consume(){
  if(!order||order.cancelled||order.trayId!==order.id+'-tray')return false;
  if(order.customer==='player'){
   if(fullMeal(order)&&(holdFor(order)?.status!=='settled'||order.supplyReceipt!==order.id+'-prepared'))return false;
   const receipt={source:fullMeal(order)?'france-full-meal':'france-tea-food',id:order.id+'-consumed',number:orderNumber(order.id),actorId:'player',orderId:order.id,mealId:order.trayId,dishId:fullMeal(order)?FRANCE_MEAL.id:'tea-cake',supplyReceipt:fullMeal(order)?order.supplyReceipt:order.id,...(fullMeal(order)?{paymentReceipt:paymentId(order.id)}:{}),completed:true};
   const next=latestReceipts(mealReceipts,[receipt]);if(!persist({mealReceipts:next,...(fullMeal(order)?{paidOrder:{...order,revision:(order.revision||0)+1,finished:true,stage:'lowering',phase:0,stageAge:0}}:{})}))return false;mealReceipts=next;
  }
  // A failed optional story save must not hold the original cup in mid-air.
  // Cleanup retries this durable source before releasing the completed order.
  if(order.customer==='guest')life.recordExperience(P.guest,{id:order.id+':drank',kind:'staff-rest',label:'刚喝完那杯热茶，也尝过小蛋糕',completed:true});
  order.finished=true;record('tea-finished');enter('lowering');if(order.customer==='player')deliverReceipts();return true;
 }
 function drink(){if(order?.customer!=='player'||order.cancelled||order.stage!=='ready'||!atSeat())return false;if(!payment(order,'settle')){notify('餐费暂时未能结账，请稍后重试');return false;}enter('drinking');return true;}
 const tick=(dt,duration,next)=>{phase+=dt;if(phase>=duration)next();};
 // The existing R63 serving prototype contributes physical steps and tray
 // recovery. Hiring, continuing demand, receipts and attendance use current core.
 // The original NPC point is only .31m clear of the table. Keep its route,
 // and give the wider player capsule a legal place beside the same seat.
 // Wait on the open southwest apron, outside the original cook's return
 // approach from the west gallery and the rear counter's narrow edge.
 const registry=[-5.5,.302,-4.45],cookRegistry=[-7.7,.258,-9.3],playerServe=[5.4,.16,12.0];
 const SPECS={
  receiving:{role:'cook',key:'receive-order',position:P.prep,target:P.report,seconds:1,action:'calligraphy',label:'核对玛农的原单与茶点用料'},
  preparing:{role:'cook',key:'cut-cake',position:P.prep,target:P.prepTop,seconds:3.4,action:'bread',label:'按原单分切一份蛋糕'},
  brewing:{role:'cook',key:'brew-tea',position:P.prep,target:P.prepTop,seconds:3.2,action:'herb-mix',label:'为同号茶盘备好热茶'},
  plating:{role:'cook',key:'plate-order',position:P.prep,target:P.prepTop,seconds:1.2,action:'tidy',label:'核对蛋糕与热茶并装原盘'},
  releasing:{role:'cook',key:'release-tray',position:P.report,target:P.prepTop,seconds:1.2,action:null,label:'让开案边，把原茶盘交给玛农'},
  requested:{key:'take-order',position:playerServe,target:P.seatCenter,seconds:1.2,action:'calligraphy',label:'听取加布里埃尔的茶点单'},
  ticket:{key:'report-order',position:P.report,target:P.prepTop,seconds:1,action:'calligraphy',label:'向卡米耶报同号茶点单'},
  pickup:{key:'take-tray',position:P.prep,target:P.prepTop,seconds:1.2,action:null,label:'取走同号原茶盘'},
  carrying:{key:'serve-tray',position:playerServe,target:P.table,seconds:1.2,action:null,label:'把原茶盘放到加布里埃尔席前'},
  clearing:{key:'clear-tray',position:playerServe,target:P.table,seconds:1.2,action:null,label:'收回这一席的原杯碟'},
  returning:{key:'wash-cups',position:P.prep,target:P.prepTop,seconds:2.5,action:'tidy',label:'将原杯碟带回糕点房并洗净'},
 };
 function dutyStep(id){
  if(!duty||duty.id!==id)return null;
  if(duty.status==='queued')return {waiting:true,label:'原员工正在收好原茶单，完成后交班'};
  const candidate=SPECS[order?.stage],spec=(playerServing()&&!candidate?.role||playerPreparing()&&candidate?.role==='cook')?candidate:null;
  if(!spec)return {waiting:true,label:!order?`${duty.role==='cook'?'糕点房':'茶廊'}候班 · 等加布里埃尔自行来点茶`:duty.role==='cook'?'等玛农实到报单、原茶盘送席或原杯碟收洗':['preparing','brewing'].includes(order.stage)?'等卡米耶备好同号茶点':'等来客用茶、离座与下一份真实订单'};
  const waiting=order.stage==='ticket'&&!near(cook,P.prep)||order.stage==='pickup'&&!near(cook,P.cookAside)||['receiving'].includes(order.stage)&&!near(host,P.report);
  return {...copy(spec),...(spec.key==='receive-order'?{visualAnchor:{actorId:P.host}}:spec.key==='take-order'?{visualAnchor:{actorId:P.guest}}:{}),orderId:order.id,trayId:order.trayId,waiting,label:waiting?'等卡米耶实到交接位置':spec.label};
 }
 function claimDuty(id,role='host'){
  if(disposed||!new RegExp('^'+(role==='cook'?'fr-pastry':'fr-tea')+'-labor-[1-9][0-9]*$').test(id)||intent||order?.customer==='player')return false;
  if(duty)return duty.id===id&&duty.role===role;
  talks.cancel('原岗位先交班');
  duty={id,role,status:order?'queued':'active'};step=null;record('duty-queued',{dutyId:id});return true;
 }
 function releaseDuty(id){
  if(!duty||duty.id!==id)return false;
  talks.cancel('原员工回来接班');
  endLeisure(duty.role);
  if(playerServing()&&order.holder==='host'){
   order.recovery={position:getPlayer().root.position.toArray(),trayPosition:props.state().trayPosition||P.prepTop.slice(),next:order.stage};
   order.holder='recovery';enter('recover-host');
  }
  if(order?.dutyId===id){if(playerPreparing()&&order.stage==='receiving')enter('ticket');else if(playerPreparing()&&['plating','releasing'].includes(order.stage))enter('pickup');delete order.dutyId;}
  duty=null;step=null;phase=0;record('duty-released',{dutyId:id});return true;
 }
 function startDutyStep(id,key){
  const spec=dutyStep(id),p=getPlayer();
  if(!spec?.key||spec.waiting||spec.key!==key||!p||getMounted()||!near(p,spec.position,.2)||Math.abs(p.root.position.y-spec.position[1])>.35||step)return false;
  step=key;phase=0;return true;
 }
 function playerWork(dt,complete){
  const spec=dutyStep(duty?.id),p=getPlayer();if(!spec?.key||step!==spec.key||spec.waiting||!p)return;
  if(p.walking||getMounted()||!near(p,spec.position,.2)){step=null;phase=0;return;}
  p.root.rotation.y=Math.atan2(spec.target[0]-p.root.position.x,spec.target[2]-p.root.position.z);
  phase+=Math.min(.1,Math.max(0,dt));if(phase+1e-8>=spec.seconds){if(complete()===false)return;record('player-duty-step',{dutyId:duty.id,key:spec.key});step=null;}
 }
 function completeServing(){
  if(!playerServing()||!order.finished||order.customer!=='guest'||!order.playerServed||order.trayId!==order.id+'-tray')return false;
  const receipt={number:orderNumber(order.id),id:order.id+'-served',receiptId:duty.id,orderId:order.id,trayId:order.trayId,customerId:P.guest,customerName:'加布里埃尔',tableId:seat.id,dishId:'tea-cake'};
  if(!workReceipts.some(r=>r.id===receipt.id)){const next=[...workReceipts,receipt].slice(-64);if(!persist({workReceipts:next}))return false;workReceipts=next;}
  order.holder='kitchen';record('cups-cleaned',{by:'player',dutyId:duty.id});enter('leaving');return true;
 }
 function completePreparation(){
  if(!playerPreparing())return true;
  const q=order.preparation;
  if(!order.finished||order.customer!=='guest'||order.trayId!==order.id+'-tray'||!q?.received||!q.cut||!q.brewed||!q.plated||!q.handed)return false;
  const receipt={number:orderNumber(order.id),id:order.id+'-prepared',receiptId:duty.id,orderId:order.id,trayId:order.trayId,cupId:order.id+'-cup',customerId:P.guest,customerName:'加布里埃尔',tableId:seat.id,dishId:'tea-cake',quality:{...q,consumed:true,cleaned:true}};
  if(!workReceipts.some(r=>r.id===receipt.id)){const next=[...workReceipts,receipt].slice(-64);if(!persist({workReceipts:next}))return false;workReceipts=next;}
  record('preparation-accepted',{by:'player',dutyId:duty.id,quality:'hot-tea-and-cake-complete'});return true;
 }
 function renderProps(){
  const visual=order&&playerServing()?{...order,stage:step==='serve-tray'?'serving':step==='clear-tray'?'lifting':order.stage==='pickup'&&!step?'preparing':order.stage}:order;
  props.update(visual,{host:server(),cook,customer:customer()},phase);
 }
 const staffOwnership=(role='host')=>{const hired=role==='cook'?isCookHired():isServerHired(),npc=role==='cook'?P.cook:P.host,working=duty?.role===role,active=working&&duty.status==='active';return {holderId:hired?'player':npc,controller:active?'player':npc,taskOwner:order?playerRole(role)?'player':npc:null,status:working?duty.status==='queued'?'handover':'on-duty':hired?'off-duty':'npc',cover:hired&&!working};};
 const staffLabel=role=>{const n=staff[role],name=role==='cook'?'卡米耶':'玛农',hired=role==='cook'?isCookHired():isServerHired();return released(role)?`${name}休班 · ${meeting[role]?'回来当面交接':offDuty[role]?.choice?.label||'稍作停留'}`:(hired?`${name}临时代班 · 玩家未报到`:n.station.npcLabel)+(order?' · '+orderLabel():'');};
 const orderLabel=()=>fullMeal(order)?(MEAL_LABEL[order?.stage]||LABEL[order?.stage]):playerPreparing()?({preparing:'玩家按原单分切蛋糕',brewing:'玩家为原单备热茶'}[order?.stage]||LABEL[order?.stage]):LABEL[order?.stage];
 function cupPose(n,t){const c=n.poseContext||{},sip=Math.pow((Math.sin(t*1.4)+1)*.5,2);c.seatHeight=(seat.seatY-n.root.position.y-(c.visualFloorOffset||0));c.handoff=true;c.seatedMeal=false;c.heldProp=null;c.archery={hands:fullMeal(order)?[[-.18,c.seatHeight+.20,.30],[.11-sip*.04,c.seatHeight+.24+sip*.34,.36-sip*.24]]:[[-.18,c.seatHeight+.15,.25],[.13-sip*.055,c.seatHeight+.30+sip*.28,.37-sip*.23]]};return c;}
 function pose(n,t,action,target,carry=false){
  if(isSociallyHeld(n.station.id,conversation)){action=null;target=null;}
  if(!n.serviceMount)n.root.position.y=visualSupportHeight(lot,n.root.position.x,n.root.position.z,0,false)??n.root.position.y;
  let c=poseContext(n,null);c.handoff=carry;c.heldProp=null;c.seatedMeal=false;c.archery=carry?{hands:[[-.19,1.12,.43],[.19,1.12,.43]]}:null;c.seatHeight=undefined;
  if(n.serviceMount){action='chair-sit';c.seatHeight=seat.seatY-n.root.position.y-(c.visualFloorOffset||0);if(['drinking','lowering'].includes(order?.stage))c=cupPose(n,t);}
  if(target&&!n.walking&&!n.serviceMount)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);
  c.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;c.workDistance=target?gap(n,target)/(n.characterScale||1):undefined;
  if(talks.talking(n))c.handoff=true;
  n.animate(t+(n.phase||0),n.walking,n.walking?null:action,c);
 }
 // Reconcile an already durable source receipt immediately on region entry.
 // The shared receiver owns the persisted watermark and rejects replay.
 deliverReceipts();
 const api={seat,view:()=>({order:copy(order),intent,label:orderLabel(),cash:ledger?.balances()?.france.cash??null,canOrder:!duty&&!order&&!intent,blockedReason:duty?'请先当面交班，再来用餐':order?'这桌尚在使用，请稍候':intent?'正在前往茶位':'',seated:!!atSeat(),menu:[{id:'tea-cake',name:'下午茶与小蛋糕',price:0,detail:'茶点 · 缓解约3小时饥饿'},{id:FRANCE_MEAL.id,name:FRANCE_MEAL.name,price:FRANCE_MEAL.price,detail:'正餐 · 完整吃完后缓解约24小时饥饿'}]}),owns:n=>owned.has(n),request,cancel,drink,
  registry:registry.slice(),canClaimDuty:()=>!intent&&order?.customer!=='player',hasWorkReceiptAfter:(id,n)=>workReceipts.some(r=>r.receiptId===id&&r.number>n),claimDuty,releaseDuty,dutyStep,startDutyStep,workReceipts:id=>copy(workReceipts.filter(r=>r.receiptId===id)),
  dutyState:()=>duty?{...duty,step}:null,requestMeeting:(active,role='host')=>{meeting[role]=!!active;if(active){talks.cancel('先回来当面面谈或交班');endLeisure(role);}},meetingReady:(role='host')=>{const n=role==='cook'?cook:host;return !offDuty[role]&&near(n,role==='cook'?P.cookAside:P.hostHome)&&!busy(n)&&(!order||released(role));},
  canEndDuty:id=>duty?.id===id&&!step&&!(playerServing()&&order.holder==='host')&&!(playerPreparing()&&order.preparation&&order.stage!=='leaving'),
  stopDutyStep(){if(step){step=null;phase=0;}},dutyPlayerAction:()=>step?SPECS[order?.stage]?.action:null,dutyPlayerStation:()=>step?{playerWorkTarget:SPECS[order?.stage]?.target}:null,
  held:()=>playerServing()&&order?.holder==='host',
  ownsStation:id=>id===P.guest,
  playerPose(t){if(playerServing()&&(order.holder==='host'||['take-tray','clear-tray'].includes(step)))return {handoff:true,heldProp:null,archery:{hands:[[-.19,1.12,.43],[.19,1.12,.43]]}};return order?.customer==='player'&&['drinking','lowering'].includes(order.stage)&&atSeat()?{archery:cupPose(getPlayer(),t).archery,handoff:true}:null;},
  playerRequest(id){if(duty){notify('请先当面交班，再坐下休息或点茶');return false;}if(id!==seat.id){cancel('换了座位');return;}if(order?.customer==='guest'||guest.serviceMount){notify('加布里埃尔还在茶位，请稍候');return false;}return true;},
  leaveSeat(id){if(id===seat.id)cancel('起身离开茶位');},
  // The original tea/meal seat is the scene object even while walking there.
  // Its marker clears the authored table camera box (top 1.36); food stays at
  // the original 1.23 surface. Guest orders never become a carried menu.
  menuTarget(){const o=order&&(!order.customer||order.customer==='player')?order:null;if(disposed||!o&&!intent&&!atSeat())return null;return {id:seat.id,name:'宫苑茶廊',targetKey:seat.id,targetName:'玛农的茶桌',action:'查看食单 · 正餐与下午茶',position:(atSeat()?seat.anchor:seat.position).slice(),executionRadius:1.8,interactionRadius:2.8,priority:52,intentKey:[seat.id,o?.id||'menu',o?.stage||'',!!o?.cancelled,!!o?.finished,!!intent].join(':'),visualAnchor:{id:'france-tea-table',point:[P.table[0],P.table[1]+.2,P.table[2]]}};},
  target(){const p=getPlayer();if(!p||duty)return null;const nearby=gap(p,[6.6,.16,8.35])<2.3||atSeat();if(!nearby&&!intent)return null;return {franceTea:true,id:'france-tea-service',name:'宫苑茶廊 · 玛农',action:order?.customer==='player'?'查看当前餐单':'查看食单 · 正餐与下午茶',status:intent?'正在走向茶位':order?orderLabel():'免费下午茶 · 4法国券正餐'};},
  interact(){if(intent){intent=false;return 'cancel-walk';}if(order?.customer==='player'&&!order.cancelled)return order.stage==='ready'?drink():cancel();return request();},
  statusLabel:id=>id===seat.id&&order?orderLabel():null,
  canTalkAtPost:n=>actors.includes(n)&&!order&&!intent&&!Object.values(meeting).some(Boolean)&&!n.walking&&!n.route?.length&&!n.serviceMount,
  canBorrowForSocial:n=>n===guest||n===host&&released('host')&&!meeting.host||n===cook&&released('cook')&&!meeting.cook,
  socialStatus:n=>{const role=n===host?'host':n===cook?'cook':null,working=!!order&&!released(role)||talks.owns(n)||!!meeting[role]||urgent(n);return {busy:working,canPause:!working,attention:!working,job:talks.label(n)||(role?staffLabel(role):order?orderLabel():n.station.npcLabel)};},
  update(dt,t,{conversationActorId=null,performing=null,playerSocialActorId=null,hour=15}={}){
   if(disposed)return;relationshipOutbox.deliver(committedRelationshipEvents);time+=dt;life.tick(dt);orphanRetry+=dt;if(orphanRetry>=3){orphanRetry=0;reconcileHolds();if(fullMeal(order)&&order.cancelled)payment(order,'refund');}conversation=conversationActorId;stationBusy=performing;playerSocial=playerSocialActorId;for(const n of actors)n.walking=false;
   if(duty?.status==='queued'&&!order&&!intent){duty.status='active';record('duty-accepted',{dutyId:duty.id});}
   if(intent&&atSeat()){intent=false;begin('player',pendingDish);}
   else if(intent&&getPendingSeat&&getPendingSeat()!==seat.id){intent=false;notify('已取消前往茶位');}
   if(order?.customer==='player'&&!order.cancelled&&!['clearing','lifting','returning','washing'].includes(order.stage)&&!atSeat())cancel('离开茶位');
   talks.update(dt);
   let ca=null,ha=null,ct=null,ht=null,carry=false;
   if(!order){
    if(!released('cook')&&!talks.owns(cook))travel(cook,P.cookAside,dt);if(!released('host')&&!talks.owns(host))travel(host,P.hostHome,dt);ca=near(cook,P.cookAside)?cook.station.npcAction:null;ct=cook.station.workTarget;ha=near(host,P.hostHome)?host.station.npcAction:null;ht=host.station.workTarget;
    if(!Object.values(meeting).some(Boolean)&&!intent&&!atSeat()&&!busy(guest)&&playerSocial!==P.guest&&!talks.owns(guest)&&time>=nextChoice){
     choice??=life.choose(P.guest,[{id:'tea',base:.6,traits:{appetite:.8,quiet:.4},needs:{hunger:1.2},duration:[9,13],relief:{hunger:-.25},cooldown:70,available:!guest.serviceMount},{id:'garden',base:.25,traits:{outdoors:.8,curiosity:.3},duration:[10,16],relief:{fatigue:-.04},cooldown:15},talks.candidate(guest)],hour);
     if(choice?.id==='conversation'){const selected=choice;choice=null;beginTalk(guest,selected);}
     else if(choice?.id==='tea'){if(furniture.facilities.reserve(seat.id,P.guest,{purpose:'afternoon-tea'}))begin('guest');else{life.complete(P.guest,choice,{fulfilled:false});choice=null;nextChoice=time+5;}}
     else if(choice){if(travel(guest,[10.55,0,13.0],dt)){choiceTime+=dt;if(choiceTime>=choice.duration){life.complete(P.guest,choice);choice=null;choiceTime=0;nextChoice=time+2;}}}
    }
   }else{
    if(fullMeal(order)&&order.cancelled&&!order.trayId)finish();
    if(!order){renderProps();return;}
    const orderPaused=(!playerServing()&&busy(host))||(!playerPreparing()&&busy(cook))||busy(guest)&&order.customer==='guest';
    if(fullMeal(order)&&!orderPaused){stageAge+=dt;if(!order.cancelled&&!['ready','drinking','lowering','clearing','lifting','returning','washing'].includes(order.stage)&&stageAge>180)cancel('供餐通道长时间未能到达');else if(order.cancelled&&stageAge>180)finish();}
    if(!order){renderProps();return;}
    const o=order,paused=(!playerServing()&&busy(host))||(!playerPreparing()&&busy(cook))||busy(guest)&&o.customer==='guest';
    if(!paused){
    if(o.stage==='seating'){if(mountGuest(dt))enter('requested');}
    else if(o.stage==='requested'){if(playerServing()){if(seatedCustomer()&&!paused)playerWork(dt,()=>enter('ticket'));}else if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('accepted');}
    else if(o.stage==='accepted'){ht=seat.anchor;if(!paused)tick(dt,1.2,()=>enter('ticket'));}
    else if(o.stage==='ticket'){const h=playerServing()?false:travel(host,P.report,dt),c=playerPreparing()?false:travel(cook,P.prep,dt);ht=P.prep;ct=server().root.position.toArray();const receive=()=>{o.trayId=o.id+'-tray';record('chef-received-order');enter('preparing');};if(playerPreparing()){if(h&&!paused)enter('receiving');}else if(playerServing()){if(c&&!paused)playerWork(dt,receive);}else if(h&&c&&!paused)tick(dt,1,receive);}
    else if(o.stage==='receiving'){travel(host,P.report,dt);if(!paused)playerWork(dt,()=>{o.trayId=o.id+'-tray';o.preparation={received:true};record('chef-received-order',{by:'player'});enter('preparing');});}
    else if(o.stage==='preparing'||o.stage==='brewing'){ct=P.prepTop;if(playerPreparing()){if(!paused)playerWork(dt,()=>{o.preparation[o.stage==='preparing'?'cut':'brewed']=true;enter(o.stage==='preparing'?'brewing':'plating');});}else{ca=o.stage==='preparing'?'bread':'herb-mix';if(travel(cook,P.prep,dt)&&!paused)tick(dt,fullMeal(o)?o.stage==='preparing'?4.2:5.2:o.stage==='preparing'?3.4:3.2,()=>{if(o.stage==='brewing'){o.npcPrepared=true;if(fullMeal(o))o.supplyReceipt=o.id+'-prepared';}enter(o.stage==='preparing'?'brewing':'pickup');});}}
    else if(o.stage==='plating'){if(!paused)playerWork(dt,()=>{o.preparation.plated=true;enter('releasing');});}
    else if(o.stage==='releasing'){if(travel(host,P.prep,dt)&&!paused)playerWork(dt,()=>{o.preparation.handed=true;record('tray-handed-over',{from:'player',to:P.host,trayId:o.trayId});enter('pickup');});}
    else if(o.stage==='pickup'){const away=playerPreparing()||travel(cook,P.cookAside,dt),receive=()=>{o.holder='host';record('tray-received',{from:playerPreparing()?'player':P.cook,to:playerServing()?'player':P.host});enter(o.cancelled?'returning':'carrying');};if(playerServing()){if(away&&!paused)playerWork(dt,receive);}else if(away&&travel(host,P.prep,dt)&&!paused){carry=true;ht=P.prepTop;tick(dt,1.2,receive);}}
    else if(o.stage==='carrying'){if(playerServing()){if(seatedCustomer()&&!paused)playerWork(dt,()=>{o.holder='table';o.playerServed=true;record('tea-delivered',{seatId:seat.id,by:'player'});enter('ready');});}else{carry=true;if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('serving');}}
    else if(o.stage==='serving'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='table';o.npcServed=true;record('tea-delivered',{seatId:seat.id});enter('ready');if(o.customer==='player')notify(fullMeal(o)?'玛农：浓汤与面包好了，请慢慢享用':'玛农：茶与小蛋糕好了，按 E 举杯品茶');});}
    else if(o.stage==='ready'){if(!playerServing())travel(host,[4.6,.16,8.6],dt);if(o.customer==='guest'&&!paused)tick(dt,1.5,()=>enter('drinking'));}
    else if(o.stage==='drinking'){if(!playerServing())travel(host,[4.6,.16,8.6],dt);if(!paused)tick(dt,fullMeal(o)?FRANCE_MEAL.seconds:9,consume);}
    else if(o.stage==='lowering'){if(!paused)tick(dt,1,()=>{o.holder='table';enter('clearing');});}
    else if(o.stage==='clearing'){if(playerServing()){if(!paused)playerWork(dt,()=>{o.holder='host';record('table-cleared',{by:'player'});enter('returning');});}else if(travel(host,P.serve,dt)&&!paused)enter('lifting');}
    else if(o.stage==='lifting'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='host';record('table-cleared');enter('returning');});}
    else if(o.stage==='recalling'){carry=true;if(!paused)tick(dt,1.2,()=>enter('returning'));}
    else if(o.stage==='returning'){if(playerServing()){if(!paused)playerWork(dt,completeServing);}else{carry=true;if(travel(host,P.prep,dt)&&!paused){o.holder='kitchen';enter('washing');}}}
    else if(o.stage==='recover-host'){const r=o.recovery;ht=r.trayPosition;if(travel(host,r.position,dt)&&!paused){carry=true;tick(dt,1.2,()=>{o.holder='host';const next=r.next;delete o.recovery;enter(next);});}}
    else if(o.stage==='washing'){ha='tidy';ht=P.prepTop;if(!paused)tick(dt,2.5,()=>{if(!completePreparation())return;o.npcCleaned=true;record('cups-cleaned');if(o.customer==='guest')enter('leaving');else finish();});}
    else if(o.stage==='leaving'){if(unmountGuest()&&travel(guest,P.guestHome,dt))finish();}
    }else carry=o.holder==='host'||['pickup','serving','lifting','recalling'].includes(o.stage);
   }
   const cookLeisure=updateLeisure('cook',dt,hour),hostLeisure=updateLeisure('host',dt,hour);
   if(released('cook')){ca=cookLeisure?.action||null;ct=cookLeisure?.target||null;}
   if(released('host')){ha=hostLeisure?.action||null;ht=hostLeisure?.target||null;carry=false;}
   updateStandby('host',dt,hour);updateStandby('cook',dt,hour);
   pose(cook,t,talks.owns(cook)?null:ca,talks.face(cook)||ct);pose(host,t,talks.owns(host)?null:ha,talks.face(host)||ht,carry);pose(guest,t,guest.serviceMount?'chair-sit':null,talks.face(guest));
   for(const n of actors){const label=n.label?.querySelector?.('small');if(label)label.textContent=talks.label(n)||(n===host?staffLabel('host'):n===cook?staffLabel('cook'):order?orderLabel():n===guest?(choice?.id==='garden'?'散步看看宫苑':n.station.npcLabel):n.station.npcLabel);}
   renderProps();
  },
  snapshot:()=>({version:1,relationshipEvents:copy(relationshipEvents),talks:talks.snapshot(),standby:copy(standby),pendingDish,stageAge,mealClosed,duty:copy(duty),step,offDuty:copy(offDuty),staffNext:copy(staffNext),workReceipts:copy(workReceipts),time,phase,serial,mealReceipts:copy(mealReceipts),order:copy(order),intent,choice:copy(choice),choiceTime,nextChoice,history:copy(history),life:life.snapshot()}),
  restore(s){if(s?.version!==1||s.order&&(!LABEL[s.order.stage]&&!['recalling','recover-host'].includes(s.order.stage)||s.order.seatId!==seat.id))return false;relationshipEvents=relationshipOutbox.merge(relationshipEvents,s.relationshipEvents||[]);time=Math.max(0,s.time||0);phase=Math.max(0,s.phase||0);mealReceipts=latestReceipts(mealReceipts,s.mealReceipts);serial=Math.max(serial,serialNumber(s.serial),orderNumber(s.order?.id),mealReceipts[0]?.number||0);order=copy(s.order||null);if(fullMeal(order)&&orderNumber(order.id)<=mealClosed)order=null;else if(paidOrder&&(!order||order.id!==paidOrder.id||(paidOrder.revision||0)>(order.revision||0)))order=copy(paidOrder);if(fullMeal(order)){const h=holdFor(order);if(!h||h.status==='refunded'){order.cancelled=true;order.payment=h?.status||'unpaid';}else order.payment=h.status;phase=Math.max(0,order===s.order?s.phase??0:order.id===s.order?.id&&order.stage===s.order.stage?s.phase??order.phase??0:order.phase??0);}pendingDish=s.pendingDish===FRANCE_MEAL.id?FRANCE_MEAL.id:'tea-cake';stageAge=Math.max(0,order?.stageAge??s.stageAge??0);duty=s.duty&&/^fr-(tea|pastry)-labor-[1-9][0-9]*$/.test(s.duty.id)&&['queued','active'].includes(s.duty.status)?{...copy(s.duty),role:s.duty.id.startsWith('fr-pastry-')?'cook':'host'}:null;step=duty&&SPECS[order?.stage]?.key===s.step?s.step:null;workReceipts=[...new Map([...(s.workReceipts||[]),...workReceipts].map(r=>[r.id,r])).values()].slice(-64);if(order?.dutyId&&workReceipts.some(r=>r.orderId===order.id)){order.stage='leaving';order.holder='kitchen';phase=0;step=null;}if(order?.customer==='player'&&mealReceipts.some(r=>r.orderId===order.id)){order.finished=true;if(!['lowering','clearing','lifting','returning','washing','recalling'].includes(order.stage)){order.stage='lowering';phase=0;}}intent=!!s.intent;choice=copy(s.choice||null);choiceTime=Math.max(0,s.choiceTime||0);nextChoice=Math.max(time,s.nextChoice||0);history.splice(0,history.length,...copy(s.history||[]));
   for(const role of ['host','cook']){
    const old=s.offDuty?.[role],current=life.state(staff[role].station.id)?.current;
    const action=franceTeaStaffChoices().find(c=>c.id===current?.id),target=action?.targets.find(t=>t.id===current?.targetId);
    offDuty[role]=released(role)&&old?.choice?.id===current?.id&&old?.choice?.targetId===current?.targetId&&target?{choice:staffChoice({...action,...target.choice,...current}),elapsed:Math.max(0,old.elapsed||0),travelTime:Math.max(0,old.travelTime||0)}:null;
    staffNext[role]=Math.max(time,s.staffNext?.[role]||0);
   }
   for(const role of ['host','cook']){const old=s.standby?.[role],current=life.state(staff[role].station.id)?.current;standby[role]=old?.choice?.id==='pause'&&current?.id==='pause'?copy(old):null;}
   routes.clear();for(const n of actors)n.route=[];talks.restore(s.talks);if(order?.customer==='guest'){furniture.facilities.reserve(seat.id,P.guest,{purpose:'afternoon-tea'});if(guest.serviceMount)furniture.facilities.occupy(seat.id,P.guest);}renderProps();return true;},
  socialProfile:id=>life.state(id),
  state:()=>({talks:talks.snapshot(),standby:copy(standby),offDuty:copy(offDuty),staffOwnership:staffOwnership(),cookOwnership:staffOwnership('cook'),duty:copy(duty),step,workReceipts:copy(workReceipts),serial,mealReceipts:copy(mealReceipts),order:order?copy(order):null,intent,phase,history:copy(history),props:props.state(),seatId:seat.id,life:life.snapshot()}),
  dispose({suspend=false}={}){if(disposed)return;if(fullMeal(order)){if(suspend)persist();else{cancel('离开茶廊');payment(order,'refund');persist();}}life.dispose();talks.dispose();disposed=true;intent=false;order=null;duty=null;step=null;for(const n of actors){n.route=[];n.serviceMount=null;if(n.poseContext){n.poseContext.handoff=false;n.poseContext.archery=null;}}furniture.releaseActor(P.guest);props.dispose();}
 };
 // Both employment adapters share the same physical lease and original props;
 // their meeting requests and activity guards stay scoped to their own role.
 api.forRole=role=>({...api,registry:(role==='cook'?cookRegistry:registry).slice(),
  claimDuty:id=>claimDuty(id,role),canClaimDuty:()=>api.canClaimDuty()&&(!duty||duty.role===role),
  requestMeeting:active=>api.requestMeeting(active,role),meetingReady:()=>api.meetingReady(role),
  dutyState:()=>duty?.role===role?api.dutyState():null,
  stopDutyStep:()=>{if(duty?.role===role)api.stopDutyStep();},
  held:()=>role==='host'&&api.held(),dutyPlayerAction:()=>duty?.role===role?api.dutyPlayerAction():null,dutyPlayerStation:()=>duty?.role===role?api.dutyPlayerStation():null});
 if(paidOrder)api.restore({version:1,order:copy(paidOrder),phase:paidOrder.phase||0});reconcileHolds();
 return api;
}
