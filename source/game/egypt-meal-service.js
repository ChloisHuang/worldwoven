import {followActorRoute} from './actor-navigation.js';
import {EGYPT_MEAL as P,validEgyptMealReceipt} from './egypt-meal-definition.js';
import {createEgyptMealProps} from './egypt-meal-props.js';
const copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0;
const labels={reserving:'正在预留餐费',seating:'前往原餐厅西侧坐凳',requested:'达娜到桌边核对访客餐单',accepted:'达娜记下这一席的餐点',ticket:'达娜到厨房递交同号餐单',preparing:'赫特在原案板切配蔬食',heating:'赫特照看陶锅，烹热蔬食',plating:'赫特在案边装好面包与陶碗',collecting:'达娜前往厨房领取这一份餐',pickup:'达娜托起同号餐盘',carrying:'达娜把原餐盘送往西侧餐位',serving:'达娜将餐点放上原餐桌',ready:'餐已上桌，请明确选择开吃',eating:'坐着慢慢享用正餐',lowering:'放回吃过的陶碗',clearing:'达娜来收回餐具',lifting:'达娜收起原餐盘',returning:'达娜把餐具送回厨房',washing:'达娜清洗陶碗并擦整餐盘',refund:'正在退回未食用餐费'};
const latest=(a,b)=>!a?b:!b?a:(b.revision||0)>(a.revision||0)||(b.revision||0)===(a.revision||0)&&(b.time||0)>(a.time||0)?b:a;
// Two original residents share this single controller. Every durable boundary
// precedes its money action; ledger holds reconcile interrupted commits by ID.
export function createEgyptMealService({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,getPendingSeat=()=>null,onSeat=()=>{},canRequest=()=>true,copperLedger,saved={},saveState=()=>false,onMealReceipts=()=>{},notify=()=>{},propsFactory=createEgyptMealProps}){
 const cook=npcs.find(n=>n.station.id===P.cook),host=npcs.find(n=>n.station.id===P.host),seat=furniture.items.find(s=>s.kind==='seat'&&Math.hypot(s.center[0]-P.seatCenter[0],s.center[2]-P.seatCenter[2])<.05);
 if(!cook||!host||!seat)return null;
 const props=propsFactory(lot.group),actors={cook,host},routes=new Map(),history=[];
 let state={version:1,revision:0,serial:0,order:null,mealReceipts:[],phase:0,time:0},disposed=false,conversation=null,initializing=false,lastReplay=0;
 function accept(s){if(!s||s.version!==1)return;state=copy(s);state.mealReceipts=(state.mealReceipts||[]).filter(validEgyptMealReceipt).slice(-1);state.serial=Math.max(integer(state.serial)?state.serial:0,state.mealReceipts[0]?.number||0);if(state.order&&(!integer(state.order.number)||state.order.id!==`egypt-meal-${state.order.number}`||state.order.seatId!==seat.id||state.order.dishId!==P.id||state.order.price!==P.price))state.order=null;}
 accept(latest(saved,saved.continuity));
 const at=(n,p,r=.075)=>!!n&&Math.abs(n.root.position.y-p[1])<.4&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r;
 const seated=()=>getMounted()?.id===seat.id&&at(getPlayer(),seat.anchor,.4);
 const cash=()=>copperLedger?.balances?.()?.egypt?.cash??null;
 const payment=o=>o&&copperLedger?.reservations?.().find(h=>h.id===o.id);
 const matching=h=>h&&h.amount===P.price&&h.currency==='egypt';
 const record=event=>{history.push({event,orderId:state.order?.id,mealId:state.order?.mealId,time:state.time});if(history.length>48)history.shift();};
 function deliver(){if(state.mealReceipts.length)try{onMealReceipts(copy(state.mealReceipts));}catch{}}
 function commit(change){const before=state,next=copy(state);change(next);next.revision=before.revision+1;state=next;try{const result=saveState(copy(next));if(result===false||result?.then){state=before;return false;}}catch{state=before;return false;}deliver();return true;}
 function stage(name,patch={}){if(!commit(s=>{Object.assign(s.order,{stage:name,...patch});s.phase=0;}))return false;record(name);return true;}
 function travel(n,p,dt){n.walking=false;if(at(n,p)){n.route=[];routes.delete(n);return true;}if(conversation===n.station.id)return false;const key=p.join(',');let route=routes.get(n);if(route?.key!==key){route={key,retry:0};routes.set(n,route);n.route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);}const result=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});if(result.waiting)route.retry=0;else if(!result.waypoint){route.retry+=dt;if(route.retry>=5){routes.delete(n);n.route=[];}}return at(n,p);}
 function face(n,p){n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);}
 function finish(){if(!commit(s=>{s.order=null;s.phase=0;}))return false;props.clear();routes.clear();for(const n of[cook,host])n.route=[];record('cleaned');return true;}
 function cleanStage(o){return !o.mealId?'done':o.holder==='table'?'clearing':o.holder==='host'?'returning':'collecting';}
 function reconcile(){const o=state.order;if(!o)return;const h=payment(o);if(h&&!matching(h))return;
  if(o.cancelled&&o.stage==='refund'){
   if(h?.status==='reserved'&&!copperLedger.refund(o.id)?.ok)return;
   const result=payment(o);if(result?.status==='reserved')return;
   const next=o.cancelledFrom==='eating'?'lowering':cleanStage(o);if(next==='done')finish();else stage(next,{payment:result?.status||'unpaid'});return;
  }
  if(o.stage==='reserving'){
   if(h?.status==='refunded'){commit(s=>{s.order=null;s.phase=0;});return;}
   if(!h){const result=copperLedger?.reserve(P.price,o.id,'egypt');if(!result?.ok){if(cash()<P.price)commit(s=>{s.order=null;s.phase=0;});return;}}
   if(matching(payment(o))&&payment(o).status==='reserved')stage(seated()?'requested':'seating',{payment:'reserved'});return;
  }
  if(o.startRequested&&o.stage==='ready'){
   if(!seated())return;
   if(h?.status==='reserved'&&!copperLedger.settle(o.id)?.ok)return;
   if(payment(o)?.status==='settled')stage('eating',{payment:'settled',startRequested:false});
  }
 }
 function request(){if(initializing||disposed||state.order||!canRequest()||cash()==null||cash()<P.price){notify(state.order?'这一份餐还在进行，请查看当前餐单':cash()<P.price?'需要 5 埃及券，可到当地银行兑换':'现在暂不能点餐');return false;}
  initializing=true;let result=false;try{
   if(!seated()){onSeat(seat);if(!seated()&&getPendingSeat()!==seat.id){notify('原餐凳暂时走不过去，请从西侧通道靠近');return false;}}
   if(!commit(s=>{const number=s.serial+1;s.serial=number;s.phase=0;s.order={id:`egypt-meal-${number}`,number,customer:'player',dishId:P.id,price:P.price,currency:'egypt',seatId:seat.id,stage:'reserving',payment:'unpaid',holder:'kitchen',mealId:null,cancelled:false,finished:false};}))return false;
   reconcile();result=!!state.order;return result;
  }finally{initializing=false;}
 }
 function eat(){const o=state.order;if(!o||o.stage!=='ready'||o.cancelled||o.finished||!seated()||!matching(payment(o))||!['reserved','settled'].includes(payment(o).status))return false;if(!o.startRequested&&!commit(s=>{s.order.startRequested=true;}))return false;reconcile();return state.order?.stage==='eating';}
 function cancel(){const o=state.order;if(initializing||!o||o.cancelled||o.finished)return true;const origin=props.state().bowlPosition;
  if(!commit(s=>{s.order.cancelledFrom=s.order.stage;s.order.cancelled=true;s.order.startRequested=false;s.order.returnBowlFrom=origin;s.order.stage='refund';s.phase=0;}))return false;
  reconcile();notify(payment(o)?.status==='settled'?'提前收餐不退费，未吃完不会缓解饥饿':'未开吃的餐费全额退回，达娜会收整餐具');return true;
 }
 function complete(){const o=state.order;if(!o||o.cancelled||o.finished||state.phase<P.duration||!seated()||!matching(payment(o))||payment(o).status!=='settled')return false;
  const receipt={source:'egypt-visitor-meal',id:o.id+'-consumed',number:o.number,actorId:'player',orderId:o.id,mealId:o.mealId,dishId:P.id,paymentReceipt:o.id,supplyReceipt:o.id+'-prepared',completed:true};
  if(!commit(s=>{s.order.finished=true;s.order.stage='lowering';s.order.returnBowlFrom=props.state().bowlPosition;s.phase=0;s.mealReceipts=[receipt];}))return false;record('consumed');return true;
 }
 function update(dt,t,{conversationActorId=null}={}){if(disposed)return;state.time+=Math.max(0,dt);conversation=conversationActorId;for(const n of[cook,host])n.walking=false;reconcile();let o=state.order,actionCook=null,actionHost=null,targetCook=null,carry=false;
  if(o&&['requested','accepted','ticket','preparing','heating','plating','collecting','pickup','carrying','serving','ready','eating'].includes(o.stage)&&!o.cancelled&&!seated()&&o.stage!=='reserving'){cancel();o=state.order;}
  if(o){const elapsed=duration=>{state.phase+=Math.max(0,dt);return state.phase>=duration;};switch(o.stage){
   case 'seating':if(seated())stage('requested');else if(getPendingSeat()!==seat.id&&!initializing)cancel();break;
   case 'requested':if(travel(host,P.serve,dt)){face(host,seat.anchor);stage('accepted');}break;
   case 'accepted':if(elapsed(1.5))stage('ticket');break;
   case 'ticket':if(travel(host,P.report,dt)&&travel(cook,P.prep,dt))stage('preparing');break;
   case 'preparing':if(travel(cook,P.prep,dt)){targetCook=P.prepTop;face(cook,targetCook);actionCook='cook';if(elapsed(4))stage('heating');}break;
   case 'heating':if(travel(cook,P.pot,dt)){targetCook=P.potTop;face(cook,targetCook);actionCook='herb-mix';if(elapsed(6))stage('plating');}break;
   case 'plating':if(travel(cook,P.pass,dt)){targetCook=P.passTop;face(cook,targetCook);actionCook='bread';if(elapsed(2))stage('collecting',{mealId:o.id+'-dish',supplyReceipt:o.id+'-prepared'});}break;
   case 'collecting':if(travel(cook,P.prep,dt)&&travel(host,P.pass,dt))stage('pickup');break;
   case 'pickup':face(host,P.passTop);carry=true;if(elapsed(1))stage(o.cancelled?'returning':'carrying',{holder:'host'});break;
   case 'carrying':carry=true;if(travel(host,P.serve,dt)){face(host,P.table);stage('serving');}break;
   case 'serving':carry=true;if(elapsed(1))stage('ready',{holder:'table'});break;
   case 'ready':travel(host,P.hostHome,dt);break;
   case 'eating':travel(host,P.hostHome,dt);if(elapsed(P.duration))complete();break;
   case 'lowering':if(elapsed(.8))stage('clearing');break;
   case 'clearing':if(travel(host,P.serve,dt)){face(host,P.table);stage('lifting');}break;
   case 'lifting':carry=true;if(elapsed(1))stage('returning',{holder:'host'});break;
   case 'returning':carry=true;if(travel(host,P.pass,dt)){face(host,P.passTop);stage('washing',{holder:'kitchen'});}break;
   case 'washing':actionHost='tidy';if(elapsed(4))finish();break;
  }}else{travel(cook,P.prep,dt);travel(host,P.hostHome,dt);}
  for(const[role,n,action,target]of[['cook',cook,actionCook,targetCook],['host',host,actionHost,P.passTop]]){
   const c=poseContext(n,target?{workTarget:target}:null);c.heldProp=null;c.handoff=role==='host'&&carry;c.seatedMeal=false;c.archery=c.handoff?{hands:[[-.16,1.08,.43],[.16,1.08,.43]]}:action==='herb-mix'?{hands:[[-.14,1.22,.40],[.12,1.24,.40]]}:null;
   n.animate(t+n.phase,n.walking,action,c);const small=n.label?.querySelector('small');if(small)small.textContent=state.order?(role==='cook'?actionCook?labels[state.order.stage]:'等候同号访客餐单':labels[state.order.stage]):n.station.npcLabel;
  }
  props.update(state.order,{cook,host,player:getPlayer()},state.phase);
  if(state.time-lastReplay>=5){lastReplay=state.time;deliver();}
 }
 function restore(s){accept(latest(state,s));routes.clear();for(const n of[cook,host])n.route=[];const o=state.order,r=state.mealReceipts[0];if(o&&r?.orderId===o.id&&!o.finished){o.finished=true;o.stage='lowering';state.phase=0;}deliver();props.update(state.order,{cook,host,player:getPlayer()},state.phase);return true;}
 deliver();
 return {seat,request,eat,cancel,update,snapshot:()=>copy(state),restore,owns:n=>n===cook||n===host,
  leaveSeat:id=>id!==seat.id||cancel(),socialStatus:n=>({available:!state.order,reason:state.order?'正在准备访客餐点':null}),
  playerPose:()=>state.order&&seated()&&['eating','lowering'].includes(state.order.stage)?{seatedMeal:true}:null,
  statusLabel:id=>id===seat.id&&state.order?labels[state.order.stage]:null,
  view(){const o=state.order;return {order:copy(o),seatId:seat.id,seated:seated(),cash:cash(),price:P.price,name:P.name,canOrder:!o&&canRequest()&&cash()!==null&&cash()>=P.price,label:o?labels[o.stage]:null};},
  state:()=>({...copy(state),props:props.state(),actors:[cook,host].map(n=>({id:n.station.id,position:n.root.position.toArray(),walking:n.walking})),history:copy(history)}),
  dispose({suspend=false}={}){if(disposed)return;if(!suspend)cancel();disposed=true;props.dispose();for(const n of[cook,host])n.route=[];routes.clear();}
 };
}
