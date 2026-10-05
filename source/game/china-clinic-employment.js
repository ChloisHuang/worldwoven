import {PHARMACY_ASSISTANT_ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {CHINA_CLINIC as C} from './china-clinic.js';

const copy=x=>JSON.parse(JSON.stringify(x)),REG=C.points.assistantHandoff;
const near=(p,q,r=.3)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.35;

// Local registration and salary use the shared career ledger. The clinic owns
// the real patient, original numbered paper and physical completion witness.
export function createChinaClinicEmployment({clinic,role:ROLE=PHARMACY_ASSISTANT_ROLE,careers,getPlayer,getMounted=()=>null,getClock,
  saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},notify=()=>{}}){
 const physician=ROLE.id==='cn-clinic-physician',provider=physician?'china-clinic-physician-employment':'china-clinic-employment',title=physician?'医师':'药铺助手';
 let current={version:1,serial:0,job:null},waiting=null,disposed=false,lastError=null,attendance=0;
 const validJob=j=>j===null||j&&j.formalRoleId===ROLE.id&&['working','ready'].includes(j.stage)&&new RegExp('^'+ROLE.workSource+'-[1-9][0-9]*$').test(j.receiptId)&&Number.isSafeInteger(j.day)&&j.day>=0&&Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&Number.isSafeInteger(j.completedTasks)&&j.completedTasks>=0&&Number.isSafeInteger(j.completedThrough)&&j.completedThrough>=0;
 if(saved!=null){if(saved.version===1&&Number.isSafeInteger(saved.serial)&&saved.serial>=0&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 const save=next=>{try{const result=saveState(copy(next));if(result===false||result?.then)return false;current=next;return true;}catch{return false;}};
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,REG,.35)&&canSee({position:REG});
 const meet=()=>atRegistration()&&clinic.doctorReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=(text,code='unavailable')=>{lastError=code;notify(text);return false;};
 function accept(){
  if(lastError==='invalid-employment-state'||current.job||!formal.hired()||!meet())return false;
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:{receiptId,formalRoleId:ROLE.id,day:getClock().day,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,completedThrough:0}}))return fail('报到保存失败，请在原处重试');
  attendance=0;clinic.beginWork(receiptId);notify(physician?'已开医师班。真实候诊计入工时；问询原来客，选择对应虚构照护单并交苏禾，原患者领取后记评价':'已报到。真实来客依次办理，医馆内候班计入当班时段；交班后按实际工时结薪');return true;
 }
 function claim(){const job=current.job;if(!job||job.stage!=='ready'||!meet())return false;
  const result=formal.inspect(job);if(!result.ok)return false;
  if(careers.state().lastDuty?.stage!=='paid'){notify('工资已入银行，封账记录待保存；请在原处重试，不会重复入账');return true;}
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待重试');
  clinic.finishWork(job.receiptId);notify(`许宁：原单、纸包和来客已核对，${careers.state().lastDuty.wage}铜文日薪已存入银行`);return true;
 }
 function intent(kind=null){if(disposed||lastError==='invalid-employment-state')return null;
  const job=current.job,plan=kind?.startsWith('plan:')?kind.slice(5):null,work=job?.stage==='working'?clinic.workIntent(job.receiptId,plan):null;
  kind||=job?job.stage==='ready'?'claim':work?'task':getClock().hour>=18?'end-shift':'wait':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&job)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&job?.stage!=='ready'||(kind==='task'||plan)&&!work||['wait','cancel','end-shift'].includes(kind)&&job?.stage!=='working')return null;
  const task=kind==='task'||!!plan;
  const action=task?work.action:({'formal-view':`查看安和${title}岗位`,'formal-apply':`提交${title}申请`,'formal-review':'当面确认职责 · 请许宁审核','formal-resign':`办理${title}离职`,accept:`报到 · 开始今日${title}工作`,claim:'当面验收 · 工资入银行',wait:'在医馆候班 · 等来客开单','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本日班次 · 不结薪'})[kind];
  if(!action)return null;return {id:`${physician?'cn-clinic-physician':'cn-pharmacy'}-job-${kind}`,provider,roleId:ROLE.id,kind,name:`安和医馆 · ${title}工作`,npcName:'许宁',action,position:(work&&task?work.position:REG).slice(),executionRadius:work&&task?work.executionRadius:.35,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),...(task?{work:copy(work)}:{}),intentKey:[careers.state().revision,job?.receiptId||'-',job?.stage||'-',kind,task?work.key:'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);if(!next||old.provider!==next.provider||old.id!==next.id||old.intentKey!==next.intentKey)return null;return next;}
 function executeIntent(old){const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.work){if(next.work.kind==='choose'){formal.open();return true;}return clinic.executeWork(next.work,current.job.receiptId,getPlayer());}
  if(next.kind==='wait'){notify(clinic.workLabel()||(physician?'等候原来客，现场候诊计入当班工时；可从职业手册当面交班':'目前没有待办，在医馆候班计入在岗工时；可从职业手册当面交班'));return true;}
  if(next.kind==='cancel'){if(!formal.cancel(current.job))return false;if(clinic.cancelWork(current.job.receiptId)===false)return false;if(!save({...current,job:null}))return false;attendance=0;return true;}
  if(!meet()){waiting=next;clinic.requestDoctor(true);notify('请在二层平台稍候，许宁忙完会来当面办理');return true;}
  waiting=null;if(next.kind==='end-shift')return endShift();return next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():false;
 }
 function flushAttendance(){const job=current.job;if(!job)return false;const receipts=clinic.workReceipts(job.receiptId).filter(r=>r.number>job.completedThrough),next={...job,coveredSeconds:job.coveredSeconds+attendance,completedTasks:job.completedTasks+receipts.length,completedThrough:Math.max(job.completedThrough,...receipts.map(r=>r.number))};if(!save({...current,job:next}))return false;attendance=0;return true;}
 function endShift(){const job=current.job;if(!job||job.stage!=='working'||!meet())return false;
  if(!clinic.canEndWork(job.receiptId))return fail(physician?'请先完成问询与照护单，让苏禾把同号包交给本人；也可中断本班，释放未交付原单':'请先按原编号把手上的纸包交给本人，再来交班');
  if(!flushAttendance()||!formal.complete(current.job))return false;
  clinic.finishWork(job.receiptId);if(!save({...current,job:{...current.job,stage:'ready'}}))return false;notify('当班时段与已交付编号已封存，请许宁当面验收后结薪');return true;
 }
 const inWorkplace=()=>{const p=getPlayer()?.root.position;return p&&p.x>=16&&p.x<=26&&p.z>=-33&&p.z<=-23&&p.y>=C.floorY-.3&&p.y<=C.clinicFloorY+.4;};
 function update(dt=0){if(disposed)return;
  if(!physician)for(const receipt of clinic.allWorkReceipts?.()||[])careers.recordClinicAssistantService?.(receipt);clinic.requestDoctor(atRegistration());
  if(waiting){if(!atRegistration()||!resolveIntent(waiting))waiting=null;else if(meet()){const next=waiting;waiting=null;executeIntent(next);}}
  const job=current.job;if(!job)return;
  if(job.stage==='working'){
   const duty=careers.state().lastDuty;if(duty?.workReceiptId===job.receiptId&&['inspection','ready','paid'].includes(duty.stage)){save({...current,job:{...job,stage:'ready'}});return;}
   if(!formal.canWork(job)){if(clinic.cancelWork(job.receiptId)!==false&&save({...current,job:null}))attendance=0;return;}
   clinic.beginWork(job.receiptId);
   if(getClock().hour<18&&inWorkplace()&&!getMounted())attendance+=Math.min(.1,Math.max(0,dt));
   if(attendance>=1||clinic.workReceipts(job.receiptId).some(r=>r.number>job.completedThrough))flushAttendance();
  }
 }

 return {intent,resolveIntent,executeIntent,update,accept,claim,endShift,formal,atRegistration,
  isActing:()=>clinic.isActing?.()||false,
  state:()=>({...copy(current),...(physician?{patient:clinic.patientDetails?.()}:{}),lastError,waiting:!!waiting,latestReview:clinic.workReceipts(current.job?.receiptId||careers.state().lastDuty?.workReceiptId).at(-1)||null,job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance,completedOrders:current.job.completedTasks}:null}),
  active:()=>!!current.job,label:()=>current.job?current.job.stage==='ready'?'同号交付已完成 · 请许宁验收':clinic.workLabel()||`${title}当班 · 等候真实来客`:null,
  stopActivity(){waiting=null;clinic.stopWorkAction();},playerAction:()=>clinic.workPose()?.action||null,playerStation:()=>clinic.workPose()?.station||null,
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,coveredSeconds:current.job?.coveredSeconds||0,attendance}),restore:s=>{if(s?.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>1.1)return false;attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)?s.attendance:0;return true;},
  dispose(){disposed=true;waiting=null;clinic.stopWorkAction();}};
}
