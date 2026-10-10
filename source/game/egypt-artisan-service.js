import * as THREE from 'three';
import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {validEgyptArtisanReceipt} from './egypt-artisan-role.js';
const copy=structuredClone,INT=n=>Number.isSafeInteger(n)&&n>=0;
export const EGYPT_ARTISAN_POINTS=Object.freeze({registry:[-7.1,0,-1.15],home:[-7.75,0,-1.7],rest:[-7.8,0,-.4],desk:[-6.65,0,-1.95],top:[-6.65,1.18,-2.95],client:[-3.6,0,9.55],clientHome:[-3.6,0,7.1],clientTop:[-3.6,1.29,8.35]});
const P=EGYPT_ARTISAN_POINTS,ARTISAN='egypt-papyrus',CLIENT='egypt-royal-reception';
// Eight original reception scrolls, not a daily re-filled source of materials.
const TITLES=['柱廊来访图','河流纹样卷','太阳迎宾卷','莲花门庭卷','羽毛礼仪卷','石兽导览卷','庭院花叶卷','王殿路径卷'];
const WORK={request:{position:P.client,target:P.clientTop,action:'向阿赫记下卷轴委托',pose:'write',duration:2,next:'materials'},materials:{position:P.desk,target:P.top,action:'核号领取纸莎草与一份颜料',pose:'tidy',duration:2,next:'outline'},outline:{position:P.desk,target:P.top,action:'在原纸上描出纹样',pose:'write',duration:4,next:'paint'},paint:{position:P.desk,target:P.top,action:'调色绘完原卷',pose:'paint',duration:6,next:'pickup'},pickup:{position:P.desk,target:P.top,action:'核号卷起成品',pose:'tidy',duration:1,next:'deliver'},deliver:{position:P.client,target:P.clientTop,action:'呈给阿赫本人验收',pose:'tidy',duration:2,next:'accepted'}};
const fresh=()=>({version:1,revision:0,time:0,serial:0,lastRequestDay:-1,stock:{sheets:8,pigment:8},order:null,completed:[],materials:[],receipts:[],duty:null});
const at=(n,p,r=.25)=>!!n&&Math.abs(n.root.position.y-p[1])<.35&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
const workReceipt=id=>typeof id==='string'&&/^eg-papyrus-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
function valid(s){
 if(!s||s.version!==1||!INT(s.revision)||!INT(s.serial)||s.serial>8||!Number.isFinite(s.time)||s.time<0||
  !Number.isSafeInteger(s.lastRequestDay)||s.lastRequestDay< -1||(s.serial===0)!==(s.lastRequestDay===-1)||
  !s.stock||!INT(s.stock.sheets)||!INT(s.stock.pigment)||!Array.isArray(s.materials)||s.materials.length+s.stock.sheets!==8||s.stock.sheets!==s.stock.pigment||
  new Set(s.materials).size!==s.materials.length||s.materials.some(id=>typeof id!=='string'||!/^egypt-artisan-[1-8]-materials$/.test(id)||Number(id.split('-')[2])>s.serial)||
  !Array.isArray(s.completed)||s.completed.length+(s.order?1:0)!==s.serial||s.completed.some((id,i)=>id!==`egypt-artisan-${i+1}`||!s.materials.includes(id+'-materials'))||
  !Array.isArray(s.receipts)||s.receipts.some(r=>!validEgyptArtisanReceipt(r)||r.number>s.serial||r.completed&&(!s.completed.includes(r.orderId)||!s.materials.includes(r.supplyReceipt)))||
  new Set(s.receipts.map(r=>r.id)).size!==s.receipts.length||
  s.duty&&(!workReceipt(s.duty.receiptId)||!['paused','draining','active'].includes(s.duty.status)))return false;
 const o=s.order;if(!o)return true;
 return INT(o.number)&&o.number>0&&o.number===s.serial&&o.id===`egypt-artisan-${o.number}`&&o.title===TITLES[o.number-1]&&
  Number.isFinite(o.requestedAt)&&o.requestedAt>=0&&o.requestedAt<=s.time&&WORK[o.stage]&&o.stage!=='request'&&
  ['npc','player','desk'].includes(o.holder)&&(o.workReceiptId===null||workReceipt(o.workReceiptId))&&typeof o.abandoned==='boolean'&&
  (o.stage==='materials'?o.supplyReceipt===null:o.supplyReceipt===o.id+'-materials'&&s.materials.includes(o.supplyReceipt));
}
export function createEgyptArtisanService({npcs,lot,doors,planPath,moveActor,poseContext=()=>({}),getPlayer,getMounted=()=>null,getClock,externalAcceptedDisplay=false,canBorrow=()=>true,canUseClient=()=>true,saved=null,saveState=()=>false,notify=()=>{}}){
 const artisan=npcs.find(n=>n.station.id===ARTISAN),client=npcs.find(n=>n.station.id===CLIENT);if(!artisan||!client)return null;
 let state=fresh(),error=null,disposed=false,meeting=false,step=null,npcStep=null,borrowing=false,clientHeld=false;const routes=new Map();
 if(saved!=null){if(valid(saved))state=copy(saved);else error='invalid-artisan-state';}
 function commit(change){if(error)return false;const next=copy(state);change(next);next.revision++;if(!valid(next))return false;try{const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;return true;}catch{return false;}}
 const alive=n=>n?.alive!==false&&!n.serviceMount&&!isSociallyHeld(n.station.id),available=()=>alive(artisan)&&canBorrow(),clientReady=()=>alive(client)&&canUseClient()&&at(client,P.clientHome,.3);
 const active=id=>state.duty?.receiptId===id&&state.duty.status==='active';
 const local=()=>{const n=getPlayer(),p=n?.root.position;return !!p&&Math.abs(p.y)<.35&&p.x>=-9&&p.x<=1.6&&p.z>=-4.5&&p.z<=11;};
 const held=()=>state.order?.holder==='player';
 const playerOrder=()=>state.order?.workReceiptId&&state.order.workReceiptId===state.duty?.receiptId&&!state.order.abandoned;
 function travel(n,target,dt){if(!alive(n))return false;n.walking=false;if(at(n,target,.06)){n.route=[];routes.delete(n);return true;}const key=target.join(',');if(routes.get(n)!==key||!n.route.length){n.route=planPath(n.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routes.set(n,key);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});return at(n,target,.06);}
 const face=(n,p)=>{n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);};
 function proof(o,completed){const waitSeconds=Math.max(0,state.time-o.requestedAt),timely=waitSeconds<=180;return {source:'egypt-artisan',id:o.id+'-art-'+o.workReceiptId,workReceiptId:o.workReceiptId,orderId:o.id,number:o.number,customerId:CLIENT,customerName:'阿赫',itemId:o.id+'-scroll',supplyReceipt:o.id+'-materials',outcome:completed?timely?'completed':'late':'handoff',completed,accurate:completed,timely,waitSeconds};}
 function abandon(s){const o=s.order;if(o?.workReceiptId&&!o.abandoned){const r=proof(o,false);if(!s.receipts.some(x=>x.id===r.id))s.receipts.push(r);o.abandoned=true;}}
 const canRequest=()=>state.serial<8&&getClock().hour>=6&&getClock().hour<18&&state.lastRequestDay<getClock().day;
 function workIntent(id){if(!active(id)||step)return null;const o=state.order;if(o&&(!playerOrder()||o.abandoned))return null;const stage=o?.stage||'request';if(!o&&!canRequest())return null;const w=WORK[stage];return {...copy(w),stage,key:(o?.id||`egypt-artisan-${state.serial+1}`)+':'+stage,orderId:o?.id||`egypt-artisan-${state.serial+1}`,number:o?.number||state.serial+1,executionRadius:.25,action:`${o?.number||state.serial+1}号 ${o?.title||TITLES[state.serial]} · ${w.action}`};}
 function advance(w,worker){if(w.stage==='request'){if(state.order||!canRequest()||!clientReady())return false;return commit(s=>{const number=++s.serial;s.lastRequestDay=getClock().day;s.order={id:`egypt-artisan-${number}`,number,title:TITLES[number-1],stage:'materials',holder:'desk',requestedAt:s.time,workReceiptId:worker==='player'?s.duty.receiptId:null,abandoned:false,supplyReceipt:null};});}
 const o=state.order;if(!o||o.id!==w.orderId||o.stage!==w.stage)return false;if(worker==='player'&&(!playerOrder()||!active(o.workReceiptId)))return false;
 if(w.stage==='deliver'&&(!clientReady()||o.holder!==worker))return false;
 return commit(s=>{const x=s.order;if(w.stage==='materials'){if(s.stock.sheets<1)throw Error('out-of-materials');s.stock.sheets--;s.stock.pigment--;x.supplyReceipt=x.id+'-materials';s.materials.push(x.supplyReceipt);}if(w.stage==='pickup')x.holder=worker;if(w.stage==='deliver'){if(worker==='player'&&!x.abandoned)s.receipts.push(proof(x,true));s.completed.push(x.id);s.order=null;}else x.stage=w.next;});}
 const duty={registry:P.registry.slice(),meetingReady:()=>available()&&at(artisan,P.home,.25)&&!npcStep&&(!state.order||playerOrder()),inWorkplace:local,dutyActive:active,canClaimDuty:()=>available()&&!getMounted(),
 holdDuty(id){if(state.duty)return state.duty.receiptId===id;return commit(s=>{s.duty={receiptId:id,status:'paused'};});},claimDuty(id){if(!this.canClaimDuty()||state.duty&&state.duty.receiptId!==id)return false;return commit(s=>{s.duty={receiptId:id,status:'draining'};});},
 releaseDuty(id,{evaluate=false}={}){if(state.duty&&state.duty.receiptId!==id||held()&&!at(getPlayer(),P.desk,.3))return false;const ok=commit(s=>{if(evaluate)abandon(s);if(s.order?.holder==='player')s.order.holder='desk';if(s.order?.stage==='deliver'&&s.order.holder==='desk')s.order.stage='pickup';s.duty=null;});if(ok)step=null;return ok;},
 canEndDuty:id=>active(id)&&!step&&!held()&&(!state.order||!playerOrder()),requestMeeting:v=>{meeting=!!v;},dutyState:()=>copy(state.duty||{status:'inactive',receiptId:null}),workReceipts:id=>copy(state.receipts.filter(r=>r.workReceiptId===id)),workIntent,
 executeWork(w,id){const expected=workIntent(id);if(!expected||w.key!==expected.key||getMounted()||!at(getPlayer(),w.position,.25))return false;if(['request','deliver'].includes(w.stage)&&!clientReady()){notify('阿赫正在忙，请在原接待案等他回来验号。');return false;}step={...expected,receiptId:id,elapsed:0};return true;},
 isActing:()=>!!step,held,stopWorkAction(){step=null;},returnPosition:()=>P.desk.slice(),workLabel:()=>step?.action||(state.duty?.status==='draining'?'等萨米拉完成手中原卷并回来交班':state.duty?.status==='paused'?'工案已暂停 · 原卷保留，请当面接回':state.order?`${state.order.number}号 ${state.order.title} · ${WORK[state.order.stage].action}`:state.serial===8?'八份原委托已验收 · 可交班':state.lastRequestDay===getClock().day?'今日原卷已完成 · 工案候单，可交班':'阿赫有一份待登记的原卷委托'),
 playerPose:()=>step||held()?{action:step?.pose||null,station:step?{workTarget:step.target.slice()}:null,workTarget:step?.target?.slice(),handoff:held(),archery:held()?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null}:null};
 // Same physical scroll moves from the original supported desk into hands and
 // onto the original client's desk. Its persistent identity is the order ID.
 const root=new THREE.Group();root.name='纸莎草原单工件';root.userData.dynamic=true;lot.group.add(root);const geo=new THREE.BoxGeometry(.56,.025,.4),mat=new THREE.MeshToonMaterial({color:0xe9d4a3}),paper=new THREE.Mesh(geo,mat);root.add(paper);const inkGeo=new THREE.BoxGeometry(.035,.007,.27),inkMat=new THREE.MeshToonMaterial({color:0x246d87});for(let i=0;i<5;i++){const m=new THREE.Mesh(inkGeo,inkMat);m.position.set(-.19+i*.09,.018,0);paper.add(m);}let acceptedDisplay=state.completed.at(-1)||null;
 function visual(){const o=state.order?.supplyReceipt?state.order:null;root.visible=!!o||!!acceptedDisplay&&!externalAcceptedDisplay;paper.children.forEach(n=>n.visible=o?o.stage!=='outline':!!acceptedDisplay);root.userData.orderId=o?.id||acceptedDisplay;const holder=o?.holder==='player'?getPlayer():o?.holder==='npc'?artisan:null;if(holder){holder.root.updateWorldMatrix(true,true);const hands=holder.root.userData.hands;if(hands?.length>=2){root.position.copy(hands[0].getWorldPosition(new THREE.Vector3())).add(hands[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);}else root.position.copy(holder.root.position).add(new THREE.Vector3(0,1.1,.4));root.rotation.y=holder.root.rotation.y;}else{root.position.set(...(o?P.top:P.clientTop));root.rotation.y=0;}}
 visual();
 function update(dt,t=0){if(disposed||error)return;dt=Math.min(.1,Math.max(0,dt));state.time+=dt;borrowing=false;clientHeld=false;
 if(state.duty?.status==='active'&&(!local()||getMounted())){if(commit(s=>{s.duty.status='paused';}))step=null;}
 const allowed=available(),o=state.order,playerOwns=!!o&&playerOrder();
 // Paused player orders stay intact. Explicit cancellation hands the exact
 // unfinished original back; NPC work never retrospectively awards player XP.
 const needNpcWork=!!o&&!playerOwns||!state.duty&&!meeting&&canRequest();
 if(allowed&&(needNpcWork||meeting||state.duty)){borrowing=true;
 if(needNpcWork){const stage=o?.stage||'request',w={...WORK[stage],stage,orderId:o?.id};const target=w.position;
 if(travel(artisan,target,dt)){face(artisan,w.target);if(!['request','deliver'].includes(stage)||clientReady()){clientHeld=['request','deliver'].includes(stage);if(!npcStep||npcStep.stage!==stage||npcStep.orderId!==o?.id)npcStep={stage,orderId:o?.id,elapsed:0};npcStep.elapsed+=dt;if(npcStep.elapsed>=w.duration){const completedId=o?.id;if(advance(w,'npc')){if(stage==='deliver')acceptedDisplay=completedId;npcStep=null;}}}}else npcStep=null;
 const c=poseContext(artisan,{workTarget:w.target});c.heldProp=null;c.handoff=state.order?.holder==='npc';c.archery=c.handoff?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null;artisan.animate?.(t+(artisan.phase||0),!!artisan.walking,artisan.walking?null:WORK[stage].pose,c);
 }else{npcStep=null;const target=meeting||state.duty?.status==='draining'?P.home:state.duty?.status==='active'?P.rest:P.home;const arrived=travel(artisan,target,dt);if(arrived&&state.duty?.status==='draining'&&local()&&!getMounted())commit(s=>{s.duty.status='active';});const c=poseContext(artisan,null);c.heldProp=null;c.handoff=false;c.archery=null;artisan.animate?.(t+(artisan.phase||0),!!artisan.walking,artisan.walking?null:state.duty?.status==='active'?'read':null,c);}
 const label=artisan.label?.querySelector?.('small');if(label)label.textContent=state.duty?.status==='active'?'萨米拉 · 工案已交班，歇脚读书':state.order?`${state.order.number}号 ${state.order.title}`:state.serial===8?'原卷已全部验收':'纸莎草工案';
 }else npcStep=null;
 if(step){const w=step;if(!active(w.receiptId)||getMounted()||!at(getPlayer(),w.position,.27)||getPlayer().walking){step=null;}else if(!['request','deliver'].includes(w.stage)||clientReady()){clientHeld=['request','deliver'].includes(w.stage);face(getPlayer(),w.target);w.elapsed+=dt;if(w.elapsed>=w.duration){const id=state.order?.id;if(advance(w,'player')){if(w.stage==='deliver')acceptedDisplay=id;step=null;}}}}
 if(clientHeld){client.walking=false;client.route=[];client.animate?.(t+(client.phase||0),false,'read',poseContext(client,{workTarget:P.clientTop}));}visual();}
 return {duty,update,acceptedOriginals:()=>error?[]:copy(state.completed),needsClient:()=>clientHeld||!!step&&['request','deliver'].includes(step.stage)||((!!state.order&&!playerOrder()||!state.duty&&!meeting&&canRequest())&&(!state.order||state.order.stage==='deliver')),owns:n=>n===artisan&&borrowing||n===client&&clientHeld,isBorrowingSamira:()=>borrowing,socialStatus:n=>n===artisan&&borrowing?{busy:!!npcStep||meeting,canPause:!npcStep&&!meeting,attention:!npcStep&&!meeting,job:duty.workLabel()}:n===client&&clientHeld?{busy:true,canPause:false,attention:false,job:'核验原号卷轴'}:null,canTalkAtPost:n=>n===artisan&&borrowing&&!npcStep&&!meeting&&!artisan.walking,canBorrowForSocial:n=>n===artisan&&borrowing&&!npcStep&&!meeting,
 state:()=>({...copy(state),lastError:error,step:step?{stage:step.stage,elapsed:step.elapsed}:null}),snapshot:()=>copy(state),restore(s){if(!valid(s)||s.revision!==state.revision)return false;state=copy(s);step=null;npcStep=null;acceptedDisplay=state.completed.at(-1)||null;visual();return true;},dispose(){disposed=true;step=null;npcStep=null;root.removeFromParent();geo.dispose();mat.dispose();inkGeo.dispose();inkMat.dispose();}};
}
