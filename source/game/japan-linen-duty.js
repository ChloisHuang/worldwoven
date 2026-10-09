import {JAPAN_BEDDING_POINTS as B} from './japan-bedding.js';
import {JAPAN_SERVICE_POINTS as P,JAPAN_LINEN_POINTS as L} from './japan-service-orders.js';
export const JAPAN_LINEN_REGISTRY=Object.freeze([5,11.4,3.9]);
const REG=JAPAN_LINEN_REGISTRY,HOME=[6.2,11.4,4.2],HOST='jp-rest',copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.25)=>!!p&&!!q&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const TARGET={wash:[4.3,12.57,6.43],hang:[5.2,12.96,2.02],take:[5.2,12.96,2.02],fold:[8.6,12.54,3.42],restock:[8.6,12.54,3.42]};
const NEXT={dirty:['collect','collected',1],collected:['wash','wet',4],wet:['hang','drying',2],drying:['take','dry',1.5],dry:['fold','folded',3],folded:['restock','clean',1.5]};
// One original employee and six original towels. The visitor board owns all
// stock/receipts; this adapter alone owns movement and physical work time.
export function createJapanLinenDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,planPath,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,onComplete=()=>{},tickDrying=true}){
 const host=actors.get(HOST);let playerOptions={getPlayer,getMounted,isDutyRoute},desired=null,paused=false,meeting=false,step=null,disposed=false,lastNPCBedding=false;
 const player=()=>playerOptions.getPlayer(),mounted=()=>playerOptions.getMounted(),items=()=>[...board.linenWork(),...(board.bedding?.work()||[])],heldBy=id=>items().find(l=>l.carryOwner===id),held=()=>heldBy('player');
 const dutyActive=id=>desired===id&&!paused&&board.linenDuty()?.status==='active',covering=()=>!!desired&&!paused&&board.linenDuty()?.status==='active';
 const busy=()=>{const t=taskOf(host);return !!t&&!t.idle;};
 const relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const meetingReady=()=>near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!heldBy(HOST)&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(busy()||heldBy(HOST)||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;const t=taskOf(host);if(!near(host.root.position,HOME,.2)||!t?.linenMeeting){clear(host);assign(host,HOME,{idle:true,linenMeeting:true,label:'到四层布草间等候原岗交班',face:REG,onDone:()=>false});}return meetingReady();}
 function workFor(l,actorId){
  const spec=NEXT[l.stage];if(!spec||l.carryOwner&&l.carryOwner!==actorId||l.stage==='drying'&&l.dryingElapsed<8)return null;
  const [kind,nextStage,duration]=spec,collect=l.bedding?B.guest:P[l.side+'Changing'],destination=kind==='collect'?collect:(l.bedding?B:L)[kind==='take'?'hang':kind],target=l.bedding?(kind==='collect'?[3.25,8,-11.8]:['hang','take'].includes(kind)?[8.6,12.54,3.42]:TARGET[kind]):kind==='collect'?[collect[0]+(l.side==='men'?-.38:.38),collect[1]+.8,collect[2]]:TARGET[kind];
  if(!l.carryOwner&&['collected','wet','dry','folded'].includes(l.stage))return {key:`${l.id}:${l.cycle}:${l.stage}:pickup`,bedding:!!l.bedding,linenId:l.id,cycle:l.cycle,visitId:l.visitId,kind:'pickup',expectedStage:l.stage,position:l.position.slice(),target:[l.position[0],l.position[1]+.85,l.position[2]],duration:1,action:`取回 ${l.customerName} 的同号布草`,executionRadius:.25};
  return {key:`${l.id}:${l.cycle}:${kind}`,bedding:!!l.bedding,linenId:l.id,cycle:l.cycle,visitId:l.visitId,kind,expectedStage:l.stage,nextStage,position:destination.slice(),target:target.slice(),visualAnchor:{id:'jp-linen-tool:'+kind,point:target.slice()},duration,action:`${l.customerName} · ${l.id} · ${{collect:l.bedding?'收下用过的原套寝具':'回收用过的布巾',wash:'在原洗桶洗净',hang:l.bedding?'在原布草台摊晾':'挂到原晾架晾干',take:'收下已晾干的原布草',fold:'在原叠台折整齐',restock:'补回下位来客的清洁库存'}[kind]}`,executionRadius:.25};
 }
 const choices=id=>{if(!dutyActive(id)||step)return [];const own=held();return (own?[own]:items()).map(l=>workFor(l,'player')).filter(Boolean);};
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 function finish(w,actor,id=null){const evidence={nextStage:w.nextStage,expectedCycle:w.cycle,position:actor.root.position.toArray(),receiptId:id};if(w.bedding)return w.kind==='pickup'?board.bedding.claim(w.linenId,actor.station?.id||'player',evidence):board.bedding.advance(w.linenId,w.expectedStage,actor.station?.id||'player',evidence);return w.kind==='pickup'?board.linenClaim(w.linenId,actor.station?.id||'player',evidence):board.linenAdvance(w.linenId,w.expectedStage,actor.station?.id||'player',evidence);}
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position))return false;step={...next,receiptId:id,elapsed:0};return true;}
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(p.y>11.05&&p.y<11.75&&p.x>2.5&&p.x<12.1&&p.z>0&&p.z<8.8||[P.menChanging,P.womenChanging,B.guest].some(q=>near(p,q,1.2))||playerOptions.isDutyRoute());};
 function scheduleNPC(){if(disposed||covering()||(meeting||desired&&!paused)&&!heldBy(HOST)||busy()||host.serviceMount||relief()||getStaffLife()&&!getStaffLife().canWork(HOST))return;
  const own=heldBy(HOST),ordered=items().sort((a,b)=>Number(!!a.bedding===lastNPCBedding)-Number(!!b.bedding===lastNPCBedding)),w=(own?[own]:ordered).map(l=>workFor(l,HOST)).find(Boolean);if(!w)return;
  clear(host);assign(host,w.position,{linenWork:true,linenId:w.linenId,linenStage:w.expectedStage,label:w.action,duration:w.duration,action:'tidy',held:own&&!w.bedding?'cloth':null,handoff:!!own&&!!w.bedding,workTarget:w.target,ready:()=>{const l=items().find(x=>x.id===w.linenId);return l?.stage===w.expectedStage&&l.cycle===w.cycle;},onDone:()=>{if(!finish(w,host))return false;lastNPCBedding=!!w.bedding;onComplete(w.visitId,'linen-'+w.kind);return true;}});
 }
 function releaseDuty(id){if(desired!==id)return desired===null&&!board.linenDuty()&&!held();if(held()&&!near(player()?.root.position,held().position,.35))return false;if(!board.releaseLinenDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;if(tickDrying){board.linenTick(dt);board.bedding?.tick(dt);}
  if(desired&&!paused&&(!inWorkplace()||mounted())){if(!board.linenDuty()||board.pauseLinenDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();
  if(desired&&!paused&&!covering()&&meetingReady())board.setLinenDuty(desired,'active');
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,.27)){step=null;}else if(!player().walking){player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,player(),w.receiptId)){onComplete(w.visitId,'linen-'+w.kind);step=null;}}}
  scheduleNPC();
 }
 return {registry:REG.slice(),connect(options){playerOptions={...playerOptions,...options};return this;},update,meetingReady,workIntent,workChoices:choices,executeWork,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!board.bedding?.state().loadError&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step&&!held(),releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering())||!!heldBy(HOST),isCovering:covering,coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='linen'),blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||heldBy(HOST)||taskOf(host)?.linenWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?HOME.slice():null,idleTask:id=>id===HOST&&covering()&&!relief()?{duration:4,face:REG,label:'布草由你当班 · 等候交接'}:null,
  workReceipts:id=>board.linenReceipts(id),isActing:()=>!!step,held:()=>!!held(),actor:player,stopWorkAction(){step=null;},returnPosition:()=>held()?.position.slice()||REG.slice(),
  workLabel:()=>step?.action||(paused?'布草班暂停 · 当面续班或将原巾归回原处':items().some(l=>l.stage==='drying')?'原巾在晾架晾干 · 可处理其他布巾':'布草候单 · 等来客用毕原巾'),
  playerPose:()=>step?{action:'tidy',heldProp:step.bedding?null:'cloth',handoff:!!step.bedding&&!!held(),workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:held()?{action:'tidy',heldProp:held().bedding?null:'cloth',handoff:true,station:{handoff:true}}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.linenDuty()?.status||(desired?'draining':'inactive'),step:step?copy(step):null,held:held()?.id||null}),
  snapshot:()=>({version:1,desired,paused,step:null}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},
  dispose(){disposed=true;step=null;}
 };
}
