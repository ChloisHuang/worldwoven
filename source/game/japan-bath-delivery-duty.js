import {JAPAN_SERVICE_POINTS as P} from './japan-service-orders.js';
// The existing men's service side and staff handover foyer; neither is a pool
// seat. Receiving this job never changes the public bathing access policy.
export const JAPAN_BATH_DELIVERY_REGISTRY=Object.freeze([-2.4,3.8,6.2]);
const HOME=[-3.8,3.8,6.2],KEY='menDelivery',copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const point=a=>({x:a[0],y:a[1],z:a[2]});
export function createJapanBathDeliveryDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,customerActor,onComplete=()=>{},getPlayer,getMounted=()=>null,planPath}){
 const host=actors.get('jp-onsen');let desired=null,meeting=false,step=null,paused=false,disposed=false;
 const stations=[JAPAN_BATH_DELIVERY_REGISTRY,P.apothecaryPickup,P.menService];
 const corridors=stations.flatMap((p,i)=>stations.slice(i+1).flatMap(q=>{const nodes=[point(p),...(planPath?.(point(p),point(q),.34)||[]),point(q)];return nodes.slice(1).map((b,j)=>[nodes[j],b]);}));
 const nearRoute=p=>corridors.some(([a,b])=>{const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=dx*dx+dy*dy+dz*dz,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/d)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy,p.z-a.z-t*dz)<.8;});
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return !!p&&(stations.some(q=>near(p,q,1.2))||nearRoute(p));};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle&&!t.deliveryMeeting;};
 const deliveryClaims=()=>board.state().claims.filter(j=>j.kind==='deliverMix'&&j.side==='men');
 const heldJob=()=>deliveryClaims().find(j=>j.workerId==='player'&&board.state().items.some(i=>i.id===j.itemId&&i.location.type==='worker'&&i.location.id==='player'));
 const meetingReady=()=>near(host.root.position,HOME,.2)&&!host.serviceMount&&!busy(host)&&getStaffLife()?.state().active?.id!=='jp-onsen';
 const dutyActive=receiptId=>desired===receiptId&&board.staffDuty(KEY)?.status==='active';
 const available=()=>board.jobs().filter(j=>j.kind==='deliverMix'&&j.side==='men'&&board.getVisit(j.visitId)?.customerType!=='player');
 function recall(){const life=getStaffLife();if(!life?.recall('jp-onsen'))return false;if(busy(host)||!unmount(host))return false;const task=taskOf(host);if(!near(host.root.position,HOME,.2)||!task?.deliveryMeeting){clear(host);assign(host,HOME,{idle:true,deliveryMeeting:true,label:'在原汤室服务侧当面交接浴牌与配送班',face:JAPAN_BATH_DELIVERY_REGISTRY,duration:0,onDone:()=>false});}return meetingReady();}
 // Cancelling an animation keeps original custody. A carried pouch is returned
 // only at the actual apothecary dispatch point or delivered to its guest.
 function stopWork(){step=null;}
 function releaseDuty(receiptId,{evaluate=false}={}){if(heldJob()&&!near(getPlayer()?.root.position,P.apothecaryPickup,.3))return false;if(!board.releaseStaffDuty(KEY,receiptId,{evaluate}))return false;step=null;desired=null;paused=false;return true;}
 function workIntent(receiptId){if(!dutyActive(receiptId)||step)return null;const job=available().find(j=>j.workerId==='player')||available().find(j=>!j.workerId);if(!job)return null;const v=board.getVisit(job.visitId),held=heldJob()?.id===job.id,kind=held?'deliverMix':'pickup';return {key:job.id+':'+kind,jobId:job.id,visitId:v.id,number:v.number,kind,itemId:job.itemId,tokenId:v.tokenId,position:(held?P.menService:P.apothecaryPickup).slice(),target:(held?P.menReceive:P.mixtureTray).slice(),executionRadius:.22,action:`${v.number}号 ${v.name} · ${held?'核对原牌并交原浴包':'去四层药房领取同号原浴包'}`};}
 function executeWork(work,receiptId){const expected=workIntent(receiptId),player=getPlayer();if(!expected||expected.key!==work.key||!near(player?.root.position,expected.position,.22)||getMounted())return false;const job=board.claim(work.jobId,'player');if(!job)return false;step={...expected,receiptId,elapsed:0,duration:work.kind==='pickup'?.8:1.3};return true;}
 function update(dt){if(disposed)return;if(meeting)recall();if(desired&&!paused&&!inWorkplace()&&!heldJob()){if(board.releaseStaffDuty(KEY,desired)){step=null;paused=true;}}
  if(desired&&!paused){if(!board.staffDuty(KEY))board.setStaffDuty(KEY,desired,'draining');if(board.staffDuty(KEY)?.status!=='active'&&recall()&&!deliveryClaims().some(j=>j.workerId!=='player'))board.setStaffDuty(KEY,desired,'active');}
  board.tickStaffDuty(KEY,dt);if(!step)return;const player=getPlayer(),v=board.getVisit(step.visitId),guest=customerActor(step.visitId);if(!dutyActive(step.receiptId)||!v||!near(player?.root.position,step.position,.24)||getMounted()){step=null;return;}if(player.walking)return;
  if(step.kind==='deliverMix'&&(v.stage!=='waiting-bath'||!near(guest?.root.position,P.menReceive,.34)))return;
  player.root.rotation.y=Math.atan2(step.target[0]-player.root.position.x,step.target[2]-player.root.position.z);step.elapsed+=Math.max(0,Math.min(.1,dt));if(step.elapsed<step.duration)return;
  const evidence={receiptId:step.receiptId,visitId:step.visitId,number:step.number,position:player.root.position.toArray(),guestPosition:guest?.root.position.toArray(),tokenId:step.tokenId,itemId:step.itemId};
  const ok=step.kind==='pickup'?board.pickup(step.jobId,'player',evidence):board.complete(step.jobId,'player',evidence);if(ok){onComplete(step.visitId,step.kind);step=null;}
 }
 return {registry:JAPAN_BATH_DELIVERY_REGISTRY.slice(),meetingReady,inWorkplace,dutyActive,workIntent,executeWork,update,releaseDuty,
  holdDuty(receiptId){desired=receiptId;paused=true;},canClaimDuty:()=>!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),
  claimDuty(receiptId){if(disposed||desired&&desired!==receiptId||!this.canClaimDuty())return false;desired=receiptId;paused=false;return board.setStaffDuty(KEY,receiptId,dutyActive(receiptId)?'active':'draining');},
  canEndDuty:receiptId=>desired===receiptId&&!step&&!heldJob(),requestMeeting(value){meeting=!!value;},blocksWorker:id=>id==='jp-onsen'&&meeting&&!busy(host)||['jp-onsen','jp-steam'].includes(id)&&!!board.staffDuty(KEY),holdsHost:()=>meeting&&!busy(host),isCovering:()=>board.staffDuty(KEY)?.status==='active',
  awaitsGuest:id=>!!desired&&!paused&&available().some(j=>j.visitId===id),
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,held:heldJob()?.itemId||null}),workReceipts:receiptId=>board.staffReceipts(KEY,receiptId),isActing:()=>!!step,held:()=>!!heldJob(),stopWorkAction:stopWork,returnPosition:()=>P.apothecaryPickup.slice(),actor:getPlayer,
  workLabel:()=>step?`${step.number}号 · ${step.kind==='pickup'?'核号领取原浴包':'当面核对原客浴牌'}`:heldJob()?'携原号浴包 · 沿服务侧送交原客':paused?'配送已暂停 · 原人代管，请当面接回':board.staffDuty(KEY)?.status==='draining'?'等原人送完手中浴包 · 安全接班':'在服务侧候单 · 原男汤来客逐号配送',
  playerPose:()=>heldJob()?{action:'tidy',handoff:true,station:{handoff:true}}:step?{action:'tidy',workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  snapshot:()=>({version:1,desired,paused,status:board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,jobId:deliveryClaims().find(j=>j.workerId==='player')?.id||null}),
  restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!s.paused;step=null;if(desired&&!paused){board.setStaffDuty(KEY,desired,s.status==='draining'?'draining':'active');if(s.jobId)board.claim(s.jobId,'player');if(s.step&&board.claim(s.step.jobId,'player')&&workIntent(desired)?.key===s.step.key)step=copy(s.step);}return true;},
  dispose(){disposed=true;step=null;if(desired)board.releaseStaffDuty(KEY,desired);desired=null;}
 };
}
