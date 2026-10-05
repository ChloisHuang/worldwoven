import {JAPAN_SERVICE_POINTS as P,japanReceptionReady} from './japan-service-orders.js';
export const JAPAN_RECEPTION_REGISTRY=Object.freeze([-5.4,0,4.45]);
const HOME=[-6.65,0,5.7],KINDS=['register','checkout'];
const copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
// The original board retains each guest, token and counter claim. This adapter
// only leases that one counter to the real player after the last NPC job drains.
export function createJapanReceptionDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,customerActor,furniture,onComplete=()=>{},getPlayer,getMounted=()=>null}){
 const host=actors.get('jp-welcome');let desired=null,meeting=false,step=null,paused=false,disposed=false;
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return !!p&&p.y>=-.1&&p.y<.5&&p.x>=-8&&p.x<=-2&&p.z>=3.3&&p.z<=8.5;};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle&&!t.receptionMeeting;};
 const receptionClaims=()=>board.state().claims.filter(j=>KINDS.includes(j.kind));
 const meetingReady=()=>near(host.root.position,HOME,.2)&&!host.serviceMount&&!busy(host)&&getStaffLife()?.state().active?.id!=='jp-welcome';
 const dutyActive=receiptId=>desired===receiptId&&board.receptionDuty()?.status==='active';
 const available=()=>board.jobs().filter(j=>KINDS.includes(j.kind)&&board.getVisit(j.visitId)?.customerType!=='player');
 function recall(){
  const life=getStaffLife();if(!life?.recall('jp-welcome'))return false;
  if(busy(host)||!unmount(host))return false;
  const task=taskOf(host);
  if(!near(host.root.position,HOME,.2)||!task?.receptionMeeting){clear(host);assign(host,HOME,{idle:true,receptionMeeting:true,label:'在原柜台旁当面交接客簿与浴牌',face:JAPAN_RECEPTION_REGISTRY,duration:0,onDone:()=>false});}
  return meetingReady();
 }
 function stopWork(){if(step)board.releaseWorker('player');step=null;}
 function releaseDuty(receiptId,{evaluate=false}={}){
  if(!board.releaseReceptionDuty(receiptId,{evaluate}))return false;
  stopWork();desired=null;paused=false;return true;
 }
 function workIntent(receiptId){
  if(!dutyActive(receiptId)||step)return null;
  const job=available().find(j=>!j.workerId||j.workerId==='player');if(!job)return null;
  const v=board.getVisit(job.visitId);return {key:job.id,jobId:job.id,visitId:v.id,number:v.number,kind:job.kind,tokenId:v.tokenId||v.id+':token',position:P.registrar.slice(),target:P.receptionLedger.slice(),executionRadius:.22,
   action:`核对 ${v.number} 号 ${v.name} · ${job.kind==='register'?'登记并发原浴牌':'销号并收原浴牌'}`};
 }
 function executeWork(work,receiptId){
  const expected=workIntent(receiptId),player=getPlayer();if(!expected||expected.key!==work.key||!near(player?.root.position,P.registrar,.22)||getMounted())return false;
  const v=board.getVisit(work.visitId),guest=customerActor(work.visitId);
  if(!japanReceptionReady(guest?.root.position,v.customerType))return false;
  const job=board.claim(work.jobId,'player');if(!job)return false;
  step={...expected,receiptId,elapsed:0,duration:job.kind==='register'?2.5:2};return true;
 }
 function update(dt){
  if(disposed)return;
  if(meeting)recall();
  if(desired&&!paused&&!inWorkplace()){
   if(board.releaseReceptionDuty(desired,{evaluate:true})){stopWork();paused=true;}
  }
  if(desired&&!paused){
   if(!board.receptionDuty())board.setReceptionDuty(desired,'draining');
   if(board.receptionDuty()?.status!=='active'&&recall()&&!receptionClaims().some(j=>j.workerId!=='player'))board.setReceptionDuty(desired,'active');
  }
  board.tickReception(dt);
  if(!step)return;
  const player=getPlayer(),v=board.getVisit(step.visitId),guest=customerActor(step.visitId);
  if(!dutyActive(step.receiptId)||!v||!near(player?.root.position,P.registrar,.24)||getMounted()||player.walking){stopWork();return;}
  if(!japanReceptionReady(guest?.root.position,v.customerType))return;
  player.root.rotation.y=Math.atan2(P.receptionLedger[0]-player.root.position.x,P.receptionLedger[2]-player.root.position.z);
  step.elapsed+=Math.max(0,Math.min(.1,dt));if(step.elapsed<step.duration)return;
  if(board.complete(step.jobId,'player',{receiptId:step.receiptId,visitId:step.visitId,number:step.number,position:player.root.position.toArray(),guestPosition:guest.root.position.toArray(),tokenId:step.tokenId})){
   furniture.facilities.release('japan-service-reception',step.visitId);onComplete(step.visitId,step.kind);step=null;
  }
 }
 return {registry:JAPAN_RECEPTION_REGISTRY.slice(),meetingReady,inWorkplace,dutyActive,workIntent,executeWork,update,releaseDuty,
  holdDuty(receiptId){desired=receiptId;paused=true;},
  canClaimDuty:()=>!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),
  claimDuty(receiptId){if(disposed||desired&&desired!==receiptId||!this.canClaimDuty())return false;desired=receiptId;paused=false;return board.setReceptionDuty(receiptId,dutyActive(receiptId)?'active':'draining');},
  canEndDuty:receiptId=>desired===receiptId&&!step,
  requestMeeting(value){meeting=!!value;},
  blocksWorker:id=>id==='jp-welcome'&&meeting&&!busy(host)||['jp-welcome','jp-market-tea'].includes(id)&&!!board.receptionDuty(),
  holdsHost:()=>meeting&&!busy(host),
  isCovering:()=>board.receptionDuty()?.status==='active',
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.receptionDuty()?.status||'inactive',step:step?copy(step):null}),
  workReceipts:receiptId=>board.receptionReceipts(receiptId),
  isActing:()=>!!step,held:()=>false,stopWorkAction:stopWork,
  workLabel:()=>step?`${step.number}号 · ${step.kind==='register'?'核对客簿，递出浴牌':'核对原牌，销号收回'}`:paused?'离开前台已暂停 · 原人代管，请当面接回':board.receptionDuty()?.status==='draining'?'等原客办完 · 当面接回前台':'在前台候单 · 原来客逐号办理',
  playerPose:()=>step?{action:'calligraphy',workTarget:P.receptionLedger.slice(),receptionWriting:true,station:{workTarget:P.receptionLedger.slice(),receptionWriting:true}}:null,
  snapshot:()=>({version:1,desired,paused,step:step?copy(step):null}),
  restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!s.paused;step=null;if(desired&&!paused&&inWorkplace()){board.setReceptionDuty(desired,'active');if(s.step&&board.receptionDuty()?.status==='active'&&board.claim(s.step.jobId,'player'))step=copy(s.step);}else if(desired)paused=true;return true;},
  dispose(){disposed=true;stopWork();if(desired)board.releaseReceptionDuty(desired);desired=null;}
 };
}
