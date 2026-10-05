import {JAPAN_SERVICE_POINTS as P,JAPAN_BATH_BLENDS} from './japan-service-orders.js';
export const JAPAN_BATH_MIXING_REGISTRY=Object.freeze([-4.1,11.4,-.3]);
const HOME=[-5.25,11.4,-.3],KEY='mixing',copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const PHASES={pending:{kind:'checked',action:'核对客名、浴牌与草木种类',duration:1.1},checked:{kind:'mixed',action:'按浴牌配制草木浴包',duration:4},mixed:{kind:'sealed',action:'封包并系好浴牌签',duration:1.5},sealed:{kind:'dispatch',action:'将封签浴包放到取件角',duration:.8}};
export function createJapanBathMixingDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,onComplete=()=>{},getPlayer,getMounted=()=>null}){
 const host=actors.get('jp-incense');let desired=null,meeting=false,step=null,paused=false,disposed=false;
 const inWorkplace=()=>[HOME,P.apothecary,P.apothecaryPickup].some(p=>near(getPlayer()?.root.position,p,1.8));
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle&&!t.mixingMeeting;};
 const meetingReady=()=>near(host.root.position,HOME,.2)&&!host.serviceMount&&!busy(host)&&getStaffLife()?.state().active?.id!=='jp-incense';
 const dutyActive=receiptId=>desired===receiptId&&board.staffDuty(KEY)?.status==='active';
 function recall(){const life=getStaffLife();if(!life?.recall('jp-incense'))return false;if(busy(host)||!unmount(host))return false;const t=taskOf(host);if(!near(host.root.position,HOME,.2)||!t?.mixingMeeting){clear(host);assign(host,HOME,{idle:true,mixingMeeting:true,label:'在工台旁等候配制交班',face:JAPAN_BATH_MIXING_REGISTRY,duration:0,onDone:()=>false});}return meetingReady();}
 function releaseDuty(receiptId,{evaluate=false}={}){if(!board.releaseStaffDuty(KEY,receiptId,{evaluate}))return false;desired=null;step=null;paused=false;return true;}
 function workIntent(receiptId){if(!dutyActive(receiptId)||step)return null;const jobs=board.mixingWork().jobs.filter(j=>j.visit.customerType!=='player'),job=jobs.find(j=>j.workerId==='player')||jobs.find(j=>!j.workerId);if(!job)return null;
  const v=job.visit,phase=v.preparation?.workReceiptId===receiptId?v.preparation.phase:'pending',config=PHASES[phase],blend=JAPAN_BATH_BLENDS.find(b=>b.id===v.blendId);if(!config)return null;
  return {key:job.id+':'+config.kind,jobId:job.id,visitId:v.id,number:v.number,kind:config.kind,tokenId:v.tokenId,itemId:`${v.id}:mixture`,blendId:v.blendId,position:(config.kind==='dispatch'?P.apothecaryPickup:P.apothecary).slice(),target:(config.kind==='dispatch'?P.mixtureTray:P.blendWork).slice(),executionRadius:.22,duration:config.duration,action:`${v.number}号 ${v.name} · ${blend.name} · ${config.action}`};
 }
 function executeWork(work,receiptId){const expected=workIntent(receiptId);if(!expected||expected.key!==work.key||!near(getPlayer()?.root.position,expected.position,.22)||getMounted()||!board.claim(work.jobId,'player'))return false;step={...expected,receiptId,elapsed:0};return true;}
 function update(dt){if(disposed)return;if(meeting)recall();if(desired&&!paused&&(!inWorkplace()||getMounted())){if(board.releaseStaffDuty(KEY,desired)){step=null;paused=true;}}
  if(desired&&!paused){if(!board.staffDuty(KEY))board.setStaffDuty(KEY,desired,'draining');if(board.staffDuty(KEY)?.status!=='active'&&recall()&&!board.mixingWork().claims.some(j=>j.workerId!=='player'))board.setStaffDuty(KEY,desired,'active');}
  board.tickStaffDuty(KEY,dt);if(!step)return;const player=getPlayer(),v=board.getVisit(step.visitId);if(!dutyActive(step.receiptId)||!v||v.mixtureId||!near(player?.root.position,step.position,.24)||getMounted()){step=null;return;}if(player.walking)return;
  player.root.rotation.y=Math.atan2(step.target[0]-player.root.position.x,step.target[2]-player.root.position.z);step.elapsed+=Math.max(0,Math.min(.1,dt));if(step.elapsed<step.duration)return;
  const evidence={receiptId:step.receiptId,visitId:step.visitId,number:step.number,position:player.root.position.toArray(),tokenId:step.tokenId,itemId:step.itemId,blendId:step.blendId};
  if(step.kind==='dispatch'?board.complete(step.jobId,'player',evidence):board.prepareWork(step.jobId,'player',step.kind,evidence)){onComplete(step.visitId,step.kind==='dispatch'?'prepare':'prepare-'+step.kind);step=null;}
 }
 return {registry:JAPAN_BATH_MIXING_REGISTRY.slice(),meetingReady,inWorkplace,dutyActive,workIntent,executeWork,update,releaseDuty,
  holdDuty(receiptId){desired=receiptId;paused=true;},canClaimDuty:()=>!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),
  claimDuty(receiptId){if(disposed||desired&&desired!==receiptId||!this.canClaimDuty())return false;desired=receiptId;paused=false;return board.setStaffDuty(KEY,receiptId,dutyActive(receiptId)?'active':'draining');},
  canEndDuty:receiptId=>desired===receiptId&&!step,requestMeeting(value){meeting=!!value;},blocksWorker:id=>id==='jp-incense'&&meeting&&!busy(host)||['jp-incense','jp-herb-workshop'].includes(id)&&['draining','active'].includes(board.staffDuty(KEY)?.status),holdsHost:()=>meeting&&!busy(host),isCovering:()=>board.staffDuty(KEY)?.status==='active',
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,held:null}),workReceipts:receiptId=>board.staffReceipts(KEY,receiptId),isActing:()=>!!step,held:()=>false,stopWorkAction(){step=null;},returnPosition:()=>P.apothecary.slice(),actor:getPlayer,
  workLabel:()=>step?`${step.number}号 · ${step.action}`:paused?'配制已暂停 · Itsuki代管，请当面接回':board.staffDuty(KEY)?.status==='draining'?'等Itsuki配好手中浴包后接班':'工台候单 · 核牌、配制、封签、交配送',
  playerPose:()=>step?{action:step.kind==='mixed'?'herb-mix':'tidy',workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  snapshot:()=>({version:1,desired,paused:paused||!!desired&&!board.staffDuty(KEY),status:board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,jobId:board.mixingWork().claims.find(j=>j.workerId==='player')?.id||null}),
  restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!s.paused;step=null;if(desired&&!paused){board.setStaffDuty(KEY,desired,s.status==='draining'?'draining':'active');if(s.jobId)board.claim(s.jobId,'player');if(s.step&&workIntent(desired)?.key===s.step.key&&board.claim(s.step.jobId,'player'))step=copy(s.step);}return true;},
  dispose(){disposed=true;step=null;if(desired)board.releaseStaffDuty(KEY,desired);desired=null;}
 };
}
