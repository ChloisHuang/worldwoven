import {createTavernStaffLife} from './china-tavern-staff-life.js';
import {followActorRoute} from './actor-navigation.js';
import {TAVERN_MEAL as M,TAVERN_DISHES} from './china-tavern-kitchen.js';
import {createTavernMealProps,createTavernDirtProps} from './china-tavern-meal-props.js';

const copy=x=>JSON.parse(JSON.stringify(x)),P=M.points;
const ROLE={host:'cn-tavern-host',chef:'cn-tavern-chef',assistant:'cn-tavern-steward'};
const GUESTS=['cn-tavern-diner-west','cn-tavern-diner-east'];
const PASS_SLOTS=[[23.63,1.31,10.34],[24.40,1.31,10.34]];
const HANDOVER={host:{player:[22.35,.215,11.7],npc:P.host,rest:[25.1,.215,13.7]},chef:{player:[22.1,.215,14],npc:[22.9,.215,14],rest:[25.1,.215,13.7]},assistant:{player:[21.5,.215,14],npc:[22.3,.215,14],rest:[25.1,.215,13.7]}};
const distance=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2]);
const at=(n,p,r=.1)=>!!n&&distance(n,p)<=r&&Math.abs(n.root.position.y-p[1])<.4;
const seatName=o=>o.tableId==='west'?'西窗桌':'东窗桌';
const tablePlace=id=>{const x=id==='west'?18.1:23.9,inward=id==='west'?1:-1;return {tableId:id,servePoint:[x+inward*1.2,.215,17.86],mealPoint:[x+inward*.36,1.21,17.83]};};
const steps={arriving:'客人入座',requested:'等候点菜',ordered:'等候收款',paid:'已付账 · 等候备菜',preparing:'切配中',prepared:'待烹调',heating:'烹调中',cooked:'待传菜',pass:'传菜台待取',carrying:'助理送餐中',wrong:'送错待取回',eating:'客人用餐',dirty:'待收碗',return:'送回洗碗处',wash:'待清洗',clean:'擦桌中',done:'完成'};

function validWorld(w){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,ids=new Set(),stages=new Set(['arriving','awaiting-payment','requested','ordered','paid','preparing','prepared','heating','cooked','pass','carrying','wrong','ready','eating','finish-bite','dirty','return','wash','done']);
 if(!w||w.version!==1||!integer(w.serial)||!integer(w.till)||!Array.isArray(w.orders)||w.orders.length>6||!Array.isArray(w.tables)||w.tables.length!==2||!Array.isArray(w.rooms)||w.rooms.length!==2||!Array.isArray(w.visitors)||w.visitors.length!==2)return false;
 if(!['west','east'].every(id=>w.tables.filter(t=>t.id===id&&typeof t.dirty==='boolean').length===1)||!['lan','zhu'].every(id=>w.rooms.filter(r=>r.id===id&&typeof r.dirty==='boolean'&&(r.guestId===null||GUESTS.includes(r.guestId))).length===1))return false;
 for(const o of w.orders){const dish=TAVERN_DISHES.find(d=>d.id===o.dishId);if(!integer(o.number)||!o.number||o.number>w.serial||o.id!=='cn-tavern-order-'+o.number||ids.has(o.id)||!dish||!stages.has(o.stage)||!['west','east'].includes(o.tableId)||!Array.isArray(o.reviews)||typeof o.collected!=='boolean'||o.price!==dish.price||!['player',...GUESTS].includes(o.customerId))return false;ids.add(o.id);}
 return GUESTS.every(id=>w.visitors.filter(v=>v.id===id&&integer(v.copper)&&['dining','lodging-wait','lodging','leaving','idle'].includes(v.mode)&&(v.mode!=='dining'||ids.has(v.orderId))).length===1);
}

// Two stable adult visitors produce bounded meal and lodging events. Durable boundaries
// are saved before effects; the physical action timer itself is never restored.
export function createTavernServiceScene({getTenureRoleId=null,getClock=()=>({hour:10}),worldSeed=1,npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,
  saveState=()=>true,onReview=()=>({ok:true}),chargePlayer=()=>({ok:false,code:'wallet-unavailable'}),notify=()=>{},navigation=lot.navigation||{},propsFactory=createTavernMealProps,sharedNeeds=null,getToilet=()=>null,onMealReceipts=()=>{}}){
 const host=npcs.find(n=>n.station.id===M.host),chef=npcs.find(n=>n.station.id===M.cook),assistant=npcs.find(n=>n.station.id===M.assistant);
 const guests=GUESTS.map(id=>npcs.find(n=>n.station.id===id)),staff={host,chef,assistant},actors=[host,chef,assistant,...guests].filter(Boolean);
 const dirt=createTavernDirtProps(lot.group,furniture);
 const paths=new Map(),effects=new Map(),props=new Map(),phases=new Map(),history=[],failures=[];
 let state=null,activity=null,pendingChoice=null,conversation=null,time=0,disposed=false,handoverRequest=null,loadError=null,restoredWorldRevision=0;
 const role=()=>Object.keys(ROLE).find(k=>ROLE[k]===state?.roleId),activePlayer=r=>['working','handover-out'].includes(state?.stage)&&role()===r;
 const tenureOwns=r=>getTenureRoleId?getTenureRoleId()===ROLE[r]:activePlayer(r),playerOwns=r=>tenureOwns(r)&&activePlayer(r);
 const actor=r=>playerOwns(r)?getPlayer():staff[r],order=id=>state?.orders.find(o=>o.id===id);
 const idleSince=new Map();
 const life=createTavernStaffLife({actors,furniture,getPlayer,getMounted,getClock,worldSeed,travel,unmount,effect,sharedNeeds,onChanged:s=>{if(state)changeWorld(next=>{next.staffLife=s;});}});
 const nearPlayer=p=>!getMounted()&&at(getPlayer(),p,.23);
 const record=(event,data={})=>{const o=state?.orders.find(o=>o.id===data.orderId);history.push({event,time:+time.toFixed(2),mealId:o?.mealId||null,seatId:o?.seatId||null,...data});if(history.length>70)history.shift();};
 function persist(next,bump=true){try{next={...next,revision:bump?Math.max(state?.revision||0,next.revision||0)+1:next.revision||0};const result=saveState(copy(next));if(result===false||result?.then)return false;state=next;onMealReceipts(state.mealReceipts||[]);return true;}catch{return false;}}
 function changeWorld(mutator){const next=copy(state);mutator(next);return persist(next);}
 function change(id,fields){const next=copy(state),o=next.orders.find(o=>o.id===id);Object.assign(o,fields);if(!persist(next))return false;record(fields.stage||'changed',{orderId:id});return true;}
 function travel(n,p,dt){
  n.walking=false;if(at(n,p,.07)){n.route=[];return true;}if(conversation===n.station.id)return false;
  const key=p.join(',');let route=paths.get(n);if(!route||route.key!==key){route={key,retryAt:0,retries:0};paths.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+2;n.route=planPath(n.root.position,{x:p[0],y:p[1],z:p[2]},.25);if(!n.route.length&&++route.retries===3){failures.push({actorId:n.station.id,target:p.slice(),position:n.root.position.toArray(),reason:'empty-route'});if(failures.length>10)failures.shift();}}
  followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.78,arrivalTolerance:.035});return at(n,p,.07);
 }
 function stage(o,next,fields={}){phases.delete(o.id);const changed=change(o.id,{stage:next,...fields});if(changed){const event={ordered:'accepted-at-table',paid:'cook-received-order',cooked:'dish-prepared',pass:'dish-on-pass',carrying:'tray-received',ready:'delivered',eating:'delivered',dirty:'eaten',return:'table-cleared',done:o.mealId?'washed':'cancelled-before-cooking'}[next];if(event&&!(next==='eating'&&o.stage==='ready'))record(event,{orderId:o.id,mealId:fields.mealId||o.mealId});}return changed;}
 // Persist a completed supply receipt with the physical order before relief.
 // Cancelled/partial meals never reach this boundary. Only one receipt per
 // customer is retained, so old order cleanup cannot erase an unapplied meal.
 function consume(o,nextStage,fields={}){
  if(!o||o.cancelled||!o.mealId||o.mealId!==o.id+'-dish'||(o.customerId==='player'?o.payment!=='settled':!o.collected))return false;
  const next=copy(state),row=next.orders.find(q=>q.id===o.id),receipt={source:'china-tavern-meal',id:o.id+'-consumed',number:o.number,actorId:o.customerId,orderId:o.id,mealId:o.mealId,dishId:o.dishId,paymentReceipt:o.id,completed:true};
  Object.assign(row,{stage:nextStage,portionsRemaining:0,consumed:true,...fields});next.mealReceipts=[...(next.mealReceipts||[]).filter(r=>r.actorId!==o.customerId),receipt];
  if(nextStage==='dirty'){markDirty(next,o.tableId);const visitor=next.visitors.find(v=>v.id===o.customerId);if(visitor)visitor.mode=visitor.visits%2&&(visitor.copper??0)>=12?'lodging-wait':'leaving';}
  if(!persist(next))return false;record('consumed',{orderId:o.id,receiptId:receipt.id});return true;
 }
 function tick(o,dt,seconds,done){const elapsed=(phases.get(o.id)||0)+Math.min(.1,Math.max(0,dt));phases.set(o.id,elapsed);if(elapsed>=seconds&&done())phases.delete(o.id);}
 function effect(n,action,target,carry=false){effects.set(n,{action,target,carry});}
 function pose(n,t){const e=effects.get(n)||{},c=poseContext(n,e.target?{workTarget:e.target}:null);c.heldProp=null;c.handoff=!!e.carry;c.archery=e.carry?{hands:[[-.16,1.18,.43],[.16,1.18,.43]]}:null;c.seatedMeal=false;
  if(e.target&&!n.walking)n.root.rotation.y=Math.atan2(e.target[0]-n.root.position.x,e.target[2]-n.root.position.z);
  if(n.serviceMount){c.seatHeight=Number.isFinite(n.serviceMount.seatY)?n.serviceMount.seatY-n.root.position.y-(c.visualFloorOffset||0):undefined;c.seatedMeal=e.action==='meal';c.handoff=c.seatedMeal;c.archery=null;c.supportY=n.serviceMount.supportY;c.lieOffset=n.serviceMount.lieOffset;c.lieSupport=n.serviceMount.lieSupport;}
  n.animate(t+n.phase,n.walking,n.serviceMount?n.serviceMount.kind==='bed'?'lie-rest':'chair-sit':e.action||null,c);
 }
 function mount(o,dt){const n=guests[o.guestIndex];let seat=furniture.items.find(i=>i.id===o.seatId);if(!seat)return false;
  if(n.serviceMount){
   if(n.serviceMount.id===seat.id&&at(n,seat.anchor,.35)){
    if(getMounted()?.id!==seat.id&&furniture.facilities.reserve(seat.id,n.station.id,{purpose:'tavern-meal'})&&furniture.facilities.occupy(seat.id,n.station.id))return true;
    if(!unmount(n))return false;
   }else if(at(n,n.serviceMount.anchor,.35)){if(!unmount(n))return false;}
   else{n.serviceMount=null;furniture.releaseActor(n.station.id);}
  }
  let reserved=getMounted()?.id!==seat.id&&furniture.facilities.reserve(seat.id,n.station.id,{purpose:'tavern-meal'});
  if(!reserved){
   const alternatives=furniture.items.filter(s=>s.id.startsWith('china-tavern-dining-')&&s.id!==seat.id&&(s.center[0]<21?'west':'east')===o.tableId&&getMounted()?.id!==s.id);
   for(const candidate of alternatives){
    const hold=furniture.facilities.reserve(candidate.id,n.station.id,{purpose:'tavern-meal'});
    if(!hold){furniture.facilities.release?.(candidate.id,n.station.id);continue;}
    const inward=o.tableId==='west'?1:-1,side=candidate.center[2]<18.1?-1:1;
    if(!change(o.id,{seatId:candidate.id,seatAnchor:candidate.anchor.slice(),servePoint:[candidate.center[0]+inward*1.2,.215,18.1+side*.24],mealPoint:[candidate.center[0]+inward*.36,1.21,18.1+side*.27]})){furniture.facilities.release?.(candidate.id,n.station.id);return false;}
    furniture.facilities.release?.(seat.id,n.station.id);seat=candidate;o=order(o.id);reserved=hold;record('seat-reassigned',{orderId:o.id,seatId:seat.id});break;
   }
  }
  if(!reserved)return false;
  if(!travel(n,seat.position,dt))return false;const table=state.tables.find(t=>t.id===o.tableId);if(!o.seatVisitStarted){if(table.dirty&&!dirtyUse(o,table))return false;if(!change(o.id,{seatVisitStarted:true}))return false;}if(!furniture.facilities.occupy(seat.id,n.station.id))return false;n.root.position.set(...seat.anchor);n.root.rotation.y=seat.yaw;n.serviceMount=seat;record('guest-seated',{customerId:n.station.id,seatId:seat.id});return true;
 }
 let nextSeatReconcile=0;
 function reconcileDiningSeats(){if(time<nextSeatReconcile)return;nextSeatReconcile=time+1;
  for(const f of furniture.facilities.state?.()||[]){if(!f.id.startsWith('china-tavern-dining-'))continue;
   if(f.player&&getMounted()?.id!==f.id)furniture.facilities.prioritize?.(f.id,false);
   for(const id of new Set([...(f.queue||[]),...(f.reservations||[]).map(r=>r.actor)])){
    const n=npcs.find(n=>n.station.id===id),v=state.visitors.find(v=>v.id===id),o=v&&order(v.orderId);
    const valid=id==='player'?getMounted()?.id===f.id:n?.serviceMount?.id===f.id||v?.mode==='dining'&&o?.seatId===f.id||life.claimsSeat(id,f.id);
    if(!valid&&(id==='player'||actors.includes(n)))furniture.facilities.release?.(f.id,id);
   }
  }
 }


 function makeOrders(receiptId,offset=0){return guests.map((n,index)=>{
  const tableId=index?'east':'west',x=index?23.9:18.1,seat=furniture.items.find(s=>s.id===`china-tavern-dining-${x}--1`),dish=TAVERN_DISHES[index],inward=index?-1:1;
  return {id:`cn-tavern-order-${offset+index+1}`,number:offset+index+1,guestIndex:index,customerId:n.station.id,customerName:n.station.npcName,tableId,seatId:seat.id,seatAnchor:seat.anchor.slice(),servePoint:[x+inward*1.2,.215,17.86],mealPoint:[x+inward*.36,1.21,17.83],passPoint:PASS_SLOTS[index].slice(),dishId:dish.id,dishName:dish.name,price:dish.price,customerCopper:30,stage:'arriving',mealId:null,holder:null,collected:false,reviews:[],cleaned:false};
 });}
 function start({roleId,receiptId,snapshot=null}){
  if(loadError)return false;if(snapshot&&!validWorld(snapshot)){loadError='invalid-tavern-world';notify('酒楼现场记录暂时无法核对，请保留当前存档');return false;}
  if(state&&state.stage!=='finished'||!Object.values(ROLE).includes(roleId)||guests.some(n=>!n))return false;
  let next=snapshot?copy(snapshot):state?copy(state):null;
  if(!next){const orders=makeOrders(receiptId);next={version:1,serial:2,orders,till:0,
    tables:[{id:'west',dirty:false},{id:'east',dirty:false}],rooms:['lan','zhu'].map((id,index)=>({id,name:index?'竹房':'兰房',price:12,dirty:false,guestId:null,bedId:'china-tavern-bed-'+id})),
    visitors:guests.map((n,i)=>({id:n.station.id,mode:'dining',orderId:orders[i].id,visits:1,roomId:null,copper:30}))};}
  Object.assign(next,{roleId,receiptId,stage:'handover-in',selectedOrderId:null,heldTrayId:null,completedTasks:snapshot?.receiptId===receiptId?snapshot.completedTasks||0:0});
  // Restored scene identities/dirty flags survive. Only unfinished hand-held
  // props return to their real pass; money and review receipts never replay.
  if(snapshot){for(const o of next.orders){if(['preparing','heating'].includes(o.stage))o.stage=o.stage==='preparing'?'paid':'prepared';if(['cooked','carrying'].includes(o.stage)){o.stage='pass';o.holder='pass';delete o.placedTableId;delete o.placedMealPoint;}if(o.stage==='return'){o.stage='dirty';o.holder='table';}}}
  if(!persist(next,!snapshot))return false;for(const n of actors)n.route=[];record('shift-created',{roleId,receiptId});return true;
 }
 function initializeWorld(){if(loadError)return false;if(state)return true;const orders=makeOrders('world');return persist({version:1,serial:2,roleId:null,receiptId:null,stage:'finished',selectedOrderId:null,heldTrayId:null,completedTasks:0,orders,till:0,tables:[{id:'west',dirty:false},{id:'east',dirty:false}],rooms:['lan','zhu'].map((id,index)=>({id,name:index?'竹房':'兰房',price:12,dirty:false,guestId:null,bedId:'china-tavern-bed-'+id})),visitors:guests.map((n,i)=>({id:n.station.id,mode:'dining',orderId:orders[i].id,visits:1,roomId:null,copper:30}))});}
 function restoreWorld(snapshot){if(!snapshot)return false;if(!validWorld(snapshot)){loadError='invalid-tavern-world';notify('酒楼现场记录暂时无法核对，请保留当前存档');return false;}restoredWorldRevision=snapshot.revision||0;const next=copy(snapshot);next.stage='finished';next.heldTrayId=null;next.selectedOrderId=null;
  for(const o of next.orders){if(['carrying','cooked'].includes(o.stage)){o.stage='pass';o.holder='pass';delete o.placedMealPoint;}if(o.stage==='return'){o.stage='dirty';o.holder='table';}}
  const result=persist(next,false);if(result&&next.staffLife)life.restore(next.staffLife);return result;
 }

 const safeHandover=r=>r==='assistant'?!state.orders.some(o=>o.holder==='assistant'&&['carrying','return','wrong'].includes(o.stage)):r==='chef'?!state.orders.some(o=>o.holder==='cook'):true;
 function handoverIn(){const r=role(),h=HANDOVER[r];if(state?.stage!=='handover-in'||!safeHandover(r)||!nearPlayer(h.player)||!at(staff[r],h.npc,.15))return false;
  if(!persist({...copy(state),stage:'working'}))return false;record('handover-in',{role:r,from:staff[r].station.id,to:'player'});notify('物品已交接，今天开始计入在岗工时。岗位一直由你独任');return true;}

 function handoverOut(){const r=role(),h=HANDOVER[r];if(state?.stage!=='handover-out'||!nearPlayer(h.player)||!at(staff[r],h.npc,.15)||state.heldTrayId)return false;
  if(!persist({...copy(state),stage:'finished'}))return false;record('handover-out',{role:r,from:'player',to:'storage',holderId:tenureOwns(r)?'player':staff[r].station.id});return true;}
 function beginReturn(){if(state?.stage!=='working'||state.heldTrayId||state.orders.some(o=>o.holder===(role()==='chef'?'cook':'assistant')&&['cooked','return'].includes(o.stage)))return false;activity=null;pendingChoice=null;return persist({...copy(state),stage:'handover-out'});}
 function collect(o){if(o.stage!=='ordered'||o.collected)return false;const next=copy(state),row=next.orders.find(q=>q.id===o.id),visitor=next.visitors.find(v=>v.id===o.customerId);if(visitor&&(visitor.copper??0)<o.price)return false;if(visitor)visitor.copper-=o.price;Object.assign(row,{collected:true,customerCopper:visitor?.copper??0,stage:'paid'});if(visitor)next.till+=row.price;if(!persist(next))return false;record(visitor?'customer-payment':'player-payment-held',{orderId:o.id,amount:o.price,to:visitor?'tavern-till':'wallet-reservation',from:o.customerId});record('cook-received-order',{orderId:o.id});return true;}
 function markDirty(next,tableId){const table=next.tables.find(t=>t.id===tableId);table.dirty=true;table.dirtyVersion=(table.dirtyVersion||0)+1;table.responsibility=tenureOwns('assistant')?{actorId:'player',roleId:ROLE.assistant,receiptId:playerOwns('assistant')?state.receiptId:null}:{actorId:M.assistant,roleId:ROLE.assistant,receiptId:null};}
 function dirtyUse(o,table){
  if(o.dirtyUse)return true;
  const id=`cn-tavern-table-use-${o.number}-${table.id}-${table.dirtyVersion||0}`,owner=table.responsibility||{actorId:M.assistant,roleId:ROLE.assistant,receiptId:null};
  const fact={id,customerId:o.customerId,customerName:o.customerName,orderId:o.id,tableId:o.tableId,dirtyVersion:table.dirtyVersion||0,reasonCode:'dirty-table',responsibility:copy(owner),evaluated:true};
  const personal=owner.actorId==='player'&&owner.receiptId===state.receiptId&&playerOwns('assistant');
  if(personal){const result=onReview({roleId:owner.roleId,receiptId:owner.receiptId,reviewId:id,customerId:o.customerId,customerName:o.customerName,tableId:o.tableId,tableName:seatName(o),dishId:o.dishId,dishName:o.dishName,reasonCode:'dirty-table'});if(!result?.ok)return false;}
  const next=copy(state),row=next.orders.find(q=>q.id===o.id);row.dirtyUse=fact;next.serviceReviews=[...(next.serviceReviews||[]),fact].slice(-40);if(!persist(next))return false;
  record('dirty-table-used',{orderId:o.id,eventId:id,responsibility:owner.actorId});notify(`👎 ${o.customerName}：${seatName(o)}还留着上一位客人的污渍。${personal?'已记入你当班的服务评价':'已记入酒楼服务记录'}`);return true;
 }
 function review(o,code,table,dish){const id=`cn-tavern-delivery-${o.number}-${code}`;if(o.reviews.some(r=>r.id===id))return true;
  const result=onReview({roleId:state.roleId,receiptId:state.receiptId,reviewId:id,customerId:o.customerId,customerName:o.customerName,tableId:o.tableId,tableName:seatName(o),dishId:o.dishId,dishName:o.dishName,reasonCode:code});
  if(!result?.ok)return false;const next=copy(state),row=next.orders.find(q=>q.id===o.id);row.reviews.push({id,code,corrected:false,responsibility:{actorId:'player',roleId:state.roleId,receiptId:state.receiptId}});if(!persist(next))return false;
  notify(`👎 ${o.customerName}：${code==='dirty-table'?`这张${seatName(o)}还脏着，就让我坐下用饭。`:code==='wrong-table'?`我坐${seatName(o)}，这份饭却送到${seatName(table)}了。`:`我点的是${o.dishName}，送来的却是${dish.dishName}。`}请取回更正`);return true;
 }
 function correctReviews(o){for(const r of o.reviews.filter(r=>!r.corrected&&r.code!=='dirty-table')){
   if(r.responsibility&&r.responsibility.receiptId!==state.receiptId)continue;
   const result=onReview({roleId:state.roleId,receiptId:state.receiptId,reviewId:r.id+'-corrected',customerId:o.customerId,customerName:o.customerName,tableId:o.tableId,tableName:seatName(o),dishId:o.dishId,dishName:o.dishName,reasonCode:'corrected',correctedReviewId:r.id});if(!result?.ok)return false;
  }return true;
 }
 function deliver(target){const ticket=order(state.selectedOrderId),tray=order(state.heldTrayId);if(!ticket||!tray||!target||!nearPlayer(target.servePoint)||!customerSeated(ticket))return false;
  const code=target.id!==ticket.id?'wrong-table':tray.dishId!==ticket.dishId?'wrong-dish':null;
  if(code&&!review(ticket,code,target,tray))return false;if(!code&&!correctReviews(ticket))return false;
  const next=copy(state),t=next.orders.find(o=>o.id===tray.id),intended=next.orders.find(o=>o.id===ticket.id);
  Object.assign(t,{stage:code?'wrong':ticket.customerId==='player'?'ready':'eating',holder:'table',placedTableId:target.tableId,placedMealPoint:target.mealPoint.slice(),deliveryTicketId:ticket.id});
  if(!code){for(const r of intended.reviews)if(r.code!=='dirty-table')r.corrected=true;next.selectedOrderId=null;next.completedTasks++;}
  next.heldTrayId=null;if(!persist(next))return false;record(code||'delivered',{orderId:ticket.id,trayId:tray.id,tableId:target.tableId});return true;
 }
 function pickup(o){if(state.heldTrayId||o.stage!=='pass'||!nearPlayer(P.hostPass))return false;const next=copy(state);next.heldTrayId=o.id;next.orders.find(q=>q.id===o.id).stage='carrying';next.orders.find(q=>q.id===o.id).holder='assistant';return persist(next);}
 function retrieve(o){const table=state.orders.find(q=>q.tableId===o.placedTableId);if(state.heldTrayId||o.stage!=='wrong'||!nearPlayer(table.servePoint))return false;
  const next=copy(state),row=next.orders.find(q=>q.id===o.id);next.heldTrayId=o.id;next.selectedOrderId=o.deliveryTicketId||next.selectedOrderId;row.stage='carrying';row.holder='assistant';delete row.placedTableId;delete row.placedMealPoint;return persist(next);}
 function returnTray(){if(!nearPlayer(P.hostPass))return false;const tray=order(state.heldTrayId);if(!tray||tray.stage!=='carrying')return false;const next=copy(state),row=next.orders.find(q=>q.id===tray.id);row.stage='pass';row.holder='pass';next.heldTrayId=null;return persist(next);}
 function clear(o){if(o.stage!=='dirty')return false;return stage(o,'return',{holder:'assistant'});}
 function describe(kind,o,position,label,extra={}){return {kind,orderId:o?.id||null,position:position.slice(),name:'云来酒楼 · 当班',action:label,executionRadius:.23,...extra};}
 function choices(){
  if(!state||state.stage==='finished')return [];
  const r=role(),h=HANDOVER[r];if(state.stage==='handover-in')return [describe('handover-in',null,h.player,`与${staff[r].station.npcName}交接物品并报到`)];
  if(state.stage==='handover-out')return [describe('handover-out',null,h.player,`交回当班物品 · 收工登记`)];
  if(activity||pendingChoice)return [];
  if(r==='host')return [...state.orders.filter(o=>['requested','ordered'].includes(o.stage)).map(o=>describe(o.stage==='requested'?'take-order':'collect',o,o.servePoint,o.stage==='requested'?`听${o.customerName}点菜 · ${seatName(o)}`:`收取${o.price}铜文 · 记入酒楼账`)),
    ...state.visitors.filter(v=>v.mode==='lodging-wait').flatMap(v=>state.rooms.filter(room=>!room.dirty&&!room.guestId).map(room=>describe('rent-room',null,P.host,`为${guests.find(n=>n.station.id===v.id).station.npcName}登记${room.name} · 收12铜文`,{guestId:v.id,roomId:room.id})))];
  if(r==='chef'){const held=state.orders.find(o=>o.stage==='cooked');if(held)return [describe('pass',held,P.cookPass,`把${held.dishName}放上传菜台`)];return state.orders.filter(o=>o.stage==='paid'||o.stage==='prepared'&&freePassSlot()!==null).map(o=>describe(o.stage==='paid'?'prep':'heat',o,o.stage==='paid'?P.prep:P.stove,`${o.stage==='paid'?'切配':'烹调'}${o.dishName} · ${seatName(o)}`));}
  const held=order(state.heldTrayId);if(held)return [...state.orders.filter(o=>state.visitors.some(v=>v.orderId===o.id&&v.mode==='dining')).map(o=>describe('deliver',o,o.servePoint,`送到${seatName(o)} · ${o.customerName}`)),describe('return-tray',held,P.hostPass,'把当前餐盘退回传菜台')];
  const returning=state.orders.find(o=>o.stage==='return');if(returning)return [describe('wash',returning,P.wash,`清洗${seatName(returning)}餐具`)];
  const wrong=state.orders.find(o=>o.stage==='wrong');if(wrong)return [describe('retrieve',wrong,state.orders.find(q=>q.tableId===wrong.placedTableId).servePoint,`取回送错的${wrong.dishName}`)];
  const ticket=order(state.selectedOrderId);if(ticket)return state.orders.filter(o=>o.stage==='pass').map(o=>describe('pickup',o,P.hostPass,`端起${o.dishName}餐盘`,{ticketId:ticket.id}));
  return [...state.orders.filter(o=>o.stage==='wrong').map(o=>describe('retrieve',o,state.orders.find(q=>q.tableId===o.placedTableId).servePoint,`取回送错的${o.dishName}`)),
    ...state.orders.filter(o=>o.stage==='pass').map(o=>describe('choose-order',o,P.hostPass,`查看${seatName(o)}客单 · ${o.dishName}`)),
    ...state.orders.filter(o=>o.stage==='dirty').map(o=>describe('clear',o,o.servePoint,`收起${seatName(o)}餐具`)),
    ...state.tables.filter(table=>table.dirty&&!state.orders.some(o=>o.tableId===table.id&&o.stage==='dirty')).map(table=>{const o=tablePlace(table.id);return describe('clean-table',o,o.servePoint,`擦净${seatName(o)} · 5秒`,{tableId:table.id});}),
    ...state.rooms.filter(room=>room.dirty&&!room.guestId).map(room=>{const bed=furniture.items.find(i=>i.id===room.bedId);return describe('clean-room',null,bed.position,`打扫二层${room.name} · 5秒`,{roomId:room.id});})];
 }

 function execute(choice){const current=choices().find(c=>c.kind===choice.kind&&c.orderId===choice.orderId&&c.roomId===choice.roomId&&c.guestId===choice.guestId&&c.tableId===choice.tableId);if(!current||!nearPlayer(current.position))return false;const o=order(current.orderId);
  if(['take-order','collect','deliver'].includes(current.kind)&&!customerSeated(current.kind==='deliver'?order(state.selectedOrderId):o)){pendingChoice=copy(current);return true;}
  if(current.kind==='handover-in'){handoverRequest='in';return handoverIn()||true;}if(current.kind==='handover-out'){handoverRequest='out';return handoverOut()||true;}if(current.kind==='end-shift')return beginReturn();
  if(current.kind==='rent-room'){const n=guests.find(n=>n.station.id===current.guestId);if(!at(n,[22.35,.215,11.7],.3)){pendingChoice=copy(current);return true;}}
  if(current.kind==='choose-order')return persist({...copy(state),selectedOrderId:o.id});if(current.kind==='pickup')return pickup(o);if(current.kind==='deliver')return deliver(o);if(current.kind==='retrieve')return retrieve(o);if(current.kind==='return-tray')return returnTray();
  const durations={'take-order':1.3,'rent-room':1.3,collect:1.1,prep:3.2,heat:4.2,pass:1.1,clear:1.1,wash:2.8,'clean-table':5,'clean-room':5};
  if(!durations[current.kind])return false;activity={...current,elapsed:0,duration:durations[current.kind],origin:getPlayer().root.position.toArray()};return true;
 }
 function finishActivity(a){const o=order(a.orderId);let result=false;
  if(a.kind==='rent-room')result=rentRoom(state.visitors.find(v=>v.id===a.guestId),state.rooms.find(r=>r.id===a.roomId),false,true);
  else if(a.kind==='clean-table')result=changeWorld(next=>{next.tables.find(t=>t.id===a.tableId).dirty=false;});
  else if(a.kind==='clean-room')result=changeWorld(next=>{next.rooms.find(r=>r.id===a.roomId).dirty=false;});
  else if(!o)return false;
  else if(a.kind==='take-order')result=stage(o,'ordered');else if(a.kind==='collect')result=collect(o);else if(a.kind==='prep')result=stage(o,'prepared');else if(a.kind==='heat')result=prepareDish(o);else if(a.kind==='pass')result=stage(o,'pass',{holder:'pass'});
  else if(a.kind==='clear')result=clear(o);else if(a.kind==='wash')result=stage(o,'done',{holder:null,portionsRemaining:0});
  if(result)changeWorld(next=>next.completedTasks++);return result;
 }
 function rentRoom(v,room,player=false,atPlayerCounter=false){if(!player&&!atPlayerCounter&&at(getPlayer(),[22.35,.215,11.7],.85))return false;const n=guests.find(n=>n.station.id===v?.id);if(!v||!room||room.dirty||room.guestId||v.mode!=='lodging-wait'||(v.copper??0)<room.price||!at(n,[22.35,.215,11.7],.3))return false;
  const result=changeWorld(next=>{const visitor=next.visitors.find(q=>q.id===v.id),r=next.rooms.find(q=>q.id===room.id);r.guestId=v.id;visitor.mode='lodging';visitor.roomId=room.id;visitor.copper-=room.price;next.till+=room.price;if(player)next.completedTasks++;});
  if(result)record('lodging-payment',{customerId:v.id,roomId:room.id,amount:room.price,to:'tavern-till'});return result;
 }
 function updateVisitors(dt){
  for(const v0 of [...state.visitors]){const v=state.visitors.find(q=>q.id===v0.id),n=guests.find(n=>n.station.id===v.id),o=order(v.orderId);
   if(v.mode!=='idle'&&life.isActive(n)&&!life.interrupt(n))continue;
   if(v.mode==='dining'){
    if(!mount(o,dt))continue;if(o.stage==='arriving')stage(o,'requested');
    if(o.stage==='eating'){effect(n,'meal');tick(o,dt,5.5,()=>consume(o,'dirty'));}
   }else if(v.mode==='lodging-wait'){
    if(n.serviceMount&&!unmount(n))continue;const first=state.visitors.find(q=>q.mode==='lodging-wait'),publicCounterBusy=at(getPlayer(),[22.35,.215,11.7],.85);travel(n,first.id===v.id?(publicCounterBusy?[22.1,.215,13.35]:[22.35,.215,11.7]):(publicCounterBusy?[21.3,.215,14.1]:[22.1,.215,13.35]),dt);
   }else if(v.mode==='lodging'){
    const room=state.rooms.find(r=>r.id===v.roomId),bed=furniture.items.find(i=>i.id===room.bedId);
    if(!n.serviceMount){if(!furniture.facilities.reserve(bed.id,v.id,{purpose:'lodging'})||!travel(n,bed.position,dt))continue;if(!furniture.facilities.occupy(bed.id,v.id))continue;n.root.position.set(...bed.anchor);n.root.rotation.y=bed.yaw;n.serviceMount=bed;record('guest-entered-room',{customerId:v.id,roomId:room.id});}
    tick({id:'room-'+v.id},dt,18,()=>{if(!unmount(n))return false;return changeWorld(next=>{const r=next.rooms.find(r=>r.id===room.id);r.dirty=true;r.guestId=null;next.visitors.find(q=>q.id===v.id).mode='leaving';});});
   }else if(v.mode==='leaving'){if(n.serviceMount&&!unmount(n))continue;if(travel(n,n.station.npcPosition,dt))changeWorld(next=>{next.visitors.find(q=>q.id===v.id).mode='idle';});}
   else if(v.mode==='idle'){
    const toilet=getToilet(),need=sharedNeeds?.status(v.id);
    if(toilet?.ownsActor(n)){toilet.updateActor(n,dt,{travel:(point,step)=>travel(n,point,step)});continue;}
    if(conversation===v.id){life.update(n,dt,time,{conversationActorId:conversation});continue;}
    if(need?.seekToilet&&time>=(idleSince.get(v.id+'-toilet')||0)&&!life.isActive(n)){
     idleSince.set(v.id+'-toilet',time+12);if(life.interrupt(n)&&toilet?.requestActor(n)){toilet.updateActor(n,dt,{travel:(point,step)=>travel(n,point,step)});continue;}
    }
    if(need&&(!need.seekMeal||life.isActive(n))){phases.delete('arrival-'+v.id);life.update(n,dt,time,{conversationActorId:conversation});continue;}
    const dish=TAVERN_DISHES[guests.indexOf(n)];if((v.copper??0)<dish.price){life.update(n,dt,time,{conversationActorId:conversation});continue;}const unfinished=state.orders.filter(o=>o.stage!=='done');if(unfinished.filter(o=>o.customerId!=='player').length>=4)continue;
    tick({id:'arrival-'+v.id},dt,7,()=>{if(!life.interrupt(n))return false;const next=copy(state),fresh=makeOrders(state.receiptId,next.serial)[guests.indexOf(n)];fresh.number=++next.serial;fresh.id='cn-tavern-order-'+fresh.number;fresh.customerCopper=v.copper;next.orders=next.orders.filter(o=>o.stage!=='done'||o.customerId==='player');next.orders.push(fresh);const visitor=next.visitors.find(q=>q.id===v.id);Object.assign(visitor,{mode:'dining',orderId:fresh.id,visits:visitor.visits+1,roomId:null});return persist(next);});
   }
  }
 }
 function unmount(n){if(!n.serviceMount)return true;const safety=npcs.filter(other=>other!==n).map(other=>({minX:other.root.position.x-.25,maxX:other.root.position.x+.25,minZ:other.root.position.z-.25,maxZ:other.root.position.z+.25,minY:other.root.position.y,maxY:other.root.position.y+1.95}));const player=getPlayer()?.root.position;if(player)safety.push({minX:player.x-.34,maxX:player.x+.34,minZ:player.z-.34,maxZ:player.z+.34,minY:player.y,maxY:player.y+1.95});const landing=furniture.standPoint(navigation,safety,n.serviceMount);if(!landing)return false;n.root.position.copy(landing);n.serviceMount=null;furniture.releaseActor(n.station.id);return true;}


 const customer=o=>o.customerId==='player'?getPlayer():guests[o.guestIndex];
 const customerSeated=o=>!!o&&(o.customerId==='player'?getMounted()?.id===o.seatId&&at(getPlayer(),o.seatAnchor,.35):guests[o.guestIndex]?.serviceMount?.id===o.seatId);
 const freePassSlot=()=>{const used=new Set(state.orders.filter(o=>['cooked','pass','carrying','wrong'].includes(o.stage)).map(o=>o.passSlot??o.guestIndex));return [0,1].find(i=>!used.has(i))??null;};
 function prepareDish(o){const slot=freePassSlot();return slot!==null&&stage(o,'cooked',{mealId:o.id+'-dish',holder:'cook',passSlot:slot,passPoint:PASS_SLOTS[slot].slice()});}
 function requestPlayerMeal(seat,dishId=M.id){
  if(!state||state.orders.some(o=>o.customerId==='player'&&o.stage!=='done')||!seat||getMounted()?.id!==seat.id)return false;
  const dish=TAVERN_DISHES.find(d=>d.id===dishId);if(!dish)return false;const next=copy(state),number=++next.serial,inward=seat.center[0]<21?1:-1,side=seat.center[2]<18.1?-1:1;
  const o={id:'cn-tavern-order-'+number,number,customerId:'player',customerName:'你',guestIndex:-1,tableId:seat.center[0]<21?'west':'east',seatId:seat.id,seatAnchor:seat.anchor.slice(),servePoint:[seat.center[0]+inward*1.2,.215,18.1+side*.24],mealPoint:[seat.center[0]+inward*.36,1.21,18.1+side*.27],dishId:dish.id,dishName:dish.name,price:dish.price,customerCopper:0,payment:'unpaid',collected:false,stage:'awaiting-payment',mealId:null,holder:null,cancelled:false,reviews:[],cleaned:false};
  next.orders=next.orders.filter(o=>o.customerId!=='player'||o.stage!=='done');next.orders.push(o);if(!persist(next))return false;record('requested',{orderId:o.id});const paid=reservePlayerMeal(order(o.id));if(paid)notify(`已暂扣${dish.price}铜文，许安将按客单过来；送达前取消可退回`);return paid;
 }
 function reservePlayerMeal(o){const result=chargePlayer('reserve',o);if(!result.ok){stage(o,'done',{cancelled:true,payment:'unpaid'});notify(result.code==='insufficient-cash'?'钱包铜文不足，请先到钱庄取款':'点餐款暂未记妥，请稍后重试');return false;}return stage(o,'requested',{payment:'reserved'});}
 function completeDelivery(o){if(o.customerId!=='player')return stage(o,'eating',{holder:'table'});
  const result=chargePlayer('settle',o);if(!result.ok)return false;const next=copy(state),row=next.orders.find(q=>q.id===o.id);if(row.payment!=='settled')next.till+=row.price;Object.assign(row,{stage:'ready',holder:'table',payment:'settled'});if(!persist(next))return false;phases.delete(o.id);record('delivered',{orderId:o.id});record('customer-payment',{orderId:o.id,amount:o.price,to:'tavern-till',from:'player'});return true;
 }
 function cancelPlayerMeal(){const o=state?.orders.find(o=>o.customerId==='player'&&o.stage!=='done');if(!o||o.cancelled)return false;
  const paid=chargePlayer('status',o);if(paid.status==='settled'){if(o.payment!=='settled'){const next=copy(state),row=next.orders.find(q=>q.id===o.id);next.till+=row.price;Object.assign(row,{payment:'settled',cancelled:true,stage:'dirty',holder:'table'});markDirty(next,o.tableId);return persist(next);}if(!change(o.id,{payment:'settled'}))return false;}else{const refund=chargePlayer('refund',o);if(!refund.ok)return false;if(!change(o.id,{payment:'refunded'}))return false;}
  if(!o.mealId)return stage(o,'done',{cancelled:true});
  if(['ready','eating','finish-bite'].includes(o.stage)){const next=copy(state),row=next.orders.find(q=>q.id===o.id);row.stage=o.stage==='eating'?'finish-bite':'dirty';row.cancelled=true;row.holder=row.stage==='finish-bite'?'player':'table';if(row.stage==='finish-bite')row.returnBowlFrom=props.get(o.id)?.state().bowlPosition;markDirty(next,o.tableId);return persist(next);}
  return change(o.id,{cancelled:true,...(o.holder==='assistant'?{stage:'return'}:{})});
 }
 function eatPlayerMeal(){const o=state?.orders.find(o=>o.customerId==='player'&&o.stage==='ready'&&!o.cancelled);return !!o&&customerSeated(o)&&stage(o,'eating',{holder:'player'});}
 function updatePlayerMeal(dt){const o=state.orders.find(o=>o.customerId==='player'&&o.stage!=='done');if(!o)return;
  if(o.stage==='awaiting-payment'){if(customerSeated(o))reservePlayerMeal(o);else cancelPlayerMeal();return;}
  if(!o.cancelled&&!['dirty','return','done','finish-bite'].includes(o.stage)&&!customerSeated(o)){cancelPlayerMeal();return;}
  if(o.stage==='eating')tick(o,dt,5.5,()=>consume(o,'finish-bite',{holder:'player'}));
  if(o.stage==='finish-bite')tick(o,dt,.8,()=>{const next=copy(state),row=next.orders.find(q=>q.id===o.id);row.stage='dirty';row.holder='table';row.portionsRemaining=0;markDirty(next,o.tableId);if(!persist(next))return false;record('eaten',{orderId:o.id});return true;});
 }
 const roomWorkTarget=id=>{const bed=furniture.items.find(i=>i.id===state.rooms.find(r=>r.id===id)?.bedId);return bed?[bed.center[0]+.85,bed.supportY+.03,bed.center[2]+.3]:null;};
 function playerEffect(){if(!state)return null;const meal=state.orders.find(o=>o.customerId==='player'&&['eating','finish-bite'].includes(o.stage));if(meal)return {seatedMeal:true};if(!playerOwns(role()))return null;const r=role(),held=state.orders.find(o=>o.holder===(r==='chef'?'cook':'assistant')&&['cooked','carrying','return'].includes(o.stage));const a=activity;
  return {handoff:!!held,archery:held?{hands:[[-.16,1.18,.43],[.16,1.18,.43]]}:null,heldProp:null,action:a?a.kind==='take-order'||a.kind==='rent-room'?'calligraphy':a.kind==='collect'?'tidy':['prep','heat'].includes(a.kind)?a.kind==='prep'?'cook':'herb-mix':['clean-table','clean-room','wash'].includes(a.kind)?'tidy':null:null,station:a?{position:a.position,playerWorkTarget:a.kind==='prep'?P.prepTop:a.kind==='heat'?P.stoveTop:a.kind==='wash'?P.washTop:a.kind==='rent-room'?[23.4,1.32,11.4]:a.tableId?tablePlace(a.tableId).mealPoint:a.roomId?roomWorkTarget(a.roomId):order(a.orderId)?.mealPoint||a.position.map((v,i)=>i===1?v+.7:v)}:null};
 }
 function workPending(r){return r==='host'?state.orders.some(o=>['requested','ordered'].includes(o.stage))||state.visitors.some(v=>v.mode==='lodging-wait'):
  r==='chef'?state.orders.some(o=>['paid','preparing','prepared','heating','cooked'].includes(o.stage)):
  state.orders.some(o=>['pass','carrying','return','wrong','dirty'].includes(o.stage))||state.tables.some(t=>t.dirty)||state.rooms.some(r=>r.dirty);}
 function relinquishHeld(r,dt){
  if(playerOwns(r))return false;const n=staff[r],o=state.orders.find(o=>r==='assistant'?o.holder==='assistant'&&['carrying','return'].includes(o.stage):r==='chef'?o.holder==='cook':false);if(!o)return false;
  if(!life.interrupt(n))return true;
  const dirty=o.stage==='return',point=r==='chef'?P.cookPass:dirty?P.wash:P.hostPass;effect(n,dirty?'tidy':null,dirty?P.washTop:o.passPoint,true);
  if(travel(n,point,dt))tick(o,dt,dirty?2.8:1.1,()=>stage(o,dirty?'done':'pass',{holder:dirty?null:'pass'}));return true;
 }
 function npcControllers(dt,t){const enabled=new Set();for(const [r,n]of Object.entries(staff)){
   const owned=tenureOwns(r),meeting=role()===r&&['handover-in','handover-out'].includes(state.stage);
   if(owned){idleSince.delete(n);if(relinquishHeld(r,dt))continue;if(meeting){if(life.interrupt(n))travel(n,HANDOVER[r].npc,dt);}else life.update(n,dt,t,{onDuty:false,conversationActorId:conversation});continue;}
   const visitor=getPlayer()?.root.position,atCounter=r==='host'&&visitor&&Math.hypot(visitor.x-22.35,visitor.z-11.7)<2&&Math.abs(visitor.y-.215)<.4;
   if(workPending(r)||meeting||atCounter){idleSince.delete(n);if(life.interrupt(n))enabled.add(r);}
   else{if(!idleSince.has(n))idleSince.set(n,time);if(life.isActive(n)||time-idleSince.get(n)>=4)life.update(n,dt,t,{onDuty:true,conversationActorId:conversation});else enabled.add(r);}
  }return enabled;}
 function actorLabel(n){const r=Object.keys(staff).find(r=>staff[r]===n);if(r){const names={host:'掌柜',chef:'厨师',assistant:'服务助理'};
   if(tenureOwns(r)){if(!safeHandover(r)&&!playerOwns(r))return '已卸任 · 归还手中物品';if(role()===r&&['handover-in','handover-out'].includes(state.stage))return '已卸任 · 协助交接物品';return '已卸任 · '+life.label(n);}
   return names[r]+' · '+(life.isActive(n)?life.label(n):n.walking?'前往工作处':workPending(r)?'办理当前工作':'候客');
  }const v=state?.visitors.find(v=>v.id===n.station.id),o=v&&order(v.orderId);if(!v)return n.station.npcLabel;
  if(v.mode==='idle'){if(getToilet()?.ownsActor(n))return getToilet().actorPose(n)?.label||'食客 · 前往净室';if(sharedNeeds?.status(v.id)?.seekMeal&&(v.copper??0)<TAVERN_DISHES[guests.indexOf(n)].price)return '肚子饿了 · 铜文不足，暂无法点餐';return '食客 · '+life.label(n);}if(v.mode==='leaving')return '食客 · 正在离店';if(v.mode==='lodging')return n.serviceMount?'住客 · 客房歇息':'住客 · 前往客房';if(v.mode==='lodging-wait')return '住客 · 等候登记';
  return n.serviceMount?'食客 · '+(steps[o?.stage]||'等候点菜'):n.walking?'食客 · 正在入店就座':'食客 · 等候空餐位';
 }
 function update(dt,t,{conversationActorId=null}={}){
  if(disposed)return;time+=Math.max(0,dt);conversation=conversationActorId;effects.clear();life.tick(dt);for(const n of guests){if(n)n.walking=false;}
  if(!state){for(const n of guests)if(n){travel(n,n.station.npcPosition,dt);pose(n,t);}return;}
  for(const n of actors)n.walking=false;
  reconcileDiningSeats();const r=role(),activeNPC=npcControllers(dt,t);
  {
   updateVisitors(dt);
   if(activeNPC.has('host')){const o=state.orders.find(o=>['requested','ordered'].includes(o.stage)&&customerSeated(o));
    if(o){effect(host,null,o.seatAnchor);if(travel(host,o.servePoint,dt))tick(o,dt,1.3,()=>o.stage==='requested'?stage(o,'ordered'):collect(o));}
    else{travel(host,P.host,dt);const v=state.visitors.find(v=>v.mode==='lodging-wait'),room=state.rooms.find(r=>!r.dirty&&!r.guestId);if(v&&room&&at(host,P.host,.15))rentRoom(v,room);}}
   if(activeNPC.has('chef')){const o=state.orders.find(o=>['preparing','prepared','heating','cooked'].includes(o.stage))||state.orders.find(o=>o.stage==='paid'&&freePassSlot()!==null);if(!o)travel(chef,P.prep,dt);
    else if(['paid','preparing'].includes(o.stage)){effect(chef,'cook',P.prepTop);if(travel(chef,P.prep,dt))tick(o,dt,3.2,()=>stage(o,'prepared'));}
    else if(['prepared','heating'].includes(o.stage)){effect(chef,'herb-mix',P.stoveTop);if(travel(chef,P.stove,dt))tick(o,dt,4.2,()=>prepareDish(o));}
    else{effect(chef,null,P.passTop,true);if(travel(chef,P.cookPass,dt))tick(o,dt,1.1,()=>stage(o,'pass',{holder:'pass'}));}}
   if(activeNPC.has('assistant')){const o=state.orders.find(o=>['carrying','return','wrong'].includes(o.stage))||state.orders.find(o=>o.stage==='pass')||state.orders.find(o=>o.stage==='dirty');
    if(o){
     if(o.stage==='pass'){effect(assistant,null,o.passPoint);if(travel(assistant,P.hostPass,dt))tick(o,dt,1.1,()=>stage(o,'carrying',{holder:'assistant'}));}
     else if(o.stage==='carrying'){effect(assistant,null,o.mealPoint,true);if(o.cancelled){stage(o,'return');}else if(travel(assistant,o.servePoint,dt)&&customerSeated(o))tick(o,dt,1.1,()=>completeDelivery(o));}
     else if(o.stage==='wrong'){const point=state.orders.find(q=>q.tableId===o.placedTableId).servePoint;effect(assistant,null,o.placedMealPoint);if(travel(assistant,point,dt))tick(o,dt,1.1,()=>stage(o,'carrying',{holder:'assistant',placedMealPoint:null}));}
     else if(o.stage==='dirty'){effect(assistant,'tidy',o.mealPoint);if(travel(assistant,o.servePoint,dt))tick(o,dt,1.1,()=>clear(o));}
     else{effect(assistant,'tidy',P.washTop,true);if(travel(assistant,P.wash,dt))tick(o,dt,2.8,()=>stage(o,'done',{holder:null}));}
    }else{
     const table=state.tables.find(t=>t.dirty),room=state.rooms.find(r=>r.dirty&&!r.guestId),last=table&&tablePlace(table.id),bed=room&&furniture.items.find(i=>i.id===room.bedId);
     if(last){effect(assistant,'tidy',last.mealPoint);if(travel(assistant,last.servePoint,dt))tick({id:'clean-'+table.id},dt,5,()=>changeWorld(next=>{next.tables.find(t=>t.id===table.id).dirty=false;}));}
     else if(bed){effect(assistant,'tidy',roomWorkTarget(room.id));if(travel(assistant,bed.position,dt))tick({id:'clean-room-'+room.id},dt,5,()=>changeWorld(next=>{next.rooms.find(r=>r.id===room.id).dirty=false;}));}
     else travel(assistant,P.assistant,dt);
    }}
   if(pendingChoice){const pending=pendingChoice;if(!nearPlayer(pending.position))pendingChoice=null;else{const ready=pending.kind==='rent-room'?at(guests.find(n=>n.station.id===pending.guestId),[22.35,.215,11.7],.3):customerSeated(pending.kind==='deliver'?order(state.selectedOrderId):order(pending.orderId));if(ready){pendingChoice=null;execute(pending);}}}
   if(activity){const a=activity;if(getMounted()||getPlayer().walking||!at(getPlayer(),a.origin,.03)){activity=null;notify('已停下当前动作；回到原处可继续');}else{a.elapsed+=Math.min(.1,Math.max(0,dt));if(a.elapsed>=a.duration&&finishActivity(a))activity=null;}}
  }
  if(handoverRequest){const h=HANDOVER[role()];if(!h||!nearPlayer(h.player))handoverRequest=null;else if(handoverRequest==='in'?handoverIn():handoverOut())handoverRequest=null;}
  updatePlayerMeal(dt);dirt.update(state.tables,state.rooms);
  for(const n of actors){const toiletPose=getToilet()?.actorPose(n);if(toiletPose)n.animate(t+n.phase,n.walking,toiletPose.action,{...poseContext(n),...toiletPose.context});else pose(n,t);const label=n.label?.querySelector?.('small');if(label)label.textContent=actorLabel(n);}
  life.sync();life.flush();
  for(const [id,prop]of props)if(!state.orders.some(o=>o.id===id)){prop.dispose();props.delete(id);}
  for(const o of state.orders){let prop=props.get(o.id);if(!prop){prop=propsFactory(lot.group);props.set(o.id,prop);}if(o.stage==='done'){prop.clear();continue;}
   const display={...o,...(o.stage==='eating'?{portionsRemaining:Math.max(0,1-(phases.get(o.id)||0)/5.5)}:{}),stage:o.stage==='eating'?'eating':o.stage==='paid'&&effects.get(chef)?.action==='cook'?'preparing':o.stage,mealPoint:o.placedMealPoint||o.mealPoint};
   prop.update(display,{host,assistant:actor('assistant'),cook:actor('chef'),player:customer(o)},phases.get(o.id)||0);
  }
 }
 function continuitySnapshot(){return {version:1,world:state?copy(state):null,time,phases:[...phases],activity:activity?copy(activity):null,pendingChoice:pendingChoice?copy(pendingChoice):null,handoverRequest,staffLife:life.snapshot(),history:copy(history)};}
 function restoreContinuity(snapshot){
  if(!snapshot||snapshot.version!==1||!validWorld(snapshot.world)||!Number.isFinite(snapshot.time)||snapshot.time<0||!Array.isArray(snapshot.phases)||snapshot.phases.some(row=>!Array.isArray(row)||typeof row[0]!=='string'||!Number.isFinite(row[1])||row[1]<0)||snapshot.activity&&(!Number.isFinite(snapshot.activity.elapsed)||snapshot.activity.elapsed<0||!Number.isFinite(snapshot.activity.duration)||!Array.isArray(snapshot.activity.origin)))return false;
  if((snapshot.world.revision||0)<Math.max(restoredWorldRevision,state?.revision||0))return false;const restored=copy(snapshot.world);try{if(saveState(restored)===false)return false;}catch{return false;}state=restored;restoredWorldRevision=restored.revision||0;time=snapshot.time;phases.clear();for(const [key,value]of snapshot.phases)phases.set(key,value);activity=snapshot.activity?copy(snapshot.activity):null;pendingChoice=snapshot.pendingChoice?copy(snapshot.pendingChoice):null;handoverRequest=['in','out'].includes(snapshot.handoverRequest)?snapshot.handoverRequest:null;history.length=0;history.push(...copy((snapshot.history||[]).slice(-70)));if(snapshot.staffLife||snapshot.world.staffLife)life.restore(snapshot.staffLife||snapshot.world.staffLife);paths.clear();return true;
 }
 function release(){activity=null;pendingChoice=null;for(const n of guests){if(n?.serviceMount){const seat=n.serviceMount;n.root.position.set(...seat.position);n.serviceMount=null;}if(n)furniture.releaseActor(n.station.id);}for(const p of props.values())p.dispose();props.clear();state=null;paths.clear();}
 return {start,continuitySnapshot,restoreContinuity,initializeWorld,restoreWorld,requestPlayerMeal,cancelPlayerMeal,eatPlayerMeal,playerOrder:()=>state?.orders.find(o=>o.customerId==='player'&&o.stage!=='done')||null,choices,execute,update,release,beginReturn,stopActivity(){activity=null;pendingChoice=null;},active:()=>!!state,finished:()=>state?.stage==='finished',owns:n=>actors.includes(n),
  playerPose:playerEffect,playerAction:()=>playerEffect()?.action||null,playerStation:()=>playerEffect()?.station||null,
  snapshot:()=>state?copy(state):null,state:()=>({...(state?copy(state):{}),loadError,activity:activity?copy(activity):null,staffLife:life.state(),staffOwnership:Object.fromEntries(Object.entries(staff).map(([r,n])=>[r,{holderId:tenureOwns(r)?'player':n.station.id,npcId:n.station.id,status:tenureOwns(r)?'released':life.isActive(n)?'short-break':'on-duty'}])),history:copy(history),failures:copy(failures),seatClaims:furniture.facilities.state?.()||[],orders:state?.orders.map(o=>({...copy(o),label:steps[o.stage],props:props.get(o.id)?.state()||null}))||[],actors:actors.map(n=>({id:n.station.id,position:n.root.position.toArray(),mounted:n.serviceMount?.id||null,walking:n.walking,routeLength:n.route.length,routeTarget:paths.get(n)?.key||null,label:actorLabel(n)}))}),
  socialStatus:n=>{if(!actors.includes(n))return null;const r=Object.keys(staff).find(r=>staff[r]===n),v=state?.visitors.find(v=>v.id===n.station.id);const busy=r?!tenureOwns(r)&&workPending(r):v?.mode!=='idle'||getToilet()?.ownsActor(n);return {busy:!!busy,attention:!busy,job:actorLabel(n)};},
  label:()=>activity?.action||(pendingChoice?pendingChoice.action+' · 等候顾客就位':null)||({ 'handover-in':'等待当面接班','handover-out':'等待当面交班',finished:'本轮已交班'}[state?.stage])||(state?'当班 · 查看当前客单':null),
  dispose(){if(disposed)return;release();life.dispose();dirt.dispose();disposed=true;}};
}
