import {followActorRoute} from './actor-navigation.js';
import * as THREE from 'three';
import {CHINA_CLINIC as C} from './china-clinic.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),distance=(p,a)=>Math.hypot(p.x-a[0],p.z-a[2]),copy=x=>JSON.parse(JSON.stringify(x));
const PATIENTS=new Set(['cn-tavern-diner-west','cn-tavern-diner-east']),OFF=[24.6,4.015,-24.3];
const LABELS={arriving:'来客正上楼候诊',consult:'许宁正在当面问询',writing:'许宁在纸上写下编号单',handoff:'二层平台当面核对编号',stock:'苏禾带原单下楼去备物间',prepare:'苏禾按号折好云纹包',counter:'苏禾把同号纸包带到柜台',ready:'云纹包已备好 · 下楼到一层药铺柜台按 E 领取',deliver:'当面交付同号云纹包',complete:'已收到云纹包 · 请收好',cancelled:'未交付 · 返回原处'};

// One real recipient/order at a time. The existing patient service and salaried
// assistant share the same physician, numbered paper, packet and delivery proof.
export function createChinaClinicService({npcs,lot,doors,planPath,moveActor,poseContext,furniture=null,navigation=lot.navigation||{},
 getPlayer=()=>null,getMounted=()=>null,isAssistantHired=()=>false,getEmployment=()=>null,
 claimPatient=()=>false,releasePatient=()=>false,patientClaims=()=>[],patientAvailable=()=>true,
 saved={},saveState=()=>{},notify=()=>{},onInteraction=()=>{}}){
 const doctor=npcs.find(n=>n.station.id===C.roles[0].id),assistant=npcs.find(n=>n.station.id===C.roles[1].id);if(!doctor||!assistant||!lot.clinic)return null;
 const nextPatientAttempt=new Map(),owned=new Set([doctor,assistant]),P=C.points,history=Array.isArray(saved.history)?saved.history.slice(-40):[],failures=[],travelState=new Map();
 let serial=Math.max(0,Number.isSafeInteger(saved.serial)?saved.serial:0),revision=saved.revision||0,time=0,order=null,player=null,playerState={},disposed=false,request=false,phaseTime=0,meeting=false,workAction=null;
 const workReceipts=Array.isArray(saved.workReceipts)?saved.workReceipts.slice(-8):[],props=makeProps(lot.group);
 const patient=()=>order&&PATIENTS.has(order.recipientId)?npcs.find(n=>n.station.id===order.recipientId):null;
 const npcOrder=()=>!!patient(),worker=()=>order?.worker==='player'?player:assistant;
 const label=()=>order?(LABELS[order.stage]||'').replaceAll('苏禾',order.worker==='player'?'你':'苏禾'):null;
 const durable=()=>({version:2,revision,serial,history:copy(history),order:npcOrder()?copy(order):null,workReceipts:copy(workReceipts)});
 const persist=()=>{try{const next={...durable(),revision:revision+1},result=saveState(next);if(result===false||result?.then)return false;revision++;return true;}catch{return false;}};
 const record=(event,details={})=>{history.push({event,orderId:order?.id||null,number:order?.number||null,time:+time.toFixed(2),...details});if(history.length>40)history.shift();};
 const tell=(n,text)=>{const el=n?.label?.querySelector?.('small');if(el)el.textContent=text;};
 const near=(n,p,r=.055)=>!!n&&distance(n.root.position,p)<r&&Math.abs(n.root.position.y-p[1])<.35;
 const seated=()=>npcOrder()?patient().serviceMount?.id===C.seatId&&near(patient(),P.consult,.35):playerState.facilityId===C.seatId&&near(player,P.consult,.35);
 const atCounter=()=>near(npcOrder()?patient():player,P.counter,.6);
 const present=()=>player&&player.root.position.x>=15.5&&player.root.position.x<=26.5&&player.root.position.z>=-33.5&&player.root.position.z<=-21.5&&player.root.position.y>=C.floorY-.4&&player.root.position.y<=C.clinicFloorY+.4;
 function enter(stage){order.stage=stage;phaseTime=0;workAction=null;for(const n of owned){travelState.delete(n);n.route=[];}record(stage);persist();}
 function cancel(reason='你离开了医馆，本次未交付的单已取消'){
  if(!order)return false;record(order.stage==='complete'?'close':'cancel',{reason});request=false;workAction=null;
  if(npcOrder()){order.claims={doctor:null,assistant:null};order.patientPhase='returning';enter('cancelled');return true;}
  order=null;phaseTime=0;player=null;for(const n of owned){n.route=[];travelState.delete(n);n.walking=false;}props.clear();persist();return true;
 }
 function travel(n,to,dt){
  n.walking=false;if(near(n,to)){n.route=[];return true;}if(playerState.conversationActorId===n.station.id)return false;
  let s=travelState.get(n);if(!s||s.key!==to.join(',')){s={key:to.join(','),retryAt:0,reported:false};travelState.set(n,s);n.route=[];}
  if(!n.route.length&&time>=s.retryAt){s.retryAt=time+2;n.route=planPath(n.root.position,point(to),.25);if(!n.route.length&&!s.reported){failures.push({actor:n.station.id,stage:order?.stage||'return',to:to.slice(),position:n.root.position.toArray()});s.reported=true;}}
  followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:player?.root.position,speedScale:.75,arrivalTolerance:.035});return near(n,to);
 }
 function face(n,p){n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);}
 function animate(n,t,action=null,target=null,holding=false){
  const context=poseContext(n,null);context.handoff=holding;context.heldProp=null;context.receptionWriting=action==='calligraphy';
  context.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;context.workDistance=target?distance(n.root.position,target)/(n.characterScale||1):undefined;
  if(n.serviceMount){context.seatHeight=n.serviceMount.seatY-n.root.position.y-(context.visualFloorOffset||0);action='chair-sit';}
  if(target&&!n.walking)face(n,target);n.animate(t+n.phase,n.walking,action,context);
  if(action==='tidy'&&n.root.userData.tools?.cloth)n.root.userData.tools.cloth.visible=false;
 }
 const safety=n=>npcs.filter(other=>other!==n).map(other=>{const p=other.root.position;return {minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95};}).concat(player?[{minX:player.root.position.x-.34,maxX:player.root.position.x+.34,minZ:player.root.position.z-.34,maxZ:player.root.position.z+.34,minY:player.root.position.y,maxY:player.root.position.y+1.95}]:[]);
 function unmount(n){if(!n?.serviceMount)return true;const landing=furniture?.standPoint(navigation,safety(n),n.serviceMount);if(!landing)return false;n.root.position.copy(landing);n.serviceMount=null;furniture.releaseActor(n.station.id);travelState.delete(n);n.route=[];return true;}
 function mountPatient(dt){const n=patient(),seat=furniture?.items.find(s=>s.id===C.seatId);if(!n||!seat||getMounted()?.id===C.seatId)return false;
  if(n.serviceMount?.id===seat.id)return !!furniture.facilities.reserve(seat.id,n.station.id)&&furniture.facilities.occupy(seat.id,n.station.id);
  if(!furniture.facilities.reserve(seat.id,n.station.id,{purpose:'clinic-consult'})||!travel(n,seat.position,dt))return false;
  if(!furniture.canSit(navigation,safety(n),seat)||!furniture.facilities.occupy(seat.id,n.station.id))return false;
  n.root.position.set(...seat.anchor);n.root.rotation.y=seat.yaw;n.serviceMount=seat;order.patientPhase='consult';record('patient-seated',{recipientId:n.station.id});persist();return true;
 }
 function newOrder(recipientId,name){return {id:'cn-clinic-order-'+(++serial),number:serial,stage:recipientId==='player'?'consult':'arriving',recipientId,recipientName:name,patientPhase:recipientId==='player'?null:'consult',packetId:null,cardId:'cn-clinic-card-'+serial,cardHolder:'doctor',packetName:C.packet.name,worker:recipientId!=='player'&&isAssistantHired()&&getEmployment()?.stage==='working'?'player':'assistant',temporaryCover:recipientId!=='player'&&isAssistantHired()&&getEmployment()?.stage!=='working',workReceiptId:null,claims:{doctor:doctor.station.id,assistant:null},createdAt:time};}
 function considerPatient(n,status){
  if(disposed||order||!furniture||!PATIENTS.has(n?.station.id)||(n.ageYears??n.station.ageYears)<18||!Number.isFinite(n.ageYears??n.station.ageYears)||status?.careStatus!=='care-advised'||!status.symptoms?.length||!patientAvailable(n)||getMounted()?.id===C.seatId)return false;
  if(time<(nextPatientAttempt.get(n.station.id)||0))return false;nextPatientAttempt.set(n.station.id,time+5);const next=newOrder(n.station.id,n.station.npcName);if(!claimPatient(n.station.id,next.id)){serial--;return false;}
  order=next;owned.add(n);n.route=[];n.walking=false;travelState.delete(n);record('patient-admitted',{recipientId:n.station.id,reason:status.symptoms.join('；')});props.order(order);
  if(!persist()){order=null;owned.delete(n);releasePatient(n.station.id,next.id);props.clear();return false;}return true;
 }
 function beginConsultation(item,p){
  if(item?.id!==C.seatId||!p||distance(p.root.position,P.consult)>.35||Math.abs(p.root.position.y-P.consult[1])>.35)return false;
  if(order&&(npcOrder()||order.stage!=='complete')){notify('这张编号单还在办理中，请稍候');return false;}
  if(order)cancel('已交付记录保留');player=p;order=newOrder('player','你');phaseTime=0;request=false;props.order(order);record('consult');persist();notify('许宁会当面问询，再写下编号单。写单前可起身取消');return true;
 }
 function beginWork(receiptId){const job=getEmployment();if(!job||job.receiptId!==receiptId||job.stage!=='working'||!isAssistantHired())return false;
  if(npcOrder()&&order.worker==='player'&&!order.workReceiptId&&!['complete','cancelled'].includes(order.stage)){order.workReceiptId=receiptId;persist();}return true;
 }
 function workIntent(receiptId){if(!npcOrder()||order.worker!=='player'||order.workReceiptId!==receiptId||workAction)return null;
  const kind=order.stage==='handoff'?'take':order.stage==='stock'?'prepare':order.stage==='counter'?'deliver':null;if(!kind)return null;
  return {kind,key:[order.id,order.stage,receiptId].join(':'),orderId:order.id,recipientId:order.recipientId,number:order.number,cardId:order.cardId,packetId:order.packetId,position:(kind==='take'?P.assistantHandoff:kind==='prepare'?P.stock:P.assistant).slice(),executionRadius:.28,
   action:kind==='take'?`接第 ${order.number} 号原单 · ${order.recipientName}`:kind==='prepare'?`按第 ${order.number} 号原单折云纹包`:`核对第 ${order.number} 号 · 交给${order.recipientName}`};
 }
 function executeWork(choice,receiptId,p){const current=workIntent(receiptId),job=getEmployment();if(!current||job?.receiptId!==receiptId||job.stage!=='working'||!isAssistantHired()||getMounted()||!p||p.walking||!near(p,current.position,.28)||['kind','key','orderId','recipientId','number','cardId','packetId'].some(k=>choice?.[k]!==current[k]))return false;
  if(current.kind==='take'&&!near(doctor,P.doctorHandoff)||current.kind==='deliver'&&!atCounter()){notify('请等许宁或这一编号的来客就位，再核对交接');return false;}
  workAction={...current,elapsed:0,duration:current.kind==='prepare'?4:1.3,origin:p.root.position.toArray()};return true;
 }
 function delivered(){const recipient=npcOrder()?patient():player;if(!recipient||!atCounter()||!order.packetId)return false;
  const before=copy(order),size=history.length,receipts=copy(workReceipts);order.cardHolder='delivered';order.claims={doctor:null,assistant:null};order.deliveredAt=time;order.stage='complete';order.patientPhase=npcOrder()?'returning':null;
  const receipt={event:'delivered',orderId:order.id,number:order.number,time:+time.toFixed(2),cardId:order.cardId,packetId:order.packetId,recipientId:order.recipientId,recipientPosition:recipient.root.position.toArray(),dispenserId:order.worker==='player'?'player':assistant.station.id,...(!npcOrder()?{playerPosition:recipient.root.position.toArray()}:{}),workReceiptId:order.workReceiptId};history.push(receipt);
  if(order.worker==='player'&&order.workReceiptId&&!workReceipts.some(r=>r.orderId===order.id)){workReceipts.push({receiptId:order.workReceiptId,orderId:order.id,number:order.number,cardId:order.cardId,packetId:order.packetId,recipientId:order.recipientId,review:{evaluatorId:order.recipientId,positive:true,reason:'原单与云纹包同号，已当面交付本人'}});if(workReceipts.length>8)workReceipts.shift();}
  if(!persist()){order=before;history.splice(size);workReceipts.splice(0,workReceipts.length,...receipts);return false;}
  phaseTime=0;workAction=null;notify(npcOrder()?`第 ${order.number} 号云纹包已交给${order.recipientName}，请许宁验收`:`第 ${order.number} 号云纹包已交给你，请收好`);return true;
 }
 function contact(dt){order.deliveryContactTime=(order.deliveryContactTime||0)+dt;onInteraction({source:'china-clinic-delivery',id:order.id,number:order.number,sceneId:'china',participants:[order.worker==='player'?'player':assistant.station.id,order.recipientId||'player'],duration:order.deliveryContactTime});}
 function cancelWork(receiptId){workAction=null;if(order?.workReceiptId!==receiptId||['complete','cancelled'].includes(order.stage))return;order.workReceiptId=null;order.worker='assistant';order.cardHolder='doctor';order.packetId=null;order.claims={doctor:doctor.station.id,assistant:null};order.temporaryCover=true;if(['arriving','consult','writing'].includes(order.stage))persist();else enter('handoff');}
 function restoreOrder(candidate){if(!candidate)return null;const n=npcs.find(n=>n.station.id===candidate.recipientId);if(!PATIENTS.has(candidate.recipientId)||!n||!(n.station.ageYears>=18)||!LABELS[candidate.stage]||candidate.id!=='cn-clinic-order-'+candidate.number||candidate.cardId!=='cn-clinic-card-'+candidate.number||candidate.packetId&&candidate.packetId!=='cn-clinic-packet-'+candidate.number)return null;return copy(candidate);}
 if(saved.version===2&&saved.order){order=restoreOrder(saved.order);if(order)owned.add(patient());}
 return {
  owns:n=>owned.has(n),ownsStation:id=>id===assistant.station.id,borrowed:id=>id===order?.recipientId&&npcOrder(),considerPatient,
  furnitureAccess:item=>item.id!==C.seatId||!npcOrder(),beginConsultation,
  requestDoctor:requested=>{meeting=!!requested;},doctorReady:()=>near(doctor,P.doctorHandoff,.1)&&(!order||['complete','cancelled'].includes(order.stage)||order.stage==='handoff'&&order.worker==='player'),
  beginWork,workIntent,executeWork,cancelWork,canEndWork:receiptId=>!workAction&&(!order||order.workReceiptId!==receiptId||order.cardHolder!=='player'||order.stage==='complete'),finishWork:receiptId=>{workAction=null;if(order?.workReceiptId===receiptId&&!['complete','cancelled'].includes(order.stage))cancelWork(receiptId);},stopWorkAction:()=>{workAction=null;},workReceipt:id=>copy(workReceipts.find(r=>r.receiptId===id)||null),workReceipts:id=>copy(workReceipts.filter(r=>r.receiptId===id)),
  workLabel:()=>order&&npcOrder()?`第 ${order.number} 号 · ${order.recipientName} · ${label()}`:null,
  workPose:()=>order?.worker==='player'&&order.cardHolder==='player'?{handoff:!workAction||workAction.kind!=='prepare',action:workAction?.kind==='prepare'?'tidy':null,station:workAction?{position:workAction.position,playerWorkTarget:workAction.kind==='prepare'?P.stockWork:workAction.kind==='take'?P.doctorHandoff:P.counter}:null}:null,
  leaveSeat(){if(!npcOrder()&&order&&['consult','writing'].includes(order.stage)){cancel('写单前起身');notify('已起身，本次问诊取消');}},
  collectionIntent(){return order&&!npcOrder()&&!['consult','writing','complete'].includes(order.stage)?{action:`领取第 ${order.number} 号云纹包`,intentKey:order.id,executionRadius:.6}:null;},
  startPlayer(id,p,intentKey){if(id!==assistant.station.id)return false;player=p;if(!order||npcOrder()){notify('请先上二层医馆，在问诊椅坐下，由许宁写下编号单');return false;}if(order.stage==='complete'||['consult','writing'].includes(order.stage)||intentKey&&intentKey!==order.id){notify('请等当前编号单写好后领取，本次动作已失效');return false;}if(!atCounter()){notify('请到药铺柜台前领取');return false;}request=true;return true;},
  stopPlayer(){request=false;if(!npcOrder()&&order?.stage==='deliver'){enter('ready');notify('交付暂停，纸包仍留在柜台，回来按 E 领取');}},cancel:()=>cancel('主动取消'),
  socialStatus(n){return owned.has(n)?{busy:!!order&&order.stage!=='complete',attention:!order||order.stage==='ready',job:n===patient()?`来客 · ${label()}`:n===assistant&&isAssistantHired()&&!(!npcOrder()&&order)?'已交出独任岗位 · 休息候援':order?label():n===doctor?'在问诊室等候来客':'药铺柜台候单'}:null;},
  statusLabel(seatId){return seatId===C.seatId&&order?`第 ${order.number} 号 · ${label()}`:null;},
  playerStatus(){return request&&order?{label:`第 ${order.number} 号 · ${label()}`,progress:order.stage==='complete'?1:order.stage==='deliver'?phaseTime/1.3:0,complete:order.stage==='complete'}:null;},
  update(dt,t,state={}){
   if(disposed)return;playerState=state;player=state.player||getPlayer()||player;time+=dt;for(const n of owned)n.walking=false;
   // A saved lease is either the same patient/order or is safely released. No
   // actor may remain parked under a missing clinic controller after recovery.
   for(const claim of patientClaims())if(claim.claimId!==order?.id||claim.actorId!==order?.recipientId)releasePatient(claim.actorId,claim.claimId);
   if(order&&!npcOrder()&&!present())cancel('离开医馆，未交付订单释放');
   if(order&&!npcOrder()&&['consult','writing'].includes(order.stage)&&!seated()){cancel('写单前离开问诊椅');notify('已离开问诊椅，本次问诊取消');}
   const n=patient();if(n){if(!claimPatient(n.station.id,order.id)){cancel('原来客占用已失效');}else if(order.patientPhase==='returning'){
     if(unmount(n)&&travel(n,n.station.npcPosition,dt)&&releasePatient(n.station.id,order.id)){owned.delete(n);tell(n,n.station.npcLabel);order=null;props.clear();persist();}
    }else if(order.stage==='arriving'){if(mountPatient(dt))enter('consult');}
    else if(!['consult','writing'].includes(order.stage)){if(unmount(n)){order.patientPhase='counter';travel(n,P.counter,dt);}}
   }
   let da=null,aa=null,dtar=null,atar=null,dh=false,ah=false;
   const paused=state.conversationActorId===doctor.station.id||state.conversationActorId===assistant.station.id;
   if(!order){travel(doctor,meeting?P.doctorHandoff:P.doctor,dt);travel(assistant,isAssistantHired()?OFF:P.assistant,dt);aa=isAssistantHired()&&!assistant.walking?'read':null;tell(doctor,meeting?'二层平台 · 当面办理药铺登记':'问诊室候诊 · 请坐问诊椅');tell(assistant,isAssistantHired()?'已交出独任岗位 · 读书候援':'药铺柜台候单');}
   else{
    if(npcOrder()&&order.worker==='player'&&!isAssistantHired()&&!['complete','cancelled'].includes(order.stage)){order.worker='assistant';order.workReceiptId=null;persist();}
    if(npcOrder()&&order.worker==='player')beginWork(getEmployment()?.receiptId);
    const playerWorker=order.worker==='player';tell(doctor,`第 ${order.number} 号 · ${['arriving','consult','writing','handoff'].includes(order.stage)?label():'已开单 · 药铺按号交付'}`);tell(assistant,playerWorker?'已交出独任岗位 · 读书候援':isAssistantHired()?'临时代办来客单 · 不占正式岗位':`第 ${order.number} 号 · ${label()}`);
    if(playerWorker){travel(assistant,OFF,dt);aa=!assistant.walking?'read':null;}
    if(order.stage==='arriving')travel(doctor,P.doctor,dt);
    else if(order.stage==='consult'){if(seated()&&travel(doctor,P.doctor,dt)&&!paused){face(doctor,P.consult);phaseTime+=dt;if(phaseTime>=2.2)enter('writing');}}
    else if(order.stage==='writing'){if(seated()&&travel(doctor,P.doctor,dt)&&!paused){da='calligraphy';dtar=P.paper;phaseTime+=dt;if(phaseTime>=3.4){order.writtenAt=time;order.claims.assistant=playerWorker?'player':assistant.station.id;enter('handoff');if(!npcOrder())notify(`第 ${order.number} 号单已写好。可起身下楼，到一层药铺柜台等苏禾备好云纹包`);}}}
    else if(order.stage==='handoff'){
     const a=travel(doctor,P.doctorHandoff,dt);dh=true;
     if(!playerWorker){const b=travel(assistant,P.assistantHandoff,dt);if(a&&b&&!paused){face(doctor,P.assistantHandoff);face(assistant,P.doctorHandoff);ah=true;phaseTime+=dt;if(phaseTime>=1.3){order.cardHolder='assistant';record('card-received',{cardId:order.cardId,from:doctor.station.id,to:assistant.station.id});order.claims.doctor=null;enter('stock');}}}
    }else{
     travel(doctor,meeting?P.doctorHandoff:P.doctor,dt);
     if(!playerWorker){if(order.stage==='stock'){ah=true;if(travel(assistant,P.stock,dt)&&!paused)enter('prepare');}
      else if(order.stage==='prepare'){aa='tidy';atar=P.stockWork;if(near(assistant,P.stock)&&!paused){phaseTime+=dt;if(phaseTime>=4){order.packetId='cn-clinic-packet-'+order.number;record('packet-prepared',{cardId:order.cardId,packetId:order.packetId});enter('counter');}}}
      else if(order.stage==='counter'){ah=true;if(travel(assistant,P.assistant,dt)&&!paused){enter('ready');if(!npcOrder())notify(`第 ${order.number} 号云纹包已到柜台，请当面按 E 领取`);}}
      else if(order.stage==='ready'){face(assistant,P.counter);if((npcOrder()||request)&&atCounter()&&near(assistant,P.assistant)&&!paused)enter('deliver');}
      else if(order.stage==='deliver'){ah=true;face(assistant,P.counter);if((!npcOrder()&&!request)||!atCounter()){enter('ready');request=false;}else if(!paused){phaseTime+=dt;contact(dt);if(phaseTime>=1.3)delivered();}}
     }
    }
    if(workAction){const a=workAction;if(!getEmployment()||getEmployment().receiptId!==order.workReceiptId||getMounted()||player.walking||!near(player,a.origin,.035)){workAction=null;notify('已停下当前动作，原单仍在，可回原处继续');}
     else if(!paused&&(a.kind!=='take'||near(doctor,P.doctorHandoff))&&(a.kind!=='deliver'||atCounter())){a.elapsed+=Math.min(.1,Math.max(0,dt));if(a.kind==='deliver')contact(dt);if(a.elapsed>=a.duration){
      if(a.kind==='take'){order.cardHolder='player';order.claims={doctor:null,assistant:'player'};record('card-received',{cardId:order.cardId,from:doctor.station.id,to:'player'});enter('stock');}
      else if(a.kind==='prepare'){order.packetId='cn-clinic-packet-'+order.number;record('packet-prepared',{cardId:order.cardId,packetId:order.packetId,by:'player'});enter('counter');}
      else delivered();
     }}
    }
   }
   animate(doctor,t,da,dtar,dh);animate(assistant,t,aa,atar,ah);if(patient()){tell(patient(),`第 ${order.number} 号来客 · ${label()}`);animate(patient(),t);}
   props.update(order,{doctor,assistant:worker()||assistant},phaseTime);
  },
  snapshot:()=>({version:2,revision,serial,time,order:order?copy(order):null,request,phaseTime,history:copy(history),workReceipts:copy(workReceipts)}),
  restore(snapshot,{player:restoredPlayer}={}){if(![1,2].includes(snapshot?.version)||snapshot.order&&(!LABELS[snapshot.order.stage]||snapshot.order.id!=='cn-clinic-order-'+snapshot.order.number)||snapshot.revision!==undefined&&snapshot.revision<revision)return false;
   const next=snapshot.order?.recipientId&&snapshot.order.recipientId!=='player'?restoreOrder(snapshot.order):snapshot.order?{...copy(snapshot.order),recipientId:'player',recipientName:'你',worker:'assistant'}:null;if(snapshot.order&&!next)return false;
   for(const n of [...owned])if(n!==doctor&&n!==assistant)owned.delete(n);serial=Math.max(serial,snapshot.serial||0);revision=Math.max(revision,snapshot.revision||0);time=Math.max(0,snapshot.time||0);order=next;if(patient())owned.add(patient());phaseTime=Math.max(0,snapshot.phaseTime||0);request=!!snapshot.request;player=restoredPlayer||null;workAction=null;history.splice(0,history.length,...copy(snapshot.history||[]));if(snapshot.workReceipts)workReceipts.splice(0,workReceipts.length,...copy(snapshot.workReceipts));travelState.clear();for(const n of owned)n.route=[];props.update(order,{doctor,assistant:worker()||assistant},phaseTime);return true;},
  state(){return {serial,revision,order:order?copy(order):null,request,workAction:workAction?copy(workAction):null,workReceipts:copy(workReceipts),history:copy(history),failures:copy(failures),staffOwnership:{holderId:isAssistantHired()?'player':assistant.station.id,npcId:assistant.station.id,status:isAssistantHired()?order&&!npcOrder()||order?.temporaryCover?'temporary-cover':'off-duty':'on-duty'},actors:[...owned].map(n=>({id:n.station.id,ageYears:n.station.ageYears,position:n.root.position.toArray(),walking:n.walking})),healthEffects:false};},
  dispose({suspend=false}={}){if(disposed)return;if(!suspend)cancel('离开地区');disposed=true;for(const n of owned){n.route=[];if(n.poseContext){n.poseContext.handoff=false;n.poseContext.receptionWriting=false;}}props.dispose();}
 };
}
function makeProps(parent){
 const root=new THREE.Group();root.name='Clinic live numbered order';root.userData.dynamic=true;parent.add(root);const mats=new Map(),geos=new Set();let card=null,packet=null,number=0;
 const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshToonMaterial({color:c}));return mats.get(c);};
 const box=(q,w,h,d,c,x=0,y=0,z=0)=>{const geo=new THREE.BoxGeometry(w,h,d);geos.add(geo);const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);q.add(m);return m;};
 function digits(q,num){const seg=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'],layout={a:[0,.055,.07,.013],b:[.038,.026,.013,.045],c:[.038,-.026,.013,.045],d:[0,-.055,.07,.013],e:[-.038,-.026,.013,.045],f:[-.038,.026,.013,.045],g:[0,0,.07,.013]},s=String(num).padStart(2,'0');for(let i=0;i<s.length;i++)for(const k of seg[+s[i]]){const[x,y,w,h]=layout[k];box(q,w,h,.006,0x443e30,x+(i-(s.length-1)/2)*.105,y,.016);}}
 function makeCard(o){const q=new THREE.Group();q.name=o.cardId;q.userData={orderId:o.id,cardId:o.cardId,number:o.number};box(q,.50,.34,.023,0xf0e2bf);box(q,.45,.026,.029,0x8b5143,0,.13);digits(q,o.number);root.add(q);return q;}
 function makePacket(o){const q=new THREE.Group();q.name=o.packetId;q.userData={orderId:o.id,cardId:o.cardId,packetId:o.packetId,number:o.number};box(q,.37,.18,.27,0xc3a779);box(q,.035,.19,.28,0x466b62);box(q,.38,.19,.03,0x466b62);const tag=new THREE.Group();tag.position.set(0,.06,.151);tag.scale.setScalar(.7);box(tag,.34,.19,.018,0xecd9aa);digits(tag,o.number);q.add(tag);root.add(q);return q;}
 const hand=(q,n)=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands;if(h?.length===2){const a=h[0].getWorldPosition(new THREE.Vector3()),b=h[1].getWorldPosition(new THREE.Vector3());q.position.copy(a).add(b).multiplyScalar(.5);q.position.y-=.035;}else q.position.set(0,1,.4).applyMatrix4(n.root.matrixWorld);q.rotation.set(0,n.root.rotation.y,0);};
 function clear(){for(const q of[card,packet])if(q){q.traverse(m=>{if(m.geometry){m.geometry.dispose();geos.delete(m.geometry);}});q.removeFromParent();}card=packet=null;number=0;}
 return {order(o){clear();number=o.number;card=makeCard(o);},clear,
  update(o,actors,phaseTime){if(!o){clear();return;}if(number!==o.number){clear();number=o.number;card=makeCard(o);}card.visible=o.stage!=='consult'&&o.stage!=='complete';
   if(['writing'].includes(o.stage)){card.position.set(...C.points.paper);card.rotation.set(-Math.PI/2,0,0);}
   else if(o.cardHolder==='doctor')hand(card,actors.doctor);
   else if(['stock','counter'].includes(o.stage))hand(card,actors.assistant);
   else{card.position.set(...(o.stage==='prepare'?C.points.stockWork:C.points.counterTop));card.rotation.set(-Math.PI/2,0,0);}
   if(o.packetId&&!packet)packet=makePacket(o);if(packet){packet.visible=o.stage!=='complete';if(o.stage==='counter'||o.stage==='deliver'){hand(packet,actors.assistant);card.visible=false;}else{packet.position.set(C.points.counterTop[0]+.38,C.points.counterTop[1]+.10,C.points.counterTop[2]-.06);packet.rotation.set(0,0,0);}}
  },dispose(){clear();root.removeFromParent();for(const geo of geos)geo.dispose();for(const m of mats.values())m.dispose();}
 };
}
