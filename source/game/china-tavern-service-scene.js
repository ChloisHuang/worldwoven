import {followActorRoute} from './actor-navigation.js';
import {TAVERN_MEAL as M,TAVERN_DISHES} from './china-tavern-kitchen.js';
import {createTavernMealProps} from './china-tavern-meal-props.js';

const copy=x=>JSON.parse(JSON.stringify(x)),P=M.points;
const ROLE={host:'cn-tavern-host',chef:'cn-tavern-chef',assistant:'cn-tavern-steward'};
const GUESTS=['cn-tavern-diner-west','cn-tavern-diner-east'];
const HANDOVER={host:{player:[22.35,.215,11.7],npc:P.host,rest:[25.1,.215,13.7]},chef:{player:[22.1,.215,14],npc:[22.9,.215,14],rest:[25.1,.215,13.7]},assistant:{player:[21.5,.215,14],npc:[22.3,.215,14],rest:[25.1,.215,13.7]}};
const distance=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2]);
const at=(n,p,r=.1)=>!!n&&distance(n,p)<=r&&Math.abs(n.root.position.y-p[1])<.4;
const seatName=o=>o.tableId==='west'?'西窗桌':'东窗桌';
const steps={arriving:'客人入座',requested:'等候点菜',ordered:'等候收款',paid:'已付账 · 等候备菜',preparing:'切配中',prepared:'待烹调',heating:'烹调中',cooked:'待传菜',pass:'传菜台待取',carrying:'助理送餐中',wrong:'送错待取回',eating:'客人用餐',dirty:'待收碗',return:'送回洗碗处',wash:'待清洗',clean:'擦桌中',done:'完成'};

// Two stable adult visitors produce bounded meal and lodging events. Durable boundaries
// are saved before effects; the physical action timer itself is never restored.
export function createTavernServiceScene({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,
  saveState=()=>true,onReview=()=>({ok:true}),notify=()=>{},navigation=lot.navigation||{},propsFactory=createTavernMealProps}){
 const host=npcs.find(n=>n.station.id===M.host),chef=npcs.find(n=>n.station.id===M.cook),assistant=npcs.find(n=>n.station.id===M.assistant);
 const guests=GUESTS.map(id=>npcs.find(n=>n.station.id===id)),staff={host,chef,assistant},actors=[host,chef,assistant,...guests].filter(Boolean);
 const paths=new Map(),effects=new Map(),props=new Map(),phases=new Map(),history=[],failures=[];
 let state=null,activity=null,conversation=null,time=0,disposed=false;
 const role=()=>Object.keys(ROLE).find(k=>ROLE[k]===state?.roleId),playerOwns=r=>['working','handover-out'].includes(state?.stage)&&role()===r;
 const actor=r=>playerOwns(r)?getPlayer():staff[r],order=id=>state?.orders.find(o=>o.id===id);
 const nearPlayer=p=>!getMounted()&&at(getPlayer(),p,.23);
 const record=(event,data={})=>{history.push({event,time:+time.toFixed(2),...data});if(history.length>70)history.shift();};
 function persist(next){try{const result=saveState(copy(next));if(result===false||result?.then)return false;state=next;return true;}catch{return false;}}
 function changeWorld(mutator){const next=copy(state);mutator(next);return persist(next);}
 function change(id,fields){const next=copy(state),o=next.orders.find(o=>o.id===id);Object.assign(o,fields);if(!persist(next))return false;record(fields.stage||'changed',{orderId:id});return true;}
 function travel(n,p,dt){
  n.walking=false;if(at(n,p,.07)){n.route=[];return true;}if(conversation===n.station.id)return false;
  const key=p.join(',');if(paths.get(n)!==key||!n.route.length){paths.set(n,key);n.route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);}
  followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.78,arrivalTolerance:.035});return at(n,p,.07);
 }
 function stage(o,next,fields={}){phases.delete(o.id);return change(o.id,{stage:next,...fields});}
 function tick(o,dt,seconds,done){const elapsed=(phases.get(o.id)||0)+Math.min(.1,Math.max(0,dt));phases.set(o.id,elapsed);if(elapsed>=seconds&&done())phases.delete(o.id);}
 function effect(n,action,target,carry=false){effects.set(n,{action,target,carry});}
 function pose(n,t){const e=effects.get(n)||{},c=poseContext(n,e.target?{workTarget:e.target}:null);c.heldProp=null;c.handoff=!!e.carry;c.archery=e.carry?{hands:[[-.16,1.18,.43],[.16,1.18,.43]]}:null;c.seatedMeal=false;
  if(e.target&&!n.walking)n.root.rotation.y=Math.atan2(e.target[0]-n.root.position.x,e.target[2]-n.root.position.z);
  if(n.serviceMount){c.seatHeight=n.serviceMount.seatY-n.root.position.y-(c.visualFloorOffset||0);c.seatedMeal=e.action==='meal';c.handoff=c.seatedMeal;c.archery=null;c.supportY=n.serviceMount.supportY;c.lieOffset=n.serviceMount.lieOffset;c.lieSupport=n.serviceMount.lieSupport;}
  n.animate(t+n.phase,n.walking,n.serviceMount?n.serviceMount.kind==='bed'?'lie-rest':'chair-sit':e.action||null,c);
 }
 function mount(o,dt){const n=guests[o.guestIndex],seat=furniture.items.find(i=>i.id===o.seatId);if(n.serviceMount?.id===o.seatId)return true;
  if(!seat||getMounted()?.id===seat.id||!furniture.facilities.reserve(seat.id,n.station.id,{purpose:'tavern-meal'}))return false;
  if(!travel(n,seat.position,dt))return false;if(!furniture.facilities.occupy(seat.id,n.station.id))return false;
  n.root.position.set(...seat.anchor);n.root.rotation.y=seat.yaw;n.serviceMount=seat;record('guest-seated',{customerId:n.station.id,seatId:seat.id});return true;
 }
 function leave(o,dt){const n=guests[o.guestIndex];if(n.serviceMount){
   const safety=npcs.filter(other=>other!==n).map(other=>({minX:other.root.position.x-.25,maxX:other.root.position.x+.25,minZ:other.root.position.z-.25,maxZ:other.root.position.z+.25,minY:other.root.position.y,maxY:other.root.position.y+1.95}));
   const landing=furniture.standPoint(navigation,safety,n.serviceMount);if(!landing)return false;n.root.position.copy(landing);n.serviceMount=null;furniture.releaseActor(n.station.id);
  }return travel(n,n.station.npcPosition,dt);
 }
 function makeOrders(receiptId,offset=0){return guests.map((n,index)=>{
  const tableId=index?'east':'west',x=index?23.9:18.1,seat=furniture.items.find(s=>s.id===`china-tavern-dining-${x}--1`),dish=TAVERN_DISHES[index],inward=index?-1:1;
  return {id:`cn-tavern-order-${offset+index+1}`,number:offset+index+1,guestIndex:index,customerId:n.station.id,customerName:n.station.npcName,tableId,seatId:seat.id,seatAnchor:seat.anchor.slice(),servePoint:[x+inward*1.2,.215,17.86],mealPoint:[x+inward*.36,1.21,17.83],passPoint:[index?24.75:23.98,1.31,10.34],dishId:dish.id,dishName:dish.name,price:dish.price,customerCopper:30,stage:'arriving',mealId:null,holder:null,collected:false,reviews:[],cleaned:false};
 });}
 function start({roleId,receiptId,snapshot=null}){
  if(state&&state.stage!=='finished'||!Object.values(ROLE).includes(roleId)||guests.some(n=>!n))return false;
  let next=state?copy(state):snapshot?copy(snapshot):null;
  if(!next){const orders=makeOrders(receiptId);next={version:1,serial:2,orders,till:0,
    tables:[{id:'west',dirty:false},{id:'east',dirty:false}],rooms:['lan','zhu'].map((id,index)=>({id,name:index?'竹房':'兰房',price:12,dirty:false,guestId:null,bedId:'china-tavern-bed-'+id})),
    visitors:guests.map((n,i)=>({id:n.station.id,mode:'dining',orderId:orders[i].id,visits:1,roomId:null}))};}
  Object.assign(next,{roleId,receiptId,stage:'handover-in',selectedOrderId:null,heldTrayId:null,completedTasks:snapshot?.receiptId===receiptId?snapshot.completedTasks||0:0});
  // Restored scene identities/dirty flags survive. Only unfinished hand-held
  // props return to their real pass; money and review receipts never replay.
  if(snapshot){for(const o of next.orders){if(['preparing','heating'].includes(o.stage))o.stage=o.stage==='preparing'?'paid':'prepared';if(['cooked','carrying','wrong'].includes(o.stage)){o.stage='pass';o.holder='pass';delete o.placedTableId;delete o.placedMealPoint;}if(o.stage==='return'){o.stage='dirty';o.holder='table';}}}
  if(!persist(next))return false;for(const n of actors)n.route=[];record('shift-created',{roleId,receiptId});return true;
 }
 function restoreWorld(snapshot){if(state||!snapshot)return false;const next=copy(snapshot);next.stage='finished';next.heldTrayId=null;next.selectedOrderId=null;
  for(const o of next.orders){if(['carrying','cooked','wrong'].includes(o.stage)){o.stage='pass';o.holder='pass';delete o.placedMealPoint;}if(o.stage==='return'){o.stage='dirty';o.holder='table';}}
  return persist(next);
 }

 function handoverIn(){const r=role(),h=HANDOVER[r];if(state?.stage!=='handover-in'||!nearPlayer(h.player)||!at(staff[r],h.npc,.15))return false;
  if(!persist({...copy(state),stage:'working'}))return false;record('handover-in',{role:r,from:staff[r].station.id,to:'player'});notify('班次已当面交接。现在由你完成这个岗位的工作');return true;}
 const settled=()=>!!state&&state.orders.every(o=>o.stage==='done')&&state.tables.every(t=>!t.dirty)&&state.rooms.every(r=>!r.dirty&&!r.guestId)&&state.visitors.every(v=>v.mode==='idle');
 function handoverOut(){const r=role(),h=HANDOVER[r];if(state?.stage!=='handover-out'||!nearPlayer(h.player)||!at(staff[r],h.npc,.15)||state.heldTrayId)return false;
  if(!persist({...copy(state),stage:'finished'}))return false;record('handover-out',{role:r,from:'player',to:staff[r].station.id});return true;}
 function beginReturn(){if(state?.stage!=='working'||state.heldTrayId||state.orders.some(o=>o.holder===(role()==='chef'?'cook':'assistant')&&['cooked','return'].includes(o.stage)))return false;activity=null;return persist({...copy(state),stage:'handover-out'});}
 function collect(o){if(o.stage!=='ordered'||o.collected)return false;const next=copy(state),row=next.orders.find(q=>q.id===o.id);Object.assign(row,{collected:true,customerCopper:row.customerCopper-row.price,stage:'paid'});next.till+=row.price;if(!persist(next))return false;record('customer-payment',{orderId:o.id,amount:o.price,to:'tavern-till',from:o.customerId});return true;}
 function review(o,code,table,dish){const id=`${state.receiptId}-order-${o.number}-${code}`;if(o.reviews.some(r=>r.id===id))return true;
  const result=onReview({roleId:state.roleId,receiptId:state.receiptId,reviewId:id,customerId:o.customerId,customerName:o.customerName,tableId:o.tableId,tableName:seatName(o),dishId:o.dishId,dishName:o.dishName,reasonCode:code});
  if(!result?.ok)return false;const next=copy(state),row=next.orders.find(q=>q.id===o.id);row.reviews.push({id,code,corrected:false});if(!persist(next))return false;
  notify(`👎 ${o.customerName}：${code==='dirty-table'?`这张${seatName(o)}还脏着，就让我坐下用饭。`:code==='wrong-table'?`我坐${seatName(o)}，这份饭却送到${seatName(table)}了。`:`我点的是${o.dishName}，送来的却是${dish.dishName}。`}请取回更正`);return true;
 }
 function correctReviews(o){for(const r of o.reviews.filter(r=>!r.corrected&&r.code!=='dirty-table')){
   const result=onReview({roleId:state.roleId,receiptId:state.receiptId,reviewId:r.id+'-corrected',customerId:o.customerId,customerName:o.customerName,tableId:o.tableId,tableName:seatName(o),dishId:o.dishId,dishName:o.dishName,reasonCode:'corrected',correctedReviewId:r.id});if(!result?.ok)return false;
  }return true;
 }
 function deliver(target){const ticket=order(state.selectedOrderId),tray=order(state.heldTrayId);if(!ticket||!tray||!target||!nearPlayer(target.servePoint))return false;
  const code=target.id!==ticket.id?'wrong-table':tray.dishId!==ticket.dishId?'wrong-dish':null;
  if(code&&!review(ticket,code,target,tray))return false;if(!code&&!correctReviews(ticket))return false;
  const next=copy(state),t=next.orders.find(o=>o.id===tray.id),intended=next.orders.find(o=>o.id===ticket.id);
  Object.assign(t,{stage:code?'wrong':'eating',holder:'table',placedTableId:target.tableId,placedMealPoint:target.mealPoint.slice(),deliveryTicketId:ticket.id});
  if(!code){for(const r of intended.reviews)if(r.code!=='dirty-table')r.corrected=true;next.selectedOrderId=null;next.completedTasks++;}
  next.heldTrayId=null;if(!persist(next))return false;record(code||'delivered',{orderId:ticket.id,trayId:tray.id,tableId:target.tableId});return true;
 }
 function pickup(o){if(state.heldTrayId||o.stage!=='pass'||!nearPlayer(P.hostPass))return false;const next=copy(state);next.heldTrayId=o.id;next.orders.find(q=>q.id===o.id).stage='carrying';next.orders.find(q=>q.id===o.id).holder='assistant';return persist(next);}
 function retrieve(o){const table=state.orders.find(q=>q.tableId===o.placedTableId);if(state.heldTrayId||o.stage!=='wrong'||!nearPlayer(table.servePoint))return false;
  const next=copy(state),row=next.orders.find(q=>q.id===o.id);next.heldTrayId=o.id;row.stage='carrying';row.holder='assistant';delete row.placedTableId;delete row.placedMealPoint;return persist(next);}
 function returnTray(){if(!nearPlayer(P.hostPass))return false;const tray=order(state.heldTrayId);if(!tray||tray.stage!=='carrying')return false;const next=copy(state),row=next.orders.find(q=>q.id===tray.id);row.stage='pass';row.holder='pass';next.heldTrayId=null;return persist(next);}
 function clear(o){if(o.stage!=='dirty')return false;return stage(o,'return',{holder:'assistant'});}
 function describe(kind,o,position,label,extra={}){return {kind,orderId:o?.id||null,position:position.slice(),name:'云来酒楼 · 当班',action:label,executionRadius:.23,...extra};}
 function choices(){
  if(!state||state.stage==='finished')return [];
  const r=role(),h=HANDOVER[r];if(state.stage==='handover-in')return [describe('handover-in',null,h.player,`与${staff[r].station.npcName}当面接班`)];
  if(state.stage==='handover-out')return [describe('handover-out',null,h.player,`向${staff[r].station.npcName}交还岗位`)];
  if(activity)return [];
  if(r==='host')return [...state.orders.filter(o=>['requested','ordered'].includes(o.stage)).map(o=>describe(o.stage==='requested'?'take-order':'collect',o,o.servePoint,o.stage==='requested'?`听${o.customerName}点菜 · ${seatName(o)}`:`收取${o.price}铜文 · 记入酒楼账`)),
    ...state.visitors.filter(v=>v.mode==='lodging-wait').flatMap(v=>state.rooms.filter(room=>!room.dirty&&!room.guestId).map(room=>describe('rent-room',null,P.host,`为${guests.find(n=>n.station.id===v.id).station.npcName}登记${room.name} · 收12铜文`,{position:[22.35,.215,11.7],guestId:v.id,roomId:room.id})))];
  if(r==='chef'){const held=state.orders.find(o=>o.stage==='cooked');if(held)return [describe('pass',held,P.cookPass,`把${held.dishName}放上传菜台`)];return state.orders.filter(o=>['paid','prepared'].includes(o.stage)).map(o=>describe(o.stage==='paid'?'prep':'heat',o,o.stage==='paid'?P.prep:P.stove,`${o.stage==='paid'?'切配':'烹调'}${o.dishName} · ${seatName(o)}`));}
  const held=order(state.heldTrayId);if(held)return [...state.orders.filter(o=>state.visitors.some(v=>v.orderId===o.id&&v.mode==='dining')).map(o=>describe('deliver',o,o.servePoint,`送到${seatName(o)} · ${o.customerName}`)),describe('return-tray',held,P.hostPass,'把当前餐盘退回传菜台')];
  const returning=state.orders.find(o=>o.stage==='return');if(returning)return [describe('wash',returning,P.wash,`清洗${seatName(returning)}餐具`)];
  const wrong=state.orders.find(o=>o.stage==='wrong');if(wrong)return [describe('retrieve',wrong,state.orders.find(q=>q.tableId===wrong.placedTableId).servePoint,`取回送错的${wrong.dishName}`)];
  const ticket=order(state.selectedOrderId);if(ticket)return state.orders.filter(o=>o.stage==='pass').map(o=>describe('pickup',o,P.hostPass,`端起${o.dishName}餐盘`,{ticketId:ticket.id}));
  return [...state.orders.filter(o=>o.stage==='wrong').map(o=>describe('retrieve',o,state.orders.find(q=>q.tableId===o.placedTableId).servePoint,`取回送错的${o.dishName}`)),
    ...state.orders.filter(o=>o.stage==='pass').map(o=>describe('choose-order',o,P.hostPass,`查看${seatName(o)}客单 · ${o.dishName}`)),
    ...state.orders.filter(o=>o.stage==='dirty').map(o=>describe('clear',o,o.servePoint,`收起${seatName(o)}餐具`)),
    ...state.tables.filter(table=>table.dirty).map(table=>{const o=state.orders.find(o=>o.tableId===table.id);return describe('clean-table',o,o.servePoint,`擦净${seatName(o)} · 5秒`,{tableId:table.id});}),
    ...state.rooms.filter(room=>room.dirty&&!room.guestId).map(room=>{const bed=furniture.items.find(i=>i.id===room.bedId);return describe('clean-room',null,bed.position,`打扫二层${room.name} · 5秒`,{roomId:room.id});})];
 }

 function execute(choice){const current=choices().find(c=>c.kind===choice.kind&&c.orderId===choice.orderId&&c.roomId===choice.roomId&&c.guestId===choice.guestId);if(!current||!nearPlayer(current.position))return false;const o=order(current.orderId);
  if(current.kind==='handover-in')return handoverIn();if(current.kind==='handover-out')return handoverOut();if(current.kind==='end-shift')return beginReturn();
  if(current.kind==='rent-room'){const room=state.rooms.find(r=>r.id===current.roomId),v=state.visitors.find(v=>v.id===current.guestId);return rentRoom(v,room,true);}
  if(current.kind==='choose-order')return persist({...copy(state),selectedOrderId:o.id});if(current.kind==='pickup')return pickup(o);if(current.kind==='deliver')return deliver(o);if(current.kind==='retrieve')return retrieve(o);if(current.kind==='return-tray')return returnTray();
  const durations={'take-order':1.3,collect:1.1,prep:3.2,heat:4.2,pass:1.1,clear:1.1,wash:2.8,'clean-table':5,'clean-room':5};
  if(!durations[current.kind])return false;activity={...current,elapsed:0,duration:durations[current.kind],origin:getPlayer().root.position.toArray()};return true;
 }
 function finishActivity(a){const o=order(a.orderId);let result=false;
  if(a.kind==='clean-table')result=changeWorld(next=>{next.tables.find(t=>t.id===a.tableId).dirty=false;});
  else if(a.kind==='clean-room')result=changeWorld(next=>{next.rooms.find(r=>r.id===a.roomId).dirty=false;});
  else if(!o)return false;
  else if(a.kind==='take-order')result=stage(o,'ordered');else if(a.kind==='collect')result=collect(o);else if(a.kind==='prep')result=stage(o,'prepared');else if(a.kind==='heat')result=stage(o,'cooked',{mealId:o.id+'-dish',holder:'cook'});else if(a.kind==='pass')result=stage(o,'pass',{holder:'pass'});
  else if(a.kind==='clear')result=clear(o);else if(a.kind==='wash')result=stage(o,'done',{holder:null,portionsRemaining:0});
  if(result)changeWorld(next=>next.completedTasks++);return result;
 }
 function rentRoom(v,room,player=false){const n=guests.find(n=>n.station.id===v?.id);if(!v||!room||room.dirty||room.guestId||v.mode!=='lodging-wait'||!at(n,[22.35,.215,11.7],.3))return false;
  const result=changeWorld(next=>{const visitor=next.visitors.find(q=>q.id===v.id),r=next.rooms.find(q=>q.id===room.id);r.guestId=v.id;visitor.mode='lodging';visitor.roomId=room.id;next.till+=room.price;if(player)next.completedTasks++;});
  if(result)record('lodging-payment',{customerId:v.id,roomId:room.id,amount:room.price,to:'tavern-till'});return result;
 }
 function updateVisitors(dt){
  for(const v0 of [...state.visitors]){const v=state.visitors.find(q=>q.id===v0.id),n=guests.find(n=>n.station.id===v.id),o=order(v.orderId);
   if(v.mode==='dining'){
    if(!n.serviceMount){const table=state.tables.find(t=>t.id===o.tableId);if(table.dirty&&playerOwns('assistant')&&!review(o,'dirty-table',o,o))continue;}
    if(!mount(o,dt))continue;if(o.stage==='arriving')stage(o,'requested');
    if(o.stage==='eating'){effect(n,'meal');tick(o,dt,5.5,()=>changeWorld(next=>{const row=next.orders.find(q=>q.id===o.id);row.stage='dirty';row.portionsRemaining=0;next.tables.find(t=>t.id===o.tableId).dirty=true;next.visitors.find(q=>q.id===v.id).mode=v.visits%2?'lodging-wait':'leaving';}));}
   }else if(v.mode==='lodging-wait'){
    if(n.serviceMount&&!unmount(n))continue;travel(n,[22.35,.215,11.7],dt);
   }else if(v.mode==='lodging'){
    const room=state.rooms.find(r=>r.id===v.roomId),bed=furniture.items.find(i=>i.id===room.bedId);
    if(!n.serviceMount){if(!furniture.facilities.reserve(bed.id,v.id,{purpose:'lodging'})||!travel(n,bed.position,dt))continue;if(!furniture.facilities.occupy(bed.id,v.id))continue;n.root.position.set(...bed.anchor);n.root.rotation.y=bed.yaw;n.serviceMount=bed;record('guest-entered-room',{customerId:v.id,roomId:room.id});}
    tick({id:'room-'+v.id},dt,18,()=>{if(!unmount(n))return false;return changeWorld(next=>{const r=next.rooms.find(r=>r.id===room.id);r.dirty=true;r.guestId=null;next.visitors.find(q=>q.id===v.id).mode='leaving';});});
   }else if(v.mode==='leaving'){if(n.serviceMount&&!unmount(n))continue;if(travel(n,n.station.npcPosition,dt))changeWorld(next=>{next.visitors.find(q=>q.id===v.id).mode='idle';});}
   else if(v.mode==='idle'&&state.stage==='working'){
    const unfinished=state.orders.filter(o=>o.stage!=='done');if(unfinished.length>=4)continue;
    tick({id:'arrival-'+v.id},dt,7,()=>{const next=copy(state),fresh=makeOrders(state.receiptId,next.serial)[guests.indexOf(n)];fresh.number=++next.serial;fresh.id='cn-tavern-order-'+fresh.number;next.orders=next.orders.filter(o=>o.stage!=='done');next.orders.push(fresh);const visitor=next.visitors.find(q=>q.id===v.id);Object.assign(visitor,{mode:'dining',orderId:fresh.id,visits:visitor.visits+1,roomId:null});return persist(next);});
   }
  }
 }
 function unmount(n){if(!n.serviceMount)return true;const safety=npcs.filter(other=>other!==n).map(other=>({minX:other.root.position.x-.25,maxX:other.root.position.x+.25,minZ:other.root.position.z-.25,maxZ:other.root.position.z+.25,minY:other.root.position.y,maxY:other.root.position.y+1.95}));const landing=furniture.standPoint(navigation,safety,n.serviceMount);if(!landing)return false;n.root.position.copy(landing);n.serviceMount=null;furniture.releaseActor(n.station.id);return true;}

 function playerEffect(){if(!state||!playerOwns(role()))return null;const r=role(),held=state.orders.find(o=>o.holder===(r==='chef'?'cook':'assistant')&&['cooked','carrying','return'].includes(o.stage));const a=activity;
  return {handoff:!!held,archery:held?{hands:[[-.16,1.18,.43],[.16,1.18,.43]]}:null,heldProp:null,action:a?['prep','heat'].includes(a.kind)?a.kind==='prep'?'cook':'herb-mix':['clean-table','clean-room','wash'].includes(a.kind)?'tidy':null:null,station:a?{position:a.position,playerWorkTarget:a.kind==='prep'?P.prepTop:a.kind==='heat'?P.stoveTop:a.kind==='wash'?P.washTop:order(a.orderId)?.mealPoint||a.position.map((v,i)=>i===1?v+.7:v)}:null};
 }
 function update(dt,t,{conversationActorId=null}={}){
  if(disposed)return;time+=Math.max(0,dt);conversation=conversationActorId;effects.clear();for(const n of guests){if(n)n.walking=false;}
  if(!state){for(const n of guests)if(n){travel(n,n.station.npcPosition,dt);pose(n,t);}return;}
  for(const n of actors)n.walking=false;
  const r=state.stage==='finished'?null:role(),h=r?HANDOVER[r]:null,working=state.stage!=='handover-in';
  if(!working){for(const [key,n]of Object.entries(staff))travel(n,key===r?h.npc:key==='host'?P.host:key==='chef'?P.prep:P.assistant,dt);}
  else{
   if(r)travel(staff[r],state.stage==='handover-out'?h.npc:h.rest,dt);
   updateVisitors(dt);
   if(r!=='host'){const o=state.orders.find(o=>['requested','ordered'].includes(o.stage)&&guests[o.guestIndex].serviceMount);
    if(o){effect(host,null,o.seatAnchor);if(travel(host,o.servePoint,dt))tick(o,dt,1.3,()=>o.stage==='requested'?stage(o,'ordered'):collect(o));}
    else{travel(host,P.host,dt);const v=state.visitors.find(v=>v.mode==='lodging-wait'),room=state.rooms.find(r=>!r.dirty&&!r.guestId);if(v&&room&&at(host,P.host,.15))rentRoom(v,room);}}
   if(r!=='chef'){const o=state.orders.find(o=>['preparing','prepared','heating','cooked'].includes(o.stage))||state.orders.find(o=>o.stage==='paid');if(!o)travel(chef,P.prep,dt);
    else if(['paid','preparing'].includes(o.stage)){effect(chef,'cook',P.prepTop);if(travel(chef,P.prep,dt))tick(o,dt,3.2,()=>stage(o,'prepared'));}
    else if(['prepared','heating'].includes(o.stage)){effect(chef,'herb-mix',P.stoveTop);if(travel(chef,P.stove,dt))tick(o,dt,4.2,()=>stage(o,'cooked',{mealId:o.id+'-dish',holder:'cook'}));}
    else{effect(chef,null,P.passTop,true);if(travel(chef,P.cookPass,dt))tick(o,dt,1.1,()=>stage(o,'pass',{holder:'pass'}));}}
   if(r!=='assistant'){const o=state.orders.find(o=>['carrying','return','wrong'].includes(o.stage))||state.orders.find(o=>o.stage==='pass')||state.orders.find(o=>o.stage==='dirty');
    if(o){
     if(o.stage==='pass'){effect(assistant,null,o.passPoint);if(travel(assistant,P.hostPass,dt))tick(o,dt,1.1,()=>stage(o,'carrying',{holder:'assistant'}));}
     else if(o.stage==='carrying'){effect(assistant,null,o.mealPoint,true);if(travel(assistant,o.servePoint,dt))tick(o,dt,1.1,()=>stage(o,'eating',{holder:'table'}));}
     else if(o.stage==='wrong'){const point=state.orders.find(q=>q.tableId===o.placedTableId).servePoint;effect(assistant,null,o.placedMealPoint);if(travel(assistant,point,dt))tick(o,dt,1.1,()=>stage(o,'carrying',{holder:'assistant',placedMealPoint:null}));}
     else if(o.stage==='dirty'){effect(assistant,'tidy',o.mealPoint);if(travel(assistant,o.servePoint,dt))tick(o,dt,1.1,()=>clear(o));}
     else{effect(assistant,'tidy',P.washTop,true);if(travel(assistant,P.wash,dt))tick(o,dt,2.8,()=>stage(o,'done',{holder:null}));}
    }else{
     const table=state.tables.find(t=>t.dirty),room=state.rooms.find(r=>r.dirty&&!r.guestId),last=table&&state.orders.find(o=>o.tableId===table.id),bed=room&&furniture.items.find(i=>i.id===room.bedId);
     if(last){effect(assistant,'tidy',last.mealPoint);if(travel(assistant,last.servePoint,dt))tick({id:'clean-'+table.id},dt,5,()=>changeWorld(next=>{next.tables.find(t=>t.id===table.id).dirty=false;}));}
     else if(bed){effect(assistant,'tidy',[bed.position[0],bed.position[1]+.7,bed.position[2]]);if(travel(assistant,bed.position,dt))tick({id:'clean-room-'+room.id},dt,5,()=>changeWorld(next=>{next.rooms.find(r=>r.id===room.id).dirty=false;}));}
     else travel(assistant,P.assistant,dt);
    }}
   if(activity){const a=activity;if(getMounted()||getPlayer().walking||!at(getPlayer(),a.origin,.03)){activity=null;notify('已停下当前动作；回到原处可继续');}else{a.elapsed+=Math.min(.1,Math.max(0,dt));if(a.elapsed>=a.duration&&finishActivity(a))activity=null;}}
  }
  for(const n of actors)pose(n,t);
  for(const o of state.orders){let prop=props.get(o.id);if(!prop){prop=propsFactory(lot.group);props.set(o.id,prop);}if(o.stage==='done'){prop.clear();continue;}
   const display={...o,stage:o.stage==='eating'?'eating':o.stage==='paid'&&effects.get(chef)?.action==='cook'?'preparing':o.stage,mealPoint:o.placedMealPoint||o.mealPoint};
   prop.update(display,{host,assistant:actor('assistant'),cook:actor('chef'),player:guests[o.guestIndex]},0);
  }
 }
 function release(){activity=null;for(const n of guests){if(n?.serviceMount){const seat=n.serviceMount;n.root.position.set(...seat.position);n.serviceMount=null;}if(n)furniture.releaseActor(n.station.id);}for(const p of props.values())p.dispose();props.clear();state=null;paths.clear();}
 return {start,restoreWorld,choices,execute,update,release,beginReturn,stopActivity(){activity=null;},active:()=>!!state&&(state.stage!=='finished'||!settled()),finished:()=>state?.stage==='finished',owns:n=>guests.includes(n)||!!state&&(state.stage!=='finished'||!settled())&&actors.includes(n),
  playerPose:playerEffect,playerAction:()=>playerEffect()?.action||null,playerStation:()=>playerEffect()?.station||null,
  snapshot:()=>state?copy(state):null,state:()=>({...(state?copy(state):{}),activity:activity?copy(activity):null,history:copy(history),failures:copy(failures),orders:state?.orders.map(o=>({...copy(o),label:steps[o.stage],props:props.get(o.id)?.state()||null}))||[],actors:actors.map(n=>({id:n.station.id,position:n.root.position.toArray(),mounted:n.serviceMount?.id||null,walking:n.walking}))}),
  socialStatus:n=>actors.includes(n)?{busy:!!state,attention:!state,job:n.serviceMount?'在酒楼用餐':state?'酒楼当班交接':'在酒楼候客'}:null,
  label:()=>activity?.action||({ 'handover-in':'等待当面接班','handover-out':'等待当面交班',finished:'本轮已交班'}[state?.stage])||(state?'当班 · 查看当前客单':null),
  dispose(){if(disposed)return;release();disposed=true;}};
}
