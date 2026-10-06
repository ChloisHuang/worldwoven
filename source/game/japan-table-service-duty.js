import {JAPAN_SERVICE_POINTS as P,JAPAN_DINING_MENU} from './japan-service-orders.js';
export const JAPAN_TABLE_SERVICE_REGISTRY=Object.freeze([3.1,0,-11.3]);
const HOME=[4.35,0,-11.3],KEY='tableService',HOST='jp-ramen',CREW=[HOST,'jp-sushi'],REG=JAPAN_TABLE_SERVICE_REGISTRY,copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&q&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const point=a=>({x:a[0],y:a[1],z:a[2]}),dish=v=>JAPAN_DINING_MENU.find(d=>d.id===(v.dishId||'ramen'))?.name||'餐点';
// The original order, plate, guest and staff pair remain the sole owners.
export function createJapanTableServiceDuty({board,actors,assign,clear,unmount,taskOf,getStaffLife,customerActor,onComplete=()=>{},getPlayer,getMounted=()=>null,planPath,isDutyRoute=()=>false}){
 const host=actors.get(HOST);let desired=null,meeting=false,step=null,paused=false,disposed=false,corridors=[],routeSignature='',reads=null;
 const read=()=>reads||board.tableWork(),scoped=fn=>{if(reads)return fn();reads=board.tableWork();try{return fn();}finally{reads=null;}};
 const jobs=()=>read().jobs.filter(j=>['serve','wash'].includes(j.kind)&&board.getVisit(j.visitId)?.customerType!=='player');
 const claims=()=>read().claims.filter(j=>['serve','wash'].includes(j.kind));
 const cargo=job=>read().items.find(i=>i.id===job?.itemId);
 const heldJob=()=>claims().find(j=>j.workerId==='player'&&cargo(j)?.location.type==='worker'&&cargo(j)?.location.id==='player');
 function refreshRoutes(){const stations=[...new Map([REG,P.kitchenPickup,P.sushiPickup,...read().visits.map(v=>v.servePoint)].map(p=>[p.join(','),p])).values()],signature=JSON.stringify(stations);if(signature===routeSignature)return;routeSignature=signature;corridors=stations.flatMap((p,i)=>stations.slice(i+1).flatMap(q=>{const route=planPath?.(point(p),point(q),.34);if(!route?.length)return [];const nodes=[point(p),...route,point(q)];return nodes.slice(1).map((b,j)=>[nodes[j],b]);}));}
 const nearRoute=p=>corridors.some(([a,b])=>{const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=dx*dx+dy*dy+dz*dz,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/d)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy,p.z-a.z-t*dz)<.8;});
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return !!p&&(Math.abs(p.y)<.35&&p.x>=-8&&p.x<=5.6&&p.z>=-14.5&&p.z<=-9.5||read().visits.some(v=>near(p,v.servePoint,1.3))||nearRoute(p)||isDutyRoute());};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle&&!t.tableMeeting;};
 const meetingReady=()=>near(host.root.position,HOME,.2)&&!host.serviceMount&&!busy(host)&&getStaffLife()?.state().active?.id!==HOST;
 const dutyActive=id=>desired===id&&board.staffDuty(KEY)?.status==='active',covering=()=>board.staffDuty(KEY)?.status==='active';
 const cookingRelief=()=>{const a=getStaffLife()?.state().active;return a?.id==='jp-sushi'&&a.reliefId===HOST&&!['draining','handoff'].includes(a.phase);};
 function recall(){if(!getStaffLife()?.recall(HOST)||busy(host)||!unmount(host))return false;const t=taskOf(host);if(!near(host.root.position,HOME,.2)||!t?.tableMeeting){clear(host);assign(host,HOME,{idle:true,tableMeeting:true,label:'在原厨房旁等候送餐交班',face:REG,duration:0,onDone:()=>false});}return meetingReady();}
 function workChoices(receiptId){if(!dutyActive(receiptId)||step)return [];const own=jobs().find(j=>j.workerId==='player'),available=own?[own]:jobs().filter(j=>!j.workerId),result=[];
  for(const j of available){const v=board.getVisit(j.visitId),item=cargo(j),held=item?.location.type==='worker'&&item.location.id==='player',wrong=item?.location.id==='wrong-table',wrongGuest=wrong?board.getVisit(item.location.targetVisitId):null;
   const base={jobId:j.id,visitId:v.id,number:v.number,itemId:j.itemId,tokenId:v.tokenId,dishId:v.dishId||'ramen',executionRadius:.22,duration:.9};
   const add=(kind,target,position,focus,label,duration=.9)=>result.push({...base,key:j.id+':'+kind+':'+target.id,kind,targetVisitId:target.id,position:position.slice(),target:focus.slice(),visualAnchor:['serve','collect','retrieve'].includes(kind)?{id:'jp-meal:'+target.id,point:target.mealPoint?.slice()||[target.diningPoint[0]+.5,target.diningPoint[1]+.6,target.diningPoint[2]]}:{id:'jp-tray:'+focus.join(':'),point:focus.slice()},action:`${v.number}号 ${v.name} · 原单${dish(v)} · ${label}`,duration});
   if(j.kind==='wash'){add(held?'wash':'collect',v,held?P.kitchenPickup:v.servePoint,held?P.mealTray:v.diningPoint,held?'归原厨房清洗同一餐盘':'收回原客已吃完的餐盘',held?2:.9);continue;}
   if(!held){add(wrong?'retrieve':'pickup',wrongGuest||v,wrong?wrongGuest.servePoint:P[j.from],wrong?wrongGuest.diningPoint:v.dishId==='sushi'?P.sushiTray:P.mealTray,wrong?`从${wrongGuest.number}号 ${wrongGuest.name}桌取回送错的原盘`:'领取这份原盘');continue;}
   for(const target of read().visits.filter(t=>t.customerType!=='player'&&['waiting-meal','eating'].includes(t.stage)))add('serve',target,target.servePoint,target.diningPoint,`送到${target.number}号 ${target.name}桌（该桌原单：${dish(target)}）`,1.3);
  }return result;
 }
 const workIntent=(id,key=null)=>scoped(()=>{const choices=workChoices(id);return (key?choices.find(w=>w.key===key):choices[0])||null;});
 function executeWork(work,id){const next=workIntent(id,work.key);if(!next||!near(getPlayer()?.root.position,next.position,.22)||getMounted()||!board.claim(next.jobId,'player'))return false;step={...next,receiptId:id,elapsed:0};return true;}
 function releaseDuty(id,{evaluate=false}={}){const held=heldJob();if(held&&!near(getPlayer()?.root.position,held.kind==='wash'?board.getVisit(held.visitId).servePoint:P[held.from],.3))return false;if(!board.releaseStaffDuty(KEY,id,{evaluate}))return false;desired=null;step=null;paused=false;return true;}
 function update(dt){if(disposed)return;if(meeting)recall();if(desired&&!paused&&(!inWorkplace()||getMounted())){if(heldJob()?board.pauseStaffDuty(KEY,desired):board.releaseStaffDuty(KEY,desired)){step=null;paused=true;}}
  if(desired&&!paused){if(!board.staffDuty(KEY))board.setStaffDuty(KEY,desired,'draining');if(board.staffDuty(KEY)?.status!=='active'&&recall()&&!claims().some(j=>j.workerId!=='player')){board.setStaffDuty(KEY,desired,'active');refreshRoutes();}}
  board.tickStaffDuty(KEY,dt);if(!step)return;const player=getPlayer(),v=board.getVisit(step.visitId),target=board.getVisit(step.targetVisitId),guest=customerActor(step.targetVisitId);if(!dutyActive(step.receiptId)||!v||!target||!near(player?.root.position,step.position,.24)||getMounted()){step=null;return;}if(player.walking)return;
  if(step.kind==='serve'&&(!['waiting-meal','eating'].includes(target.stage)||!near(guest?.root.position,target.diningPoint,.8))){step=null;return;}
  player.root.rotation.y=Math.atan2(step.target[0]-player.root.position.x,step.target[2]-player.root.position.z);step.elapsed+=Math.max(0,Math.min(.1,dt));if(step.elapsed<step.duration)return;
  const evidence={receiptId:step.receiptId,visitId:v.id,number:v.number,itemId:step.itemId,tokenId:step.tokenId,position:player.root.position.toArray(),guestPosition:guest?.root.position.toArray(),targetVisitId:target.id};
  const ok=['pickup','retrieve','collect'].includes(step.kind)?board.pickup(step.jobId,'player',evidence):step.kind==='serve'&&target.id!==v.id?board.rejectTableDelivery(step.jobId,evidence):board.complete(step.jobId,'player',evidence);
  if(ok){if(step.kind==='wash'&&['departed','cancelled'].includes(v.stage))board.forgetFinished([v.id]);reads=null;onComplete(v.id,step.kind==='serve'&&target.id!==v.id?'wrong-table':step.kind);step=null;refreshRoutes();}
 }
 return {registry:REG.slice(),meetingReady,inWorkplace:()=>scoped(inWorkplace),dutyActive,workIntent,workChoices:id=>scoped(()=>workChoices(id)),executeWork,releaseDuty,update:dt=>scoped(()=>update(dt)),
  holdDuty(id){desired=id;paused=true;},canClaimDuty:()=>!board.state().visits.some(v=>v.customerType==='player'&&!['departed','cancelled'].includes(v.stage)),
  claimDuty(id){if(disposed||desired&&desired!==id||!this.canClaimDuty())return false;desired=id;paused=false;refreshRoutes();return board.setStaffDuty(KEY,id,dutyActive(id)?'active':'draining');},
  canEndDuty:id=>desired===id&&!step&&!claims().some(j=>j.workerId==='player'),requestMeeting:value=>{meeting=!!value;},
  blocksWorker(id,kind){if(id===HOST&&meeting&&!busy(host))return true;if(!CREW.includes(id)||!['draining','active'].includes(board.staffDuty(KEY)?.status))return false;return ['serve','wash'].includes(kind)||id===HOST&&(board.staffDuty(KEY)?.status==='draining'||kind==='cook'&&!cookingRelief());},
  coversWorker:(id,kind=null)=>covering()&&CREW.includes(id)&&(kind?['serve','wash'].includes(kind):id===HOST),holdsHost:()=>!!(meeting||board.staffDuty(KEY)?.status==='draining')&&!busy(host),isCovering:covering,
  idlePoint:id=>covering()&&id===HOST?HOME.slice():null,idleTask:id=>covering()&&id===HOST?{duration:4,face:REG,label:cookingRelief()?'代做餐候单 · 送餐由你当班':'送餐已交班 · 歇脚并等候厨房后备'}:null,
  dutyState:()=>({receiptId:desired,status:paused?'paused':board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,held:heldJob()?.itemId||null}),workReceipts:id=>board.staffReceipts(KEY,id),isActing:()=>!!step,held:()=>!!heldJob(),actor:getPlayer,
  stopWorkAction(){step=null;},returnPosition(){const j=heldJob();return j?.kind==='wash'?board.getVisit(j.visitId).servePoint.slice():j?P[j.from].slice():HOME.slice();},
  workLabel:()=>step?.action|| (paused?heldJob()?'送餐暂停 · 保留原盘，请当面续班或送回原处':'送餐暂停 · Daichi代管，请当面续班':heldJob()?'持原号餐盘 · 职业手册可核对并选择原客桌':board.staffDuty(KEY)?.status==='draining'?'等Daichi交妥当前原盘，再接送餐班':'送餐候单 · 可选择原托盘、客桌与已用餐盘'),
  playerPose:()=>heldJob()?{action:'tidy',handoff:true,station:{handoff:true}}:step?{action:'tidy',workTarget:step.target.slice(),station:{workTarget:step.target.slice()}}:null,
  snapshot:()=>({version:1,desired,paused:paused||!!desired&&(!board.staffDuty(KEY)||board.staffDuty(KEY).status==='paused'),status:board.staffDuty(KEY)?.status||'inactive',step:step?copy(step):null,jobId:claims().find(j=>j.workerId==='player')?.id||null}),
  restore(s){if(s?.version!==1)return false;desired=s.desired||null;paused=!!s.paused;step=null;refreshRoutes();if(desired&&(s.jobId||!paused)){board.setStaffDuty(KEY,desired,paused||s.status==='draining'?'draining':'active');if(s.jobId)board.claim(s.jobId,'player');if(paused)board.pauseStaffDuty(KEY,desired);if(!paused&&s.step&&workIntent(desired,s.step.key)&&board.claim(s.step.jobId,'player'))step=copy(s.step);}return true;},
  dispose(){disposed=true;step=null;if(desired)board.releaseStaffDuty(KEY,desired);desired=null;}
 };
}
