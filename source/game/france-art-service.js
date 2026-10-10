import {createFranceArtProps} from './france-art-props.js';
import {followActorRoute} from './actor-navigation.js';
import {isSociallyHeld} from './npc-social-ownership.js';
import {validFranceArtReceipt} from './france-art-role.js';
const copy=structuredClone,INT=n=>Number.isSafeInteger(n)&&n>=0;
export const FRANCE_ART_POINTS=Object.freeze({registry:[5.55,0,-8.35],home:[5.55,0,-9.4],rest:[4.3,0,-9.4],desk:[7.1,0,-9.25],top:[7.1,1.95,-10.79],supply:[9.35,0,-8.75],supplyTop:[9.35,1.22,-7.6],catalogue:[9.7,0,-11.9],gallery:[10.57,1.9,-10.25],review:[8.7,0,-11.9]});
const P=FRANCE_ART_POINTS,ARTISAN='france-atelier',CLIENT=ARTISAN;
export const FRANCE_ART_DESIGNS=Object.freeze([
 {id:'garden-morning',title:'宫苑花园·晨光',subject:'garden',palette:'morning'},
 {id:'garden-evening',title:'宫苑花园·暖暮',subject:'garden',palette:'evening'},
 {id:'colonnade-morning',title:'宫苑柱廊·晨光',subject:'colonnade',palette:'morning'},
 {id:'colonnade-evening',title:'宫苑柱廊·暖暮',subject:'colonnade',palette:'evening'}]);
const design=id=>FRANCE_ART_DESIGNS.find(d=>d.id===id);
const WORK={request:{position:P.registry,target:[5.55,1.2,-9.4],action:'登记这幅原创展览画的题材与光色',pose:'write',duration:2,next:'materials'},materials:{position:P.supply,target:P.supplyTop,action:'核号领用一张画布与一份颜料',pose:'tidy',duration:2,next:'outline'},outline:{position:P.desk,target:P.top,action:'在原画布上描出构图',pose:'write',duration:4,next:'paint'},paint:{position:P.desk,target:P.top,action:'调色完成原画',pose:'paint',duration:8,next:'pickup'},pickup:{position:P.desk,target:P.top,action:'核号取下完成原画',pose:'tidy',duration:1,next:'deliver'},deliver:{position:P.catalogue,target:P.gallery,action:'登记同号原画并陈列展览',pose:'tidy',duration:2,next:'accepted'}};
// This migration introduces exactly six exhibition sets once per save. No
// buyer, customer budget, sale, or replenishment is implied by these supplies.
const fresh=()=>({version:1,openingSupply:'france-exhibition-six-v1',revision:0,time:0,serial:0,lastRequestDay:-1,stock:{sheets:6,pigment:6},order:null,completed:[],materials:[],receipts:[],duty:null});
const at=(n,p,r=.25)=>!!n&&Math.abs(n.root.position.y-p[1])<.35&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r;
const workReceipt=id=>typeof id==='string'&&/^fr-atelier-labor-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.split('-').at(-1)));
function valid(s){
 if(!s||s.version!==1||s.openingSupply!=='france-exhibition-six-v1'||!INT(s.revision)||!INT(s.serial)||s.serial>6||!Number.isFinite(s.time)||s.time<0||
  !Number.isSafeInteger(s.lastRequestDay)||s.lastRequestDay< -1||(s.serial===0)!==(s.lastRequestDay===-1)||
  !s.stock||!INT(s.stock.sheets)||!INT(s.stock.pigment)||!Array.isArray(s.materials)||s.materials.length+s.stock.sheets!==6||s.stock.sheets!==s.stock.pigment||
  new Set(s.materials).size!==s.materials.length||s.materials.some(id=>typeof id!=='string'||!/^france-art-[1-6]-materials$/.test(id)||Number(id.split('-')[2])>s.serial)||
  !Array.isArray(s.completed)||s.completed.length+(s.order?1:0)!==s.serial||s.completed.some((o,i)=>!o||o.id!==`france-art-${i+1}`||!design(o.designId)||o.title!==design(o.designId).title||!['npc','player'].includes(o.artist)||o.supplyReceipt!==o.id+'-materials'||!s.materials.includes(o.id+'-materials'))||
  !Array.isArray(s.receipts)||s.receipts.some(r=>!validFranceArtReceipt(r)||r.number>s.serial||r.completed&&(!s.completed.some(o=>o.id===r.orderId)||!s.materials.includes(r.supplyReceipt)))||
  new Set(s.receipts.map(r=>r.id)).size!==s.receipts.length||
  s.duty&&(!workReceipt(s.duty.receiptId)||!['paused','draining','active'].includes(s.duty.status)))return false;
 const o=s.order;if(!o)return true;
 return INT(o.number)&&o.number>0&&o.number===s.serial&&o.id===`france-art-${o.number}`&&!!design(o.designId)&&o.title===design(o.designId).title&&
  Number.isFinite(o.requestedAt)&&o.requestedAt>=0&&o.requestedAt<=s.time&&WORK[o.stage]&&o.stage!=='request'&&
  ['npc','player','desk'].includes(o.holder)&&(o.workReceiptId===null||workReceipt(o.workReceiptId))&&typeof o.abandoned==='boolean'&&
  (['materials','outline','paint','pickup'].includes(o.stage)?o.holder==='desk':o.holder!=='desk')&&
  (o.stage==='materials'?o.supplyReceipt===null&&!s.materials.includes(o.id+'-materials'):o.supplyReceipt===o.id+'-materials'&&s.materials.includes(o.supplyReceipt));
}
export function createFranceArtService({npcs,lot,doors,planPath,moveActor,poseContext=()=>({}),getPlayer,getMounted=()=>null,getClock,canBorrow=()=>true,saved=null,saveState=()=>false,notify=()=>{}}){
 const artisan=npcs.find(n=>n.station.id===ARTISAN);if(!artisan)return null;
 let state=fresh(),error=null,disposed=false,meeting=false,step=null,npcStep=null,borrowing=false;const routes=new Map();
 if(saved!=null){if(valid(saved))state=copy(saved);else error='invalid-artisan-state';}
 function commit(change){if(error)return false;try{const next=copy(state);change(next);next.revision++;if(!valid(next))return false;const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then)return false;state=next;return true;}catch{return false;}}
 const alive=n=>n?.alive!==false&&!n.serviceMount&&!isSociallyHeld(n.station.id),available=()=>alive(artisan)&&canBorrow();
 const active=id=>state.duty?.receiptId===id&&state.duty.status==='active';
 const local=()=>{const n=getPlayer(),p=n?.root.position;return !!p&&Math.abs(p.y)<.35&&p.x>=3.5&&p.x<=10.7&&p.z>=-13&&p.z<=-6.5;};
 const held=()=>state.order?.holder==='player';
 const playerOrder=()=>state.order?.workReceiptId&&state.order.workReceiptId===state.duty?.receiptId&&!state.order.abandoned;
 function travel(n,target,dt){if(!alive(n))return false;n.walking=false;if(at(n,target,.06)){n.route=[];routes.delete(n);return true;}const key=target.join(',');if(routes.get(n)!==key||!n.route.length){n.route=planPath(n.root.position,{x:target[0],y:target[1],z:target[2]},.25)||[];routes.set(n,key);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.85,arrivalTolerance:.035});return at(n,target,.06);}
 const face=(n,p)=>{n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);};
 function proof(o,completed){const waitSeconds=Math.max(0,state.time-o.requestedAt),timely=waitSeconds<=180;return {source:'france-art',id:o.id+'-art-'+o.workReceiptId,workReceiptId:o.workReceiptId,orderId:o.id,number:o.number,customerId:CLIENT,customerName:'卢西安',itemId:o.id+'-canvas',supplyReceipt:o.id+'-materials',outcome:completed?timely?'completed':'late':'handoff',completed,accurate:completed,timely,waitSeconds};}
 function abandon(s){const o=s.order;if(o?.workReceiptId&&!o.abandoned){const r=proof(o,false);if(!s.receipts.some(x=>x.id===r.id))s.receipts.push(r);o.abandoned=true;}}
 const canRequest=()=>state.serial<6&&getClock().hour>=6&&getClock().hour<18&&state.lastRequestDay<getClock().day;
 function workIntent(id,choiceKey=null){if(!active(id)||step)return null;const o=state.order;if(o&&(!playerOrder()||o.abandoned))return null;const stage=o?.stage||'request';if(!o&&!canRequest())return null;const selected=o?design(o.designId):design(choiceKey?.split(':').at(-1))||FRANCE_ART_DESIGNS[state.serial%4];const w=WORK[stage];return {...copy(w),stage,designId:selected.id,key:(o?.id||`france-art-${state.serial+1}`)+':'+stage+(o?'':':'+selected.id),orderId:o?.id||`france-art-${state.serial+1}`,number:o?.number||state.serial+1,executionRadius:.25,action:`${o?.number||state.serial+1}号 ${selected.title} · ${w.action}`};}

 function advance(w,worker){if(w.stage==='request'){if(state.order||!canRequest())return false;return commit(s=>{const number=++s.serial;s.lastRequestDay=getClock().day;s.order={id:`france-art-${number}`,number,designId:w.designId||FRANCE_ART_DESIGNS[(number-1)%4].id,title:design(w.designId||FRANCE_ART_DESIGNS[(number-1)%4].id).title,stage:'materials',holder:'desk',requestedAt:s.time,workReceiptId:worker==='player'?s.duty.receiptId:null,abandoned:false,supplyReceipt:null};});}
 const o=state.order;if(!o||o.id!==w.orderId||o.stage!==w.stage)return false;if(worker==='player'&&(!playerOrder()||!active(o.workReceiptId)))return false;
 if(w.stage==='deliver'&&(o.holder!==worker||worker==='player'&&(!available()||!at(artisan,P.review,.25))))return false;
 return commit(s=>{const x=s.order;if(w.stage==='materials'){if(s.stock.sheets<1)throw Error('out-of-materials');s.stock.sheets--;s.stock.pigment--;x.supplyReceipt=x.id+'-materials';s.materials.push(x.supplyReceipt);}if(w.stage==='pickup')x.holder=worker;if(w.stage==='deliver'){if(worker==='player'&&!x.abandoned)s.receipts.push(proof(x,true));s.completed.push({id:x.id,title:x.title,designId:x.designId,artist:worker,supplyReceipt:x.supplyReceipt});s.order=null;}else x.stage=w.next;});}
 const duty={registry:P.registry.slice(),meetingReady:()=>available()&&at(artisan,P.home,.25)&&!npcStep&&(!state.order||playerOrder()),inWorkplace:local,dutyActive:active,canClaimDuty:()=>available()&&!getMounted(),
 holdDuty(id){if(state.duty)return state.duty.receiptId===id;return commit(s=>{s.duty={receiptId:id,status:'paused'};});},claimDuty(id){if(!this.canClaimDuty()||state.duty&&state.duty.receiptId!==id)return false;return commit(s=>{s.duty={receiptId:id,status:'draining'};});},
 releaseDuty(id,{evaluate=false}={}){if(state.duty&&state.duty.receiptId!==id||held()&&!at(getPlayer(),P.desk,.3))return false;const ok=commit(s=>{if(evaluate)abandon(s);if(s.order?.holder==='player')s.order.holder='desk';if(s.order?.stage==='deliver'&&s.order.holder==='desk')s.order.stage='pickup';s.duty=null;});if(ok)step=null;return ok;},
 canEndDuty:id=>active(id)&&!step&&!held()&&(!state.order||!playerOrder()),requestMeeting:v=>{meeting=!!v;},dutyState:()=>copy(state.duty||{status:'inactive',receiptId:null}),workReceipts:id=>copy(state.receipts.filter(r=>r.workReceiptId===id)),workIntent,workChoices:id=>state.order?[]:FRANCE_ART_DESIGNS.map(d=>workIntent(id,d.id)).filter(Boolean),
 executeWork(w,id){const expected=workIntent(id,w.key);if(!expected||w.key!==expected.key||getMounted()||!at(getPlayer(),w.position,.25))return false;step={...expected,receiptId:id,elapsed:0};return true;},
 isActing:()=>!!step,held,stopWorkAction(){step=null;},returnPosition:()=>P.desk.slice(),workLabel:()=>step?.action||(state.duty?.status==='draining'?'等卢西安完成手中原画并回来交班':state.duty?.status==='paused'?'工案已暂停 · 原画保留，请当面接回':state.order?`${state.order.number}号 ${state.order.title} · ${WORK[state.order.stage].action}`:state.serial===6?'六套展览耗材已用尽 · 停止新作，可交班':state.lastRequestDay===getClock().day?'今日展览原画已完成 · 整理画坊，可交班':'选题创作原画 · 六套一次性展览耗材，无买家订单'),
 playerPose:()=>step||held()?{action:step?.pose||null,station:step?{workTarget:step.target.slice()}:null,workTarget:step?.target?.slice(),handoff:held(),archery:held()?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null}:null};
 const props=createFranceArtProps(lot.group,P);
 const visual=()=>props.update(state,getPlayer(),artisan);
 visual();

 function update(dt,t=0){if(disposed||error)return;dt=Math.min(.1,Math.max(0,dt));state.time+=dt;borrowing=false;
 if(state.duty?.status==='active'&&(!local()||getMounted())){if(commit(s=>{s.duty.status='paused';}))step=null;}
 const allowed=available(),o=state.order,playerOwns=!!o&&playerOrder();
 // Paused player orders stay intact. Explicit cancellation hands the exact
 // unfinished original back; NPC work never retrospectively awards player XP.
 const needNpcWork=!!o&&!playerOwns||!state.duty&&!meeting&&canRequest();
 if(allowed&&(needNpcWork||meeting||state.duty)){borrowing=true;
 if(needNpcWork){const stage=o?.stage||'request',w={...WORK[stage],stage,orderId:o?.id};const target=w.position;
 if(travel(artisan,target,dt)){face(artisan,w.target);{if(!npcStep||npcStep.stage!==stage||npcStep.orderId!==o?.id)npcStep={stage,orderId:o?.id,elapsed:0};npcStep.elapsed+=dt;if(npcStep.elapsed>=w.duration){if(advance(w,'npc')){npcStep=null;}}}}else npcStep=null;
 const c=poseContext(artisan,{workTarget:w.target});c.heldProp=null;c.handoff=state.order?.holder==='npc';c.archery=c.handoff?{hands:[[-.16,1.25,.43],[.16,1.25,.43]]}:null;artisan.animate?.(t+(artisan.phase||0),!!artisan.walking,artisan.walking?null:WORK[stage].pose,c);
 }else{npcStep=null;const target=meeting||state.duty?.status==='draining'?P.home:playerOwns&&o.stage==='deliver'?P.review:state.duty?.status==='active'?P.rest:P.home;const arrived=travel(artisan,target,dt);if(arrived&&state.duty?.status==='draining'&&local()&&!getMounted())commit(s=>{s.duty.status='active';});const c=poseContext(artisan,null);c.heldProp=null;c.handoff=false;c.archery=null;artisan.animate?.(t+(artisan.phase||0),!!artisan.walking,artisan.walking?null:state.duty?.status==='active'?'read':null,c);}
 const label=artisan.label?.querySelector?.('small');if(label)label.textContent=state.duty?.status==='active'?(o?.stage==='deliver'?'卢西安 · 核验同号展览原画':'卢西安 · 画坊已交班，歇脚读书'):state.order?`${state.order.number}号 ${state.order.title}`:state.serial===6?'原画已全部验收':'画布工案';
 }else npcStep=null;
 if(step){const w=step;if(!active(w.receiptId)||getMounted()||!at(getPlayer(),w.position,.27)||getPlayer().walking){step=null;}else if(w.stage!=='deliver'||available()&&at(artisan,P.review,.25)){face(getPlayer(),w.target);w.elapsed+=dt;if(w.elapsed>=w.duration){if(advance(w,'player')){step=null;}}}}
 visual();}
 const catalogueIntent=()=>({id:'france-art-catalogue',provider:'france-art-catalogue',kind:'catalogue',name:'原画展览目录',action:'查看原画目录与剩余耗材',position:P.catalogue.slice(),executionRadius:.3,interactionRadius:1.8,priority:46,intentKey:'france-art-catalogue:'+state.revision});
 return {duty,update,intent:catalogueIntent,resolveIntent:old=>old?.intentKey===catalogueIntent().intentKey?catalogueIntent():null,executeIntent(old){if(old?.intentKey!==catalogueIntent().intentKey||!at(getPlayer(),P.catalogue,.3)||getMounted())return false;notify(error?'原画记录损坏，已停止创作，未重新补充材料。':`原画展览 · ${state.completed.length}/6幅；剩余${state.stock.sheets}套一次性耗材，不自动补充。`+(state.completed.length?'\n'+state.completed.map(o=>`${o.id.split('-').at(-1)}号 ${o.title}（${o.artist==='player'?'你':'卢西安'}绘）`).join('\n'):' 尚无完成原画。')+'\n这里是原创展览，没有买家订单或销售收入。');return true;},acceptedOriginals:()=>error?[]:copy(state.completed),owns:n=>n===artisan&&borrowing,isBorrowingArtist:()=>borrowing,socialStatus:n=>n===artisan&&borrowing?{busy:!!npcStep||meeting,canPause:!npcStep&&!meeting,attention:!npcStep&&!meeting,job:duty.workLabel()}:null,canTalkAtPost:n=>n===artisan&&borrowing&&!npcStep&&!meeting&&!artisan.walking,canBorrowForSocial:n=>n===artisan&&borrowing&&!npcStep&&!meeting,
 state:()=>({...copy(state),lastError:error,step:step?{stage:step.stage,elapsed:step.elapsed}:null}),snapshot:()=>copy(state),restore(s){if(!valid(s)||s.revision!==state.revision)return false;state=copy(s);step=null;npcStep=null;visual();return true;},dispose(){disposed=true;step=null;npcStep=null;props.dispose();}};
}
