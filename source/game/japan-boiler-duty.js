// The original copper boiler and three existing wheels. These are fictional
// maintenance actions, not engineering temperatures, water quantities or faults.
export const JAPAN_BOILER_REGISTRY=Object.freeze([4.1,11.4,-10.8]);
export const JAPAN_BOILER_POINTS=Object.freeze({read:[4.1,11.4,-11.35],men:[5.7,11.4,-13.55],women:[6.65,11.4,-13.55],return:[2.5,11.4,-13.55]});
const REG=JAPAN_BOILER_REGISTRY,HOME=[5.3,11.4,-10.8],HOST='jp-steam';
const TARGET={read:[4.1,12.54,-11.78],men:[5.7,12.85,-13.99],women:[6.65,12.85,-13.99],return:[2.5,12.85,-13.99]};
const near=(p,q,r=.25)=>!!p&&!!q&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const copy=x=>JSON.parse(JSON.stringify(x)),NEXT={read:'adjust',adjust:'return',return:'verify',verify:'completed'};
export function createJapanBoilerDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,getPlayer=()=>null,getMounted=()=>null,isDutyRoute=()=>false,onComplete=()=>{}}){
 const host=actors.get(HOST),ledger=board.boiler;let options={getPlayer,getMounted,isDutyRoute},desired=null,paused=false,meeting=false,step=null,disposed=false;
 const player=()=>options.getPlayer(),mounted=()=>options.getMounted(),busy=()=>!!taskOf(host)&&!taskOf(host).idle;
 const relief=()=>{const a=getStaffLife()?.state().active;return a?.reliefId===HOST&&!a.externalCoverage;};
 const hostBatch=()=>ledger.work().find(b=>b.owner===HOST);
 const covering=()=>!!desired&&!paused&&ledger.duty()?.status==='active',dutyActive=id=>desired===id&&covering();
 const meetingReady=()=>near(host.root.position,HOME,.22)&&!host.serviceMount&&!busy()&&!hostBatch()&&getStaffLife()?.state().active?.id!==HOST&&!relief();
 function recall(){if(busy()||hostBatch()||relief()||!getStaffLife()?.recall(HOST)||!unmount(host))return false;if(!near(host.root.position,HOME,.2)||!taskOf(host)?.boilerMeeting){clear(host);assign(host,HOME,{idle:true,boilerMeeting:true,label:'到原锅炉登记处等候交班',face:REG,onDone:()=>false});}return meetingReady();}
 function workFor(batch){const kind=batch.stage,key=kind==='adjust'?batch.side:kind==='verify'?'read':kind,position=JAPAN_BOILER_POINTS[key],target=TARGET[key];if(!position)return null;
  return {key:`${batch.id}:${kind}`,batchId:batch.id,poolId:batch.poolId,side:batch.side,visitIds:batch.visitIds.slice(),kind,expectedStage:kind,nextStage:NEXT[kind],position:position.slice(),target:target.slice(),visualAnchor:{id:'jp-boiler-tool:'+key,point:target.slice()},duration:kind==='adjust'?3:2,action:`${batch.side==='men'?'男汤':'女汤'} · ${{read:'读表核对本批真实用汤',adjust:'调节对应池原阀轮',return:'检查原回水阀',verify:'复核本批供热巡护'}[kind]}`,executionRadius:.08};
 }
 const maintenanceLabel=()=>['men','women'].map(side=>{const batches=ledger.state().batches.filter(b=>b.side===side),open=batches.filter(b=>b.stage!=='completed');return `${side==='men'?'男汤':'女汤'}${open.some(b=>b.frozen)?'调节中':open.length?'待巡护':batches.length?'已复核':'供热照常'}`;}).join(' · ');
 const choices=id=>dutyActive(id)&&!step?ledger.work().filter(b=>!b.owner||b.owner==='player').map(workFor).filter(Boolean):[];
 const workIntent=(id,key=null)=>{const list=choices(id);return (key?list.find(w=>w.key===key):list[0])||null;};
 const begin=(w,actorId,receiptId=null)=>ledger.begin(w.batchId,w.kind,actorId,{receiptId});
 const finish=(w,actorId,receiptId=null)=>ledger.advance(w.batchId,w.kind,actorId,{receiptId,nextStage:w.nextStage});
 function executeWork(w,id){const next=workIntent(id,w.key);if(!next||mounted()||!near(player()?.root.position,next.position,.1)||!begin(next,'player',id))return false;step={...next,receiptId:id,elapsed:0};return true;}
 const inWorkplace=()=>{const p=player()?.root.position;return !!p&&(p.y>11.05&&p.y<11.75&&p.x>1.65&&p.x<7.65&&p.z>-14.65&&p.z<-9.75||options.isDutyRoute());};
 function scheduleNPC(){if(disposed||covering()||(meeting||desired&&!paused)&&!hostBatch()||busy()||host.serviceMount||relief()||getStaffLife()&&!getStaffLife().canWork(HOST))return;
  const batch=hostBatch()||ledger.work().find(b=>!b.owner),w=batch&&workFor(batch);if(!w)return;
  clear(host);assign(host,w.position,{boilerWork:true,batchId:w.batchId,label:w.action,duration:w.duration,action:'tidy',workTarget:w.target,onArrive:()=>begin(w,HOST),onDone:()=>{if(!finish(w,HOST))return false;onComplete(w.batchId,'boiler-'+w.kind);return true;}});
 }
 function releaseDuty(id){if(desired!==id)return desired===null&&!ledger.duty();if(!ledger.releaseDuty(id))return false;desired=null;paused=false;step=null;return true;}
 function update(dt){if(disposed)return;
  if(desired&&!paused&&(!inWorkplace()||mounted())){if(!ledger.duty()||ledger.pauseDuty(desired)){step=null;paused=true;}}
  if(meeting||desired&&!paused&&!covering())recall();
  if(desired&&!paused&&!covering()&&meetingReady())ledger.claimDuty(desired);
  if(step){const w=step;if(!dutyActive(w.receiptId)||mounted()||!near(player()?.root.position,w.position,.12)){step=null;}else if(!player().walking){player().root.rotation.y=Math.atan2(w.target[0]-player().root.position.x,w.target[2]-player().root.position.z);w.elapsed+=Math.min(.1,Math.max(0,dt));if(w.elapsed>=w.duration&&finish(w,'player',w.receiptId)){onComplete(w.batchId,'boiler-'+w.kind);step=null;}}}
  scheduleNPC();
 }
 return {registry:REG.slice(),connect(next){options={...options,...next};return this;},update,meetingReady,workIntent,workChoices:choices,executeWork,
  requestMeeting(v){meeting=!!v;},holdDuty(id){desired=id;paused=true;},claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;return true;},
  canClaimDuty:()=>!ledger.state().loadError&&!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),canEndDuty:id=>desired===id&&!step,releaseDuty,inWorkplace,dutyActive,
  holdsHost:()=>!!(meeting||desired&&!paused&&!covering()),isCovering:covering,
  coversWorker:(id,kind=null)=>id===HOST&&covering()&&(!kind||kind==='boiler'),
  blocksWorker:id=>id===HOST&&!!(meeting||desired&&!paused&&!covering()||taskOf(host)?.boilerWork),
  idlePoint:id=>id===HOST&&covering()&&!relief()?HOME.slice():null,idleTask:id=>id===HOST&&!relief()?{duration:4,face:covering()?REG:TARGET.read,label:covering()?'供热巡护由你当班 · '+maintenanceLabel():maintenanceLabel()}:null,
  workReceipts:id=>ledger.receipts(id),isActing:()=>!!step,held:()=>false,actor:player,stopWorkAction(){step=null;},returnPosition:()=>REG.slice(),
  workLabel:()=>ledger.state().loadError?'巡护记录异常 · 请恢复有效存档后接班':step?.action||(paused?'供热巡护班暂停 · 当面续班':maintenanceLabel()),
  playerPose:()=>step?{action:'tidy',workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':ledger.duty()?.status||(desired?'draining':'inactive'),step:step?copy(step):null}),
  snapshot:()=>({version:1,desired,paused,step:null}),restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!desired;step=null;return true;},
  dispose(){disposed=true;step=null;}
 };
}
