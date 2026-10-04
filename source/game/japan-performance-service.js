import {knownAdult} from './player-age.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {PERFORMANCE_POINTS as P,PERFORMANCE_ACTIVITIES as ACT,PERFORMANCE_DRINKS as DRINKS} from './japan-performance-cast.js';
const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
const TABLE='jp-performance-table',GUEST='jp-performance-guest-seat',ARTIST='jp-performance-artist-seat';
const near=(a,p,r=.09)=>a&&Math.abs(a.root.position.y-p[1])<.35&&Math.hypot(a.root.position.x-p[0],a.root.position.z-p[2])<r;
export function performanceWillingness(actor,activity,opinion=0){
 const p=actor?.station?.performance;
 if(!knownAdult(actor))return {willing:false,reply:'今日不安排这次服务。'};
 if(p?.willing===false)return {willing:false,reply:'我今天想歇一歇，这次先谢过了。'};
 if(!p?.activities.includes(activity))return {willing:false,reply:p?.preference||'这不是我擅长的节目，先谢过了。'};
 if(activity==='tea'&&opinion<-.2)return {willing:false,reply:'我们还不太投契，今天先不单独茶谈了。'};
 return {willing:true,reply:p.yes};
}

// One finite table and one public stage. The same copper journal owns holds;
// no free coins, persistent occupancy, intimacy, pregnancy or parallel score.
export function createJapanPerformanceService({npcs,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted=()=>null,copperLedger,props=null,worldSeed=1,saved={},saveState=()=>{},notify=()=>{},isActorBusy=()=>false}){
 const cast=npcs.filter(n=>n.station.performance),server=cast.find(n=>n.station.id==='jp-performance-reception'),artists=cast.filter(n=>n!==server);
 const guestSeat=furniture.items.find(i=>i.id===GUEST),artistSeat=furniture.items.find(i=>i.id===ARTIST);if(!server||artists.length!==2||!guestSeat||!artistSeat)return null;
 let order=null,lastReply=clone(saved.lastReply),lastResult=null,time=Number(saved.time)||0,serial=Number(saved.serial)||0,disposed=false,paymentError=null,phase=0,elapsed=0,drinkPhase=0,conversation=null;
 const history=clone(saved.history)||[],responses=clone(saved.responses)||{},returns=new Set(),routes=new Map(),failures=[];
 let life;
 const persist=()=>{try{return saveState({serial,time,lastReply:clone(lastReply),history:clone(history.slice(-60)),responses:clone(responses),life:life?.snapshot()||saved.life||{}})!==false;}catch{return false;}};
 life=createLifeDecisions({worldSeed,actorIds:['player',...cast.map(n=>n.station.id)],saved:saved.life||{},onChange:()=>persist()});
 const artist=()=>artists.find(n=>n.station.id===order?.artistId);
 const eligible=n=>knownAdult(getPlayer())&&knownAdult(server)&&knownAdult(n);
 const atReception=()=>!!getPlayer()&&!getMounted()&&near(getPlayer(),P.reception,1.15);
 const record=(outcome,extra={})=>{const id=order?.id;if(!id)return;const eventId=id+':'+outcome;if(history.some(e=>e.eventId===eventId))return;history.push({eventId,orderId:id,outcome,activity:order.activity,artistId:order.artistId,participants:['player',order.artistId,server.station.id],time:+time.toFixed(2),...extra});if(history.length>90)history.shift();persist();};
 const opinion=n=>life.state(n.station.id)?.opinions?.player||0;
 const willingness=()=>performanceWillingness(artist(),order.activity,opinion(artist()));
 function recoverPayments(){if(order?.status==='refund-pending')finish('取消后重试退款');paymentError=copperLedger?.loadError||null;if(!copperLedger)return false;for(const h of copperLedger.reservations())if(h.id.startsWith('jp-performance-')&&h.status==='reserved'&&h.id!==order?.id+':act'&&h.id!==order?.id+':drink'){const r=copperLedger.refund(h.id);if(!r.ok)paymentError=r.code;}return !paymentError;}
 recoverPayments();
 function occupied(){
  const lock=furniture.facilities.state().find(f=>f.id===TABLE);if(lock?.owner&&lock.owner!==order?.id||lock?.player)return true;
  return npcs.some(n=>n!==artist()&&n!==server&&(near(n,guestSeat.anchor,.75)||near(n,artistSeat.anchor,.75)||near(n,P.stage,1.15)))||getMounted()?.id===ARTIST;
 }
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 function move(n,to,dt){
  n.walking=false;if(near(n,to))return true;if(conversation===n.station.id)return false;
  const key=to.join(',');let r=routes.get(n);
  if(!r||r.key!==key){r={key,path:planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25),stalled:0};routes.set(n,r);}
  const step=doors.routeStep(r.path,n.root.position,.04),p=step.waypoint;if(step.waiting)return false;
  if(p){const dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz),others=[...npcs.filter(a=>a!==n),getPlayer()].filter(Boolean);
   const blocked=others.some(a=>{const q=a.root.position,x=q.x-n.root.position.x,z=q.z-n.root.position.z;return Math.abs(q.y-n.root.position.y)<.6&&Math.hypot(x,z)<.63&&x*dx+z*dz>.004&&Math.abs(x*dz-z*dx)/Math.max(d,.001)<.45;});
   if(!blocked&&d>.001){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.8);moveActor(n,dx/d*amount,dz/d*amount,.25);n.root.rotation.y=Math.atan2(dx,dz);n.walking=n.root.position.distanceToSquared(before)>1e-9;}
  }
  r.stalled=n.walking?0:r.stalled+dt;if(r.stalled>2){routes.delete(n);if(order)order.stalls=(order.stalls||0)+1;if(order?.stalls>8){failures.push({orderId:order.id,actor:n.station.id,target:to,position:n.root.position.toArray()});cancel('通道暂时不便通行');}}
  return near(n,to);
 }
 function unseat(n){if(!n?.serviceMount)return true;const extra=[...npcs.filter(a=>a!==n),getPlayer()].filter(Boolean).map(a=>{const p=a.root.position;return {minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.9};});const landing=furniture.standPoint(undefined,extra,n.serviceMount);if(!landing)return false;n.root.position.copy(landing);n.serviceMount=null;return true;}
 function finish(reason,complete=false){
  if(!order)return false;
  for(const part of['act','drink']){const h=copperLedger.reservations().find(h=>h.id===order.id+':'+part);if(h?.status==='reserved'){const r=copperLedger.refund(h.id);if(!r.ok){paymentError=r.code;order.status='refund-pending';notify('未提供部分的退款暂未保存，请重开接待簿重试');return false;}}}
  record(complete?'completed':'cancelled',{reason,actComplete:order.actComplete,drinkComplete:order.drinkComplete,settlement:copperLedger.reservations().filter(h=>h.id.startsWith(order.id+':'))});
  life.complete('player',order.socialChoice,{fulfilled:false});
  const a=artist();if(a){returns.add(a);reset(a);}returns.add(server);reset(server);furniture.facilities.release(TABLE,order.id);lastResult={id:order.id,reason,complete};props?.clearOrder();order=null;phase=elapsed=drinkPhase=0;persist();return true;
 }
 function cancel(reason='你取消了这次安排'){const ok=finish(reason);if(ok)notify(reason+'；未提供部分已退回');return ok;}
 function enter(status){if(order){order.status=status;phase=0;record(status);}}
 function request(artistId,activity,drink=null){
  if(disposed||order||returns.size||!atReception())return false;const a=artists.find(n=>n.station.id===artistId),d=DRINKS.find(d=>d.id===drink);
  if(!a||!eligible(a)||!ACT[activity]||drink&&!d)return false;
  if(isActorBusy(a)||conversation===a.station.id){notify(`${a.station.npcName}还在和别人说话，稍后再来吧`);return false;}
  if(!recoverPayments()||occupied()){notify(paymentError?'铜钱账目尚未核对':'演艺茶席或舞台有人使用，稍后再来');return false;}
  const prior=responses[artistId];if(prior&&time-prior.at<15){notify(`${a.station.npcName}：${prior.reply}`);return false;}
  const id=`jp-performance-${worldSeed}-${++serial}-${copperLedger.state().nextTransaction}`;
  order={id,artistId,activity,drink:drink||null,status:'invited',fee:ACT[activity].fee+(d?.fee||0),paid:false,actComplete:false,drinkComplete:!d,drinkStatus:d?'waiting':'none',actSeconds:0,drinkSeconds:0,stalls:0};
  order.socialChoice=life.choose('player',[{id,targets:[{id:artistId}],socialEvent:{values:{company:activity==='tea'?1:.25,quiet:.4,curiosity:.6},strength:.06}}]);
  reset(a);elapsed=phase=drinkPhase=0;record('requested');notify(`绫乃：我请${a.station.npcName}亲自过来答复`);return true;
 }
 function respond(){
  const a=artist(),r=willingness();lastReply={name:a.station.npcName,artistId:a.station.id,...r};responses[a.station.id]={...lastReply,at:time};record(r.willing?'accepted-response':'refused',{reply:r.reply,positions:{player:getPlayer().root.position.toArray(),artist:a.root.position.toArray()}});notify(`${a.station.npcName}：${r.reply}`);
  if(!r.willing){finish('艺者婉拒');return;}
  if(occupied()||!furniture.facilities.request(TABLE,order.id)){finish('茶席已有人');notify('绫乃：茶席已有人，未收取铜钱');return;}enter('accepted');
 }
 function confirm(){
  if(!order||order.status!=='accepted'||!atReception()||!eligible(artist())||!near(artist(),P.reply,.15))return false;
  if(!willingness().willing||occupied()){cancel('艺者意愿或茶席状态已改变');return false;}
  if(copperLedger.state().cash<order.fee){notify(`本次需${order.fee}铜文，钱袋不足；可先取消安排，去中国酒馆做洒扫短工`);return false;}
  for(const [part,fee]of[['act',ACT[order.activity].fee],['drink',DRINKS.find(d=>d.id===order.drink)?.fee||0]])if(fee){const r=copperLedger.reserve(fee,order.id+':'+part);if(!r.ok){paymentError=r.code;cancel('预留未能保存');return false;}}
  order.paid=true;record('reserved',{amount:order.fee});enter('seating');reset(artist());notify('价目已确认，请到本次客席坐好；节目和饮品各自完成后结账');return true;
 }
 function settle(part){const r=copperLedger.settle(order.id+':'+part);if(!r.ok){paymentError=r.code;cancel('结算尚未记妥');return false;}paymentError=null;order[part+'Complete']=true;record(part+'-completed',{amount:part==='act'?ACT[order.activity].fee:DRINKS.find(d=>d.id===order.drink).fee});
  if(part==='act')life.observe('player',order.socialChoice,{observers:[{id:order.artistId,knowledge:'participant'}]});return true;}
 function pose(n,t,action=null,hands=null){
  const c={...poseContext(n,null),archery:hands?{hands}:null,heldProp:null,handoff:false};if(n.serviceMount)c.seatHeight=n.serviceMount.seatY-n.root.position.y-(c.visualFloorOffset||0);
  n.animate(t+(n.phase||0),n.walking,n.walking?null:action,c);
 }
 const labels={invited:'艺者前来亲自答复',reply:'听取艺者的回应',accepted:'本人已接受 · 等你确认价目',seating:'请到专属客席入座',performing:'正在表演或陪席茶谈',drinking:'节目已完成 · 饮品服务中','refund-pending':'退款待保存，请重开接待簿'};
 const api={request,confirm,cancel,atReception,recoverPayments,active:()=>!!order,seat:()=>guestSeat,
  owns:n=>cast.includes(n),socialStatus:n=>({busy:!!order||returns.has(n),attention:!order&&!returns.has(n),job:n.station.npcLabel}),
  furnitureAccess(item){if(item.id===ARTIST&&(order||returns.size)){notify('这是本次艺者陪席位置');return false;}return true;},
  leaveSeat(id){if(id===GUEST&&order?.paid&&order.status!=='seating')cancel('你提前离开了茶席');},
  playerPose(t=0){if(!order||getMounted()?.id!==GUEST||order.drinkStatus!=='drinking')return null;const sip=(Math.sin(t*1.15)+1)*.5;return {archery:{hands:[[-.18,.89,.24],[.14,1.02+sip*.28,.30-sip*.13]]}};},
  update(dt,t,{conversationActorId=null}={}){
   if(disposed)return;dt=Math.max(0,Math.min(.1,dt));time+=dt;life.tick(dt);conversation=conversationActorId;
   for(const n of cast)n.walking=false;
   if(order){elapsed+=dt;phase+=dt;if(!eligible(artist()))cancel('本次服务资格已改变');}
   if(order&&(!getPlayer()||Math.abs(getPlayer().root.position.y-7.6)>.5||elapsed>120))cancel('你已离开或本次等待过久');
   if(order&&['invited','reply','accepted'].includes(order.status)&&!atReception())cancel('你离开了接待案');
   if(order&&!['invited','reply','refund-pending'].includes(order.status)&&!willingness().willing)cancel('艺者想先歇息');
   if(order&&order.paid&&occupied())cancel('茶席或舞台被占用');
   if(order){const o=order,a=artist();
    if(o.status==='invited'){if(move(a,P.reply,dt)&&order===o)enter('reply');}
    else if(o.status==='reply'&&phase>=1.1)respond();
    else if(o.status==='seating'){
     if(o.activity==='tea'){
      if(move(a,artistSeat.position,dt)&&order===o&&furniture.canSit(undefined,[],artistSeat)){a.root.position.set(...artistSeat.anchor);a.root.rotation.y=-Math.PI/2;a.serviceMount=artistSeat;reset(a);}
     }else move(a,P.stage,dt);
     if(order===o&&getMounted()?.id===GUEST&&(o.activity==='tea'?!!a.serviceMount:near(a,P.stage,.15))){furniture.facilities.occupy(TABLE,o.id);enter('performing');record('participants-arrived',{positions:{player:getPlayer().root.position.toArray(),artist:a.root.position.toArray()}});}
    }else if(['performing','drinking'].includes(o.status)){
     if(getMounted()?.id!==GUEST||!near(getPlayer(),guestSeat.anchor,.2)){cancel('你提前离开了茶席');}
     else if(!o.actComplete){o.actSeconds+=dt;if(o.activity==='tea'&&o.actSeconds>=5&&!o.spoke){o.spoke=true;const words=o.artistId==='jp-salon-mai'?'舞：扇面开合很像风停在袖边。我喜欢慢慢看的人，也喜欢慢慢听。':'一郎：那位旅人以为雨声是掌声，连讲了三回。店主只好再添一壶茶。';notify(words);record('conversation',{words});}if(o.actSeconds>=ACT[o.activity].duration&&settle('act')&&order===o)enter('drinking');}
    }
    if(order===o&&o.paid&&o.drink&&!o.drinkComplete){
     if(o.drinkStatus==='waiting'){if(move(server,P.bar,dt)){drinkPhase+=dt;if(drinkPhase>=2){o.drinkStatus='carrying';drinkPhase=0;record('drink-prepared');}}}
     else if(o.drinkStatus==='carrying'){if(move(server,P.serve,dt)&&order===o){o.drinkStatus='serving';drinkPhase=0;}}
     else if(o.drinkStatus==='serving'&&getMounted()?.id===GUEST){drinkPhase+=dt;if(drinkPhase>=1.2){o.drinkStatus='drinking';drinkPhase=0;record('drink-delivered');reset(server);}}
     else if(o.drinkStatus==='drinking'){move(server,P.bar,dt);if(getMounted()?.id===GUEST){o.drinkSeconds+=dt;if(o.drinkSeconds>=6&&settle('drink')&&order===o)o.drinkStatus='finished';}}
    }
    if(order===o&&o.actComplete&&o.drinkComplete){finish('节目与饮品已完成',true);notify('这次演艺茶席已完成，绫乃按实际完成的服务结清铜文');}
   }
   for(const n of [...returns]){if(!unseat(n))continue;if(move(n,n.home.toArray(),dt)){returns.delete(n);reset(n);}}
   for(const n of cast){const a=order&&n===artist(),performing=a&&order.status==='performing',tea=a&&n.serviceMount;
    if(performing&&!tea)n.root.rotation.y=Math.PI+Math.sin(t*.45)*.10;
    let hands=null,action=tea?'chair-sit':n===server?'tea':'relax';
    if(performing&&order.activity==='dance'){const wave=Math.sin(t*1.4);hands=[[-.24,1.08,.22],[.38+wave*.08,1.40+wave*.20,.18]];action=null;}
    else if(performing&&order.activity==='story')action='read';
    if(tea){hands=[[-.18,.89,.26],[.18,.94+Math.sin(t*.7)*.06,.27]];n.root.rotation.y=-Math.PI/2;}
    if(n===server&&order?.drinkStatus==='carrying')hands=[[-.18,1.02,.32],[.18,1.02,.32]];
    pose(n,t,action,hands);const label=n.label?.querySelector?.('small');if(label)label.textContent=returns.has(n)?'返回歇场位置':a?labels[order.status]||n.station.npcLabel:n.station.npcLabel;
   }
   props?.update(order,{server,artist:artist(),player:getPlayer()},t);
  },
  view(){return {order:clone(order),label:order?labels[order.status]:returns.size?'艺者与侍者正在返位':null,lastReply:clone(lastReply),lastResult:clone(lastResult),candidates:artists.filter(eligible).map(n=>({id:n.station.id,name:n.station.npcName,ageYears:n.station.ageYears,specialty:n.station.performance.specialty,preference:n.station.performance.preference,available:!order&&!returns.size&&!isActorBusy(n),activities:n.station.performance.activities.map(id=>ACT[id])})),drinks:DRINKS,cash:copperLedger?.state().cash||0,paymentError,returning:returns.size>0};},
  state(){return {...api.view(),history:clone(history),failures:clone(failures),life:life.snapshot(),actors:cast.map(n=>({id:n.station.id,position:n.root.position.toArray(),mounted:n.serviceMount?.id||null})),props:props?.state()||null};},
  dispose(){if(disposed)return;finish('离开地区');disposed=true;for(const n of cast){n.serviceMount=null;reset(n);}returns.clear();props?.dispose();life.dispose();persist();}
 };return api;
}
