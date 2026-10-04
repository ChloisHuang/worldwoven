import * as THREE from 'three';
import {CHINA_CLINIC as C} from './china-clinic.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),distance=(p,a)=>Math.hypot(p.x-a[0],p.z-a[2]),copy=x=>JSON.parse(JSON.stringify(x));
const LABELS={consult:'许宁正在当面问询',writing:'许宁在纸上写下编号单',handoff:'二层平台当面核对编号',stock:'苏禾带原单下楼去备物间',prepare:'苏禾按号折好云纹包',counter:'苏禾把同号纸包带到柜台',ready:'云纹包已备好 · 下楼到一层药铺柜台按 E 领取',deliver:'苏禾当面交付同号云纹包',complete:'已收到云纹包 · 请收好'};

// One bounded player order. Numbers survive reloads; unfinished physical work
// is cancelled on departure, never remotely delivered or replayed as health.
export function createChinaClinicService({npcs,lot,doors,planPath,moveActor,poseContext,saved={},saveState=()=>{},notify=()=>{}}){
 const doctor=npcs.find(n=>n.station.id===C.roles[0].id),assistant=npcs.find(n=>n.station.id===C.roles[1].id);if(!doctor||!assistant||!lot.clinic)return null;
 const owned=new Set([doctor,assistant]),P=C.points,history=Array.isArray(saved.history)?saved.history.slice(-16):[],failures=[],travelState=new Map();
 let serial=Math.max(0,Number.isSafeInteger(saved.serial)?saved.serial:0),time=0,order=null,player=null,playerState={},disposed=false,request=false,phaseTime=0;
 const props=makeProps(lot.group),persist=()=>saveState({serial,history:copy(history)});
 const record=(event,details={})=>{history.push({event,orderId:order?.id||null,number:order?.number||null,time:+time.toFixed(2),...details});if(history.length>40)history.shift();};
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const near=(n,p,r=.055)=>distance(n.root.position,p)<r&&Math.abs(n.root.position.y-p[1])<.35;
 const seated=()=>playerState.facilityId===C.seatId&&player&&distance(player.root.position,P.consult)<.35&&Math.abs(player.root.position.y-P.consult[1])<.35;
 const atCounter=()=>player&&distance(player.root.position,P.counter)<.6&&Math.abs(player.root.position.y-C.floorY)<.4;
 const present=()=>player&&player.root.position.x>=15.5&&player.root.position.x<=26.5&&player.root.position.z>=-33.5&&player.root.position.z<=-21.5&&player.root.position.y>=C.floorY-.4&&player.root.position.y<=C.clinicFloorY+.4;
 function enter(stage){order.stage=stage;phaseTime=0;for(const n of owned){travelState.delete(n);n.route=[];}record(stage);}
 function cancel(reason='你离开了医馆，本次未交付的单已取消'){
  if(!order)return false;record(order.stage==='complete'?'close':'cancel',{reason});order=null;phaseTime=0;request=false;player=null;
  for(const n of owned){n.route=[];travelState.delete(n);n.walking=false;}props.clear();persist();return true;
 }
 function travel(n,to,dt){
  n.walking=false;if(near(n,to)){n.route=[];return true;}
  if(playerState.conversationActorId===n.station.id)return false;
  let s=travelState.get(n);if(!s||s.key!==to.join(',')){s={key:to.join(','),stalled:0,reported:false};travelState.set(n,s);n.route=planPath(n.root.position,point(to),.25);}
  const step=doors.routeStep(n.route,n.root.position,.035);if(step.waiting)return false;
  const p=step.waypoint;if(!p){s.stalled+=dt;if(s.stalled>3&&!s.reported){failures.push({actor:n.station.id,stage:order?.stage||'return',to:to.slice(),position:n.root.position.toArray()});s.reported=true;}return false;}
  const dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
  const others=[...npcs.filter(a=>a!==n).map(a=>a.root.position),...(player?[player.root.position]:[])];
  if(others.some(o=>Math.abs(o.y-n.root.position.y)<.7&&Math.hypot(o.x-n.root.position.x,o.z-n.root.position.z)<.64&&(o.x-n.root.position.x)*dx+(o.z-n.root.position.z)*dz>.001&&Math.abs((o.x-n.root.position.x)*dz-(o.z-n.root.position.z)*dx)/Math.max(d,.001)<.52))return false;
  if(d>.001){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.75);moveActor(n,dx/d*amount,dz/d*amount,.25);n.root.rotation.y=Math.atan2(dx,dz);n.walking=before.distanceToSquared(n.root.position)>1e-9;}
  s.stalled=n.walking?0:s.stalled+dt;if(s.stalled>2){travelState.delete(n);n.route=[];}return near(n,to);
 }
 function face(n,p){n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);}
 function animate(n,t,action=null,target=null,holding=false){
  const context=poseContext(n,null);context.handoff=holding;context.heldProp=null;context.receptionWriting=action==='calligraphy';
  context.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;context.workDistance=target?distance(n.root.position,target)/(n.characterScale||1):undefined;
  if(target&&!n.walking)face(n,target);n.animate(t+n.phase,n.walking,action,context);
  // Folding the authored order packet uses existing hand reaches, without a
  // cleaning rag or food prop appearing in place of the paper being handled.
  if(action==='tidy'&&n.root.userData.tools?.cloth)n.root.userData.tools.cloth.visible=false;
 }
 function beginConsultation(item,p){
  if(item?.id!==C.seatId||!p||distance(p.root.position,P.consult)>.35||Math.abs(p.root.position.y-P.consult[1])>.35)return false;
  if(order&&order.stage!=='complete'){notify('这张编号单还在办理中，请按原编号到药铺领取');return false;}
  if(order)cancel('已交付记录保留');player=p;order={id:'cn-clinic-order-'+(++serial),number:serial,stage:'consult',packetId:null,cardId:'cn-clinic-card-'+serial,cardHolder:'doctor',packetName:C.packet.name,claims:{doctor:doctor.station.id,assistant:null},createdAt:time};phaseTime=0;request=false;props.order(order);record('consult');persist();notify('许宁会当面问询，再写下编号单。写单前可起身取消');return true;
 }
 return {
  owns:n=>owned.has(n),ownsStation:id=>id===assistant.station.id,
  beginConsultation,
  leaveSeat(){if(order&&['consult','writing'].includes(order.stage)){cancel('写单前起身');notify('已起身，本次问诊取消');}},
  startPlayer(id,p){if(id!==assistant.station.id)return false;player=p;
   if(!order){notify('请先上二层医馆，在问诊椅坐下，由许宁写下编号单');return false;}
   if(order.stage==='complete'){notify('这份云纹包已经交付，新的问诊会使用下一编号');return false;}
   if(!atCounter()){notify('请到药铺柜台前领取');return false;}request=true;return true;
  },
  stopPlayer(){request=false;if(order?.stage==='deliver'){enter('ready');notify('交付暂停，纸包仍留在柜台，回来按 E 领取');}},
  cancel:()=>cancel('主动取消'),
  socialStatus(n){return owned.has(n)?{busy:!!order&&order.stage!=='complete',attention:!order||order.stage==='ready',job:order?LABELS[order.stage]:n===doctor?'在问诊室等候来客':'药铺柜台候单'}:null;},
  statusLabel(seatId){return seatId===C.seatId&&order?`第 ${order.number} 号 · ${LABELS[order.stage]}`:null;},
  playerStatus(){return request&&order?{label:`第 ${order.number} 号 · ${LABELS[order.stage]}`,progress:order.stage==='complete'?1:order.stage==='deliver'?phaseTime/1.3:0,complete:order.stage==='complete'}:null;},
  update(dt,t,state={}){
   if(disposed)return;playerState=state;if(state.player)player=state.player;time+=dt;for(const n of owned)n.walking=false;
   if(order&&!present())cancel('离开医馆，未交付订单释放');
   if(order&&['consult','writing'].includes(order.stage)&&!seated()){cancel('写单前离开问诊椅');notify('已离开问诊椅，本次问诊取消');}
   let da=null,aa=null,dtar=null,atar=null,dh=false,ah=false;
   const paused=state.conversationActorId===doctor.station.id||state.conversationActorId===assistant.station.id;
   if(!order){travel(doctor,P.doctor,dt);travel(assistant,P.assistant,dt);tell(doctor,'问诊室候诊 · 请坐问诊椅');tell(assistant,'药铺柜台候单');}
   else{
    tell(doctor,`第 ${order.number} 号 · ${['consult','writing','handoff'].includes(order.stage)?LABELS[order.stage]:'已开单 · 药铺按号交付'}`);tell(assistant,`第 ${order.number} 号 · ${['consult','writing'].includes(order.stage)?'等医师写好原单':LABELS[order.stage]}`);
    if(order.stage==='consult'){if(travel(doctor,P.doctor,dt)&&!paused){face(doctor,P.consult);phaseTime+=dt;if(phaseTime>=2.2)enter('writing');}}
    else if(order.stage==='writing'){if(travel(doctor,P.doctor,dt)&&!paused){da='calligraphy';dtar=P.paper;phaseTime+=dt;if(phaseTime>=3.4){order.writtenAt=time;order.claims.assistant=assistant.station.id;enter('handoff');notify(`第 ${order.number} 号单已写好。可起身下楼，到一层药铺柜台等苏禾备好云纹包`);}}}
    else if(order.stage==='handoff'){
     const a=travel(doctor,P.doctorHandoff,dt),b=travel(assistant,P.assistantHandoff,dt);dh=true;
     if(a&&b&&!paused){face(doctor,P.assistantHandoff);face(assistant,P.doctorHandoff);ah=true;phaseTime+=dt;if(phaseTime>=1.3){order.cardHolder='assistant';record('card-received',{cardId:order.cardId,from:doctor.station.id,to:assistant.station.id});order.claims.doctor=null;enter('stock');}}
    }else{
     travel(doctor,P.doctor,dt);
     if(order.stage==='stock'){ah=true;if(travel(assistant,P.stock,dt)&&!paused)enter('prepare');}
     else if(order.stage==='prepare'){aa='tidy';atar=P.stockWork;if(near(assistant,P.stock)&&!paused){phaseTime+=dt;if(phaseTime>=4){order.packetId='cn-clinic-packet-'+order.number;record('packet-prepared',{cardId:order.cardId,packetId:order.packetId});enter('counter');}}}
     else if(order.stage==='counter'){ah=true;if(travel(assistant,P.assistant,dt)&&!paused){enter('ready');notify(`第 ${order.number} 号云纹包已到柜台，请当面按 E 领取`);}}
     else if(order.stage==='ready'){face(assistant,P.counter);if(request&&atCounter()&&near(assistant,P.assistant)&&!paused)enter('deliver');}
     else if(order.stage==='deliver'){ah=true;face(assistant,P.counter);if(!request||!atCounter()){enter('ready');request=false;}else if(!paused){phaseTime+=dt;if(phaseTime>=1.3){order.cardHolder='delivered';order.claims={doctor:null,assistant:null};order.deliveredAt=time;enter('complete');record('delivered',{cardId:order.cardId,packetId:order.packetId,playerPosition:player.root.position.toArray()});persist();notify(`第 ${order.number} 号云纹包已交给你，请收好`);}}}
    }
   }
   animate(doctor,t,da,dtar,dh);animate(assistant,t,aa,atar,ah);props.update(order,{doctor,assistant},phaseTime);
  },
  state(){return {serial,order:order?copy(order):null,request,history:copy(history),failures:copy(failures),actors:[doctor,assistant].map(n=>({id:n.station.id,ageYears:n.station.ageYears,position:n.root.position.toArray(),walking:n.walking})),healthEffects:false};},
  dispose(){if(disposed)return;cancel('离开地区');disposed=true;for(const n of owned){n.route=[];if(n.poseContext){n.poseContext.handoff=false;n.poseContext.receptionWriting=false;}}props.dispose();}
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
