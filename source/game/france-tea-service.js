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
const LABEL={seating:'加布里埃尔正在茶桌入座',requested:'玛农过来记下下午茶',accepted:'玛农记下茶与小蛋糕',ticket:'玛农去糕点房传话',preparing:'卡米耶切好一小份蛋糕',brewing:'卡米耶备好热茶',pickup:'玛农在糕点案边接过茶盘',carrying:'玛农把茶盘送往茶廊',serving:'玛农轻轻把茶盘放上桌',ready:'茶与小蛋糕已上桌',drinking:'坐着慢慢品茶',lowering:'把茶杯放回茶碟',clearing:'玛农过来收拾杯碟',lifting:'玛农收起用过的杯碟',returning:'玛农把杯碟送回糕点房',washing:'玛农清理杯碟',leaving:'加布里埃尔起身让出茶位'};

export function createFranceTeaService({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,getPendingSeat=null,onSeat=()=>{},notify=()=>{},onComplete=()=>{},worldSeed=1,saved={},saveState=()=>{},propsFactory=createFranceTeaProps}){
 const cook=npcs.find(n=>n.station.id===P.cook),host=npcs.find(n=>n.station.id===P.host),guest=npcs.find(n=>n.station.id===P.guest);
 const seat=furniture.items.find(i=>i.kind==='seat'&&Math.hypot(i.center[0]-P.seatCenter[0],i.center[2]-P.seatCenter[2])<.05);
 if(!cook||!host||!guest||!seat)return null;
 const actors=[cook,host,guest],owned=new Set(actors),routes=new Map(),history=[],props=propsFactory(lot.group),navigation={bounds:lot.bounds,multilevel:false};
 const life=createLifeDecisions({worldSeed,actorIds:[P.guest],saved:saved.life,onChange:life=>saveState({life})});
 let time=0,phase=0,serial=0,order=null,intent=false,choice=null,choiceTime=0,nextChoice=8,disposed=false,conversation=null,stationBusy=null;
 let duty=null,meeting=null,step=null;
 const isPlayerRole=role=>!!duty&&['active','done'].includes(duty.status)&&duty.role===role&&order?.dutyId===duty.id;
 const server=()=>isPlayerRole('host')?getPlayer():host;
 const chef=()=>isPlayerRole('cook')?getPlayer():cook;
 const record=(event,extra={})=>{history.push({event,time:+time.toFixed(2),orderId:order?.id,customer:order?.customer,...extra});if(history.length>64)history.shift();};
 const near=(n,p,r=.07)=>gap(n,p)<r;
 const safety=n=>[...(doors.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(getPlayer()?[getPlayer().root.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95}:p);
 const atSeat=()=>getMounted()?.id===seat.id&&getPlayer()&&gap(getPlayer(),seat.anchor)<.4;
 const customer=()=>order?.customer==='player'?getPlayer():guest;
 const seatedCustomer=()=>order?.customer==='player'?atSeat():guest.serviceMount?.id===seat.id;
 const busy=n=>!n||conversation===n.station?.id||stationBusy===n.station?.id;
 function enter(stage){order.stage=stage;phase=0;step=null;record(stage);}
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
 function begin(who){order={id:'france-tea-'+(++serial),customer:who,stage:who==='player'?'requested':'seating',seatId:seat.id,holder:'kitchen',trayId:null,cancelled:false,tablePoint:P.table.slice()};phase=0;record('requested');return true;}
 function request(){
  if(duty){notify('下午茶正在员工轮班交接，请先完成或取消当班');return false;}
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
 function drink(){if(order?.customer!=='player'||order.stage!=='ready'||!atSeat())return false;enter('drinking');return true;}
 const tick=(dt,duration,next)=>{phase+=dt;if(phase>=duration)next();};
 // Exactly one finite duty lease. Existing orders drain before the next real
 // Gabriel order is offered. The original residents remain under this service.
 const REGISTRIES={cook:{position:[-7.9,.258,-10.55],npcPoint:P.cookAside},host:{position:[-5.5,.302,-4.45],npcPoint:P.hostHome}};
 const SPECS={
  requested:{role:'host',key:'take-order',position:P.serve,target:P.seatCenter,seconds:1.2,action:'calligraphy',label:'听取加布里埃尔的茶点单'},
  ticket:{role:'host',key:'report-order',position:P.report,target:P.prepTop,seconds:1,action:'calligraphy',label:'向卡米耶报同号茶点单'},
  receiving:{role:'cook',key:'receive-order',position:P.prep,target:P.report,seconds:1,action:'calligraphy',label:'核对玛农送来的茶点单'},
  preparing:{role:'cook',key:'cut-cake',position:P.prep,target:P.prepTop,seconds:3.4,action:'bread',label:'切好一份小蛋糕'},
  brewing:{role:'cook',key:'brew-tea',position:P.prep,target:P.prepTop,seconds:3.2,action:'herb-mix',label:'备好同盘热茶'},
  releasing:{role:'cook',key:'release-tray',position:P.report,target:P.prepTop,seconds:1.2,action:null,label:'让开案边，把原茶盘交给玛农'},
  pickup:{role:'host',key:'take-tray',position:P.prep,target:P.prepTop,seconds:1.2,action:null,label:'取走同号原茶盘'},
  carrying:{role:'host',key:'serve-tray',position:P.serve,target:P.table,seconds:1.2,action:null,label:'把原茶盘放到加布里埃尔席前'},
  clearing:{role:'host',key:'clear-tray',position:P.serve,target:P.table,seconds:1.2,action:null,label:'收回这一席的原杯碟'},
  returning:{role:'host',key:'wash-cups',position:P.prep,target:P.prepTop,seconds:2.5,action:'tidy',label:'将原杯碟带回糕点房并洗净'},
 };
 function dutyStep(id){
  if(!duty||duty.id!==id)return null;
  if(duty.status==='queued')return {waiting:true,label:'原来的茶点单还在收尾，等卡米耶与玛农交班'};
  if(duty.status==='done')return {done:true,label:'这班实际职责已完成，回登记处当面验收'};
  const spec=SPECS[order?.stage];
  if(!spec||spec.role!==duty.role)return {waiting:true,label:order?.stage==='seating'?'等加布里埃尔实际入座':duty.role==='host'&&['preparing','brewing','receiving','releasing'].includes(order?.stage)?'等卡米耶备好同号茶点，不计作你的缺勤':'等对方完成这一段交接'};
  const waiting=order.stage==='ticket'&&!near(cook,P.prep)||order.stage==='receiving'&&!near(host,P.report)||order.stage==='pickup'&&!near(cook,P.cookAside)||order.stage==='releasing'&&!near(host,P.prep);
  return {...copy(spec),orderId:order.id,trayId:order.trayId,waiting,label:waiting?'等同事实际走到交接位置':spec.label};
 }
 function claimDuty(id,role){
  if(disposed||!['cook','host'].includes(role)||typeof id!=='string'||!id||intent||order?.customer==='player')return false;
  if(duty)return duty.id===id&&duty.role===role;
  duty={id,role,status:'queued',expires:time+180};meeting=null;step=null;record('duty-queued',{dutyId:id,role});return true;
 }
 function releaseDuty(id){
  if(!duty||duty.id!==id)return false;
  const old=duty;step=null;
  // A carried original tray stays exactly where it was released. Manon walks
  // to it and picks it up before continuing, so cancellation cannot duplicate
  // or teleport either the tray or an NPC.
  if(isPlayerRole('host')&&order?.holder==='host'){
   const trayPosition=props.state().trayPosition;
   order.recovery={position:getPlayer().root.position.toArray(),trayPosition:trayPosition||P.prepTop.slice(),next:order.stage};
   order.holder='recovery';enter('recover-host');
  }else if(order?.dutyId===id){
   if(order.stage==='receiving')enter('ticket');
   else if(order.stage==='releasing')enter('pickup');
   else phase=0;
  }
  duty=null;record('duty-released',{dutyId:id,role:old.role,completed:old.status==='done'});return true;
 }
 function startDutyStep(id,key){
  const spec=dutyStep(id),p=getPlayer();
  if(!spec||spec.waiting||spec.done||spec.key!==key||!p||p.walking||getMounted()||!near(p,spec.position,.18)||step)return false;
  step=key;phase=0;return true;
 }
 function playerWork(dt,complete){
  const spec=dutyStep(duty?.id),p=getPlayer();
  if(!spec?.key||step!==spec.key||spec.waiting||!p)return;
  if(p.walking||getMounted()||!near(p,spec.position,.18)){step=null;phase=0;return;}
  p.root.rotation.y=Math.atan2(spec.target[0]-p.root.position.x,spec.target[2]-p.root.position.z);
  phase+=Math.min(.1,Math.max(0,dt));
  if(phase+1e-8>=spec.seconds){record('player-duty-step',{dutyId:duty.id,role:duty.role,key:spec.key,trayId:order.trayId});step=null;complete();}
 }
 function completeDuty(){duty.status='done';step=null;record('player-duty-completed',{dutyId:duty.id,role:duty.role,trayId:order.trayId});}
 function requestMeeting(role){if(!REGISTRIES[role]||duty)return false;meeting={role,expires:time+8};return true;}
 function meetingReady(role){const n=role==='cook'?cook:host;return meeting?.role===role&&!order&&!duty&&near(n,REGISTRIES[role].npcPoint)&&!busy(n);}

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
  registries:copy(REGISTRIES),claimDuty,releaseDuty,dutyStep,startDutyStep,requestMeeting,meetingReady,
  releaseMeeting(){meeting=null;},keepDuty(id){if(duty?.id===id){duty.expires=time+180;return true;}return false;},
  stopDutyStep(){if(step){step=null;phase=0;}},dutyState:()=>duty?{...copy(duty),step,progress:phase}:null,
  dutyPlayerAction:()=>step?SPECS[order?.stage]?.action:null,
  dutyPlayerStation:()=>step?{playerWorkTarget:SPECS[order?.stage]?.target}:null,
  ownsStation:id=>id===P.guest,
  playerPose(t){if(isPlayerRole('host')&&(order?.holder==='host'||step&&['take-tray','clear-tray'].includes(step)))return {handoff:true,heldProp:null,archery:{hands:[[-.19,1.12,.43],[.19,1.12,.43]]}};return order?.customer==='player'&&['drinking','lowering'].includes(order.stage)&&atSeat()?{archery:cupPose(getPlayer(),t).archery,handoff:true}:null;},
  playerRequest(id){if(duty){notify('请先完成或取消茶点当班，再使用座位');return false;}if(id!==seat.id){cancel('换了座位');return;}if(order?.customer==='guest'||guest.serviceMount){notify('加布里埃尔还在茶位，请稍候');return false;}return true;},
  leaveSeat(id){if(id===seat.id)cancel('起身离开茶位');},
  target(){const p=getPlayer();if(!p||duty)return null;const nearby=gap(p,[6.6,.16,8.35])<2.3||atSeat();if(!nearby&&!intent)return null;const label=intent?'取消前往茶位':order?.customer==='player'&&!order.cancelled?(order.stage==='ready'?'举杯品茶':'取消下午茶'):order?'茶席使用中 · 稍候':'请玛农准备下午茶';return {franceTea:true,id:'france-tea-service',name:'宫苑下午茶 · 玛农',action:label,status:intent?'正在走向茶位':order?LABEL[order.stage]:'一壶茶与一小份蛋糕'};},
  interact(){if(intent){intent=false;return 'cancel-walk';}if(order?.customer==='player'&&!order.cancelled)return order.stage==='ready'?drink():cancel();return request();},
  statusLabel:id=>id===seat.id&&order?LABEL[order.stage]:null,
  socialStatus:n=>({busy:!!order||n.walking,attention:!order,job:order?LABEL[order.stage]:n.station.npcLabel}),
  update(dt,t,{conversationActorId=null,performing=null,hour=15}={}){
   if(disposed)return;time+=dt;life.tick(dt);conversation=conversationActorId;stationBusy=performing;for(const n of actors)n.walking=false;
   if(duty&&time>duty.expires)releaseDuty(duty.id);if(meeting&&time>meeting.expires)meeting=null;
   if(duty?.status==='queued'&&!order&&!intent&&!atSeat()&&!guest.serviceMount&&furniture.facilities.reserve(seat.id,P.guest,{purpose:'staff-tea-duty'})){
    if(choice){life.complete(P.guest,choice,{fulfilled:false});choice=null;choiceTime=0;}
    begin('guest');order.dutyId=duty.id;duty.status='active';record('duty-accepted',{dutyId:duty.id,role:duty.role});
   }
   if(intent&&atSeat()){intent=false;begin('player');}
   else if(intent&&getPendingSeat&&getPendingSeat()!==seat.id){intent=false;notify('已取消前往茶位');}
   if(order?.customer==='player'&&!order.cancelled&&!['clearing','lifting','returning','washing'].includes(order.stage)&&!atSeat())cancel('离开茶位');
   let ca=null,ha=null,ct=null,ht=null,carry=false;
   if(!order){
    travel(cook,P.cookAside,dt);travel(host,P.hostHome,dt);ca=near(cook,P.cookAside)?cook.station.npcAction:null;ct=cook.station.workTarget;ha=near(host,P.hostHome)?host.station.npcAction:null;ht=host.station.workTarget;
    if(!duty&&!meeting&&!intent&&!atSeat()&&!busy(guest)&&time>=nextChoice){
     choice??=life.choose(P.guest,[{id:'tea',base:.6,traits:{appetite:.8,quiet:.4},needs:{hunger:1.2},duration:[9,13],relief:{hunger:-.25},cooldown:70,available:!guest.serviceMount},{id:'garden',base:.25,traits:{outdoors:.8,curiosity:.3},duration:[10,16],relief:{fatigue:-.04},cooldown:15}],hour);
     if(choice?.id==='tea'){if(furniture.facilities.reserve(seat.id,P.guest,{purpose:'afternoon-tea'}))begin('guest');else{life.complete(P.guest,choice,{fulfilled:false});choice=null;nextChoice=time+5;}}
     else if(choice){if(travel(guest,[10.55,0,13.0],dt)){choiceTime+=dt;if(choiceTime>=choice.duration){life.complete(P.guest,choice);choice=null;choiceTime=0;nextChoice=time+2;}}}
    }
   }else{
    const o=order,paused=busy(host)||busy(cook)||busy(guest)&&o.customer==='guest';
    if(isPlayerRole('cook'))travel(cook,P.cookAside,dt);if(isPlayerRole('host'))travel(host,P.hostHome,dt);
    if(o.stage==='seating'){if(mountGuest(dt))enter('requested');}
    else if(o.stage==='requested'){if(isPlayerRole('host')){if(seatedCustomer()&&!paused)playerWork(dt,()=>enter('ticket'));}else if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('accepted');}
    else if(o.stage==='accepted'){ht=seat.anchor;if(!paused)tick(dt,1.2,()=>enter('ticket'));}
    else if(o.stage==='ticket'){const h=isPlayerRole('host')?false:travel(host,P.report,dt),c=isPlayerRole('cook')?false:travel(cook,P.prep,dt);ht=P.prep;ct=server()?.root.position.toArray();
     const received=()=>{o.trayId=o.id+'-tray';record('chef-received-order');enter('preparing');};
     if(isPlayerRole('host')){if(c&&!paused)playerWork(dt,received);}else if(isPlayerRole('cook')){if(!paused)enter('receiving');}else if(h&&c&&!paused)tick(dt,1,received);}
    else if(o.stage==='receiving'){travel(host,P.report,dt);if(!paused)playerWork(dt,()=>{o.trayId=o.id+'-tray';record('chef-received-order');enter('preparing');});}
    else if(o.stage==='preparing'||o.stage==='brewing'){ct=P.prepTop;const next=()=>enter(o.stage==='preparing'?'brewing':isPlayerRole('cook')?'releasing':'pickup');if(isPlayerRole('cook')){if(!paused)playerWork(dt,next);}else{ca=o.stage==='preparing'?'bread':'herb-mix';if(travel(cook,P.prep,dt)&&!paused)tick(dt,o.stage==='preparing'?3.4:3.2,next);}}
    else if(o.stage==='releasing'){if(travel(host,P.prep,dt)&&!paused)playerWork(dt,()=>{completeDuty();enter('pickup');});}
    else if(o.stage==='pickup'){const away=travel(cook,P.cookAside,dt),receive=()=>{o.holder='host';record('tray-received',{from:P.cook,to:isPlayerRole('host')?'player':P.host});enter(o.cancelled?'returning':'carrying');};if(isPlayerRole('host')){if(away&&!paused)playerWork(dt,receive);}else if(away&&travel(host,P.prep,dt)&&!paused){carry=true;ht=P.prepTop;tick(dt,1.2,receive);}}
    else if(o.stage==='carrying'){if(isPlayerRole('host')){if(seatedCustomer()&&!paused)playerWork(dt,()=>{o.holder='table';record('tea-delivered',{seatId:seat.id,by:'player'});enter('ready');});}else{carry=true;if(travel(host,P.serve,dt)&&seatedCustomer()&&!paused)enter('serving');}}
    else if(o.stage==='serving'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='table';record('tea-delivered',{seatId:seat.id});enter('ready');if(o.customer==='player')notify('玛农：茶与小蛋糕好了，按 E 举杯品茶');});}
    else if(o.stage==='ready'){if(!isPlayerRole('host'))travel(host,[4.6,.16,8.6],dt);if(o.customer==='guest'&&!paused)tick(dt,1.5,()=>enter('drinking'));}
    else if(o.stage==='drinking'){if(!isPlayerRole('host'))travel(host,[4.6,.16,8.6],dt);if(!paused)tick(dt,9,()=>{o.finished=true;record('tea-finished');enter('lowering');});}
    else if(o.stage==='lowering'){if(!paused)tick(dt,1,()=>{o.holder='table';enter('clearing');});}
    else if(o.stage==='clearing'){if(isPlayerRole('host')){if(!paused)playerWork(dt,()=>{o.holder='host';record('table-cleared',{by:'player'});enter('returning');});}else if(travel(host,P.serve,dt)&&!paused)enter('lifting');}
    else if(o.stage==='lifting'){carry=true;ht=P.table;if(!paused)tick(dt,1.2,()=>{o.holder='host';record('table-cleared');enter('returning');});}
    else if(o.stage==='recalling'){carry=true;if(!paused)tick(dt,1.2,()=>enter('returning'));}
    else if(o.stage==='returning'){if(isPlayerRole('host')){if(!paused)playerWork(dt,()=>{o.holder='kitchen';record('cups-cleaned',{by:'player'});completeDuty();enter('leaving');});}else{carry=true;if(travel(host,P.prep,dt)&&!paused){o.holder='kitchen';enter('washing');}}}
    else if(o.stage==='recover-host'){const r=o.recovery;ht=r.trayPosition;if(travel(host,r.position,dt)&&!paused){carry=true;tick(dt,1.2,()=>{o.holder='host';const next=r.next;delete o.recovery;enter(next);});}}
    else if(o.stage==='washing'){ha='tidy';ht=P.prepTop;if(!paused)tick(dt,2.5,()=>{record('cups-cleaned');if(o.customer==='guest')enter('leaving');else finish();});}
    else if(o.stage==='leaving'){if(unmountGuest()&&travel(guest,P.guestHome,dt))finish();}
   }
   pose(cook,t,ca,ct);pose(host,t,ha,ht,carry);pose(guest,t,guest.serviceMount?'chair-sit':null,null);
   for(const n of actors){const label=n.label?.querySelector?.('small');if(label)label.textContent=order?LABEL[order.stage]:n===guest?(choice?.id==='garden'?'散步看看宫苑':n.station.npcLabel):n.station.npcLabel;}
   // Render the same physical service against its current carrier. Player
   // placement/collection lerp uses the same transfer path as the NPC.
   const visual=order&&isPlayerRole('host')&&step?{...order,stage:step==='serve-tray'?'serving':step==='clear-tray'?'lifting':step==='wash-cups'?'washing':order.stage,holder:step==='wash-cups'?'kitchen':order.holder}:order;
   props.update(visual,{host:server(),cook:chef(),customer:customer()},phase);
  },
  state:()=>({order:order?copy(order):null,intent,phase,duty:duty?copy(duty):null,step,meeting:meeting?copy(meeting):null,history:copy(history),props:props.state(),seatId:seat.id,life:life.snapshot()}),
  dispose(){if(disposed)return;disposed=true;intent=false;order=null;duty=null;meeting=null;step=null;for(const n of actors){n.route=[];n.serviceMount=null;if(n.poseContext){n.poseContext.handoff=false;n.poseContext.archery=null;}}furniture.releaseActor(P.guest);life.dispose();props.dispose();}
 };
}
