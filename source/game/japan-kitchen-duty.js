import {JAPAN_SERVICE_POINTS as P,JAPAN_DINING_MENU} from './japan-service-orders.js';
export const JAPAN_KITCHEN_REGISTRY=Object.freeze([-1.4,0,-12.05]);
const HOME=[-2.75,0,-12.05],KEY='kitchen',CREW=['jp-sushi','jp-ramen'],copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const PHASES={pending:{kind:'checked',action:'核对菜名与份号',duration:1.1},checked:{kind:'cooked',duration:6},cooked:{kind:'plated',action:'装盘并核对份号',duration:1.5},plated:{kind:'dispatch',action:'放到传菜位等送餐',duration:.8}};
// The player covers only manufacture. Daichi delivers; when he physically
// hands over for a break, Haru covers delivery without reacquiring cooking.
export function createJapanKitchenDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,onComplete=()=>{},getPlayer,getMounted=()=>null}){
 const host=actors.get('jp-sushi');let desired=null,meeting=false,step=null,paused=false,disposed=false;
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return p&&Math.abs(p.y)<.35&&p.x>=-8&&p.x<=5&&p.z>=-14.5&&p.z<=-9.5;};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle&&!t.kitchenMeeting;};
 const meetingReady=()=>near(host.root.position,HOME,.2)&&!host.serviceMount&&!busy(host)&&getStaffLife()?.state().active?.id!=='jp-sushi';
 const dutyActive=receiptId=>desired===receiptId&&board.staffDuty(KEY)?.status==='active';
 const covering=()=>board.staffDuty(KEY)?.status==='active';
 const deliveryRelief=()=>{const a=getStaffLife()?.state().active;return a?.id==='jp-ramen'&&a.reliefId==='jp-sushi'&&!['draining','handoff'].includes(a.phase);};
 function recall(){const life=getStaffLife();if(!life?.recall('jp-sushi'))return false;if(busy(host)||!unmount(host))return false;const t=taskOf(host);if(!near(host.root.position,HOME,.2)||!t?.kitchenMeeting){clear(host);assign(host,HOME,{idle:true,kitchenMeeting:true,label:'在厨房旁等候制作交班',face:JAPAN_KITCHEN_REGISTRY,duration:0,onDone:()=>false});}return meetingReady();}
 function releaseDuty(receiptId,{evaluate=false}={}){if(!board.releaseStaffDuty(KEY,receiptId,{evaluate}))return false;desired=null;step=null;paused=false;return true;}
 function workIntent(receiptId){if(!dutyActive(receiptId)||step)return null;const jobs=board.kitchenWork().jobs.filter(j=>j.visit.customerType!=='player'),job=jobs.find(j=>j.workerId==='player')||jobs.find(j=>!j.workerId);if(!job)return null;
  const v=job.visit,dishId=v.dishId||'ramen',phase=v.cooking?.workReceiptId===receiptId?v.cooking.phase:'pending',config=PHASES[phase],dish=JAPAN_DINING_MENU.find(d=>d.id===dishId);if(!config||!dish)return null;
  const dispatch=config.kind==='dispatch',position=P[dispatch?(dishId==='sushi'?'sushiPickup':'kitchenPickup'):job.to],target=dispatch?P[dishId==='sushi'?'sushiTray':'mealTray']:dishId==='sushi'?[-6.6,1.18,-13.65]:[2.1,1.47,-13.4];
  return {key:job.id+':'+config.kind,jobId:job.id,visitId:v.id,number:v.number,kind:config.kind,tokenId:v.tokenId,itemId:`${v.id}:meal`,dishId,position:position.slice(),target:target.slice(),executionRadius:.22,duration:config.duration,action:`${v.number}号 ${dish.name} · ${config.action||(dishId==='sushi'?'切配并握制寿司':'煮面并备好热汤')}`};
 }
 function executeWork(work,receiptId){const expected=workIntent(receiptId);if(!expected||expected.key!==work.key||!near(getPlayer()?.root.position,expected.position,.22)||getMounted()||!board.claim(work.jobId,'player'))return false;step={...expected,receiptId,elapsed:0};return true;}
 function update(dt){if(disposed)return;if(meeting)recall();if(desired&&!paused&&(!inWorkplace()||getMounted())){if(board.releaseStaffDuty(KEY,desired)){step=null;paused=true;}}
  if(desired&&!paused){if(!board.staffDuty(KEY))board.setStaffDuty(KEY,desired,'draining');if(board.staffDuty(KEY)?.status!=='active'&&recall()&&!board.kitchenWork().claims.some(j=>j.workerId!=='player'))board.setStaffDuty(KEY,desired,'active');}
  board.tickStaffDuty(KEY,dt);if(!step)return;const player=getPlayer(),v=board.getVisit(step.visitId);if(!dutyActive(step.receiptId)||!v||v.mealId||!near(player?.root.position,step.position,.24)||getMounted()){step=null;return;}if(player.walking)return;
  player.root.rotation.y=Math.atan2(step.target[0]-player.root.position.x,step.target[2]-player.root.position.z);step.elapsed+=Math.max(0,Math.min(.1,dt));if(step.elapsed<step.duration)return;
  const evidence={receiptId:step.receiptId,visitId:step.visitId,number:step.number,position:player.root.position.toArray(),tokenId:step.tokenId,itemId:step.itemId,dishId:step.dishId};
  if(step.kind==='dispatch'?board.complete(step.jobId,'player',evidence):board.cookWork(step.jobId,'player',step.kind,evidence)){onComplete(step.visitId,step.kind==='dispatch'?'cook':'cook-'+step.kind);step=null;}
 }
 return {registry:JAPAN_KITCHEN_REGISTRY.slice(),meetingReady,inWorkplace,dutyActive,workIntent,executeWork,update,releaseDuty,
  holdDuty(receiptId){desired=receiptId;paused=true;},canClaimDuty:()=>!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),
  claimDuty(receiptId){if(disposed||desired&&desired!==receiptId||!this.canClaimDuty())return false;desired=receiptId;paused=false;return board.setStaffDuty(KEY,receiptId,dutyActive(receiptId)?'active':'draining');},
  canEndDuty:receiptId=>desired===receiptId&&!step,requestMeeting(value){meeting=!!value;},
  blocksWorker(id,kind){if(id==='jp-sushi'&&meeting&&!busy(host))return true;if(!CREW.includes(id)||!['draining','active'].includes(board.staffDuty(KEY)?.status))return false;return kind==='cook'||id==='jp-sushi'&&(board.staffDuty(KEY)?.status==='draining'||kind==='serve'&&!deliveryRelief());},
  coversWorker:(id,kind=null)=>covering()&&CREW.includes(id)&&(kind?kind==='cook':id==='jp-sushi'),
  holdsHost:()=>!!(meeting||board.staffDuty(KEY)?.status==='draining')&&!busy(host),isCovering:covering,
  idlePoint:id=>covering()&&CREW.includes(id)?id==='jp-sushi'?HOME.slice():[4.35,0,-11.3]:null,
  idleTask:id=>covering()&&CREW.includes(id)?{duration:4,face:P.mealTray,label:id==='jp-sushi'?deliveryRelief()?'代送餐候单 · 制作由你当班':'制作已交班 · 歇脚并等候配送后备':'传菜候单 · 接取同号餐盘'}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,held:null}),workReceipts:receiptId=>board.staffReceipts(KEY,receiptId),isActing:()=>!!step,held:()=>false,stopWorkAction(){step=null;},returnPosition:()=>HOME.slice(),actor:getPlayer,
  workLabel:()=>step?step.action:paused?'制作已暂停 · Haru代管，请当面接回':board.staffDuty(KEY)?.status==='draining'?'等原餐盘做好并交妥后接班':'厨房候单 · 核菜名、做餐、出品到传菜位',
  playerPose:()=>step?{action:step.kind==='cooked'?step.dishId==='sushi'?'sushi':'ramen':'tidy',workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  snapshot:()=>({version:1,desired,paused:paused||!!desired&&!board.staffDuty(KEY),status:board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,jobId:board.kitchenWork().claims.find(j=>j.workerId==='player')?.id||null}),
  restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!s.paused;step=null;if(desired&&!paused){board.setStaffDuty(KEY,desired,s.status==='draining'?'draining':'active');if(s.jobId)board.claim(s.jobId,'player');if(s.step&&workIntent(desired)?.key===s.step.key&&board.claim(s.step.jobId,'player'))step=copy(s.step);}return true;},
  dispose(){disposed=true;step=null;if(desired)board.releaseStaffDuty(KEY,desired);desired=null;}
 };
}
