import {PALACE_GUARD_ROLE as ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {CHINA_GUARD_ROUTES,GUARD_REGISTRATION as REG} from './china-guard-routes.js';
import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';

const copy=x=>JSON.parse(JSON.stringify(x)),integer=n=>Number.isSafeInteger(n)&&n>=0;
const near=(p,q,r=.25)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<.4;
const routeFor=j=>CHINA_GUARD_ROUTES[j.routeId];
// Manual walking and selected navigation share the same live checkpoint. Only
// the current authored leg is inspected; no global path or actor scan is added.
function advancingOnLeg(job,p,previous){
 const route=routeFor(job),a=job.index?route[job.index-1].at:REG,b=route[job.index].at,dx=b[0]-a[0],dz=b[2]-a[2],length2=dx*dx+dz*dz;
 const fraction=length2?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[2])*dz)/length2)):0;
 return Math.hypot(p.x-a[0]-dx*fraction,p.z-a[2]-dz*fraction)<2.4&&
  Math.abs(p.y-(a[1]+(b[1]-a[1])*fraction))<1.6&&
  (p.x-previous.x)*(b[0]-previous.x)+(p.z-previous.z)*(b[2]-previous.z)>0;
}
const validJob=j=>j===null||j?.formalRoleId===ROLE.id&&/^cn-guard-labor-[1-9][0-9]*$/.test(j.receiptId)&&integer(j.day)&&
 ['working','ready'].includes(j.stage)&&['requested','patrol','returning'].includes(j.assignment)&&
 Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&integer(j.completedTasks)&&integer(j.circuits)&&
 ['east','west'].includes(j.routeId)&&integer(j.index)&&j.index<routeFor(j).length&&Array.isArray(j.checkpoints)&&j.checkpoints.length<=64&&
 j.checkpoints.every(r=>integer(r.circuit)&&['east','west'].includes(r.routeId)&&integer(r.index)&&CHINA_GUARD_ROUTES[r.routeId][r.index]?.id===r.id);

// Career state owns appointment/payroll. This controller owns only the actual
// patrol circuit, observed checkpoints and bounded attendance. Merely accepting
// the role, idling nearby or practising at the range never earns patrol wages.
export function createChinaGuardEmployment({archery,careers,getPlayer,getMounted=()=>null,getClock,
 isNavigating=()=>false,onIntent=()=>false,saved=null,saveState=()=>true,canSee=()=>true,openRegistration=()=>{},onWardrobeChange=()=>{},notify=()=>{}}){
 let current={version:1,serial:0,job:null},lastError=null,waiting=null,waitingIdentity=null,observation=null,attendance=0,autoPatrol=false,disposed=false,previous=null;
 if(saved!=null){if(saved.version===1&&integer(saved.serial)&&validJob(saved.job))current=copy(saved);else lastError='invalid-employment-state';}
 const save=next=>{try{const result=saveState(copy(next));if(result===false||result?.then){lastError='save-failed';return false;}current=next;lastError=null;}catch{lastError='save-failed';return false;}syncWardrobe();return true;};
 const atRegistration=()=>!getMounted()&&near(getPlayer()?.root.position,REG,.32)&&canSee({position:REG});
 const reviewer=()=>archery.reviewerContext?.()||null;
 const reviewerName=()=>reviewer()?.name||'射圃审核人暂缺';
 const holderName=()=>archery.patrolHolderContext?.()?.name||'巡值交班人暂缺';
 const meetingIdentity=()=>{const p=reviewer(),h=archery.patrolHolderContext?.();return [p?.actorId||'-',p?.revision??'-',h?.actorId||'-',h?.revision??'-'].join(':');};
 const meet=()=>!!reviewer()&&atRegistration()&&archery.supervisorReady();
 const roleView={...ROLE,get employer(){return reviewerName();}};
 const formal=createFormalLaborContract({careers,workState:()=>careers?.workState?.()??careers?.state(),role:roleView,getJob:()=>current.job,getPlayer,meetHost:meet,notify,openRegistration});
 const wardrobePreset=()=>!disposed&&current.job?.stage==='working'&&formal.hired()&&formal.canWork(current.job)?'jinyi-training':null;
 let lastWardrobe=wardrobePreset();
 const syncWardrobe=()=>{const preset=wardrobePreset();if(preset!==lastWardrobe){lastWardrobe=preset;onWardrobeChange(preset);}};
 const freshJob=(receiptId,day)=>({receiptId,formalRoleId:ROLE.id,stage:'working',assignment:'requested',day,shiftKind:'continuous',coveredSeconds:0,completedTasks:0,circuits:0,routeId:'east',index:0,checkpoints:[]});
 const fail=text=>{notify(text);return false;};
 function recover(){
  if(lastError==='invalid-employment-state'||current.job||!formal.hired())return;
  const duty=careers.workState().lastDuty;
  if(duty?.roleId!==ROLE.id||!duty.workReceiptId||!['working','inspection','ready'].includes(duty.stage))return;
  const job=freshJob(duty.workReceiptId,duty.day);
  if(duty.stage!=='working')Object.assign(job,{stage:'ready',assignment:'returning',coveredSeconds:duty.coveredSeconds,completedTasks:duty.completedTasks});
  save({...current,serial:Math.max(current.serial,Number(job.receiptId.split('-').at(-1))),job});
 }
 function accept(){
  if(current.job||lastError==='invalid-employment-state'||!formal.hired()||!meet())return false;
  const receiptId=formal.pendingReceipt()||`${ROLE.workSource}-${current.serial+1}`,serial=Number(receiptId.split('-').at(-1));
  if(!formal.begin(receiptId,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:1,serial:Math.max(current.serial,serial),job:freshJob(receiptId,getClock().day)}))return fail('接班记录未保存，请留在原处重试');
  archery.requestGuardWork(receiptId);notify(`已借穿值勤袍、折帽与佩刀。${reviewerName()}：等${holderName()}交清巡线、弓箭归架后开始巡值；回圃交班归还衣装，按实工时结薪`);return true;
 }
 function flushAttendance(){
  if(!current.job)return false;
  if(!attendance)return true;
  if(!save({...current,job:{...current.job,coveredSeconds:current.job.coveredSeconds+attendance}}))return false;
  attendance=0;return true;
 }
 function completeCheckpoint(){
  const job=current.job,stop=routeFor(job)[job.index];
  if(!flushAttendance())return false;
  const last=job.index===routeFor(job).length-1,record={circuit:job.circuits,routeId:job.routeId,index:job.index,id:stop.id};
  if(!save({...current,job:{...current.job,index:last?0:job.index+1,routeId:last?(job.routeId==='east'?'west':'east'):job.routeId,
   circuits:job.circuits+(last?1:0),completedTasks:job.completedTasks+1,checkpoints:[...job.checkpoints,record].slice(-64)}}))return false;
  observation=null;
  if(last)notify(`第${current.job.circuits}轮巡查已记录；可继续${current.job.routeId==='east'?'东':'西'}线，或回圃交班`);
  if(autoPatrol&&getClock().hour<18){const next=intent('task');autoPatrol=!!next&&onIntent(next)!==false;}
  return true;
 }
 function requestEnd(){
  const job=current.job;if(!job||job.stage!=='working'||!atRegistration())return false;
  observation=null;autoPatrol=false;
  if(!flushAttendance()||!save({...current,job:{...current.job,assignment:'returning'}}))return false;
  archery.requestGuardReturn(job.receiptId);waiting='end-shift';waitingIdentity=meetingIdentity();notify(`${reviewerName()}：请在靶道外稍候，等弓箭归架、${holderName()}回圃后，当面核对巡查凭记`);return true;
 }
 function endShift(){
  const job=current.job;if(!job||job.stage!=='working'||!meet())return false;
  if(archery.guardWorkState()?.stage!=='returned')return requestEnd();
  if(!flushAttendance()||!formal.complete(current.job))return false;
  if(!save({...current,job:{...current.job,stage:'ready'}}))return false;
  notify(`值勤装已归还，恢复个人衣装。${reviewerName()}：已核对${current.job.completedTasks}处检查点、${current.job.circuits}轮巡查；工时已封存，请验收结薪`);return true;
 }
 function claim(){
  const job=current.job;if(!job||job.stage!=='ready'||!meet())return false;
  if(!formal.inspect(job).ok)return false;
  if(careers.workState().lastDuty?.stage!=='paid')return fail('银行已入账，封账记录待保存；原处重试不会重复发薪');
  if(!save({...current,job:null}))return fail('工资已入账，交班记录待保存，请在原处重试');
  if(archery.guardWorkState()?.receiptId===job.receiptId)archery.finishGuardWork(job.receiptId);
  notify(`${reviewerName()}：巡查与交班凭记已核验，${careers.workState().lastDuty.wage}铜文已存入银行；下次开班前${holderName()}明确代巡`);return true;
 }
 function intent(kind=null){
  if(disposed||lastError==='invalid-employment-state')return null;
  const job=current.job,work=job?.stage==='working',owned=archery.guardWorkState()?.stage==='active';
  kind||=job?job.stage==='ready'?'claim':job.assignment==='returning'||getClock().hour>=18?'end-shift':job.assignment==='requested'||!owned?'wait':'task':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&job)return null;
  if(kind==='formal-apply'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!formal.hired())return null;
  if(kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&job?.stage!=='ready'||['wait','cancel','end-shift','task'].includes(kind)&&!work)return null;
  if(kind==='task'&&(!owned||job.assignment!=='patrol'||getClock().hour>=18))return null;
  const personDirected=!['formal-view','task','wait','cancel'].includes(kind),person=reviewer(),holder=archery.patrolHolderContext?.();
  if(personDirected&&!person)return null;
  const stop=kind==='task'?routeFor(job)[job.index]:null;
  const action=stop?`${observation?'驻察':'继续巡值'} · ${stop.label}`:({'formal-view':'查看锦衣卫巡值岗位','formal-apply':'提交锦衣卫巡值申请','formal-review':`当面确认职责 · 请${reviewerName()}审核`,'formal-resign':'办理锦衣卫巡值离职',accept:'领取值勤装 · 接班巡值',wait:'已换值勤装 · 等安全交班','end-shift':'回圃交班还装 · 按实工时结薪',claim:`请${reviewerName()}验收 · 工资入银行`,cancel:'中断本班并还装 · 不结薪'})[kind];
  if(!action)return null;
  return {id:`cn-guard-job-${kind}`,provider:'china-guard-employment',roleId:ROLE.id,kind,name:'锦衣卫 · 巡值工作',npcName:person?.name||'射圃巡值登记',visualAnchor:personDirected?{actorId:person.actorId}:{},action,
   position:(stop?.at||REG).slice(),executionRadius:stop?.hold!==undefined ? .19 : .26,interactionRadius:1.8,priority:47,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),
   intentKey:[...(personDirected?[person.actorId,person.revision??'-',holder?.actorId||'-',holder?.revision??'-']:[]),careers.workState().revision,job?.receiptId||'-',job?.stage||'-',job?.assignment||'-',kind,stop?`${job.routeId}:${job.circuits}:${job.index}`:'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);return next&&old.provider===next.provider&&old.id===next.id&&old.intentKey===next.intentKey?next:null;}
 function executeIntent(old){
  const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open();return true;}
  if(next.kind==='task'){
   const stop=routeFor(current.job)[current.job.index];autoPatrol=true;observation={key:next.intentKey,seconds:0};
   if(stop.look){const p=getPlayer().root.position;getPlayer().root.rotation.y=Math.atan2(stop.look[0]-p.x,stop.look[1]-p.z);}
   return true;
  }
  if(next.kind==='wait'){notify(`请在靶道外候班；箭落靶、弓箭归架且${holderName()}返圃后才接管巡线，候交班不计工时`);return true;}
  if(next.kind==='cancel'){
   if(!formal.cancel(current.job))return false;
   const receipt=current.job.receiptId;if(!save({...current,job:null}))return false;
   attendance=0;observation=null;autoPatrol=false;waiting=null;archery.cancelGuardWork(receipt);notify('本班已中断，值勤装已归还，恢复个人衣装');return true;
  }
  if(next.kind==='end-shift')return requestEnd();
  if(!meet()){waiting=next.kind;waitingIdentity=meetingIdentity();archery.requestSupervisor(true);notify(`${reviewerName()}先照看停射与归弓，请在射圃登记处等他当面办理`);return true;}
  waiting=null;
  return next.kind==='formal-apply'?formal.apply():next.kind==='formal-review'?formal.review():next.kind==='formal-resign'?formal.resign():next.kind==='accept'?accept():next.kind==='claim'?claim():false;
 }
 function update(dt=0){
  try{
  if(disposed)return;recover();archery.setGuardTenure(formal.hired());archery.requestSupervisor(atRegistration());
  if(waiting&&(!atRegistration()||waitingIdentity!==meetingIdentity())){waiting=null;waitingIdentity=null;}
  if(waiting&&meet()){
   if(waiting==='end-shift'){if(archery.guardWorkState()?.stage==='returned'){waiting=null;endShift();}}
   else{const kind=waiting;waiting=null;const next=intent(kind);if(next)executeIntent(next);}
  }
  const job=current.job;if(!job){previous=null;return;}
  if(job.stage==='ready')return;
  const duty=careers.workState().lastDuty;
  if(duty?.workReceiptId===job.receiptId&&['inspection','ready','paid'].includes(duty.stage)){save({...current,job:{...job,stage:'ready'}});observation=null;autoPatrol=false;return;}
  if(!formal.canWork(job)){archery.cancelGuardWork(job.receiptId);if(save({...current,job:null})){attendance=0;observation=null;autoPatrol=false;}return;}
  archery.requestGuardWork(job.receiptId);
  const assignment=archery.guardWorkState();
  if(job.assignment==='returning')archery.requestGuardReturn(job.receiptId);
  if(job.assignment==='requested'&&assignment?.stage==='active'){
   if(save({...current,job:{...job,assignment:'patrol'}}))notify(`${holderName()}已让岗去庭边歇脚；你的巡值已接班。选择继续巡值，沿当前检查点逐一驻察`);return;
  }
  const p=getPlayer()?.root.position,clock=getClock(),canWork=job.assignment==='patrol'&&assignment?.stage==='active'&&!getMounted()&&clock.hour<18;
  let worked=0;
  if(observation){const target=intent('task');if(!canWork||!target||target.intentKey!==observation.key||!near(p,target.position,target.executionRadius)){observation=null;autoPatrol=false;}
   else{const stop=routeFor(job)[job.index],hold=Math.max(.15,stop.hold||0);worked=Math.min(Math.max(0,dt),hold-observation.seconds);observation.seconds+=worked;
    if(stop.look)getPlayer().root.rotation.y=Math.atan2(stop.look[0]-p.x,stop.look[1]-p.z);}
  }else if(canWork&&previous&&Math.hypot(p.x-previous.x,p.z-previous.z)>.0001&&(isNavigating()||advancingOnLeg(job,p,previous)))worked=Math.max(0,dt);
  const maxSeconds=Math.max(0,(Math.min(18,clock.hour)-duty.arrivalHour)*60/GAME_MINUTES_PER_SECOND);
  attendance+=Math.min(worked,Math.max(0,maxSeconds-job.coveredSeconds-attendance));
  previous=p?{x:p.x,z:p.z}:null;
  if(observation&&observation.seconds>=Math.max(.15,routeFor(job)[job.index].hold||0))completeCheckpoint();
  else if(attendance>=1)flushAttendance();
  }finally{syncWardrobe();}
 }
 return {holderName,reviewerName,identityKey:meetingIdentity,intent,resolveIntent,executeIntent,update,accept,endShift,claim,formal,atRegistration,wardrobePreset,
  state:()=>({...copy(current),lastError,waiting,observation:copy(observation),autoPatrol,job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance}:null}),
  active:()=>!!current.job,isActing:()=>!!observation,playerAction:()=>observation?'observe':null,playerStation:()=>null,
  label:()=>current.job?current.job.stage==='ready'?`已还值勤装 · 待${reviewerName()}验收`:current.job.assignment==='requested'?'已换值勤装 · 候交班不计薪':current.job.assignment==='returning'?'等原守卫当面接回巡线':observation?routeFor(current.job)[current.job.index].label:`锦衣卫巡值 · ${current.job.routeId==='east'?'东':'西'}线 ${current.job.index+1}/${routeFor(current.job).length}`:null,
  stopActivity(){observation=null;autoPatrol=false;waiting=null;},
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,coveredSeconds:current.job?.coveredSeconds||0,attendance,observation:copy(observation),autoPatrol}),
  restore(s){if(s?.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>1.1)return false;
   attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)?s.attendance:0;const target=intent('task');observation=s.observation&&target&&s.observation.key===target.intentKey&&Number.isFinite(s.observation.seconds)&&s.observation.seconds>=0&&s.observation.seconds<=3.3?copy(s.observation):null;autoPatrol=!!s.autoPatrol;return true;},
  dispose(){disposed=true;observation=null;autoPatrol=false;waiting=null;}};
}
