import * as THREE from 'three';
import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {validEgyptArchiveReceipt} from './egypt-archive-role.js';
export const EGYPT_ARCHIVE_POINTS=Object.freeze({registry:[-5.35,0,9.55],home:[-3.6,0,7.1],desk:[-3.6,0,9.55],top:[-3.6,1.30,8.35],storage:[-1.4,0,8.35],storageTop:[-2.23,1.3,8.35]});
const P=EGYPT_ARCHIVE_POINTS,ACTOR='egypt-royal-reception',copy=structuredClone,INT=n=>Number.isSafeInteger(n)&&n>=0;
const validId=id=>typeof id==='string'&&/^egypt-artisan-[1-8]$/.test(id),workId=id=>typeof id==='string'&&/^eg-archive-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
const WORK={register:{position:P.desk,target:P.top,action:'核对已验原卷并登记原编号',pose:'write',duration:4,next:'pickup'},pickup:{position:P.desk,target:P.top,action:'按登记号拿起同一原卷',pose:'tidy',duration:2,next:'store'},store:{position:P.storage,target:P.storageTop,action:'将原卷放入接待案右侧同号格',pose:'tidy',duration:3,next:null}};
const fresh=()=>({version:1,revision:0,time:0,order:null,archived:[],receipts:[],duty:null});
const at=(n,p,r=.25)=>!!n&&Math.abs(n.root.position.y-p[1])<.35&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
function valid(s,accepted){
 if(!s||s.version!==1||!INT(s.revision)||!Number.isFinite(s.time)||s.time<0||!Array.isArray(s.archived)||s.archived.length>8||new Set(s.archived).size!==s.archived.length||s.archived.some((id,i)=>!validId(id)||!accepted.includes(id)||id!==accepted[i])||!Array.isArray(s.receipts)||s.receipts.some(r=>!validEgyptArchiveReceipt(r)||!accepted.includes(r.orderId)||r.completed&&!s.archived.includes(r.orderId))||new Set(s.receipts.map(r=>r.id)).size!==s.receipts.length||s.duty&&(!workId(s.duty.receiptId)||!['paused','draining','active'].includes(s.duty.status)))return false;
 const o=s.order;return !o||validId(o.id)&&accepted.includes(o.id)&&o.id===accepted[s.archived.length]&&!s.archived.includes(o.id)&&o.number===Number(o.id.split('-').at(-1))&&['pickup','store'].includes(o.stage)&&['desk','npc','player'].includes(o.holder)&&(o.stage==='store'?o.holder!=='desk':o.holder==='desk')&&Number.isFinite(o.startedAt)&&o.startedAt>=0&&o.startedAt<=s.time&&(o.workReceiptId===null||workId(o.workReceiptId))&&typeof o.abandoned==='boolean';
}
export function createEgyptArchiveService({npcs,lot,doors,planPath,moveActor,poseContext=()=>({}),getPlayer,getMounted=()=>null,getAccepted=()=>[],upstreamNeedsClient=()=>false,upstreamOwnsClient=()=>false,canBorrow=()=>true,saved=null,saveState=()=>false}){
 const actor=npcs.find(n=>n.station.id===ACTOR);if(!actor)return null;
 const accepted=()=>{const ids=getAccepted();return Array.isArray(ids)&&ids.length<=8&&ids.every((id,i)=>id===`egypt-artisan-${i+1}`)?ids:[];};
 let state=fresh(),error=null,disposed=false,meeting=false,step=null,npcStep=null,borrowing=false,routeKey=null;
 if(saved!=null){if(valid(saved,accepted()))state=copy(saved);else error='invalid-archive-state';}
 function commit(change){if(error)return false;const s=copy(state);change(s);s.revision++;if(!valid(s,accepted()))return false;try{const r=saveState(copy(s));if(r===false||r?.ok===false||r?.then)return false;state=s;return true;}catch{return false;}}
 const available=()=>actor.alive!==false&&!actor.serviceMount&&!isSociallyHeld(ACTOR)&&canBorrow()&&!upstreamOwnsClient();
 const active=id=>state.duty?.receiptId===id&&state.duty.status==='active';
 const local=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y)<.35&&p.x>=-6.2&&p.x<=.2&&p.z>=6.4&&p.z<=11;};
 const held=()=>state.order?.holder==='player',playerOrder=()=>!!state.order?.workReceiptId&&state.order.workReceiptId===state.duty?.receiptId&&!state.order.abandoned;
 const nextId=()=>accepted().find(id=>!state.archived.includes(id))||null;
 function travel(target,dt){actor.walking=false;if(at(actor,target,.06)){actor.route=[];routeKey=null;return true;}const key=target.join(',');if(routeKey!==key||!actor.route.length){actor.route=planPath(actor.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routeKey=key;}followActorRoute(actor,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});return at(actor,target,.06);}
 const face=(n,p)=>n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);
 function proof(o,completed){const waitSeconds=Math.max(0,state.time-o.startedAt),timely=waitSeconds<=180;return {source:'egypt-archive',id:o.id+'-archive-'+o.workReceiptId,workReceiptId:o.workReceiptId,orderId:o.id,number:o.number,customerId:ACTOR,customerName:'阿赫',itemId:o.id+'-scroll',supplyReceipt:o.id+'-materials',outcome:completed?timely?'completed':'late':'handoff',completed,accurate:completed,timely,waitSeconds};}
 function workIntent(id){if(!active(id)||step||state.order&&!playerOrder())return null;const orderId=state.order?.id||nextId();if(!orderId)return null;const stage=state.order?.stage||'register',work=copy(WORK[stage]);work.target[1]+=(Number(orderId.split('-').at(-1))-1)*.04;return {...work,stage,orderId,number:Number(orderId.split('-').at(-1)),key:orderId+':'+stage,executionRadius:.25,action:`${Number(orderId.split('-').at(-1))}号已验原卷 · ${WORK[stage].action}`};}
 function advance(w,worker){if(!accepted().includes(w.orderId))return false;if(w.stage==='register'){if(state.order||nextId()!==w.orderId)return false;return commit(s=>s.order={id:w.orderId,number:Number(w.orderId.split('-').at(-1)),stage:'pickup',holder:'desk',startedAt:s.time,workReceiptId:worker==='player'?s.duty.receiptId:null,abandoned:false});}
 const o=state.order;if(!o||o.id!==w.orderId||o.stage!==w.stage||worker==='player'&&(!playerOrder()||!active(o.workReceiptId))||w.stage==='store'&&o.holder!==worker)return false;
 return commit(s=>{if(w.stage==='pickup'){s.order.holder=worker;s.order.stage='store';}else{if(worker==='player'&&!o.abandoned)s.receipts.push(proof(o,true));s.archived.push(o.id);s.order=null;}});}
 const duty={registry:P.registry.slice(),meetingReady:()=>available()&&!upstreamNeedsClient()&&at(actor,P.home,.25)&&!npcStep&&(!state.order||playerOrder()),inWorkplace:local,dutyActive:active,canClaimDuty:()=>available()&&!getMounted(),
 holdDuty(id){if(state.duty)return state.duty.receiptId===id;return commit(s=>s.duty={receiptId:id,status:'paused'});},claimDuty(id){if(!this.canClaimDuty()||state.duty&&state.duty.receiptId!==id)return false;return commit(s=>s.duty={receiptId:id,status:'draining'});},
 releaseDuty(id,{evaluate=false}={}){if(state.duty&&state.duty.receiptId!==id||held()&&!at(getPlayer(),P.desk,.3))return false;const ok=commit(s=>{const o=s.order;if(evaluate&&o?.workReceiptId&&!o.abandoned){const r=proof(o,false);if(!s.receipts.some(x=>x.id===r.id))s.receipts.push(r);o.abandoned=true;}if(o?.holder==='player'){o.holder='desk';o.stage='pickup';}s.duty=null;});if(ok)step=null;return ok;},
 canEndDuty:id=>active(id)&&!step&&!held()&&(!state.order||!playerOrder()),requestMeeting:v=>{meeting=!!v;},dutyState:()=>copy(state.duty||{status:'inactive',receiptId:null}),workReceipts:id=>copy(state.receipts.filter(r=>r.workReceiptId===id)),workIntent,
 executeWork(w,id){const expected=workIntent(id);if(!expected||w.key!==expected.key||getMounted()||!at(getPlayer(),expected.position,.25))return false;step={...expected,receiptId:id,elapsed:0};return true;},isActing:()=>!!step,held,stopWorkAction(){step=null;},returnPosition:()=>P.desk.slice(),
 workLabel:()=>step?.action||(state.duty?.status==='draining'?'等阿赫完成原事务回接待案交班':state.duty?.status==='paused'?'登记班已暂停 · 原卷保留，请当面接回':state.order?`${state.order.number}号已验原卷 · ${WORK[state.order.stage].action}`:nextId()?'已有阿赫验收的原卷待登记收存':accepted().length===8?'八份原卷已全数收存 · 可交班':'等萨米拉原卷由阿赫验收 · 可交班'),
 playerPose:()=>step||held()?{action:step?.pose||null,station:step?{workTarget:step.target.slice()}:null,workTarget:step?.target?.slice(),handoff:held(),archery:held()?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null}:null};
 // One mesh per actual accepted identity; positions change, identities never do.
 const root=new THREE.Group();root.name='阿赫原号卷轴收存';root.userData.dynamic=true;lot.group.add(root);
 const geo=new THREE.BoxGeometry(.56,.025,.4),mat=new THREE.MeshToonMaterial({color:0xe9d4a3}),inkGeo=new THREE.BoxGeometry(.035,.007,.27),inkMat=new THREE.MeshToonMaterial({color:0x246d87}),papers=new Map();
 function visual(){for(const id of accepted()){let mesh=papers.get(id);if(!mesh){mesh=new THREE.Mesh(geo,mat);mesh.name=id+'-scroll';mesh.userData.orderId=id;for(let i=0;i<5;i++){const ink=new THREE.Mesh(inkGeo,inkMat);ink.position.set(-.19+i*.09,.018,0);mesh.add(ink);}root.add(mesh);papers.set(id,mesh);}const number=Number(id.split('-').at(-1)),o=state.order?.id===id?state.order:null,holder=o?.holder==='player'?getPlayer():o?.holder==='npc'?actor:null;mesh.userData.archiveNumber=number;mesh.userData.archived=state.archived.includes(id);if(holder){holder.root.updateWorldMatrix(true,true);const hands=holder.root.userData.hands;if(hands?.length>=2)mesh.position.copy(hands[0].getWorldPosition(new THREE.Vector3())).add(hands[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);else mesh.position.copy(holder.root.position).add(new THREE.Vector3(0,1.25,.4));mesh.rotation.y=holder.root.rotation.y;}else{const p=state.archived.includes(id)?P.storageTop:P.top;mesh.position.set(p[0],p[1]+(number-1)*.04,p[2]);mesh.rotation.y=0;}}}
 visual();
 function update(dt,t=0){if(disposed||error)return;dt=Math.min(.1,Math.max(0,dt));state.time+=dt;borrowing=false;
 if(state.duty?.status==='active'&&(!local()||getMounted())){if(commit(s=>s.duty.status='paused'))step=null;}
 if(available()){
  const o=state.order,needNpc=!!o&&!playerOrder()||!state.duty&&!meeting&&!!nextId();
  // Original commission acceptance always has priority. Return the same carried
  // archive scroll to the desk first; never teleport it or let a player accept it.
  if(upstreamNeedsClient()){
   borrowing=true;npcStep=null;const returning=o?.holder==='npc';const target=returning?P.desk:P.home;
   if(travel(target,dt)&&returning)commit(s=>{s.order.holder='desk';s.order.stage='pickup';});
   actor.animate?.(t+(actor.phase||0),!!actor.walking,null,{...poseContext(actor,null),heldProp:null,handoff:returning,archery:returning?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null});
  }else if(needNpc||meeting||state.duty||!at(actor,P.home,.06)){
   borrowing=true;if(needNpc){const stage=o?.stage||'register',w={...copy(WORK[stage]),stage,orderId:o?.id||nextId()};w.target[1]+=(Number(w.orderId.split('-').at(-1))-1)*.04;if(travel(w.position,dt)){face(actor,w.target);if(!npcStep||npcStep.stage!==stage||npcStep.orderId!==w.orderId)npcStep={stage,orderId:w.orderId,elapsed:0};npcStep.elapsed+=dt;if(npcStep.elapsed>=w.duration&&advance(w,'npc'))npcStep=null;}else npcStep=null;actor.animate?.(t+(actor.phase||0),!!actor.walking,actor.walking?null:w.pose,{...poseContext(actor,{workTarget:w.target}),heldProp:null,handoff:state.order?.holder==='npc',archery:state.order?.holder==='npc'?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null});
   }else{npcStep=null;if(travel(P.home,dt)&&state.duty?.status==='draining'&&local()&&!getMounted())commit(s=>s.duty.status='active');actor.animate?.(t+(actor.phase||0),!!actor.walking,null,{...poseContext(actor,null),heldProp:null,handoff:false,archery:null});}
  }else npcStep=null;
 }else npcStep=null;
 if(step){const w=step;if(!active(w.receiptId)||getMounted()||!at(getPlayer(),w.position,.27)||getPlayer().walking)step=null;else{face(getPlayer(),w.target);w.elapsed+=dt;if(w.elapsed>=w.duration&&advance(w,'player'))step=null;}}
 visual();}
 return {duty,update,owns:n=>n===actor&&borrowing,canAcceptOriginal:()=>!error&&at(actor,P.home,.3)&&state.order?.holder!=='npc'&&!npcStep,
 socialStatus:n=>n===actor&&borrowing?{busy:!!npcStep||meeting||state.order?.holder==='npc',canPause:!npcStep&&!meeting&&state.order?.holder!=='npc',attention:!npcStep&&!meeting&&state.order?.holder!=='npc',job:duty.workLabel()}:null,
 canTalkAtPost:n=>n===actor&&borrowing&&!npcStep&&!meeting&&state.order?.holder!=='npc'&&!actor.walking,canBorrowForSocial:n=>n===actor&&borrowing&&!npcStep&&!meeting&&state.order?.holder!=='npc',
 state:()=>({...copy(state),lastError:error,step:step?{stage:step.stage,elapsed:step.elapsed}:null}),snapshot:()=>copy(state),restore(s){if(!valid(s,accepted())||s.revision!==state.revision)return false;state=copy(s);step=null;npcStep=null;visual();return true;},dispose(){disposed=true;step=null;npcStep=null;root.removeFromParent();geo.dispose();mat.dispose();inkGeo.dispose();inkMat.dispose();}};
}
