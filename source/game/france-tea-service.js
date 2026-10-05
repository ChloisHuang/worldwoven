import {followActorRoute} from './actor-navigation.js';
import {createLifeDecisions} from './npc-life-decisions.js';
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
const validReceipt=r=>r?.source==='france-tea-food'&&r.actorId==='player'&&r.completed===true&&serialNumber(r.number)&&r.orderId==='france-tea-'+r.number&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-tray'&&r.dishId==='tea-cake'&&r.supplyReceipt===r.orderId;
const latestReceipts=(...sets)=>{const latest=sets.flatMap(s=>Array.isArray(s)?s:[]).filter(validReceipt).sort((a,b)=>b.number-a.number)[0];return latest?[copy(latest)]:[];};
const LABEL={seating:'加布里埃尔正在茶桌入座',requested:'玛农过来记下下午茶',accepted:'玛农记下茶与小蛋糕',ticket:'玛农去糕点房传话',preparing:'卡米耶切好一小份蛋糕',brewing:'卡米耶备好热茶',pickup:'玛农在糕点案边接过茶盘',carrying:'玛农把茶盘送往茶廊',serving:'玛农轻轻把茶盘放上桌',ready:'茶与小蛋糕已上桌',drinking:'坐着慢慢品茶',lowering:'把茶杯放回茶碟',clearing:'玛农过来收拾杯碟',lifting:'玛农收起用过的杯碟',returning:'玛农把杯碟送回糕点房',washing:'玛农清理杯碟',leaving:'加布里埃尔起身让出茶位'};

export function createFranceTeaService({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,getPendingSeat=null,onSeat=()=>{},notify=()=>{},onComplete=()=>{},onMealReceipts=()=>{},worldSeed=1,saved={},saveState=()=>{},propsFactory=createFranceTeaProps}){
 const cook=npcs.find(n=>n.station.id===P.cook),host=npcs.find(n=>n.station.id===P.host),guest=npcs.find(n=>n.station.id===P.guest);
 const seat=furniture.items.find(i=>i.kind==='seat'&&Math.hypot(i.center[0]-P.seatCenter[0],i.center[2]-P.seatCenter[2])<.05);
 if(!cook||!host||!guest||!seat)return null;
 const actors=[cook,host,guest],owned=new Set(actors),routes=new Map(),history=[],props=propsFactory(lot.group),navigation={bounds:lot.bounds,multilevel:false};
 let mealReceipts=latestReceipts(saved.mealReceipts,saved.continuity?.mealReceipts);
 let time=0,phase=0,serial=Math.max(serialNumber(saved.serial),serialNumber(saved.continuity?.serial),orderNumber(saved.continuity?.order?.id),mealReceipts[0]?.number||0),order=null,intent=false,choice=null,choiceTime=0,nextChoice=8,disposed=false,conversation=null,stationBusy=null;
 const {continuity:ignoredContinuity,...aggregate}=saved;
 const life=createLifeDecisions({worldSeed,actorIds:[P.guest],saved:saved.continuity?.life||saved.life,onChange:life=>{if(persist({life}))deliverReceipts();}});
 // Keep the source receipt after cleanup and failed downstream relief. A life
 // save or unload must never overwrite the serial/receipt with a life-only save.
 function persist(next={}){try{const result=saveState(copy({...aggregate,life:life.snapshot(),serial,mealReceipts,...next}));return result!==false&&!result?.then;}catch{return false;}}
 function deliverReceipts(){if(mealReceipts.length)try{onMealReceipts(copy(mealReceipts));}catch{/* A later save or restore can replay the durable receipt. */}}
 const record=(event,extra={})=>{history.push({event,time:+time.toFixed(2),orderId:order?.id,customer:order?.customer,...extra});if(history.length>64)history.shift();};
 const near=(n,p,r=.07)=>gap(n,p)<r;
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(getPlayer()?[getPlayer().root.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 const atSeat=()=>getMounted()?.id===seat.id&&getPlayer()&&gap(getPlayer(),seat.anchor)<.4;
 const customer=()=>order?.customer==='player'?getPlayer():guest;
 const seatedCustomer=()=>order?.customer==='player'?atSeat():guest.serviceMount?.id===seat.id;
 const busy=n=>conversation===n.station.id||stationBusy===n.station.id;
 function enter(stage){order.stage=stage;phase=0;record(stage);}
 function travel(n,to,dt){
  n.walking=false;if(near(n,to)){n.route=[];routes.delete(n);return true;}if(busy(n)||n.serviceMount)return false;
  const key=to.join(',');let s=routes.get(n);if(!s||s.key!==key){s={key,stalled:0};routes.set(n,s);n.route=planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25);}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8,arrivalTolerance:.045});if(step.waiting){s.stalled=0;return false;}
  const p=step.waypoint;if(!p){s.stalled+=dt;if(s.stalled>2){routes.delete(n);n.route=[];}return false;}
  s.stalled=n.walking?0:s.stalled+dt;if(s.stalled>2){routes.delete(n);n.route=[];}return near(n,to);
 }
 function mountGuest(dt){
  if(guest.serviceMount)return true;if(!furniture.facilities.reservation(seat.id,P.guest)||!travel(guest,seat.position,dt)||!furniture.canSit(navigation,safety(guest),seat))return false;
  if(!furniture.facilities.occupy(seat.id,P.guest))return false;guest.root.position.set(...seat.anchor);guest.root.rotation.y=seat.yaw;guest.serviceMount=seat;record('guest-seated',{seatId:seat.id});return true;
 }
 function unmountGuest(){if(!guest.serviceMount)return true;const landing=furniture.standPoint(navigation,safety(guest),seat);if(!landing)return false;guest.root.position.copy(landing);guest.serviceMount=null;furniture.releaseActor(P.guest);return true;}
 function finish(){const cancelled=order.cancelled,completed=order.customer==='player'&&order.finished&&!cancelled;record(cancelled?'cancel-cleared':'complete');props.clear();order=null;phase=0;intent=false;furniture.releaseActor(P.guest);for(const n of actors){n.route=[];routes.delete(n);}if(choice){life.complete(P.guest,choice,{fulfilled:!cancelled});choice=null;}nextChoice=time+12;if(completed)onComplete();}
 function cancel(reason='取消下午茶'){
  intent=false;if(!order||order.customer!=='player'||order.cancelled)return false;order.cancelled=true;record('cancel',{reason});notify('已取消，玛农会收回已备好的杯碟');
  if(!order.trayId){finish();return true;}
  if(order.stage==='drinking'||order.stage==='lowering'){order.returnCupFrom=props.state().cupPosition;enter('lowering');}
  else if(order.stage==='serving'||order.stage==='pickup'&&phase>0){order.recallFrom=props.state().trayPosition;order.holder='host';enter('recalling');}
  else if(order.holder==='table')enter('clearing');else if(order.holder==='host')enter('returning');else enter('pickup');return true;
 }
 function begin(who){const nextSerial=serial+1;if(!persist({serial:nextSerial})){if(who==='player')notify('暂时无法记下下午茶，请稍后再试');return false;}serial=nextSerial;order={id:'france-tea-'+serial,customer:who,stage:who==='player'?'requested':'seating',seatId:seat.id,holder:'kitchen',trayId:null,cancelled:false,tablePoint:P.table.slice()};phase=0;record('requested');return true;}
 function request(){
  if(order){notify(order.cancelled?'杯碟还在收拾，请稍候':order.customer==='player'?'这份下午茶已经记下了':'加布里埃尔正在用茶，请等这桌收拾完');return false;}
  if(intent){notify('正在走向茶位，可按 E 或移动取消');return false;}
  if(!atSeat()){
   if(guest.serviceMount||furniture.facilities.reservation(seat.id,P.guest)){notify('这张茶椅有人，请稍候');return false;}
   // Existing player furniture navigation remains responsible for approach,
   // swept transfer and cancellation. Mark intent after its cancelAction hook.
   onSeat(seat);intent=atSeat()||!getPendingSeat||getPendingSeat()===seat.id;if(!intent){notify('茶椅入口暂时走不过去，请从通道靠近后再试');return false;}notify('先到茶椅坐好，玛农会过来记下午茶');return true;
  }
  return begin('player');
 }
 function consume(){
  if(!order||order.cancelled||order.trayId!==order.id+'-tray')return false;
  if(order.customer==='player'){
   const receipt={source:'france-tea-food',id:order.id+'-consumed',number:orderNumber(order.id),actorId:'player',orderId:order.id,mealId:order.trayId,dishId:'tea-cake',supplyReceipt:order.id,completed:true};
   const next=latestReceipts(mealReceipts,[receipt]);if(!persist({mealReceipts:next}))return false;mealReceipts=next;
  }
  order.finished=true;record('tea-finished');enter('lowering');if(order.customer==='player')deliverReceipts();return true;
 }
 function drink(){if(order?.customer!=='player'||order.stage!=='ready'||!atSeat())return false;enter('drinking');return true;}
 const tick=(dt,duration,next)=>{phase+=dt;if(phase>=duration)next();};
 function cupPose(n,t){const c=n.poseContext||{},sip=Math.pow((Math.sin(t*1.4)+1)*.5,2);c.seatHeight=(seat.seatY-n.root.position.y-(c.visualFloorOffset||0));c.handoff=true;c.seatedMeal=false;c.heldProp=null;c.archery={hands:[[-.18,c.seatHeight+.15,.25],[.13-sip*.055,c.seatHeight+.30+sip*.28,.37-sip*.23]]};return c;}
 function pose(n,t,action,target,carry=false){
  if(!n.serviceMount)n.root.position.y=visualSupportHeight(lot,n.root.position.x,n.root.position.z,0,false)??n.root.position.y;
  let c=poseContext(n,null);c.handoff=carry;c.heldProp=null;c.seatedMeal=false;c.archery=carry?{hands:[[-.19,1.12,.43],[.19,1.12,.43]]}:null;c.seatHeight=undefined;
  if(n.serviceMount){action='chair-sit';c.seatHeight=seat.seatY-n.root.position.y-(c.visualFloorOffset||0);if(['drinking','lowering'].includes(order?.stage))c=cupPose(n,t);}
  if(target&&!n.walking&&!n.serviceMount)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);
  c.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;c.workDistance=target?gap(n,target)/(n.characterScale||1):undefined;
  n.animate(t+(n.phase||0),n.walking,n.walking?null:action,c);
 }
 return {seat,owns:n=>owned.has(n),request,cancel,drink,
  ownsStation:id=>id===P.guest,
  playerPose(t){return order?.customer==='player'&&['drinking','lowering'].includes(order.stage)&&atSeat()?{archery:cupPose(getPlayer(),t).archery,handoff:true}:null;},
  playerRequest(id){if(id!==seat.id){cancel('换了座位');return;}if(order?.customer==='guest'||guest.serviceMount){notify('加布里埃尔还在茶位，请稍候');return false;}return true;},
  leaveSeat(id){if(id===seat.id)cancel('起身离开茶位');},
  target(){const p=getPlayer();if(!p)return null;const nearby=gap(p,[6.6,.16,8.35])<2.3||atSeat();if(!nearby&&!intent)return null;const label=intent?'取消前往茶位':order?.customer==='player'&&!order.cancelled?(order.stage==='ready'?'举杯品茶':'取消下午茶'):order?'茶席使用中 · 稍候':'请玛农准备下午茶';return {franceTea:true,id:'france-tea-service',name:'宫苑下午茶 · 玛农',action:label,status:intent?'正在走向茶位':order?LABEL[order.stage]:'一壶茶与一小份蛋糕'};},
  interact(){if(intent){intent=false;return 'cancel-walk';}if(order?.customer==='player'&&!order.cancelled)return order.stage==='ready'?drink():cancel();return request();},
  statusLabel:id=>id===seat.id&&order?LABEL[order.stage]:null,
  socialStatus:n=>({busy:!!order||n.walking,attention:!order,job:order?LABEL[order.stage]:n.station.npcLabel}),
  update(dt,t,{conversationActorId=null,performing=null,hour=15}={}){
   if(disposed)return;time+=dt;life.tick(dt);conversation=conversationActorId;stationBusy=performing;for(const n of actors)n.walking=false;
   if(intent&&atSeat()){intent=false;begin('player');}
   else if(intent&&getPendingSeat&&getPendingSeat()!==seat.id){intent=false;notify('已取消前往茶位');}
   if(order?.customer==='player'&&!order.cancelled&&!['clearing','lifting','returning','washing'].includes(order.stage)&&!atSeat())cancel('离开茶位');
   let ca=null,ha=null,ct=null,ht=null,carry=false;
   if(!order){
    travel(cook,P.cookAside,dt);travel(host,P.hostHome,dt);ca=near(cook,P.cookAside)?cook.station.npcAction:null;ct=cook.station.workTarget;ha=near(host,P.hostHome)?host.station.npcAction:null;ht=host.station.workTarget;
    if(!intent&&!atSeat()&&!busy(guest)&&time>=nextChoice){
     choice??=life.choose(P.guest,[{id:'tea',base:.6,traits:{appetite:.8,quiet:.4},needs:{hunger:1.2},duration:[9,13],relief:{hunger:-.25},cooldown:70,available:!guest.serviceMount},{id:'garden',base:.25,traits:{outdoors:.8,curiosity:.3},duration:[10,16],relief:{fatigue:-.04},cooldown:15}],hour);
     if(choice?.id==='tea'){if(furniture.facilities.reserve(seat.id,P.guest,{purpose:'afternoon-tea'}))begin('guest');else{life.complete(P.guest,choice,{fulfilled:false});choice=null;nextChoice=time+5;}}
     else if(choice){if(travel(guest,[10.55,0,13.0],dt)){choiceTime+=dt;if(choiceTime>=choice.duration){life.complete(P.guest,choice);choice=null;choiceTime=0;nextChoice=time+2;}}}
    }
   }else{
    const o=order,paused=busy(host)||busy(cook)||busy(guest)&&o.customer==='guest';
    if(o.stage==='seating'){if(mountGuest(dt))enter('requested');}
    else if(o.stage==='requested'){if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('accepted');}
    else if(o.stage==='accepted'){ht=seat.anchor;if(!paused)tick(dt,1.2,()=>enter('ticket'));}
    else if(o.stage==='ticket'){const h=travel(host,P.report,dt),c=travel(cook,P.prep,dt);ht=P.prep;ct=host.root.position.toArray();if(h&&c&&!paused)tick(dt,1,()=>{o.trayId=o.id+'-tray';record('chef-received-order');enter('preparing');});}
    else if(o.stage==='preparing'||o.stage==='brewing'){ca=o.stage==='preparing'?'bread':'herb-mix';ct=P.prepTop;if(travel(cook,P.prep,dt)&&!paused)tick(dt,o.stage==='preparing'?3.4:3.2,()=>enter(o.stage==='preparing'?'brewing':'pickup'));}
    else if(o.stage==='pickup'){const away=travel(cook,P.cookAside,dt);if(away&&travel(host,P.prep,dt)&&!paused){carry=true;ht=P.prepTop;tick(dt,1.2,()=>{o.holder='host';record('tray-received',{from:P.cook,to:P.host});enter(o.cancelled?'returning':'carrying');});}}
    else if(o.stage==='carrying'){carry=true;if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('serving');}
    else if(o.stage==='serving'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='table';record('tea-delivered',{seatId:seat.id});enter('ready');if(o.customer==='player')notify('玛农：茶与小蛋糕好了，按 E 举杯品茶');});}
    else if(o.stage==='ready'){travel(host,[4.6,.16,8.6],dt);if(o.customer==='guest'&&!paused)tick(dt,1.5,()=>enter('drinking'));}
    else if(o.stage==='drinking'){travel(host,[4.6,.16,8.6],dt);if(!paused)tick(dt,9,consume);}
    else if(o.stage==='lowering'){if(!paused)tick(dt,1,()=>{o.holder='table';enter('clearing');});}
    else if(o.stage==='clearing'){if(travel(host,P.serve,dt)&&!paused)enter('lifting');}
    else if(o.stage==='lifting'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='host';record('table-cleared');enter('returning');});}
    else if(o.stage==='recalling'){carry=true;if(!paused)tick(dt,1.2,()=>enter('returning'));}
    else if(o.stage==='returning'){carry=true;if(travel(host,P.prep,dt)&&!paused){o.holder='kitchen';enter('washing');}}
    else if(o.stage==='washing'){ha='tidy';ht=P.prepTop;if(!paused)tick(dt,2.5,()=>{record('cups-cleaned');if(o.customer==='guest')enter('leaving');else finish();});}
    else if(o.stage==='leaving'){if(unmountGuest()&&travel(guest,P.guestHome,dt))finish();}
   }
   pose(cook,t,ca,ct);pose(host,t,ha,ht,carry);pose(guest,t,guest.serviceMount?'chair-sit':null,null);
   for(const n of actors){const label=n.label?.querySelector?.('small');if(label)label.textContent=order?LABEL[order.stage]:n===guest?(choice?.id==='garden'?'散步看看宫苑':n.station.npcLabel):n.station.npcLabel;}
   props.update(order,{host,cook,customer:customer()},phase);
  },
  snapshot:()=>({version:1,time,phase,serial,mealReceipts:copy(mealReceipts),order:copy(order),intent,choice:copy(choice),choiceTime,nextChoice,history:copy(history),life:life.snapshot()}),
  restore(s){if(s?.version!==1||s.order&&(!LABEL[s.order.stage]&&s.order.stage!=='recalling'||s.order.seatId!==seat.id))return false;time=Math.max(0,s.time||0);phase=Math.max(0,s.phase||0);mealReceipts=latestReceipts(mealReceipts,s.mealReceipts);serial=Math.max(serial,serialNumber(s.serial),orderNumber(s.order?.id),mealReceipts[0]?.number||0);order=copy(s.order);if(order?.customer==='player'&&mealReceipts.some(r=>r.orderId===order.id)){order.finished=true;if(!['lowering','clearing','lifting','returning','washing','recalling'].includes(order.stage)){order.stage='lowering';phase=0;}}intent=!!s.intent;choice=copy(s.choice);choiceTime=Math.max(0,s.choiceTime||0);nextChoice=Math.max(time,s.nextChoice||0);history.splice(0,history.length,...copy(s.history||[]));routes.clear();for(const n of actors)n.route=[];if(order?.customer==='guest'){furniture.facilities.reserve(seat.id,P.guest,{purpose:'afternoon-tea'});if(guest.serviceMount)furniture.facilities.occupy(seat.id,P.guest);}props.update(order,{host,cook,customer:customer()},phase);return true;},
  state:()=>({serial,mealReceipts:copy(mealReceipts),order:order?copy(order):null,intent,phase,history:copy(history),props:props.state(),seatId:seat.id,life:life.snapshot()}),
  dispose(){if(disposed)return;disposed=true;intent=false;order=null;for(const n of actors){n.route=[];n.serviceMount=null;if(n.poseContext){n.poseContext.handoff=false;n.poseContext.archery=null;}}furniture.releaseActor(P.guest);life.dispose();props.dispose();}
 };
}
