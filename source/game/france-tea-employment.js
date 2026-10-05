import {TEA_SERVER_ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
// Persistent hiring and wage authority stays in the shared career ledger. The
// tea controller alone can attest the real guest, tray, drink and cleaned cups.
export function createFranceTeaEmployment({tea:service,role:ROLE=TEA_SERVER_ROLE,careers,getPlayer,getMounted=()=>null,getClock,
 saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},notify=()=>{}}){
 const pastry=ROLE.id==='fr-tea-pastry',tea=service.forRole?.(pastry?'cook':'host')||service,provider=pastry?'france-pastry-employment':'france-tea-employment';
 const receiptPattern=new RegExp('^'+ROLE.workSource+'-[1-9][0-9]*$');
 let current={version:1,serial:0,job:null},waiting=null,pending=null,disposed=false,lastError=null,attendance=0;
 const validJob=j=>j===null||j&&j.formalRoleId===ROLE.id&&['working','ready'].includes(j.stage)&&receiptPattern.test(j.receiptId)&&integer(j.day)&&Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&integer(j.completedTasks)&&integer(j.completedThrough);
 if(saved!=null){if(saved.version===1&&integer(saved.serial)&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 const save=next=>{try{const result=saveState(copy(next));if(result===false||result?.then)return false;current=next;return true;}catch{return false;}};
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,tea.registry,.3)&&canSee({position:tea.registry});
 const meet=()=>atRegistration()&&tea.meetingReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=text=>{notify(text);return false;};
 function accept(){
  if(lastError||current.job||!formal.hired()||!meet())return false;
  if(!tea.canClaimDuty())return fail('请先等自己的茶单收好，再报到；不能给自己点茶算工作');
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:{receiptId,formalRoleId:ROLE.id,day:getClock().day,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,completedThrough:0}}))return fail('报到保存失败，请在原处重试');
  tea.claimDuty(receiptId);notify(`已报到。${ROLE.employer}收好原单后交班；${pastry?'糕点房':'茶廊'}候班计时，真实来客逐单办理，另行交班后按实际工时结薪`);return true;
 }
 function claim(){
  const job=current.job;if(!job||job.stage!=='ready'||!meet())return false;
  const result=formal.inspect(job);if(!result.ok)return false;
  if(careers.state().lastDuty?.stage!=='paid'){notify('工资已入银行，封账待重试；不会重复入账');return true;}
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待重试');
  tea.releaseDuty(job.receiptId);notify(`${ROLE.employer}：当班时段与原杯碟已核对，${careers.state().lastDuty.wage}法国券已存入银行`);return true;
 }
 function intent(kind=null){
  if(disposed||lastError)return null;
  const job=current.job,spec=job?.stage==='working'?tea.dutyStep(job.receiptId):null,work=spec?.key&&!spec.waiting?spec:null;
  kind||=job?job.stage==='ready'?'claim':work?'task':getClock().hour>=18?'end-shift':'wait':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';if(kind==='work')kind='task';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&job)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&job?.stage!=='ready'||kind==='task'&&!work||['wait','cancel','end-shift'].includes(kind)&&job?.stage!=='working')return null;
  const action=kind==='task'?work.label:({'formal-view':`查看${ROLE.name}岗位`,'formal-apply':`提交${ROLE.name}申请`,'formal-review':`当面确认职责 · 请${ROLE.employer}审核`,'formal-resign':`办理${ROLE.name}离职`,accept:`报到 · 开始今日${pastry?'茶点制作':'侍茶'}工作`,claim:'当面验收 · 工资入银行',wait:spec?.label||'在茶廊候班 · 等真实来客','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本日班次 · 不结薪'})[kind];
  if(!action)return null;
  return {id:`${pastry?'fr-pastry':'fr-tea'}-job-${kind}`,provider,roleId:ROLE.id,kind,name:ROLE.workplace,npcName:ROLE.employer,action,
   position:(kind==='task'?work.position:tea.registry).slice(),executionRadius:kind==='task'?.2:.3,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),...(kind==='task'?{work:copy(work),playerWorkTarget:work.target}:{}),
   intentKey:[careers.state().revision,job?.receiptId||'-',job?.stage||'-',kind,kind==='task'?work.orderId+'-'+work.key:'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);return next&&old.provider===next.provider&&old.id===next.id&&old.intentKey===next.intentKey?next:null;}
 function executeIntent(old){
  const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.kind==='task'){pending=next;return true;}
  if(next.kind==='wait'){notify(next.action+'；交班可从职业手册选择');return true;}
  if(next.kind==='cancel'){if(!formal.cancel(current.job))return false;tea.releaseDuty(current.job.receiptId);pending=null;return save({...current,job:null});}
  if(!meet()){waiting=next;tea.requestMeeting(true);notify(`请在${ROLE.workplace}稍候，${ROLE.employer}收好原单后会来当面办理`);return true;}
  waiting=null;return next.kind==='end-shift'?endShift():next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():false;
 }
 function flushAttendance(){
  const job=current.job;if(!job)return false;
  const receipts=tea.workReceipts(job.receiptId).filter(r=>r.number>job.completedThrough);
  for(const r of receipts){const review=careers.customerReview({roleId:ROLE.id,receiptId:job.receiptId,reviewId:r.orderId+'-order-done',customerId:r.customerId,customerName:r.customerName,tableId:r.tableId,tableName:'宫苑茶席',dishId:r.dishId,dishName:'热茶与小蛋糕',reasonCode:'tea-completed'});if(!review.ok)return false;}
  const next={...job,coveredSeconds:job.coveredSeconds+attendance,completedTasks:job.completedTasks+receipts.length,completedThrough:Math.max(job.completedThrough,...receipts.map(r=>r.number))};
  if(!save({...current,job:next}))return false;attendance=0;return true;
 }
 function endShift(){
  const job=current.job;if(!job||job.stage!=='working'||!meet())return false;
  if(!tea.canEndDuty(job.receiptId))return fail(pastry?'请先把同号茶点交给玛农，并等原杯碟收洗后再交班':'请先把手上的原茶盘送到客席，或把杯碟送回糕点房，再来交班');
  if(!flushAttendance()||!formal.complete(current.job))return false;
  tea.releaseDuty(job.receiptId);if(!save({...current,job:{...current.job,stage:'ready'}}))return false;
  notify(`当班时段与逐单评价已封存，请${ROLE.employer}当面验收后结薪`);return true;
 }
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return p&&(pastry?p.x>=-8.8&&p.x<=-3.7&&p.z>=-11.8&&p.z<=-6.3:p.x>=-9&&p.x<=11.5&&p.z>=-12&&p.z<=14)&&p.y>=-.1&&p.y<=.7;};
 function update(dt=0){
  if(disposed||lastError)return;tea.requestMeeting(!!waiting||atRegistration()&&current.job?.stage!=='working');
  if(waiting){if(!atRegistration()||!resolveIntent(waiting))waiting=null;else if(meet()){const next=waiting;waiting=null;executeIntent(next);}}
  const job=current.job;if(!job)return;
  if(job.stage==='working'){
   const duty=careers.state().lastDuty;
   if(duty?.workReceiptId===job.receiptId&&['inspection','ready','paid'].includes(duty.stage)){tea.releaseDuty(job.receiptId);save({...current,job:{...job,stage:'ready'}});return;}
   if(!formal.canWork(job)){tea.releaseDuty(job.receiptId);pending=null;save({...current,job:null});return;}
   tea.claimDuty(job.receiptId);
   if(getClock().hour<18&&inWorkplace()&&!getMounted()&&tea.dutyState()?.status==='active')attendance+=Math.min(.1,Math.max(0,dt));
   if(attendance>=1||tea.hasWorkReceiptAfter(job.receiptId,job.completedThrough))flushAttendance();
   if(pending){const next=resolveIntent(pending);if(!next||!near(getPlayer()?.root.position,next.position,next.executionRadius)||getMounted())pending=null;else if(!getPlayer().walking){pending=null;tea.startDutyStep(job.receiptId,next.work.key);}}
  }
 }
 return {intent,resolveIntent,executeIntent,update,accept,claim,endShift,formal,atRegistration,
  state:()=>({...copy(current),lastError,waiting:!!waiting,job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance,completedOrders:current.job.completedTasks}:null}),
  active:()=>!!current.job,held:()=>tea.held(),isActing:()=>!!pending||!!waiting||!!tea.dutyState()?.step,
  label:()=>current.job?current.job.stage==='ready'?`${ROLE.name}当班已封存 · 请${ROLE.employer}验收`:tea.dutyStep(current.job.receiptId)?.label:null,
  stopActivity(){waiting=null;pending=null;tea.stopDutyStep();tea.requestMeeting(false);},playerAction:()=>tea.dutyPlayerAction(),playerStation:()=>tea.dutyPlayerStation(),
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,coveredSeconds:current.job?.coveredSeconds||0,attendance}),
  restore:s=>{if(s?.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>1.1)return false;attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)?s.attendance:0;return true;},
  dispose(){disposed=true;waiting=null;pending=null;tea.stopDutyStep();tea.requestMeeting(false);}};
}
