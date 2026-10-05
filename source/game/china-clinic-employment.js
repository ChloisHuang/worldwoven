import {PHARMACY_ASSISTANT_ROLE as ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {CHINA_CLINIC as C} from './china-clinic.js';

const copy=x=>JSON.parse(JSON.stringify(x)),REG=C.points.assistantHandoff;
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;

// Local registration and salary use the shared career ledger. The clinic owns
// the real patient, original numbered paper and physical completion witness.
export function createChinaClinicEmployment({clinic,careers,getPlayer,getMounted=()=>null,getClock,
  saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},notify=()=>{}}){
 let current={version:1,serial:0,job:null},waiting=null,disposed=false,lastError=null;
 const validJob=j=>j===null||j&&j.formalRoleId===ROLE.id&&['working','ready'].includes(j.stage)&&/^cn-pharmacy-labor-[1-9][0-9]*$/.test(j.receiptId)&&Number.isSafeInteger(j.day)&&j.day>=0;
 if(saved!=null){if(saved.version===1&&Number.isSafeInteger(saved.serial)&&saved.serial>=0&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 const save=next=>{try{const result=saveState(copy(next));if(result===false||result?.then)return false;current=next;return true;}catch{return false;}};
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,REG,.35)&&canSee({position:REG});
 const meet=()=>atRegistration()&&clinic.doctorReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=(text,code='unavailable')=>{lastError=code;notify(text);return false;};
 function accept(){
  if(lastError==='invalid-employment-state'||current.job||!formal.hired()||!meet())return false;
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:{receiptId,formalRoleId:ROLE.id,day:getClock().day,stage:'working'}}))return fail('报到保存失败，请在原处重试');
  clinic.beginWork(receiptId);notify('已报到。等真实来客问询开单，再上平台接原单；完整交付后才结日薪');return true;
 }
 function claim(){const job=current.job;if(!job||job.stage!=='ready'||!meet())return false;
  const result=formal.inspect(job);if(!result.ok)return false;
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待重试');
  clinic.finishWork(job.receiptId);notify(`许宁：原单、纸包和来客已核对，${careers.state().lastDuty.wage}铜文日薪已存入银行`);return true;
 }
 function intent(kind=null){if(disposed||lastError==='invalid-employment-state')return null;
  const job=current.job,work=job?.stage==='working'?clinic.workIntent(job.receiptId):null;
  kind||=job?job.stage==='ready'?'claim':work?'task':'wait':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&job)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&job?.stage!=='ready'||kind==='task'&&!work||['wait','cancel'].includes(kind)&&job?.stage!=='working')return null;
  const action=kind==='task'?work.action:({'formal-view':'查看安和药铺岗位','formal-apply':'提交药铺助手申请','formal-review':'当面确认职责 · 请许宁审核','formal-resign':'办理药铺离职',accept:'报到 · 开始今日药铺工作',claim:'交回原单 · 当面验收日薪',wait:'等候真实来客开单',cancel:'取消未交付班次 · 不结薪'})[kind];
  if(!action)return null;return {id:`cn-pharmacy-job-${kind}`,provider:'china-clinic-employment',roleId:ROLE.id,kind,name:'安和医馆 · 药铺工作',npcName:'许宁',action,position:(work&&kind==='task'?work.position:REG).slice(),executionRadius:work&&kind==='task'?work.executionRadius:.35,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),...(kind==='task'?{work:copy(work)}:{}),intentKey:[careers.state().revision,job?.receiptId||'-',job?.stage||'-',kind,kind==='task'?work.key:'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);if(!next||old.provider!==next.provider||old.id!==next.id||old.intentKey!==next.intentKey)return null;return next;}
 function executeIntent(old){const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.kind==='task')return clinic.executeWork(next.work,current.job.receiptId,getPlayer());
  if(next.kind==='wait'){notify(clinic.workLabel()||'目前没有需要照护的来客，候班不会产生工资');return true;}
  if(next.kind==='cancel'){if(!formal.cancel(current.job))return false;clinic.cancelWork(current.job.receiptId);return save({...current,job:null});}
  if(!meet()){waiting=next;clinic.requestDoctor(true);notify('请在二层平台稍候，许宁忙完会来当面办理');return true;}
  waiting=null;return next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():false;
 }
 function update(){if(disposed)return;clinic.requestDoctor(atRegistration());
  if(waiting){if(!atRegistration()||!resolveIntent(waiting))waiting=null;else if(meet()){const next=waiting;waiting=null;executeIntent(next);}}
  const job=current.job;if(!job)return;
  if(job.stage==='working'){
   if(!formal.canWork(job)){clinic.cancelWork(job.receiptId);save({...current,job:null});return;}
   clinic.beginWork(job.receiptId);
   if(clinic.workReceipt(job.receiptId)&&formal.complete(job))save({...current,job:{...job,stage:'ready'}});
  }
 }
 return {intent,resolveIntent,executeIntent,update,accept,claim,formal,atRegistration,
  state:()=>({...copy(current),lastError,waiting:!!waiting,job:current.job?{...copy(current.job),completedOrders:clinic.workReceipt(current.job.receiptId)?1:0,requiredOrders:1}:null}),
  active:()=>!!current.job,label:()=>current.job?current.job.stage==='ready'?'同号交付已完成 · 请许宁验收':clinic.workLabel()||'药铺当班 · 等候真实来客':null,
  stopActivity(){waiting=null;clinic.stopWorkAction();},playerAction:()=>clinic.workPose()?.action||null,playerStation:()=>clinic.workPose()?.station||null,
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null}),restore:s=>s?.version===1&&s.receiptId===(current.job?.receiptId||null),
  dispose(){disposed=true;waiting=null;clinic.stopWorkAction();}};
}
