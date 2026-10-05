import {TEA_PREPARER_ROLE,TEA_SERVER_ROLE} from './formal-careers.js';

// A small adapter for the existing tea order controller. Identity and wages
// stay in formal-careers; this file never moves a player or manufactures tea.
const ROLES=[TEA_PREPARER_ROLE,TEA_SERVER_ROLE],copy=x=>JSON.parse(JSON.stringify(x));
const dutyRole=id=>id===TEA_PREPARER_ROLE.id?'cook':'host';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const MESSAGES={'adult-required':'需年满18岁','ritual-required':'待客礼仪需要2点，可在镜厅读礼仪书',
 'writing-required':'备茶单据需要文书1点，可在镜厅读文书书籍','no-vacancy':'这一助理名额已满',
 'already-employed':'你已有正式职位，请先结清并回原岗位离职','outside-arrival-window':'请在06:00至18:00之间开班',
 'already-paid-today':'今天的正式日薪已结算，下一模拟日再来','duty-missed':'本日当班已中断，下一模拟日再来',
 'duty-active':'请先处理正在进行的正式班次','wage-ready':'已完成的工资仍待验收结清','save-failed':'登记未能保存，请稍后再试',
 'bank-unavailable':'银行入账暂不可用，已完成工资会保留','work-incomplete':'当班实际职责尚未完成'};
function restore(saved){
 if(saved==null)return {version:1,serial:0,job:null};
 if(saved.version!==1||!integer(saved.serial)||saved.job&&(!ROLES.some(r=>r.id===saved.job.roleId)||
  saved.job.id!==`${saved.job.roleId}-${saved.serial}`||!['working','ready'].includes(saved.job.stage)||typeof saved.job.started!=='boolean'||typeof saved.job.waiting!=='boolean'))throw Error('invalid-tea-career-state');
 return {version:1,serial:saved.serial,job:saved.job?copy(saved.job):null};
}
export function createFranceTeaCareers({tea,careers,getPlayer,getClock,saveState,saved,getBusy=()=>false,
 canSee=()=>true,notify=()=>{},openRegistration=()=>{}}){
 if(!tea||!careers||typeof saveState!=='function')throw TypeError('tea career dependencies required');
 let current,loadError=null;try{current=restore(saved);}catch{current={version:1,serial:0,job:null};loadError='invalid-tea-career-state';}
 let meeting=null,pending=null,disposed=false,saving=false,recovery=true,nextPayAt=0;
 const roleById=id=>ROLES.find(r=>r.id===id),job=()=>current.job,formalDuty=()=>{const d=careers.state().lastDuty;return d?.roleId===job()?.roleId&&d.workReceiptId===job()?.id?d:null;};
 const at=point=>{const p=getPlayer()?.root.position;return !!p&&!getBusy()&&Math.hypot(p.x-point[0],p.z-point[2])<=.18&&Math.abs(p.y-point[1])<.45;};
 const result=r=>{if(!r?.ok)notify((r?.reasons||[r?.code]).map(k=>MESSAGES[k]||'这次办理未完成，请保留记录后重试').join('；'));return !!r?.ok;};
 function persist(next){
  if(saving||loadError)return false;saving=true;
  try{const r=saveState(copy(next));if(r===false)throw Error();if(r&&typeof r.then==='function'){Promise.resolve(r).catch(()=>{});throw Error();}current=next;return true;}
  catch{notify('茶点当班记录未能保存，请稍后重试');return false;}finally{saving=false;}
 }
 function stopActivity(){pending=null;tea.stopDutyStep();meeting=null;tea.releaseMeeting();}
 function clearJob(){const id=job()?.id;if(!persist({...current,job:null}))return false;if(id)tea.releaseDuty(id);return true;}
 function cancel(reason=null){
  if(!job())return false;
  const d=formalDuty();if(job().stage==='ready'||['inspection','ready','paid'].includes(d?.stage)){notify('实际工作已完成，请回主管处验收，工资会保留');return false;}
  const state=tea.dutyStep(job().id),why=reason||(!job().started||state?.waiting?'tea-handoff-wait':'cancelled');
  if(d?.stage==='working'&&!result(careers.interruptDuty(why)))return false;
  stopActivity();if(!clearJob())return false;notify(why==='tea-handoff-wait'?'交接等待已撤回，不记缺勤；原NPC继续原茶单':'已交回当班，原NPC会接续同一茶单；未完成的班次没有工资');return true;
 }
 function finishPay(r){if(!r?.ok||r.cleanupPending)return false;if(!clearJob())return false;notify(`${r.wage}法国券日薪已存入银行账户，同一日不会重复发放`);return true;}
 function pay(){const d=formalDuty();if(d?.stage==='paid')return finishPay({ok:true,wage:d.wage,replayed:true});const r=careers.settle();return result(r)&&finishPay(r);}
 function performMeeting(selected){
  const role=roleById(selected.roleId),kind=selected.kind;
  if(kind==='formal-apply')return result(careers.apply(role.id,{ageYears:getPlayer().ageYears}))&&!!notifySuccess(`${role.employer}：录用为${role.name}。专设轮班名额由你任职，我保留原职。`);
  if(kind==='formal-resign')return result(careers.resign())&&!!notifySuccess(`${role.employer}：离职登记好了，技能与已得评价保留。`);
  if(kind==='accept'){
   if(job()||!careers.isHired(role.id))return false;
   const old=careers.state().lastDuty,retry=old?.roleId===role.id&&old.stage==='working'?old.workReceiptId:null;
   const serial=retry?Number(retry.split('-').at(-1)):current.serial+1;if(!integer(serial)||serial<1)return false;const id=`${role.id}-${serial}`;
   if(!result(careers.beginDuty({receiptId:id})))return false;
   if(!persist({...current,serial,job:{id,roleId:role.id,stage:'working',started:false,waiting:true}}))return false;
   if(!tea.claimDuty(id,dutyRole(role.id)))return false;
   notify(`${role.employer}：这班接加布里埃尔的真实茶点单。每一步由你选择开始，做完再回来验收。`);return true;
  }
  if(kind==='claim'){
   if(!job()||job().stage!=='ready')return false;
   const d=formalDuty();if(d?.stage==='inspection'&&!result(careers.laborEvent('inspected',{roleId:role.id,receiptId:job().id})))return false;
   return pay();
  }
  return false;
 }
 const notifySuccess=text=>{notify(text);return true;};
 function nextKind(role){
  if(job()?.roleId===role.id)return job().stage==='ready'?'claim':tea.dutyStep(job().id)?.key?'work':'wait';
  if(!careers.isHired(role.id))return 'view';
  const s=careers.state(),d=s.lastDuty,c=getClock();
  return s.lastPaidDay===c.day||d?.day===c.day&&d.stage==='missed'&&d.reason!=='tea-handoff-wait'?'view':'accept';
 }
 function intentFor(roleId,kind){
  const role=roleById(roleId);if(!role||disposed)return null;kind||=nextKind(role);
  if(!['view','formal-view','formal-apply','formal-resign','accept','claim','work','wait','cancel'].includes(kind))return null;
  const j=job(),hired=careers.isHired(role.id),s=careers.state(),spec=j?.roleId===role.id?tea.dutyStep(j.id):null;
  if(kind==='formal-apply'&&(j||s.tenure)||kind==='formal-resign'&&(!hired||j)||kind==='accept'&&(!hired||j)||
   ['work','wait','claim','cancel'].includes(kind)&&j?.roleId!==role.id||kind==='claim'&&j?.stage!=='ready'||
   ['work','wait','cancel'].includes(kind)&&j?.stage!=='working'||kind==='work'&&!spec?.key||kind==='wait'&&spec?.key&&!spec.waiting)return null;
  if(!['view','formal-view'].includes(kind)&&(loadError||s.loadError))return null;
  const registry=tea.registries[dutyRole(role.id)],position=kind==='work'?spec.position:kind==='cancel'?getPlayer()?.root.position.toArray():registry.position;
  if(!position)return null;
  const label={view:`查看${role.name}登记`,'formal-view':`查看${role.name}登记`,'formal-apply':`向${role.employer}申请${role.name}`,
   'formal-resign':`办理${role.name}离职`,accept:`开始今日${role.name}轮班`,claim:`请${role.employer}验收 · 工资入银行`,
   work:spec?.label,wait:spec?.label||'等候茶点工序交接',cancel:'取消当前轮班 · 安全交回原茶单'}[kind];
  return {id:`${role.id}-${kind}`,provider:'france-tea-careers',roleId,kind,position:[...position],name:role.workplace,npcName:role.employer,
   action:label,playerWorkTarget:spec?.target,stepKey:kind==='work'?spec.key:null,
   intentKey:[s.revision,j?.id||'-',j?.stage||'-',spec?.orderId||'-',spec?.key||'-',kind].join(':'),
   interactionRadius:2.1,executionRadius:.18,priority:kind==='view'||kind==='wait'?2:56};
 }
 function resolveIntent(selected){const next=intentFor(selected?.roleId,selected?.kind);return next&&next.provider===selected?.provider&&next.id===selected.id&&next.intentKey===selected.intentKey?next:null;}
 function executeIntent(selected){
  const next=resolveIntent(selected);if(!next||!at(next.position)||!canSee(next))return false;
  if(['view','formal-view'].includes(next.kind)){openRegistration({country:'france',roleId:next.roleId});return true;}
  if(next.kind==='cancel')return cancel();
  if(next.kind==='wait'){notify(next.action);return true;}
  if(next.kind==='work'){pending=next;return true;}
  meeting=next;tea.requestMeeting(dutyRole(next.roleId));notify(`${roleById(next.roleId).employer}会先收好原茶单，再到登记处与你办理`);return true;
 }
 function recover(){
  const d=careers.state().lastDuty;
  if(job()){
   if(formalDuty()&&['inspection','ready','paid'].includes(d.stage)){if(job().stage!=='ready'&&!persist({...current,job:{...job(),stage:'ready'}}))return false;}
   else if(!cancel(job().started&&!job().waiting?'reloaded':'tea-handoff-wait'))return false;
  }else if(ROLES.some(r=>r.id===d?.roleId)&&d.stage==='working'){
   if(!result(careers.interruptDuty('tea-handoff-wait')))return false;
  }
  recovery=false;return true;
 }
 // Called before shared observeDay. An employee waiting for the old order,
 // seat or upstream cook must not receive a player-absence evaluation.
 function beforeClock(){if(job()?.stage==='working'&&formalDuty()?.day!==getClock().day){const spec=tea.dutyStep(job().id);if(!job().started||spec?.waiting)cancel('tea-handoff-wait');}}
 function update(dt){
  if(disposed||loadError)return;if(recovery&&!recover())return;
  if(job()?.stage==='working'){
   const d=formalDuty();
   if(d?.stage==='missed'){cancel(d.reason);return;}
   if(!tea.keepDuty(job().id)&&!tea.claimDuty(job().id,dutyRole(job().roleId)))return;
   const state=tea.dutyState(),waiting=!!tea.dutyStep(job().id)?.waiting;
   if(job().waiting!==waiting&&!persist({...current,job:{...job(),waiting}}))return;
   if(state?.status==='done'){
    if(!result(careers.laborEvent('completed',{roleId:job().roleId,receiptId:job().id})))return;
    if(persist({...current,job:{...job(),stage:'ready'}})){tea.releaseDuty(job().id);notify('本岗实际职责已完成，请回登记处由主管验收');}
   }
  }
  if(meeting){
   const selected=meeting,next=resolveIntent(selected);
   if(!next||!at(next.position)||!canSee(next)){meeting=null;tea.releaseMeeting();}
   else if(!getPlayer()?.walking){tea.requestMeeting(dutyRole(next.roleId));if(tea.meetingReady(dutyRole(next.roleId))){meeting=null;performMeeting(next);tea.releaseMeeting();}}
  }
  if(pending){
   const next=resolveIntent(pending);if(!next||!at(next.position)||!canSee(next))pending=null;
   else if(!getPlayer()?.walking&&!tea.dutyStep(job().id)?.waiting){pending=null;if(!job().started&&!persist({...current,job:{...job(),started:true,waiting:false}}))return;tea.startDutyStep(job().id,next.stepKey);}
  }
  if(job()?.stage==='ready'&&['ready','paid'].includes(formalDuty()?.stage)){
   nextPayAt+=Math.max(0,dt||0);if(nextPayAt>=5){nextPayAt=0;pay();}
  }
 }
 const services=ROLES.map(role=>({intent:kind=>intentFor(role.id,kind),resolveIntent,executeIntent}));
 return {forRole:id=>services[ROLES.findIndex(r=>r.id===id)]||null,services,resolveIntent,executeIntent,update,beforeClock,stopActivity,cancel,
  isActing:()=>!!pending||!!meeting||!!tea.dutyState()?.step,
  held:()=>tea.state().order?.holder==='host'&&tea.dutyState()?.role==='host'&&tea.dutyState()?.status==='active',
  playerAction:()=>tea.dutyPlayerAction(),playerStation:()=>tea.dutyPlayerStation(),
  label:()=>meeting?'等主管把原单收好再办理':job()?tea.dutyStep(job().id)?.label:null,
  state:()=>({...copy(current),loadError,meeting:meeting?.kind||null,pending:pending?.stepKey||null}),
  dispose(){if(disposed)return;if(job()?.stage==='working')cancel();stopActivity();disposed=true;},
 };
}
