import {isSociallyHeld} from './npc-social-ownership.js';
import {createServiceRelationshipOutbox,serviceRelationshipEvent} from './service-relationship-outbox.js';
import {followActorRoute,findActorStandPoint} from './actor-navigation.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {createWorkplaceConversations} from './workplace-conversations.js';
// The existing public passage between the dining room and private-suite wall.
export const EGYPT_TALK_PLACES=Object.freeze([[17.1,0,-5.1],[18.7,0,-5.1]]);
import {EGYPT_MEAL as P,validEgyptMealReceipt} from './egypt-meal-definition.js';
import {initialEgyptResidentSupply,validEgyptResidentSupply} from './egypt-resident-supply.js';
import {createEgyptMealProps} from './egypt-meal-props.js';
const copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0;
const TABLE_REG=[18.1,0,-8.03],TABLE_ASIDE=[20.5,0,-7.7];
const GUEST='egypt-papyrus',REG=[20.6,0,-17.1],HOME=[21.62,0,-17.1],ASIDE=[20.6,0,-14.2];
const labels={reserving:'正在预留餐费',seating:'前往餐厅西席',requested:'达娜过来点餐',accepted:'达娜记下这一席的餐点',ticket:'达娜把餐单送进厨房',preparing:'切配本单蔬食',heating:'照看陶锅，烹热蔬食',plating:'装好本单面包与陶碗',dispatch:'同号原餐装好，待交达娜',collecting:'达娜前往厨房领取这一份餐',pickup:'达娜端起餐盘',carrying:'达娜正在送餐',serving:'达娜把餐点摆上桌',ready:'餐已上桌，可以开吃',eating:'坐着慢慢享用正餐',lowering:'放回吃过的陶碗',clearing:'达娜来收回餐具',lifting:'达娜收起餐盘',returning:'达娜把餐具送回厨房',washing:'达娜清洗陶碗并擦整餐盘',leaving:'萨米拉起身回原书案',refund:'正在退回未食用餐费'};
const latest=(a,b)=>!a?b:!b?a:(b.revision||0)>(a.revision||0)||(b.revision||0)===(a.revision||0)&&(b.time||0)>(a.time||0)?b:a;
const resident=o=>o?.customer===GUEST;
const cooking=o=>o&&!o.cancelled&&['preparing','heating','plating','dispatch'].includes(o.stage);
const WORK={preparing:{position:P.prep,target:P.prepTop,action:'核原单 · 切配蔬食',pose:'cook',duration:4,next:'heating'},heating:{position:P.pot,target:P.potTop,action:'原陶锅 · 烹热本单蔬食',pose:'herb-mix',duration:6,next:'plating'},plating:{position:P.pass,target:P.passTop,action:'核原号 · 装面包与陶碗',pose:'bread',duration:2,next:'dispatch'},dispatch:{position:[20.6,0,-15.1],target:P.passTop,action:'让开传菜位 · 交原盘给达娜',pose:'tidy',duration:.8,next:'collecting'}};
// The original visitor bill keeps its price/refund ledger. Resident meals use
// a separately named, finite game-opening supply, never an NPC cash refill.
export function createEgyptMealService({npcs,lot,furniture,doors,navigation:sceneNavigation=null,planPath,moveActor,poseContext,getPlayer,getMounted,getPendingSeat=()=>null,onSeat=()=>{},canRequest=()=>true,copperLedger,getClock=()=>({day:0,hour:10}),sharedNeeds=null,beginInteraction=()=>null,onInteraction=()=>{},worldSeed=1,saved={},saveState=()=>false,onRelationshipEvent=()=>({ok:false}),onMealReceipts=()=>{},onResidentMealReceipts=()=>{},notify=()=>{},propsFactory=createEgyptMealProps}){
 const cook=npcs.find(n=>n.station.id===P.cook),host=npcs.find(n=>n.station.id===P.host),guest=npcs.find(n=>n.station.id===GUEST),seat=furniture.items.find(s=>s.kind==='seat'&&Math.hypot(s.center[0]-P.seatCenter[0],s.center[2]-P.seatCenter[2])<.05);
 if(!cook||!host||!seat)return null;
 const relationshipOutbox=createServiceRelationshipOutbox(onRelationshipEvent);
 const props=propsFactory(lot.group),routes=new Map(),history=[],navigation=sceneNavigation||(lot.walkableSurfaces?.length?{surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4}:{bounds:lot.bounds,multilevel:false});
 let state={version:2,revision:0,serial:0,order:null,mealReceipts:[],phase:0,time:0,supply:initialEgyptResidentSupply(),resident:{lastDay:-1,nextChoice:8,choice:null,elapsed:0},duty:null,workReceipts:[],tableDuty:null,tableReceipts:[],life:null,idle:{},talks:null,pendingTalk:null},disposed=false,conversation=null,initializing=false,lastReplay=0,meeting=false,step=null,tableMeeting=false,tableStep=null,life=null,initialized=false,lastError=null,talks=null,playerSocial=null,stationBusy=null;
 function accept(s){if(!s||![1,2].includes(s.version))return;const next=copy(s);if(s.version===2&&!validEgyptResidentSupply(s.supply)){lastError='invalid-resident-supply';return;}state={...state,...next,version:2,supply:s.version===2?next.supply:initialEgyptResidentSupply(),resident:next.resident||state.resident,duty:next.duty||null,workReceipts:next.workReceipts||[],tableDuty:next.tableDuty||null,tableReceipts:next.tableReceipts||[]};state.mealReceipts=(state.mealReceipts||[]).filter(validEgyptMealReceipt).slice(-1);state.serial=Math.max(integer(state.serial)?state.serial:0,state.mealReceipts[0]?.number||0,...state.supply.prepared.map(r=>r.number));if(state.order&&(!integer(state.order.number)||state.order.id!==`egypt-meal-${state.order.number}`||state.order.seatId!==seat.id||state.order.dishId!==P.id||state.order.price!==(resident(state.order)?0:P.price)))state.order=null;const o=state.order;if(resident(o)&&!state.resident.departure&&(o.finished||o.cancelled)&&!['eating','lowering'].includes(o.stage))state.resident.departure={id:o.id,finished:o.finished,cancelled:o.cancelled,stage:o.guestStage||'leaving'};if(o)delete o.guestStage;initialized=s.version===2;}
 accept(latest(saved,saved.continuity));
 const at=(n,p,r=.075)=>!!n&&Math.abs(n.root.position.y-p[1])<.4&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r;
 const guestAway=()=>!!state.resident.departure&&state.resident.departure.stage!=='returned';
 const guestReturned=()=>state.resident.departure?.stage==='returned';
 const guestLabel=()=>guestAway()?labels.leaving:resident(state.order)&&!guestReturned()?labels[state.order.stage]:guest.station.npcLabel;
 function beginDeparture(s){const o=s.order;s.resident.departure={id:o.id,finished:o.finished,cancelled:o.cancelled,stage:'leaving'};}
 const seated=()=>getMounted()?.id===seat.id&&at(getPlayer(),seat.anchor,.4);
 const customer=()=>resident(state.order)?guest:getPlayer(),customerSeated=()=>resident(state.order)?guest?.serviceMount?.id===seat.id&&at(guest,seat.anchor,.4)&&furniture.facilities.reservation(seat.id,GUEST)?.status==='occupied':seated();
 const cash=()=>copperLedger?.balances?.()?.egypt?.cash??null,payment=o=>o&&copperLedger?.reservations?.().find(h=>h.id===o.id),matching=h=>h&&h.amount===P.price&&h.currency==='egypt';
 const record=(event,extra={})=>{history.push({event,...extra,orderId:state.order?.id,mealId:state.order?.mealId,customer:state.order?.customer,time:state.time});if(history.length>64)history.shift();};
 function deliver(){relationshipOutbox.deliver(state.relationshipEvents);try{if(state.mealReceipts.length)onMealReceipts(copy(state.mealReceipts));if(state.supply.consumed.length)onResidentMealReceipts(copy(state.supply.consumed),copy(state.supply));}catch{}}
 function commit(change){if(lastError)return false;const before=state,next=copy(state);if(life)next.life=life.snapshot();if(talks)next.talks=talks.snapshot();change(next);const o=next.order,previous=before.order;
 const events=[];if(o&&o.id===previous?.id&&((o.finished&&!previous.finished)||(o.cancelled&&!previous.cancelled))){const outcome=o.cancelled?'cancelled':'completed';const provider=o.tableReceiptId?'player':P.host;events.push(serviceRelationshipEvent('egypt-meal',o.id,outcome,provider,o.customer,next.time));if(outcome==='completed'&&(o.npcPrepared||o.workReceiptId))events.push(serviceRelationshipEvent('egypt-kitchen',o.id,'completed',o.workReceiptId?'player':P.cook,provider,next.time));}
 next.relationshipEvents=relationshipOutbox.merge(next.relationshipEvents,events);next.revision=before.revision+1;state=next;try{const result=saveState(copy(next));if(result===false||result?.then){state=before;return false;}}catch{state=before;return false;}initialized=true;deliver();return true;}
 life=createLifeDecisions({worldSeed,actorIds:[P.cook,P.host,...(guest?[GUEST]:[])],saved:state.life||{},sharedNeeds,onChange:l=>commit(s=>{s.life=l;})});
 function stage(name,patch={}){if(!commit(s=>{Object.assign(s.order,{stage:name,...patch});s.phase=0;}))return false;record(name);return true;}
 function travel(n,p,dt){n.walking=false;if(n.serviceMount)return false;if(at(n,p)){n.route=[];routes.delete(n);return true;}if(paused(n))return false;const key=p.join(',');let route=routes.get(n);if(route?.key!==key){route={key,retry:0};routes.set(n,route);n.route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);}const result=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});if(result.waiting)route.retry=0;else if(!result.waypoint){route.retry+=dt;if(route.retry>=5){routes.delete(n);n.route=[];}}return at(n,p);}
 function face(n,p){n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);}
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(getPlayer()?[getPlayer().root.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 function mountGuest(dt){if(guest.serviceMount)return true;if(!furniture.facilities.reserve(seat.id,GUEST)||!travel(guest,seat.position,dt)||!furniture.canSit(navigation,safety(guest),seat))return false;if(!furniture.facilities.occupy(seat.id,GUEST))return false;guest.root.position.set(...seat.anchor);guest.root.rotation.y=seat.yaw;guest.serviceMount=seat;return true;}
 // The person leaves independently of the order-owned dirty tray. Capture the
 // legal stand and departure phase together; a failed write restores the seat.
 function unmountGuest(){
  const mount=guest?.serviceMount,position=guest?.root.position.clone();
  const landing=mount?findActorStandPoint(guest,mount,({ignoreDynamicBodies})=>furniture.standPoint(navigation,ignoreDynamicBodies?[...(doors?.cameraColliders||[])]:safety(guest),mount,guest.collisionRadius??.25)):position;
  if(!landing)return false;
  guest.root.position.copy(landing);guest.serviceMount=null;
  if(!commit(s=>{s.resident.departure.stage='returning';})){guest.root.position.copy(position);guest.serviceMount=mount;return false;}
  furniture.facilities.release(seat.id,GUEST);guest.route=[];routes.delete(guest);record('guest-standing');return true;
 }
 function returnGuest(dt){
  const o=state.resident.departure;if(!guestAway()||!guest||paused(guest))return;
  if(o.stage==='leaving'&&!unmountGuest())return;
  if(!travel(guest,guest.station.npcPosition||guest.home.toArray(),dt))return;
  if(o.finished&&!o.cancelled&&!life.recordExperience(GUEST,{id:o.id+':'+GUEST,kind:'staff-rest',label:'刚坐着吃完陶锅蔬食与面包，再回纸莎草案',completed:true}).ok)return;
  const c=life.state(GUEST).current;if(c?.id==='meal')life.complete(GUEST,c,{fulfilled:!o.cancelled});
  if(commit(s=>{s.resident.departure.stage='returned';s.resident.nextChoice=s.time+15;s.resident.choice=null;s.resident.elapsed=0;}))record('guest-returned',{sourceOrderId:o.id});
 }
 function finish(){if(!sourceExperiences())return false;const residentOrder=resident(state.order);if(!commit(s=>{s.order=null;s.phase=0;if(!residentOrder&&!guestAway()){s.resident.nextChoice=s.time+15;s.resident.choice=null;s.resident.elapsed=0;}}))return false;props.clear();for(const n of[cook,host]){routes.delete(n);n.route=[];}record('cleaned');return true;}
 const cleanStage=o=>!o.mealId?'done':o.holder==='table'?'clearing':o.holder==='host'?'returning':'collecting';
 function reconcile(){const o=state.order;if(!o||resident(o))return;const h=payment(o);if(h&&!matching(h))return;
  if(o.cancelled&&o.stage==='refund'){if(h?.status==='reserved'&&!copperLedger.refund(o.id)?.ok)return;const result=payment(o);if(result?.status==='reserved')return;const next=o.cancelledFrom==='eating'?'lowering':cleanStage(o);if(next==='done')finish();else stage(next,{payment:result?.status||'unpaid'});return;}
  if(o.stage==='reserving'){if(h?.status==='refunded'){commit(s=>{s.order=null;s.phase=0;});return;}if(!h){const result=copperLedger?.reserve(P.price,o.id,'egypt');if(!result?.ok){if(cash()<P.price)commit(s=>{s.order=null;s.phase=0;});return;}}if(matching(payment(o))&&payment(o).status==='reserved')stage(seated()?'requested':'seating',{payment:'reserved'});return;}
  if(o.startRequested&&o.stage==='ready'){if(!seated())return;if(h?.status==='reserved'&&!copperLedger.settle(o.id)?.ok)return;if(payment(o)?.status==='settled')stage('eating',{payment:'settled',startRequested:false});}
 }
 function request(){if(initializing||disposed||lastError||state.order||guest?.serviceMount||state.resident.departure?.stage==='leaving'||state.duty||state.tableDuty||!canRequest()||cash()==null||cash()<P.price){notify(state.duty||state.tableDuty?'先交回自己的工作班次，再点访客餐':state.order?'这一份餐还在进行，请稍候':cash()<P.price?'需要 5 埃及券，可到当地银行兑换':'现在暂不能点餐');return false;}initializing=true;try{if(!seated()){onSeat(seat);if(!seated()&&getPendingSeat()!==seat.id){notify('原餐凳暂时走不过去，请从西侧通道靠近');return false;}}if(!commit(s=>{const number=++s.serial;s.phase=0;s.order={id:`egypt-meal-${number}`,number,customer:'player',dishId:P.id,price:P.price,currency:'egypt',seatId:seat.id,stage:'reserving',payment:'unpaid',holder:'kitchen',mealId:null,cancelled:false,finished:false};}))return false;talks.cancel('先接待这份访客餐');reconcile();return !!state.order;}finally{initializing=false;}}
 function eat(){const o=state.order;if(!o||resident(o)||o.stage!=='ready'||o.cancelled||o.finished||!seated()||!matching(payment(o))||!['reserved','settled'].includes(payment(o).status))return false;if(!o.startRequested&&!commit(s=>{s.order.startRequested=true;}))return false;reconcile();return state.order?.stage==='eating';}
 function cancel(){const o=state.order;if(initializing||!o||resident(o)||o.cancelled||o.finished)return true;const origin=props.state().bowlPosition;if(!commit(s=>{s.order.cancelledFrom=s.order.stage;s.order.cancelled=true;s.order.startRequested=false;s.order.returnBowlFrom=origin;s.order.stage='refund';s.phase=0;}))return false;reconcile();notify(payment(o)?.status==='settled'?'提前收餐不退费，未吃完不会缓解饥饿':'未开吃的餐费全额退回，达娜会收整餐具');return true;}
 function review(o,completed){const waitSeconds=Math.max(0,(o.dispatchedAt??state.time)-o.requestedAt),timely=waitSeconds<=90;return {source:'egypt-kitchen',id:o.id+'-cook-'+o.workReceiptId,workReceiptId:o.workReceiptId,orderId:o.id,number:o.number,customerId:GUEST,customerName:'萨米拉',dishId:P.id,itemId:o.id+'-dish',supplyReceipt:o.id+'-prepared',outcome:completed?timely?'completed':'late':'handoff',waitSeconds,completed,accurate:completed,timely};}
 function cancelResidentState(s){const o=s.order;if(!resident(o)||o.finished||o.cancelled)return;o.cancelled=true;o.returnBowlFrom=props.state().bowlPosition;if(o.supplyReceipt&&!s.supply.wasted.includes(o.id))s.supply.wasted.push(o.id);const next=o.stage==='eating'?'lowering':cleanStage(o);o.stage=next==='done'?'leaving':next;if(o.stage!=='lowering')beginDeparture(s);s.phase=0;}
 function complete(){const o=state.order;if(!o||o.cancelled||o.finished||state.phase<P.duration||!customerSeated())return false;if(!resident(o)&&(!matching(payment(o))||payment(o).status!=='settled'))return false;
  const receipt={source:resident(o)?'egypt-resident-meal':'egypt-visitor-meal',id:o.id+'-consumed',number:o.number,actorId:o.customer,orderId:o.id,mealId:o.mealId,dishId:P.id,supplyReceipt:o.id+'-prepared',completed:true,...(resident(o)?{eatingSeconds:P.duration,day:getClock().day}:{paymentReceipt:o.id})};
  if(!commit(s=>{s.order.finished=true;s.order.stage='lowering';s.order.returnBowlFrom=props.state().bowlPosition;s.phase=0;if(resident(o)){s.supply.consumed.push(receipt);s.resident.lastDay=getClock().day;if(o.workReceiptId&&!o.workAbandoned)s.workReceipts.push(review(o,true));}else s.mealReceipts=[receipt];}))return false;record('consumed');return true;
 }
 function prepare(next='heating',workReceiptId=null){const o=state.order;if(!o)return false;if(resident(o)&&!o.supplyReceipt&&state.supply.remaining<1)return false;return commit(s=>{const x=s.order;if(resident(x)&&!x.supplyReceipt){s.supply.remaining--;s.supply.prepared.push({orderId:x.id,number:x.number,actorId:GUEST,supplyReceipt:x.id+'-prepared'});}x.supplyReceipt=x.id+'-prepared';if(workReceiptId)x.workReceiptId=workReceiptId;else x.npcPrepared=true;x.stage=next;s.phase=0;});}
 function residentChoice(dt){if(!guest||guestAway()||state.order&&!guestReturned()||state.pendingTalk||talks?.owns(guest)||paused(guest)||tableMeeting||state.tableDuty?.status==='draining'||conversation===GUEST||state.time<state.resident.nextChoice)return;let c=state.resident.choice;
  if(c?.id==='conversation'){beginTalk(guest,c);return;}
  if(c){state.resident.elapsed+=dt;if(state.resident.elapsed>=c.duration){life.complete(GUEST,c,{fulfilled:true});commit(s=>{s.resident.choice=null;s.resident.elapsed=0;s.resident.nextChoice=s.time+8;});}return;}
  const hungry=sharedNeeds?.hunger(GUEST)>=1,free=!seated()&&getPendingSeat()!==seat.id&&!furniture.facilities.state().some(f=>f.id===seat.id&&(f.player||f.owner));
  c=life.choose(GUEST,[{id:'read',base:.2,traits:{curiosity:.4},duration:[10,20],cooldown:12},{id:'meal',available:!state.order&&hungry&&free&&state.supply.remaining>0&&state.resident.lastDay<getClock().day,base:.8,needs:{hunger:2},duration:[12,12],cooldown:20},talks.candidate(guest)],getClock().hour);
  if(!c)return;if(c.id==='conversation'){state.resident.choice=c;beginTalk(guest,c);return;}if(c.id!=='meal'){commit(s=>{s.resident.choice=c;s.resident.elapsed=0;});return;}
  if(!furniture.facilities.reserve(seat.id,GUEST)){life.complete(GUEST,c,{fulfilled:false});return;}
  if(!commit(s=>{const number=++s.serial;s.phase=0;s.resident.choice=null;s.resident.departure=null;s.order={id:`egypt-meal-${number}`,number,customer:GUEST,customerName:'萨米拉',dishId:P.id,price:0,currency:'egypt',seatId:seat.id,stage:'seating',payment:'opening-supply',holder:'kitchen',mealId:null,cancelled:false,finished:false,requestedAt:s.time};})){furniture.releaseActor(GUEST);life.complete(GUEST,c,{fulfilled:false});}else record('resident-requested');
 }
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return p&&Math.abs(p.y)<.35&&p.x>=19.6&&p.x<=22.7&&p.z>=-18.1&&p.z<=-14;};
 const playerCooking=()=>state.duty?.status==='active'&&resident(state.order)&&(!state.order.workReceiptId||state.order.workReceiptId===state.duty.receiptId)&&!state.order.workAbandoned;
 const npcBusy=()=>cooking(state.order)&&!playerCooking();
 function recall(dt){if(npcBusy())return false;return travel(cook,HOME,dt);}
 const meetingReady=()=>!npcBusy()&&at(cook,HOME,.2),dutyActive=id=>state.duty?.receiptId===id&&state.duty.status==='active';
 function workIntent(id){const o=state.order;if(!dutyActive(id)||!playerCooking()||step||!o||o.cancelled||!WORK[o.stage])return null;const w=WORK[o.stage];return {...copy(w),key:o.id+':'+o.stage,orderId:o.id,number:o.number,stage:o.stage,executionRadius:.22,action:`${o.number}号 萨米拉 · ${w.action}`};}
 function releaseDuty(id,{evaluate=false}={}){if(state.duty&&state.duty.receiptId!==id)return false;const o=state.order;if(!commit(s=>{if(evaluate&&o?.workReceiptId===id&&!o.finished&&!o.workAbandoned){s.workReceipts.push(review(o,false));s.order.workAbandoned=true;cancelResidentState(s);}s.duty=null;}))return false;step=null;return true;}
 const kitchen={registry:REG.slice(),meetingReady,inWorkplace,dutyActive,workIntent,
  canClaimDuty:()=>!!guest&&!state.tableDuty&&(!state.order||resident(state.order)),
  holdDuty(id){if(!state.duty)return commit(s=>{s.duty={receiptId:id,status:'paused'};});return state.duty.receiptId===id;},
  claimDuty(id){if(!this.canClaimDuty()||state.duty&&state.duty.receiptId!==id)return false;step=null;return commit(s=>{s.duty={receiptId:id,status:'draining'};});},
  releaseDuty,canEndDuty:id=>state.duty?.receiptId===id&&!step&&(!state.order?.workReceiptId||state.order.workReceiptId!==id||state.order.finished||state.order.workAbandoned),
  requestMeeting:v=>{meeting=!!v;if(meeting)talks.cancel('先回厨房面谈或交班');},dutyState:()=>copy(state.duty||{receiptId:null,status:'inactive'}),workReceipts:id=>copy(state.workReceipts.filter(r=>r.workReceiptId===id)),
  executeWork(w,id){const expected=workIntent(id);if(!expected||expected.key!==w.key||getMounted()||!at(getPlayer(),expected.position,.22))return false;step={...expected,receiptId:id,elapsed:0};return true;},
  isActing:()=>!!step,held:()=>false,stopWorkAction(){step=null;},returnPosition:()=>REG.slice(),
  workLabel:()=>step?.action||(state.duty?.status==='paused'?'厨房已暂停 · 赫特代管，请当面接回':state.duty?.status==='draining'?'等赫特做好原餐并当面交班':`原厨房候单 · 游戏开局居民供膳余${state.supply.remaining}/24份`),
  playerPose:()=>step?{action:step.pose,workTarget:step.target.slice(),station:{workTarget:step.target.slice()},...(step.pose==='herb-mix'?{archery:{hands:[[-.14,1.22,.40],[.12,1.24,.40]]}}:{})}:null,
 };
 function updateDuty(dt){if(state.duty?.status==='active'&&(!inWorkplace()||getMounted())){if(commit(s=>{s.duty.status='paused';const o=s.order;if(o?.workReceiptId===s.duty.receiptId&&!o.finished&&!o.workAbandoned){s.workReceipts.push(review(o,false));o.workAbandoned=true;}}))step=null;}
  if(state.duty?.status==='draining'&&inWorkplace()&&!getMounted()&&recall(dt)&&!npcBusy())commit(s=>{s.duty.status='active';});
  if(meeting)recall(dt);if(!step)return;const w=step;if(!dutyActive(w.receiptId)||state.order?.id!==w.orderId||state.order.stage!==w.stage||!at(getPlayer(),w.position,.24)||getMounted()){step=null;return;}if(getPlayer().walking)return;face(getPlayer(),w.target);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed<w.duration)return;
  const ok=w.stage==='preparing'?prepare(w.next,w.receiptId):stage(w.next,w.stage==='plating'?{mealId:state.order.id+'-dish'}:w.stage==='dispatch'?{dispatchedAt:state.time}:{});if(ok){record('player-'+w.stage);step=null;}
 }


 // Dana lends her one existing service lane. Old meals drain before takeover;
 // only a player who hears, reports, serves and washes the original order earns evidence.
 const tableHeld=()=>state.order?.holder==='player';
 const tableLocal=()=>{const p=getPlayer()?.root.position;return p&&Math.abs(p.y)<.35&&p.x<=23&&p.z<=-7&&(p.z>=-12.3&&p.x>=13.3||p.z>=-18.1&&p.x>=17);};
 const tableActive=id=>state.tableDuty?.receiptId===id&&state.tableDuty.status==='active';
 const playerServing=()=>resident(state.order)&&(tableHeld()||state.tableDuty?.status==='active'&&!state.order.tableAbandoned&&(!state.order.tableReceiptId||state.order.tableReceiptId===state.tableDuty.receiptId));
 const hostBusy=()=>!!state.order&&!playerServing();
 const tableReady=()=>!hostBusy()&&at(host,P.hostHome,.2);
 function recallHost(dt){return !hostBusy()&&travel(host,P.hostHome,dt);}
 function tableReview(o,completed){const waitSeconds=Math.max(0,(o.servedAt??state.time)-o.requestedAt),timely=waitSeconds<=120;return {source:'egypt-table-service',id:o.id+'-serve-'+o.tableReceiptId,workReceiptId:o.tableReceiptId,orderId:o.id,number:o.number,customerId:GUEST,customerName:'萨米拉',dishId:P.id,itemId:o.id+'-dish',supplyReceipt:o.id+'-prepared',outcome:completed?timely?'completed':'late':'handoff',waitSeconds,completed,accurate:completed,timely};}
 function abandonTable(s,id){const o=s.order;if(o?.tableReceiptId===id&&!o.tableAbandoned&&!s.tableReceipts.some(r=>r.id===o.id+'-serve-'+id)){s.tableReceipts.push(tableReview(o,false));o.tableAbandoned=true;}}
 const TABLE_WORK={requested:{position:P.serve,target:P.table,action:'问萨米拉 · 记原餐单',pose:'write',duration:1.5,next:'ticket'},ticket:{position:P.report,target:P.prepTop,action:'向赫特报原餐单',pose:'tidy',duration:1,next:'preparing'},collecting:{position:P.pass,target:P.passTop,action:'核原号 · 接同一份原盘',pose:'tidy',duration:1,next:'carrying'},carrying:{position:P.serve,target:P.table,action:'核萨米拉本人 · 送原盘上桌',pose:'tidy',duration:1,next:'ready'},clearing:{position:P.serve,target:P.table,action:'收回萨米拉用毕的同一原盘',pose:'tidy',duration:1,next:'returning'},returning:{position:P.pass,target:P.passTop,action:'原盘送回厨房 · 亲手洗净',pose:'tidy',duration:4,next:'leaving'}};
 function tableIntent(id){const o=state.order;if(!tableActive(id)||!playerServing()||tableStep||!o||o.cancelled||!TABLE_WORK[o.stage])return null;const w=TABLE_WORK[o.stage];return {...copy(w),key:o.id+':'+o.stage,orderId:o.id,number:o.number,stage:o.stage,executionRadius:.22,action:`${o.number}号 萨米拉 · ${w.action}`};}
 const tableService={registry:TABLE_REG.slice(),meetingReady:tableReady,inWorkplace:tableLocal,dutyActive:tableActive,workIntent:tableIntent,
  canClaimDuty:()=>!!guest&&!state.duty&&(!state.order||resident(state.order)),
  holdDuty(id){if(!state.tableDuty)return commit(s=>{s.tableDuty={receiptId:id,status:'paused'};});return state.tableDuty.receiptId===id;},
  claimDuty(id){if(!this.canClaimDuty()||state.tableDuty&&state.tableDuty.receiptId!==id)return false;tableStep=null;return commit(s=>{s.tableDuty={receiptId:id,status:'draining'};});},
  releaseDuty(id,{evaluate=false}={}){if(state.tableDuty&&state.tableDuty.receiptId!==id||tableHeld()&&!at(getPlayer(),P.pass,.31))return false;const ok=commit(s=>{if(evaluate)abandonTable(s,id);if(s.order?.holder==='player'){s.order.holder='kitchen';s.order.stage=s.order.finished||s.order.cancelled?'washing':'collecting';s.phase=0;}s.tableDuty=null;});if(ok)tableStep=null;return ok;},
  canEndDuty:id=>state.tableDuty?.receiptId===id&&!tableStep&&!tableHeld()&&(!state.order?.tableReceiptId||state.order.tableReceiptId!==id||state.order.tableAbandoned||state.tableReceipts.some(r=>r.workReceiptId===id&&r.orderId===state.order.id&&r.completed)),
  requestMeeting:v=>{tableMeeting=!!v;if(tableMeeting)talks.cancel('先回餐厅面谈或交班');},dutyState:()=>copy(state.tableDuty||{receiptId:null,status:'inactive'}),workReceipts:id=>copy(state.tableReceipts.filter(r=>r.workReceiptId===id)),
  executeWork(w,id){const expected=tableIntent(id);if(!expected||expected.key!==w.key||getMounted()||!at(getPlayer(),expected.position,.22))return false;tableStep={...expected,receiptId:id,elapsed:0};return true;},
  isActing:()=>!!tableStep,held:tableHeld,stopWorkAction(){tableStep=null;},returnPosition:()=>P.pass.slice(),
  workLabel:()=>tableStep?.action||(state.tableDuty?.status==='paused'?'餐桌服务已暂停 · 持盘请带回；当面接回才继续工时':state.tableDuty?.status==='draining'?'等达娜送完手中原餐，再当面接班':state.order?`萨米拉原餐 · ${labels[state.order.stage]}`:`原餐厅候单 · 居民供膳余${state.supply.remaining}/24份`),
  playerPose:()=>tableStep||tableHeld()?{action:tableStep?.pose||null,handoff:tableHeld()||['collecting','carrying','clearing'].includes(tableStep?.stage),workTarget:tableStep?.target?.slice(),station:tableStep?{workTarget:tableStep.target.slice()}:null,archery:tableHeld()?{hands:[[-.16,1.08,.43],[.16,1.08,.43]]}:null}:null,
 };
 function updateTableDuty(dt){
  if(state.tableDuty?.status==='active'&&(!tableLocal()||getMounted())){if(commit(s=>{s.tableDuty.status='paused';if(!tableHeld())abandonTable(s,s.tableDuty.receiptId);}))tableStep=null;}
  if(state.tableDuty?.status==='draining'&&tableLocal()&&!getMounted()&&recallHost(dt)&&!hostBusy())commit(s=>{s.tableDuty.status='active';});
  if(tableMeeting)recallHost(dt);if(!tableStep)return;const w=tableStep,o=state.order;
  if(!tableActive(w.receiptId)||o?.id!==w.orderId||o.stage!==w.stage||!at(getPlayer(),w.position,.24)||getMounted()){tableStep=null;return;}
  if(getPlayer().walking)return;if(w.stage==='ticket'&&!travel(cook,P.prep,dt))return;if(w.stage==='collecting'&&!travel(cook,P.prep,dt))return;
  face(getPlayer(),w.target);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed<w.duration)return;
  if(commit(s=>{const x=s.order;if(w.stage==='requested')x.tableReceiptId=w.receiptId;if(w.stage==='collecting'||w.stage==='clearing')x.holder='player';if(w.stage==='carrying'){x.holder='table';x.servedAt=s.time;}if(w.stage==='returning'){x.holder='kitchen';if(x.finished&&!x.tableAbandoned&&x.tableReceiptId===w.receiptId&&!s.tableReceipts.some(r=>r.id===x.id+'-serve-'+w.receiptId))s.tableReceipts.push(tableReview(x,true));}x.stage=w.next;s.phase=0;})){record('player-table-'+w.stage);tableStep=null;}
 }
 // Durable source facts are set only by the NPC branch that actually did
 // each step. Taking over a player's half-finished task earns no invented story.
 function sourceExperiences(){
  const o=state.order;if(!o)return true;
  const sources=[[cook,o.npcPrepared&&o.npcHeated&&o.npcPlated,'staff-work','按刚才的原餐单切配蔬食、守过陶锅，再装好面包'],[host,o.npcHeard&&o.npcReported&&o.npcServed&&o.npcCleaned,'staff-work','刚听过餐单、报进厨房，送好原盘并洗净了陶碗']];
  for(const[n,done,kind,label]of sources)if(n&&done&&!life.recordExperience(n.station.id,{id:o.id+':'+n.station.id,kind,label,completed:true}).ok)return false;
  return true;
 }
 const paused=n=>isSociallyHeld(n.station.id,conversation)||playerSocial===n.station.id||stationBusy===n.station.id;
 const urgent=n=>{const need=sharedNeeds?.status(n.station.id);return need?.seekMeal||need?.seekToilet||life.fatigued(n.station.id);};
 const socialAvailable=n=>!!n&&(!state.order||n===guest&&guestReturned())&&(n!==guest||!guestAway())&&!meeting&&!tableMeeting&&!step&&!tableStep&&!['draining'].includes(state.duty?.status)&&!['draining'].includes(state.tableDuty?.status)&&!paused(n)&&!n.serviceMount&&!urgent(n);
 const clear=n=>{n.route=[];routes.delete(n);};
 function makeTalks(){return createWorkplaceConversations({places:EGYPT_TALK_PLACES,placePrefix:'egypt-meal-talk-',labels:{invited:'相约去餐厅外小廊说几句 · 来单先忙',appreciated:'聊起陶锅蔬食与忙完一餐 · 彼此谈得投缘',mismatched:'对用餐与歇息各有想法 · 保留自己的习惯',neutral:'听听对方备餐、送盘与用餐的日常'},actors:[cook,host,...(guest?[guest]:[])],brain:life,claims:furniture.facilities,available:socialAvailable,
  canReach:(n,p)=>at(n,p)||planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25).length>0,travel,clear,save:()=>commit(()=>{}),beginInteraction,onInteraction,note:record,
  onRelease:n=>{delete state.idle[n.station.id];if(n===guest){state.resident.choice=null;state.resident.elapsed=0;state.resident.nextChoice=state.time+3;}}});}
 talks=makeTalks();
 function beginTalk(n,c){
  state.pendingTalk={actorId:n.station.id,choice:c};
  if(talks.invite(n,c)){state.pendingTalk=null;return true;}
  // The life transaction rolls a failed invitation back, including reply RNG.
  // Keep the original selected intention while storage is down; never reroll it.
  if(!socialAvailable(n)||!life.canReply(c.targetId)){state.pendingTalk=null;life.complete(n.station.id,c,{fulfilled:false});life.defer(n.station.id,12);delete state.idle[n.station.id];if(n===guest)state.resident.choice=null;}
  return false;
 }
 function staffLeisure(n,dt){
  if(talks.owns(n)||paused(n)||state.pendingTalk)return null;
  const id=n.station.id,role=n===cook?'cook':'host',released=(role==='cook'?state.duty:state.tableDuty)?.status==='active',busy=role==='cook'?npcBusy():hostBusy();
  if(busy||meeting||tableMeeting||urgent(n)){
   if(state.idle[id]||life.state(id).current&&!life.state(id).current.conversationId){life.complete(id,life.state(id).current,{fulfilled:false});delete state.idle[id];}return null;
  }
  let idle=state.idle[id];
  if(!idle){if(!released&&!socialAvailable(n)||!released&&!life.experience(id))return null;
   const c=life.choose(id,[...(released?[{id:'read',base:.3,traits:{curiosity:.7},duration:[14,24],cooldown:12},{id:'rest',base:.3,traits:{quiet:.7},needs:{fatigue:.5},duration:[12,20],cooldown:12,relief:{fatigue:-.08}}]:[{id:'pause',base:.18,traits:{quiet:.4},needs:{fatigue:.4},duration:[8,13],cooldown:20}]),talks.candidate(n)],getClock().hour);
   if(!c)return null;idle=state.idle[id]={choice:c,elapsed:0};
  }
  const c=idle.choice;if(c.id==='conversation'){beginTalk(n,c);return null;}
  if(released&&!travel(n,n===cook?ASIDE:TABLE_ASIDE,dt))return null;
  idle.elapsed+=dt;if(idle.elapsed>=c.duration){life.complete(id,c,{fulfilled:true});life.defer(id,8);delete state.idle[id];}
  return c.id==='read'?'read':null;
 }

 function update(dt,t,{conversationActorId=null,playerSocialActorId=null,performing=null}={}){if(disposed||lastError)return;if(!initialized&&!commit(()=>{}))return;state.time+=Math.max(0,dt);conversation=conversationActorId;playerSocial=playerSocialActorId;stationBusy=performing;for(const n of[cook,host,...(guest?[guest]:[])])n.walking=false;life.tick(dt);reconcile();updateDuty(dt);updateTableDuty(dt);if(state.pendingTalk){const p=state.pendingTalk,n=[cook,host,guest].find(n=>n?.station.id===p.actorId);if(n&&talks.owns(n))state.pendingTalk=null;else if(n)beginTalk(n,p.choice);else state.pendingTalk=null;}residentChoice(dt);talks.update(dt);let o=state.order,actionCook=null,actionHost=null,targetCook=null,carry=false;
  if(resident(o)&&!o.cancelled&&!o.finished&&o.stage!=='seating'&&!furniture.facilities.reservation(seat.id,GUEST)){commit(s=>cancelResidentState(s));o=state.order;}
  if(o&&!resident(o)&&['requested','accepted','ticket','preparing','heating','plating','collecting','pickup','carrying','serving','ready','eating'].includes(o.stage)&&!o.cancelled&&!seated()){cancel();o=state.order;}
  if(o){const elapsed=duration=>{state.phase+=Math.max(0,dt);return state.phase>=duration;};switch(o.stage){
   case 'seating':if(resident(o)){if(mountGuest(dt))stage('requested');}else if(seated())stage('requested');else if(getPendingSeat()!==seat.id&&!initializing)cancel();break;
   case 'requested':if(playerServing())break;if(travel(host,P.serve,dt)){face(host,seat.anchor);stage('accepted');}break;
   case 'accepted':if(playerServing())break;if(elapsed(1.5))stage('ticket',{npcHeard:true});break;
   case 'ticket':if(playerServing())break;if(travel(host,playerCooking()?[20.6,0,-16]:P.report,dt)&&(playerCooking()||travel(cook,P.prep,dt)))stage('preparing',{npcReported:true});break;
   case 'preparing':if(!playerCooking()&&travel(cook,P.prep,dt)){targetCook=P.prepTop;face(cook,targetCook);actionCook='cook';if(elapsed(4))prepare();}break;
   case 'heating':if(!playerCooking()&&travel(cook,P.pot,dt)){targetCook=P.potTop;face(cook,targetCook);actionCook='herb-mix';if(elapsed(6))stage('plating',{npcHeated:true});}break;
   case 'plating':if(!playerCooking()&&travel(cook,P.pass,dt)){targetCook=P.passTop;face(cook,targetCook);actionCook='bread';if(elapsed(2))stage('collecting',{mealId:o.id+'-dish',supplyReceipt:o.id+'-prepared',npcPlated:true});}break;
   case 'dispatch':if(!playerCooking())stage('collecting');break;
   case 'collecting':if(playerServing())break;if((state.duty?.status==='active'||travel(cook,P.prep,dt))&&travel(host,P.pass,dt))stage('pickup');break;
   case 'pickup':if(playerServing())break;face(host,P.passTop);carry=true;if(elapsed(1))stage(o.cancelled?'returning':'carrying',{holder:'host'});break;
   case 'carrying':if(playerServing())break;carry=true;if(travel(host,P.serve,dt)){face(host,P.table);stage('serving');}break;
   case 'serving':if(playerServing())break;carry=true;if(elapsed(1))stage('ready',{holder:'table',npcServed:true});break;
   case 'ready':if(!playerServing())travel(host,P.hostHome,dt);if(resident(o)&&customerSeated())stage('eating');break;
   case 'eating':if(!playerServing())travel(host,P.hostHome,dt);if(elapsed(P.duration))complete();break;
   case 'lowering':if(elapsed(.8)&&commit(s=>{s.order.stage='clearing';s.phase=0;if(resident(s.order))beginDeparture(s);}))record('clearing');break;
   case 'clearing':if(playerServing())break;if(travel(host,P.serve,dt)){face(host,P.table);stage('lifting');}break;
   case 'lifting':if(playerServing())break;carry=true;if(elapsed(1))stage('returning',{holder:'host'});break;
   case 'returning':if(playerServing())break;carry=true;if(travel(host,P.pass,dt)){face(host,P.passTop);stage('washing',{holder:'kitchen'});}break;
   case 'washing':if(playerServing())break;if(!travel(host,P.pass,dt))break;actionHost='tidy';if(elapsed(4)){if(stage('leaving',{npcCleaned:true})&&!resident(o))finish();}break;
   case 'leaving':finish();break;
  }}else{if(!talks.owns(cook)&&!meeting&&state.duty?.status!=='active')travel(cook,P.prep,dt);if(!talks.owns(host)&&!tableMeeting&&state.tableDuty?.status!=='active')travel(host,P.hostHome,dt);if(guest&&!guestAway()&&!talks.owns(guest))travel(guest,guest.station.npcPosition||guest.home.toArray(),dt);}
  returnGuest(dt);
  if(!actionCook)actionCook=staffLeisure(cook,dt);if(!actionHost)actionHost=staffLeisure(host,dt);
  for(const n of[cook,host,...(guest?[guest]:[])]){const target=talks.face(n);if(target)face(n,target);}
  for(const[role,n,action,target]of[['cook',cook,actionCook,targetCook],['host',host,actionHost,P.passTop]]){const c=poseContext(n,target?{workTarget:target}:null);c.heldProp=null;c.handoff=role==='host'&&carry;c.seatedMeal=false;c.archery=c.handoff?{hands:[[-.16,1.08,.43],[.16,1.08,.43]]}:action==='herb-mix'?{hands:[[-.14,1.22,.40],[.12,1.24,.40]]}:null;n.animate(t+n.phase,n.walking,talks.talking(n)?'talk':action,c);const small=n.label?.querySelector('small');if(small)small.textContent=talks.label(n)||(role==='host'&&state.tableDuty?.status==='active'?'达娜 · 已交班，餐厅旁读书歇脚':role==='cook'&&state.duty?.status==='active'?'赫特 · 已交班，厨房旁读书歇脚':state.order?(role==='cook'?actionCook?labels[state.order.stage]:'等候同号餐单':labels[state.order.stage]):n.station.npcLabel);}
  if(guest){const c=poseContext(guest,guest.station);c.seatHeight=guest.serviceMount?seat.seatY-guest.root.position.y-(c.visualFloorOffset||0):undefined;c.heldProp=null;c.archery=null;c.seatedMeal=resident(state.order)&&['eating','lowering'].includes(state.order.stage);c.handoff=c.seatedMeal;guest.animate(t+guest.phase,guest.walking,talks.talking(guest)?'talk':guest.serviceMount?'chair-sit':state.resident.choice?.id==='read'?'read':guestAway()||resident(state.order)&&!guestReturned()?null:guest.station.npcAction,c);const small=guest.label?.querySelector('small');if(small)small.textContent=talks.label(guest)||guestLabel();}
  props.update(state.order,{cook,host,server:tableHeld()?getPlayer():host,player:customer()},state.phase);if(state.time-lastReplay>=5){lastReplay=state.time;deliver();}
 }
 function snapshot(){return copy({...state,life:life.snapshot(),talks:talks.snapshot(),step,tableStep});}
 function restore(s){talks.dispose();accept(latest(state,s));life=createLifeDecisions({worldSeed,actorIds:[P.cook,P.host,...(guest?[GUEST]:[])],saved:state.life||{},sharedNeeds,onChange:l=>commit(x=>{x.life=l;})});talks=makeTalks();talks.restore(state.talks);routes.clear();for(const n of[cook,host])n.route=[];step=s?.step&&state.order?.id===s.step.orderId&&state.order?.stage===s.step.stage?copy(s.step):null;tableStep=s?.tableStep&&state.order?.id===s.tableStep.orderId&&state.order?.stage===s.tableStep.stage?copy(s.tableStep):null;const o=state.order,r=state.mealReceipts[0];if(o&&!resident(o)&&r?.orderId===o.id&&!o.finished){o.finished=true;o.stage='lowering';state.phase=0;}const departure=state.resident.departure;if(guest&&(resident(o)&&!departure||departure?.stage==='leaving')){const held=furniture.facilities.reserve(seat.id,GUEST);if(held&&o?.stage!=='seating'&&at(guest,seat.anchor,.4)&&furniture.facilities.occupy(seat.id,GUEST))guest.serviceMount=seat;else if(!held)guest.serviceMount=null;}else if(guest&&['returning','returned'].includes(departure?.stage)){guest.serviceMount=null;furniture.facilities.release(seat.id,GUEST);}deliver();props.update(state.order,{cook,host,server:tableHeld()?getPlayer():host,player:customer()},state.phase);return true;}
 deliver();
 return {seat,kitchen,tableService,request,eat,cancel,update,snapshot,restore,playerRequest(id){if(tableHeld()){notify('请先送妥或归回手中的原餐盘');return false;}if(id===seat.id&&(resident(state.order)||guest?.serviceMount||state.resident.departure?.stage==='leaving')){notify(resident(state.order)&&state.resident.departure?'原餐具还待收洗，请等这一桌清理完':'萨米拉正在使用原餐席，请等她用毕起身');return false;}return true;},owns:n=>n===cook||n===host||n===guest,
  leaveSeat:id=>id!==seat.id||cancel(),socialProfile:id=>life.state(id),canTalkAtPost:n=>[cook,host,guest].includes(n)&&!state.order&&!meeting&&!tableMeeting&&!step&&!tableStep&&!n.walking&&!n.route?.length&&!n.serviceMount,canBorrowForSocial:n=>n===guest||n===cook&&state.duty?.status==='active'&&!meeting||n===host&&state.tableDuty?.status==='active'&&!tableMeeting,socialStatus:n=>{if(![cook,host,guest].includes(n))return null;const working=talks.owns(n)||urgent(n)||meeting||tableMeeting||(n===cook?!!state.order&&state.duty?.status!=='active':n===guest?!!n.serviceMount||resident(state.order)&&!state.order.finished&&!state.order.cancelled:hostBusy());return {busy:!!working,canPause:!working,attention:!working,job:talks.label(n)||(n===guest?guestLabel():state.order?labels[state.order.stage]:n===cook?'厨房厨役 · 等候餐单':'餐厅侍者 · 等候来访')};},
  playerPose:()=>state.order&&!resident(state.order)&&seated()&&['eating','lowering'].includes(state.order.stage)?{seatedMeal:true}:null,
  statusLabel:id=>id===seat.id&&state.order&&!resident(state.order)?labels[state.order.stage]:null,
  // Browsing an existing meal belongs to the original west place setting,
  // including waiting/cleanup; the service and ledger remain untouched.
  menuTarget(){const o=resident(state.order)?null:state.order;if(disposed||!o&&!seated())return null;return {id:seat.id,name:'访客餐桌',targetKey:seat.id,targetName:'餐厅西席',action:'查看访客餐单',position:(seated()?seat.anchor:seat.position).slice(),executionRadius:1.8,interactionRadius:2.8,priority:52,intentKey:[seat.id,o?.id||'menu',o?.stage||'',!!o?.cancelled,!!o?.finished].join(':'),visualAnchor:{id:'egypt-meal-table-'+seat.id,point:P.table.slice()}};},
  view(){const o=state.order;return {order:copy(resident(o)?null:o),residentOrder:resident(o)?{name:'萨米拉',label:labels[o.stage]}:null,seatId:seat.id,seated:seated(),cash:cash(),price:P.price,name:P.name,canOrder:!o&&!guest?.serviceMount&&state.resident.departure?.stage!=='leaving'&&!state.duty&&!state.tableDuty&&canRequest()&&cash()!==null&&cash()>=P.price,label:o?labels[o.stage]:null};},
  state:()=>({...snapshot(),lastError,props:props.state(),actors:[cook,host,...(guest?[guest]:[])].map(n=>({id:n.station.id,position:n.root.position.toArray(),walking:n.walking})),history:copy(history)}),
  dispose({suspend=false}={}){if(disposed)return;if(!suspend)cancel();disposed=true;talks.dispose();props.dispose();for(const n of[cook,host,...(guest?[guest]:[])]){n.route=[];n.serviceMount=null;}furniture.releaseActor(GUEST);routes.clear();}
 };
}
