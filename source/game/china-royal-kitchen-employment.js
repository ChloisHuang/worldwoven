import {ROYAL_KITCHEN_ROLE as ROLE} from './china-royal-kitchen-role.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
const copy=x=>JSON.parse(JSON.stringify(x)),near=(p,q,r=.35)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const int=n=>Number.isSafeInteger(n)&&n>=0;
export function createChinaRoyalKitchenEmployment({kitchen,careers,getPlayer,getMounted=()=>null,getClock,saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},notify=()=>{}}){
 const provider='china-royal-kitchen-employment',REG=kitchen.registry;
 let current={version:1,serial:0,job:null},waiting=null,attendance=0,disposed=false,lastError=null;
 const validJob=j=>j===null||j&&j.formalRoleId===ROLE.id&&['working','ready'].includes(j.stage)&&/^cn-royal-kitchen-labor-[1-9][0-9]*$/.test(j.receiptId)&&int(j.day)&&Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&int(j.completedTasks)&&int(j.completedThrough)&&Array.isArray(j.completedOrderIds)&&j.completedOrderIds.every(id=>/^cn-royal-meal-[1-9][0-9]*$/.test(id));
 if(saved!=null){if(saved.version===1&&int(saved.serial)&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 function save(next){try{const ok=saveState(copy(next));if(ok===false||ok?.then)return false;current=next;return true;}catch{return false;}}
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,REG)&&canSee({position:REG});
 const meet=()=>atRegistration()&&kitchen.meetingReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=text=>{notify(text);return false;};
 function accept(){if(lastError||current.job||!formal.hired()||!meet())return false;
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:{receiptId,formalRoleId:ROLE.id,day:getClock().day,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,completedThrough:0,completedOrderIds:[]}}))return fail('报到保存失败，请原处重试');
  attendance=0;kitchen.claimDuty(receiptId);notify('Jia已当面交班。现场候单计时，逐单备膳；另行交班按实际工时入银行');return true;
 }
 function flush(){const j=current.job;if(!j)return false;const receipts=kitchen.workReceipts(j.receiptId).filter(r=>!j.completedOrderIds.includes(r.orderId));
  for(const receipt of receipts)if(!careers.recordRoyalKitchenService(receipt).ok)return false;
  if(!save({...current,job:{...j,coveredSeconds:j.coveredSeconds+attendance,completedTasks:j.completedTasks+receipts.length,completedOrderIds:[...j.completedOrderIds,...receipts.map(r=>r.orderId)],completedThrough:Math.max(j.completedThrough,...receipts.map(r=>r.number))}}))return false;attendance=0;return true;
 }
 function endShift(){const j=current.job;if(!j||j.stage!=='working'||!meet())return false;
  if(!kitchen.canEndDuty(j.receiptId))return fail('请先完成手上原膳，并等本人用完；中断班次会注销未用膳并记耗损');
  if(!flush()||!formal.complete(current.job))return false;
  kitchen.releaseDuty(j.receiptId);if(!save({...current,job:{...current.job,stage:'ready'}}))return false;notify('原膳和当班时段已核对，请Jia验收后结薪');return true;
 }
 function claim(){const j=current.job;if(j?.stage!=='ready'||!meet())return false;const result=formal.inspect(j);if(!result.ok)return false;
  if(careers.state().lastDuty?.stage!=='paid'){notify('工资已入银行，封账待重试，不会重复入账');return true;}
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待重试');kitchen.releaseDuty(j.receiptId);notify(`Jia：当班日薪${careers.state().lastDuty.wage}铜文已入银行`);return true;
 }
 function intent(kind=null){if(disposed||lastError)return null;const j=current.job,work=j?.stage==='working'?kitchen.workIntent(j.receiptId):null;
  kind||=j?j.stage==='ready'?'claim':work?'task':getClock().hour>=18?'end-shift':'wait':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';if(kind==='work')kind='task';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&j)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&j?.stage!=='ready'||kind==='task'&&!work||['wait','cancel','end-shift'].includes(kind)&&j?.stage!=='working')return null;
  const action=kind==='task'?work.action:({'formal-view':'查看御膳厨役技术岗','formal-apply':'提交御膳厨役申请','formal-review':'请Jia本人审核','formal-resign':'办理御膳厨役离职',accept:'报到 · 与Jia当面接班',claim:'Jia验收 · 工资入银行',wait:kitchen.workLabel(),'end-shift':'当面交班 · 按工时结薪',cancel:'中断本班 · 注销未用原膳'})[kind];
  return action?{id:'cn-royal-kitchen-job-'+kind,provider,roleId:ROLE.id,kind,name:'御膳备餐间 · 技术岗',npcName:'Jia',action,position:(kind==='task'?work.position:REG).slice(),executionRadius:kind==='task'?work.executionRadius:.35,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),...(kind==='task'?{work:copy(work),playerWorkTarget:work.target}:{}),intentKey:[['task','wait','end-shift','cancel'].includes(kind)?'-':careers.state().revision,j?.receiptId||'-',j?.stage||'-',kind,kind==='task'?work.key:'-'].join(':')}:null;
 }
 const resolveIntent=old=>{const next=intent(old?.kind);return next&&next.provider===old.provider&&next.id===old.id&&next.intentKey===old.intentKey?next:null;};
 function executeIntent(old){const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.kind==='task')return kitchen.executeWork(next.work,current.job.receiptId,getPlayer());
  if(next.kind==='wait'){const s=kitchen.supplyState();notify(`${next.action} · 开局储备余${s.remaining}/120份，已损耗${s.wasted}份；工作不授用膳资格`);return true;}
  if(next.kind==='cancel'){if(!flush())return false;if(!formal.cancel(current.job))return false;if(!kitchen.releaseDuty(current.job.receiptId,{cancel:true}))return false;if(!save({...current,job:null}))return false;attendance=0;return true;}
  if(!meet()||next.kind==='end-shift'&&!kitchen.canEndDuty(current.job.receiptId)){waiting=next;kitchen.requestMeeting(true);notify('等原膳用毕、Jia回来当面交班；如尚有备制，请先完成手上原单');return true;}
  waiting=null;return next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():next.kind==='end-shift'?endShift():false;
 }
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return p&&p.x>=16&&p.x<=26&&p.z>=-12&&p.z<=2&&p.y>=-.05&&p.y<=.55;};
 function update(dt=0){if(disposed||lastError)return;kitchen.requestMeeting(!!waiting||atRegistration()&&(current.job?.stage!=='working'||!kitchen.dutyActive(current.job.receiptId)));
  if(waiting){if(!atRegistration()||!resolveIntent(waiting))waiting=null;else if(meet()&&(waiting.kind!=='end-shift'||kitchen.canEndDuty(current.job.receiptId))){const next=waiting;waiting=null;executeIntent(next);}}
  const j=current.job;if(j?.stage!=='working')return;const d=careers.state().lastDuty;
  if(d?.workReceiptId===j.receiptId&&['inspection','ready','paid'].includes(d.stage)){kitchen.releaseDuty(j.receiptId);save({...current,job:{...j,stage:'ready'}});return;}
  if(!formal.canWork(j)){if(!flush())return;if(kitchen.releaseDuty(j.receiptId,{cancel:true})&&save({...current,job:null}))attendance=0;return;}
  kitchen.claimDuty(j.receiptId);
  if(getClock().hour<18&&inWorkplace()&&!getMounted()&&kitchen.dutyActive(j.receiptId))attendance+=Math.min(.1,Math.max(0,dt));
  if(attendance>=1||kitchen.workReceipts(j.receiptId).some(r=>!j.completedOrderIds.includes(r.orderId)))flush();
 }
 return {formal,intent,resolveIntent,executeIntent,accept,claim,endShift,update,atRegistration,
  active:()=>!!current.job,isActing:()=>kitchen.isActing(),held:()=>kitchen.held(),stopActivity(){waiting=null;kitchen.stopWorkAction();kitchen.requestMeeting(false);},
  playerAction:()=>kitchen.playerPose()?.action||null,playerStation:()=>kitchen.playerPose()?.station||null,label:()=>current.job?current.job.stage==='ready'?'当班已封存 · 请Jia验收':kitchen.workLabel():null,
  state:()=>({...copy(current),lastError,waiting:!!waiting,supply:kitchen.supplyState(),job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance,completedOrders:current.job.completedTasks}:null}),
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,coveredSeconds:current.job?.coveredSeconds||0,attendance}),restore:s=>{if(s?.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>1.1)return false;attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)?s.attendance:0;return true;},
  dispose(){disposed=true;waiting=null;}
 };
}
