import {JAPAN_RECEPTION_ROLE as ROLE} from './japan-reception-role.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
const copy=x=>JSON.parse(JSON.stringify(x)),near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
// Hiring, time wages and reviews share the formal ledger. Only the original
// service board produces evidence of a same-number guest/token operation.
export function createJapanReceptionEmployment({reception,careers,getPlayer,getMounted=()=>null,getClock,saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},notify=()=>{}}){
 const provider='japan-reception-employment',REG=reception.registry;let current={version:1,serial:0,job:null},waiting=null,attendance=0,disposed=false,lastError=null;
 const validJob=j=>j===null||j&&j.formalRoleId===ROLE.id&&['working','ready'].includes(j.stage)&&/^jp-reception-labor-[1-9][0-9]*$/.test(j.receiptId)&&integer(j.day)&&Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&integer(j.completedTasks)&&Array.isArray(j.reviewIds)&&j.reviewIds.every(id=>typeof id==='string');
 if(saved!=null){if(saved.version===1&&integer(saved.serial)&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 if(current.job?.stage==='working')reception.holdDuty(current.job.receiptId);
 function save(next){try{const result=saveState(copy(next));if(result===false||result?.then)return false;current=next;return true;}catch{return false;}}
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,REG)&&canSee({position:REG});
 const meet=()=>atRegistration()&&reception.meetingReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=text=>{notify(text);return false;};
 function accept(){if(lastError||current.job||!formal.hired()||!meet())return false;
  if(!reception.canClaimDuty())return fail('请先完成自己的泡汤或用餐，再接前台班次');
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:{receiptId,formalRoleId:ROLE.id,day:getClock().day,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,reviewIds:[]}}))return fail('报到未保存，请在原处重试');
  attendance=0;reception.claimDuty(receiptId);notify('Koharu：请逐号核对客簿与原浴牌。前台候单计时，另行交班后日薪存入日本币银行');return true;
 }
 function flush(){const j=current.job;if(!j)return false;const receipts=reception.workReceipts(j.receiptId).filter(r=>!j.reviewIds.includes(r.id));
  for(const receipt of receipts)if(!careers.recordJapanReceptionReview(receipt).ok)return false;
  if(!save({...current,job:{...j,coveredSeconds:j.coveredSeconds+attendance,completedTasks:j.completedTasks+receipts.filter(r=>r.completed).length,reviewIds:[...j.reviewIds,...receipts.map(r=>r.id)]}}))return false;attendance=0;return true;
 }
 function endShift(){const j=current.job;if(j?.stage!=='working'||!meet())return false;
  if(reception.isActing())return fail('请先核对完手上原牌，再当面交班');
  if(!flush()||!reception.releaseDuty(j.receiptId,{evaluate:true})||!flush()||!formal.complete(current.job))return false;
  if(!save({...current,job:{...current.job,stage:'ready'}}))return false;notify('Koharu已接回原柜台，工时与逐客记录已封存；请当面验收结薪');return true;
 }
 function claim(){const j=current.job;if(j?.stage!=='ready'||!meet())return false;const result=formal.inspect(j);if(!result.ok)return false;
  if(careers.state().lastDuty?.stage!=='paid'){notify('工资已入银行，封账待重试，不会重复发放');return true;}
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待重试');notify(`Koharu：${careers.state().lastDuty.wage}日本券日薪已存入银行`);return true;
 }
 function intent(kind=null){if(disposed||lastError)return null;const j=current.job,work=j?.stage==='working'?reception.workIntent(j.receiptId):null,paused=reception.dutyState().status==='paused';
  kind||=j?j.stage==='ready'?'claim':getClock().hour>=18?'end-shift':paused?'resume':work?'task':'wait':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';if(kind==='work')kind='task';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&j)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&j?.stage!=='ready'||kind==='task'&&!work||['wait','cancel','end-shift','resume'].includes(kind)&&j?.stage!=='working'||kind==='resume'&&!paused)return null;
  const action=kind==='task'?work.action:({'formal-view':'查看汤馆接待见习岗位','formal-apply':'自荐 · 提交接待见习申请','formal-review':'请Koharu审核 · 确认店规与工钱','formal-resign':'办理接待见习离职',accept:'显式接班 · 开始今日前台工作',resume:'当面接回前台 · 继续原班',claim:'Koharu验收 · 日薪入银行',wait:reception.workLabel(),'end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 原柜台交回'})[kind];
  return action?{id:'jp-reception-job-'+kind,provider,roleId:ROLE.id,kind,name:ROLE.workplace,npcName:'Koharu',action,position:(kind==='task'?work.position:REG).slice(),executionRadius:kind==='task'?work.executionRadius:.3,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),...(kind==='task'?{work:copy(work),playerWorkTarget:work.target}:{}),intentKey:[['task','wait','resume','end-shift','cancel'].includes(kind)?'-':careers.state().revision,j?.receiptId||'-',j?.stage||'-',kind,kind==='task'?work.key:'-'].join(':')}:null;
 }
 const resolveIntent=old=>{const next=intent(old?.kind);return next&&old&&next.provider===old.provider&&next.id===old.id&&next.intentKey===old.intentKey?next:null;};
 function executeIntent(old){const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.kind==='task')return reception.executeWork(next.work,current.job.receiptId);
  if(next.kind==='wait'){notify(next.action+'；职业手册可选择交班');return true;}
  if(next.kind==='cancel'){if(!flush()||!reception.releaseDuty(current.job.receiptId,{evaluate:true})||!flush()||!formal.cancel(current.job))return false;if(!save({...current,job:null}))return false;attendance=0;return true;}
  if(!meet()){waiting=next;reception.requestMeeting(true);notify('请在原前台稍候，Koharu收好原单后回来当面办理');return true;}
  waiting=null;if(next.kind==='resume')return reception.canClaimDuty()&&formal.canWork(current.job)&&reception.claimDuty(current.job.receiptId);
  return next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():next.kind==='end-shift'?endShift():false;
 }
 function update(dt=0){if(disposed||lastError)return;reception.requestMeeting(!!waiting||atRegistration()&&current.job?.stage!=='working');
  if(waiting){if(!atRegistration()||!resolveIntent(waiting))waiting=null;else if(meet()){const next=waiting;waiting=null;executeIntent(next);}}
  const j=current.job;if(j?.stage!=='working')return;const d=careers.state().lastDuty;
  if(d?.workReceiptId===j.receiptId&&['inspection','ready','paid'].includes(d.stage)){reception.releaseDuty(j.receiptId);save({...current,job:{...j,stage:'ready'}});return;}
  if(!formal.canWork(j)){if(!flush())return;if(reception.releaseDuty(j.receiptId,{evaluate:true})&&save({...current,job:null}))attendance=0;return;}
  if(getClock().hour<18&&reception.inWorkplace()&&!getMounted()&&reception.dutyActive(j.receiptId))attendance+=Math.min(.1,Math.max(0,dt));
  if(attendance>=1||reception.workReceipts(j.receiptId).some(r=>!j.reviewIds.includes(r.id)))flush();
 }
 return {formal,intent,resolveIntent,executeIntent,accept,claim,endShift,update,atRegistration,
  active:()=>!!current.job,isActing:()=>!!waiting||reception.isActing(),held:()=>false,stopActivity(){waiting=null;reception.stopWorkAction();reception.requestMeeting(false);},
  playerAction:()=>reception.playerPose()?.action||null,playerStation:()=>reception.playerPose()?.station||null,playerPose:()=>reception.playerPose(),label:()=>current.job?current.job.stage==='ready'?'当班已封存 · 请Koharu验收':reception.workLabel():null,
  state:()=>({...copy(current),lastError,waiting:!!waiting,duty:reception.dutyState(),job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance,completedOrders:current.job.completedTasks}:null}),
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,coveredSeconds:current.job?.coveredSeconds||0,attendance}),restore:s=>{if(s?.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>1.1)return false;attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)?s.attendance:0;return true;},
  dispose(){disposed=true;waiting=null;}
 };
}
