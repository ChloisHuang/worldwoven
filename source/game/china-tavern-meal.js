import {TAVERN_MEAL as M} from './china-tavern-kitchen.js';
import {createTavernMealProps} from './china-tavern-meal-props.js';

const copy=x=>JSON.parse(JSON.stringify(x)),gap=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2]);
const LABELS={requested:'许安正过来听你点菜',accepted:'许安当面记下菜和桌位',ticket:'许安到后厨报菜',preparing:'沈禾在案板上切配菌菇',heating:'沈禾在灶前烹制菌菇饭','kitchen-pass':'沈禾把热饭端到传菜台',placing:'沈禾将餐盘放上传菜台',pickup:'许安在传菜台接餐',carrying:'许安正把热饭端到你的桌边',serving:'许安将餐盘放到你面前',ready:'云来菌菇饭已上桌，可以用餐',eating:'慢慢享用云来菌菇饭','finish-bite':'吃好了，放回餐碗','clear-table':'许安过来收碗',lifting:'许安收起桌上的餐具',return:'许安把餐具带回后厨',washing:'许安正在清洗餐具',recall:'许安收回手中的餐盘'};

// One meal has one tray/bowl identity. Arrival, cook work, the shared counter,
// the same dining seat and cleanup all gate progress; no generic stamp timer.
export function createChinaTavernMeal({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,saved={},saveState=()=>{},notify=()=>{}}){
 const host=npcs.find(n=>n.station.id===M.host),cook=npcs.find(n=>n.station.id===M.cook);if(!host||!cook)return null;
 const actors=[host,cook],owned=new Set(actors),P=M.points,travelState=new Map(),history=Array.isArray(saved.history)?saved.history.slice(-30):[],failures=[];
 const seats=furniture.items.filter(i=>i.id.startsWith('china-tavern-dining-')),props=createTavernMealProps(lot.group);
 let serial=Number.isSafeInteger(saved.serial)?saved.serial:0,time=0,order=null,phaseTime=0,disposed=false,conversation=null;
 const record=(event,details={})=>{history.push({event,orderId:order?.id||null,mealId:order?.mealId||null,seatId:order?.seatId||null,time:+time.toFixed(2),...details});if(history.length>60)history.shift();};
 const persist=()=>saveState({serial,history:copy(history.slice(-30))});
 const near=(n,p,r=.055)=>gap(n,p)<r&&Math.abs(n.root.position.y-p[1])<.35;
 const mounted=()=>{const item=getMounted(),player=getPlayer();return !!(order&&item?.id===order.seatId&&player&&gap(player,order.seatAnchor)<.35&&Math.abs(player.root.position.y-M.floorY)<.4);};
 const present=()=>{const p=getPlayer()?.root.position;return p&&p.x>16.15&&p.x<25.85&&p.z>15.32&&p.z<20.96&&Math.abs(p.y-M.floorY)<.55;};
 const face=(n,p)=>n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);
 function enter(stage){order.stage=stage;phaseTime=0;record(stage);for(const n of actors){travelState.delete(n);n.route=[];}}
 function finish(){record(order.cancelled?'cancel-cleared':'complete');props.clear();order=null;phaseTime=0;travelState.clear();for(const n of actors)n.route=[];persist();}
 function cancel(reason='你取消了这份饭'){
  if(!order||order.cancelled)return false;order.cancelled=true;order.claims={host:null,cook:null,seat:null};record('cancel',{reason});notify(order.mealId?'这份饭已取消，许安会把餐具收回':'已取消，想用饭时再招呼掌柜');
  if(!order.mealId)finish();
  else if(order.holder==='player'){order.returnBowlFrom=props.state().bowlPosition;order.holder='table';enter('finish-bite');}
  else if(order.holder==='table')enter('clear-table');
  else if(order.holder==='host'&&order.stage==='serving'){order.recallPoint=props.state().trayPosition;enter('recall');}
  else if(order.holder==='host')enter('return');
  else if(!['placing','pickup'].includes(order.stage))enter(order.holder==='cook'?'kitchen-pass':'pickup');persist();return true;
 }
 function travel(n,to,dt){
  n.walking=false;if(near(n,to)){n.route=[];return true;}if(conversation===n.station.id)return false;
  let s=travelState.get(n);const key=to.join(',');if(!s||s.key!==key){s={key,stalled:0};travelState.set(n,s);n.route=planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25);}
  const step=doors.routeStep(n.route,n.root.position,.035);if(step.waiting)return false;
  const p=step.waypoint;if(!p){s.stalled+=dt;if(s.stalled>2.5){failures.push({actor:n.station.id,stage:order?.stage||'return',to:to.slice(),position:n.root.position.toArray()});if(failures.length>12)failures.shift();s.stalled=0;}return false;}
  const dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz),player=getPlayer();
  const others=[...npcs.filter(a=>a!==n).map(a=>a.root.position),...(player?[player.root.position]:[])];
  if(others.some(o=>Math.abs(o.y-n.root.position.y)<.7&&Math.hypot(o.x-n.root.position.x,o.z-n.root.position.z)<.64&&(o.x-n.root.position.x)*dx+(o.z-n.root.position.z)*dz>.001&&Math.abs((o.x-n.root.position.x)*dz-(o.z-n.root.position.z)*dx)/Math.max(d,.001)<.51))return false;
  if(d>.001){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);moveActor(n,dx/d*amount,dz/d*amount,.25);n.root.rotation.y=Math.atan2(dx,dz);n.walking=before.distanceToSquared(n.root.position)>1e-9;}
  s.stalled=n.walking?0:s.stalled+dt;if(s.stalled>2){travelState.delete(n);n.route=[];}return near(n,to);
 }
 function pose(n,t,action=null,target=null,carrying=false){
  const c=poseContext(n,null);c.handoff=carrying;c.heldProp=null;
  // Reuse the existing authored-hand reach for a level tray above the pass.
  c.archery=carrying?{hands:[[-.16,1.18,.43],[.16,1.18,.43]]}:null;c.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;c.workDistance=target?gap(n,target)/(n.characterScale||1):undefined;
  if(target&&!n.walking)face(n,target);n.animate(t+n.phase,n.walking,action,c);
 }
 const tick=(dt,duration,next)=>{phaseTime+=dt;if(phaseTime>=duration)next();};
 function requestMeal(){
  const item=getMounted(),player=getPlayer();if(order){notify(order.cancelled?'请稍等，餐具还在收拾':'已经记下这份饭了，请稍候');return false;}
  if(!item||!seats.includes(item)||!player||gap(player,item.anchor)>.35||!present()){notify('先挑一把一层餐椅坐好，再招呼掌柜点菜');return false;}
  const inward=item.center[0]<21?1:-1,side=item.center[2]<18.1?-1:1;
  order={id:'cn-tavern-meal-'+(++serial),number:serial,dishId:M.id,dishName:M.name,seatId:item.id,seatAnchor:item.anchor.slice(),servePoint:[item.center[0]+inward*1.20,M.floorY,18.1+side*.24],mealPoint:[item.center[0]+inward*.36,1.21,18.1+side*.27],stage:'requested',mealId:null,holder:null,cancelled:false,claims:{host:M.host,cook:null,seat:item.id},createdAt:time};
  phaseTime=0;record('requested');persist();notify('许安：稍候，我这就过来听你点菜');return true;
 }
 return {
  seats,dish:M,owns:n=>owned.has(n),requestMeal,cancel:()=>cancel(),
  leaveSeat(id){if(order?.seatId===id&&!['clear-table','lifting','return','washing'].includes(order.stage))cancel('起身离开餐位');},
  eat(){if(!order||order.stage!=='ready'||!mounted()||!present()){notify('请坐在点菜时的餐位，等饭送到面前再吃');return false;}enter('eating');order.holder='player';return true;},
  playerPose:()=>order&&!order.cancelled&&['eating','finish-bite'].includes(order.stage)?{seatedMeal:true}:null,
  statusLabel:seatId=>order?.seatId===seatId?(order.cancelled?'许安正在收回餐具':LABELS[order.stage]):null,
  socialStatus:n=>owned.has(n)?{busy:!!order||n.walking,attention:!order,job:order?LABELS[order.stage]:n===host?'在酒楼迎客':'在后厨备菜'}:null,
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;time+=dt;conversation=conversationActorId;for(const n of actors)n.walking=false;
   if(order&&!order.cancelled&&!['clear-table','lifting','return','washing'].includes(order.stage)&&(!present()||!mounted()))cancel('离开餐位或酒楼');
   let ha=null,ca=null,ht=null,ct=null,hcarry=false,ccarry=false;
   const paused=!!conversation&&actors.some(n=>n.station.id===conversation);
   if(!order){travel(host,P.host,dt);travel(cook,P.prep,dt);ht=P.passTop;ct=P.prepTop;}
   else{
    const o=order;
    if(o.stage==='requested'){if(travel(host,o.servePoint,dt)&&!paused)enter('accepted');}
    else if(o.stage==='accepted'){ht=o.seatAnchor;if(near(host,o.servePoint)&&mounted()&&!paused)tick(dt,1.3,()=>{record('accepted-at-table',{host:host.root.position.toArray(),player:getPlayer().root.position.toArray()});o.claims.cook=M.cook;enter('ticket');notify(`许安：一份${M.name}，给你送到这张桌上`);});}
    else if(o.stage==='ticket'){
     const h=travel(host,P.hostPass,dt),c=travel(cook,P.cookPass,dt);ht=P.cookPass;ct=P.hostPass;
     if(h&&c&&!paused)tick(dt,1.2,()=>{record('cook-received-order',{from:M.host,to:M.cook,dishId:M.id});enter('preparing');});
    }else if(o.stage==='preparing'){
     travel(host,P.host,dt);if(travel(cook,P.prep,dt)&&!paused){ca='cook';ct=P.prepTop;tick(dt,3.2,()=>enter('heating'));}
    }else if(o.stage==='heating'){
     travel(host,P.host,dt);if(travel(cook,P.stove,dt)&&!paused){ca='herb-mix';ct=P.stoveTop;tick(dt,4.2,()=>{o.mealId='cn-tavern-dish-'+o.number;o.holder='cook';record('dish-prepared',{cook:M.cook,position:cook.root.position.toArray()});enter('kitchen-pass');});}
    }else if(o.stage==='kitchen-pass'){
     ccarry=true;travel(host,P.hostPass,dt);if(travel(cook,P.cookPass,dt)&&!paused)enter('placing');
    }else if(o.stage==='placing'){
     ccarry=true;ct=P.passTop;travel(host,P.hostPass,dt);if(near(cook,P.cookPass)&&!paused)tick(dt,1.1,()=>{o.holder='pass';record('dish-on-pass',{from:M.cook,position:P.passTop.slice()});enter('pickup');});
    }else if(o.stage==='pickup'){
     ccarry=false;ct=P.passTop;hcarry=true;ht=P.passTop;
     if(travel(host,P.hostPass,dt)&&!paused)tick(dt,1.1,()=>{o.holder='host';record('tray-received',{from:M.cook,to:M.host,position:host.root.position.toArray()});enter(o.cancelled?'return':'carrying');});
    }else if(o.stage==='carrying'){
     travel(cook,P.prep,dt);hcarry=true;if(travel(host,o.servePoint,dt)&&mounted()&&!paused)enter('serving');
    }else if(o.stage==='serving'){
     hcarry=true;ht=o.mealPoint;if(near(host,o.servePoint)&&mounted()&&!paused)tick(dt,1.1,()=>{o.holder='table';o.deliveredAt=time;record('delivered',{mealPoint:o.mealPoint.slice(),player:getPlayer().root.position.toArray()});enter('ready');notify(`许安：${M.name}到了，慢慢吃`);});
    }else if(o.stage==='ready'||o.stage==='eating'||o.stage==='finish-bite'){
     travel(host,P.host,dt);travel(cook,P.prep,dt);
     if(o.stage==='eating'&&mounted()&&!paused){o.portionsRemaining=Math.max(.12,1-(phaseTime+dt)/5.5*.88);tick(dt,5.5,()=>{o.portionsRemaining=0;record('eaten');enter('finish-bite');});}
     else if(o.stage==='finish-bite'&&(mounted()||o.cancelled))tick(dt,.8,()=>{o.holder='table';o.claims.seat=null;enter('clear-table');});
    }else if(o.stage==='clear-table'){
     travel(cook,P.prep,dt);if(travel(host,o.servePoint,dt)&&!paused)enter('lifting');
    }else if(o.stage==='lifting'){
     hcarry=true;ht=o.mealPoint;if(near(host,o.servePoint)&&!paused)tick(dt,1.1,()=>{o.holder='host';record('table-cleared');enter('return');});
    }else if(o.stage==='recall'){
     hcarry=true;ht=o.mealPoint;tick(dt,1.1,()=>enter('return'));
    }else if(o.stage==='return'){
     travel(cook,P.prep,dt);hcarry=true;if(travel(host,P.wash,dt)&&!paused){o.holder='wash';enter('washing');}
    }else if(o.stage==='washing'){
     ha='tidy';ht=P.washTop;travel(cook,P.prep,dt);if(near(host,P.wash)&&!paused)tick(dt,2.8,()=>{record('washed');const completed=!o.cancelled;finish();if(completed)notify('许安已收碗洗净，多谢光顾');});
    }
   }
   pose(host,t,ha,ht,hcarry);pose(cook,t,ca,ct,ccarry);
   const label=order?LABELS[order.stage]:null;for(const n of actors){const e=n.label?.querySelector?.('small');if(e)e.textContent=label||(n===host?'掌柜 · 请入座点菜':'厨师 · 备菜候单');}
   props.update(order,{host,cook,player:getPlayer()},phaseTime);
  },
  view:()=>({order:order?{id:order.id,seatId:order.seatId,stage:order.stage,cancelled:order.cancelled}:null,label:order?LABELS[order.stage]:null}),
  state(){return {serial,order:order?copy(order):null,label:order?LABELS[order.stage]:null,history:copy(history),failures:copy(failures),props:props.state(),actors:actors.map(n=>({id:n.station.id,ageYears:n.station.ageYears||n.station.age,position:n.root.position.toArray(),walking:n.walking})),persistentClaims:false};},
  dispose(){if(disposed)return;if(order){record('cancel',{reason:'离开地区'});order=null;persist();}disposed=true;for(const n of actors){n.route=[];if(n.poseContext)n.poseContext.handoff=false;}travelState.clear();props.dispose();}
 };
}
