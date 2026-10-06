import {createFranceGardenerShift} from './france-gardener-shift.js';
import {skillXPReceipt} from './skill-progress.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {GARDEN_ASSISTANT_ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {GARDEN_HELPER_ROLE} from './france-gardener-employment.js';
import {settleTemporaryWage} from './temporary-work-payroll.js';
import {FRANCE_GARDENER as P} from './france-gardener-place.js';
const WAGE=6,SECONDS=5,TRANSFER=1.35,copy=x=>JSON.parse(JSON.stringify(x));
const REGISTRY={name:'西苑工具架 · 园艺帮工登记',position:P.registration};
const RACK={name:'原浇水壶 · 工具架',position:P.playerApproach};
const near=(p,a,r=.2)=>!!p&&Math.hypot(p.x-a[0],p.z-a[2])<=r&&Math.abs(p.y-a[1])<=.2;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
function restore(saved){
 if(saved==null)return {version:2,serial:0,job:null};
 if(![1,2].includes(saved.version)||!integer(saved.serial))throw Error('invalid-saved-state');
 const j=saved.job;
 if(j!=null&&(!j||j.id!==`fr-garden-labor-${saved.serial}`||j.receiptId!==j.id||(j.formalRoleId!=null&&(saved.version!==2||j.formalRoleId!==GARDEN_ASSISTANT_ROLE.id))||saved.serial<1||
  !['working','ready'].includes(j.stage)||!integer(j.completedBeds)||j.completedBeds>2||
  j.stage==='ready'&&j.completedBeds!==2||typeof j.cancelled!=='boolean'||j.cancelled&&j.completedBeds===2&&!j.formalRoleId||
  j.settlementDay!=null&&(!integer(j.settlementDay)||j.stage!=='ready'||j.formalRoleId)))throw Error('invalid-saved-state');
 // Tools return to the rack when a region unloads. Completed beds remain on
 // the work slip; the player must take/return the real can again before pay.
 return {version:2,serial:saved.serial,job:j&&!j.cancelled?copy(j):null};
}
export function createFranceGardenerLabor(options={}){
 let latest=options.saved,ui=null;
 const saveState=next=>{const result=options.saveState(next);if(result!==false&&!result?.then)latest=copy(next);return result;};
 const continuous=options.saved?.version===3;
 const legacy=createLegacyFranceGardenerLabor({...options,document:null,saved:continuous?null:options.saved,saveState});
 const shift=options.careers&&options.gardener?.maintenanceState?createFranceGardenerShift({...options,saved:continuous?options.saved:null,saveState,getSerial:()=>latest?.serial||0}):null;
 const current=()=>legacy.active()?legacy:shift&&(shift.active()||options.careers.isHired(GARDEN_ASSISTANT_ROLE.id))?shift:legacy;
 const service=new Proxy({}, {get(_target,key){
  if(key==='update')return dt=>{current().update(dt);ui?.refresh();};
  if(key==='dispose')return options=>{legacy.dispose(options);shift?.dispose(options);ui?.dispose();};
  if(key==='menuContext')return ()=>ui?.menuContext();
  if(key==='open')return ()=>ui?.open();if(key==='close')return ()=>ui?.close();if(key==='isOpen')return ()=>!!ui?.isOpen();
  if(key==='restore')return s=>(s?.version===2?shift:legacy)?.restore(s);
  const value=current()[key];return typeof value==='function'?value.bind(current()):value;
 }});
 const doc=options.document===undefined?globalThis.document:options.document;
 if(doc?.createElement&&doc.body)ui=createUI({doc,service,getPlayer:options.getPlayer,canSee:options.canSee||(()=>true),onIntent:options.onIntent||(()=>{}),onOpen:options.onOpen||(()=>{})});
 return service;
}
function createLegacyFranceGardenerLabor({gardener,employment,careers,openRegistration,onCompleted=()=>{},getPlayer,getMounted=()=>null,
 copperLedger,getClock,saved,saveState,notify=()=>{},onIntent=()=>{},canSee=()=>true,onOpen=()=>{},
 document:doc=globalThis.document}={}){
 if(!gardener||!copperLedger||typeof getPlayer!=='function'||typeof saveState!=='function')throw TypeError('garden labor dependencies required');
 let current,loadError=null;try{current=restore(saved);}catch{current={version:2,serial:0,job:null};loadError='invalid-saved-state';}
 let disposed=false,saving=false,paying=false,lastError=null,activity=null,pending=null,meetingIntent=null,elapsed=0,origin=null,activityPoint=null,ui=null;
 let nextPayAt=0;
 const formal=createFormalLaborContract({careers,role:GARDEN_ASSISTANT_ROLE,getJob:()=>current.job,getPlayer,meetHost:()=>meetHost(),notify,openRegistration});
 const hired=()=>formal.hired()||!!employment?.isHired();
 const position=()=>getPlayer()?.root?.position,held=()=>!!current.job&&gardener.loanState().owner===current.job.id&&gardener.loanState().borrowed;
 const at=point=>!getMounted()&&near(position(),point),active=()=>!!current.job;
 const fail=(code,text)=>{lastError=code;if(text)notify(text);return false;};
 const permitted=()=>!disposed&&!saving&&!paying&&!loadError&&!copperLedger.loadError;
 function persist(next){
  if(saving)return false;saving=true;
  try{const result=saveState(copy(next));if(result===false)return fail('save-failed','园艺记录没能保存，请稍后再试');
   if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});return fail('async-save-unsupported','园艺记录没能保存，请稍后再试');}
   current=next;lastError=null;return true;
  }catch{return fail('save-failed','园艺记录没能保存，请稍后再试');}finally{saving=false;}
 }
 const meetHost=()=>at(P.registration)&&!getPlayer()?.walking&&canSee(REGISTRY)&&gardener.hostReady();
 function ensureReservation(){return !current.job||current.job.stage==='ready'||gardener.loanState().owner===current.job.id||gardener.reserveTools(current.job.id);}
 function stopActivity(){activity=null;pending=null;elapsed=0;origin=null;meetingIntent=null;gardener.releaseMeeting();}
 function accept(){
  if(!permitted()||current.job)return false;
  if(!hired())return fail('not-employed','请先当面申请园艺帮工');
  if(!meetHost())return fail('host-unavailable');
  const resume=formal.pendingReceipt(),serial=resume?Number(resume.split('-').at(-1)):Math.max(current.serial+1,copperLedger.state().nextTransaction);if(!integer(serial)||serial<1)return fail('job-limit');
  const id=`fr-garden-labor-${serial}`;
  if(!gardener.reserveTools(id))return fail('tools-busy','埃米尔还在收好工具，请稍候');
  const contract=formal.begin(id);if(!contract.ok){gardener.releaseTools(id);return false;}
  if(!persist({version:2,serial,job:{id,receiptId:id,stage:'working',completedBeds:0,cancelled:false,...(contract.formalRoleId?{formalRoleId:contract.formalRoleId}:{})}})){gardener.releaseTools(id);return false;}
  notify(formal.pinned(current.job)?`埃米尔：今日正式班次已登记。领原壶、浇两畦、归壶后找我验收，${formal.salary}日薪存法国券账户。`:'埃米尔：水壶和两畦玫瑰留给你。每畦浇 5 秒，归还水壶后找我验收，6 铜文工资自动存银行。');return true;
 }
 function claim(){
  if(!permitted()||current.job?.stage!=='ready')return fail('work-incomplete');
  if(!meetHost())return fail('host-unavailable');
  if(formal.pinned(current.job)){const r=formal.inspect(current.job);return r.ok?finishFormalPay(r):false;}
  onCompleted(copy(current.job));
  paying=true;let result;
  try{result=settleTemporaryWage({ledger:copperLedger,job:current.job,amount:WAGE,roleId:GARDEN_HELPER_ROLE,
   getClock,saveJob:job=>persist({...current,job})});}catch{return fail('payment-failed','工钱尚未入账，稍后可重试');}finally{paying=false;}
  if(!result?.ok)return fail(result?.code||'payment-failed','工钱尚未入账，稍后可重试');
  if(!persist({...current,job:null})){notify(result.legacyCash?'旧工钱已在钱包中，收工记录待确认；再来不会重复发薪':'6 铜文工资已存银行；收工记录待确认，再来不会重复发薪');return true;}
  notify(result.legacyCash?'已在钱包的旧工钱保留，收工记录已确认':'埃米尔：验收完成，6 铜文工资已存银行；可在音乐接待厅柜台选择铜文提款。');return true;
 }
 function finishFormalPay(r){
  if(!r.ok||r.cleanupPending)return false;
  if(!persist({...current,job:null}))return false;
  notify(`${r.wage}法国券日薪已存入法国券账户；可在音乐接待厅银行柜台取出。`);return true;
 }
 function cancel(){
  if(!permitted()||!current.job)return false;
  if(current.job.stage==='ready'||current.job.completedBeds===2&&(!formal.pinned(current.job)||formal.canWork(current.job)))return fail('wage-ready','两畦已经做好；归还水壶后当面验收，工资存银行，这份工钱会保留');
  if(!formal.cancel(current.job))return false;
  const id=current.job.id;stopActivity();
  if(held()){
   if(!persist({...current,job:{...current.job,cancelled:true}}))return false;
   notify('先把手里的水壶放回工具架，再取消这份活');ui?.close();onIntent(intent('return'));return true;
  }
  if(!persist({...current,job:null}))return false;gardener.releaseTools(id);notify('已取消园艺活，没有领取工钱');return true;
 }
 function target(){
  const j=current.job;if(!j||j.stage==='ready')return REGISTRY;
  if(!held()||j.cancelled||j.completedBeds===2)return RACK;
  const b=P.beds[j.completedBeds];return {name:`第${j.completedBeds+1}畦玫瑰`,position:b.approach,playerWorkTarget:b.target};
 }
 function intent(kind){
  const j=current.job,employed=hired(),registration=employment?.state();
  kind||=j?j.stage==='ready'?'claim':held()?j.cancelled||j.completedBeds===2?'return':'water':'take':formal.hired()?'formal-view':'view';
  if(disposed||!['view','apply','resign','accept','claim','take','water','return','formal-view','formal-apply','formal-review','formal-resign'].includes(kind))return null;
  if(!['view','formal-view'].includes(kind)&&!permitted())return null;
  if(['apply','resign','accept'].includes(kind)&&registration?.loadError)return null;
  if(kind==='apply'&&(employed||j)||kind==='resign'&&(!employed||j||formal.hired())||kind==='accept'&&(!employed||j)||
   kind==='claim'&&j?.stage!=='ready'||['take','water','return'].includes(kind)&&(!employed||j?.stage!=='working')||
   kind==='take'&&held()||kind==='water'&&(!held()||j.cancelled||j.completedBeds===2)||kind==='return'&&!held())return null;
  if(kind==='accept'&&formal.hired()&&!formal.beginAvailability().ok)return null;
  if(kind==='formal-review'&&(j||formal.hired()||careers?.applicationResult(GARDEN_ASSISTANT_ROLE.id)?.status!=='pending'))return null;
  if(kind==='formal-apply'&&(j||formal.hired()||!careers)||kind==='formal-resign'&&(j||!formal.hired()))return null;
  if(['take','water'].includes(kind)&&!formal.canWork(j))return null;
  const point=kind==='water'?target():['take','return'].includes(kind)?RACK:REGISTRY;
  return {...copy(point),id:`fr-garden-labor-${kind}`,provider:'france-gardener-labor',kind,npcName:'埃米尔',...(kind==='formal-view'?{registration:{scope:'role',roleId:GARDEN_ASSISTANT_ROLE.id}}:{}),
   action:{'formal-view':formal.hired()?'查看岗位状态':'查看正式职位与申请条件','formal-apply':'提交园艺助理申请','formal-review':'当面确认职责并接受审核','formal-resign':'办理常任园艺离职',view:'查看临工与长期职位',apply:'申请园艺帮工',resign:'办理园艺离职',accept:formal.hired()?'开始今日园艺班次':'接下浇花活',claim:formal.pinned(j)?'提交当班验收 · 工资存法国券账户':'验收后工资存银行 · 6 铜文',take:'领取浇水壶',water:'亲手浇花 · 5 秒',return:'归还浇水壶'}[kind],
   intentKey:[registration?.revision||0,formal.state()?.revision||0,j?.id||'-',j?.stage||'-',j?.completedBeds||0,j?.cancelled||false,held(),kind].join(':'),
   interactionRadius:2.4,executionRadius:.16,priority:kind==='view'?1:45};
 }
 function resolveIntent(selected){const next=intent(selected?.kind);if(!next||selected?.provider!==next.provider||selected.id!==next.id||selected.intentKey!==next.intentKey)return null;if(next.kind==='formal-view'){const context=selected.registration||next.registration;if(context.roleId!==GARDEN_ASSISTANT_ROLE.id||!['role','catalogue'].includes(context.scope))return null;return {...next,registration:{...context}};}return next;}
 function executeIntent(selected){
  const next=resolveIntent(selected);if(!next||!at(next.position)||!canSee(next))return false;
  if(next.kind==='formal-view'){formal.open(next.registration);return true;}
  if(next.kind==='view'){if(formal.hired())formal.open();else ui?.open();return true;}
  if(['apply','resign','accept','claim','formal-apply','formal-review','formal-resign'].includes(next.kind)){
   if(meetingIntent)return false;meetingIntent=next;gardener.requestMeeting();
   notify('埃米尔：在登记簿旁稍候，我放好工具就来。');return true;
  }
  if(activity||pending)return false;pending=next;return true;
 }
 function begin(selected){
  if(!resolveIntent(selected)||!at(selected.position)||getPlayer()?.walking||!canSee(selected)||!ensureReservation())return false;
  activity=selected.kind;activityPoint=selected;origin={...position()};elapsed=0;return true;
 }
 function stationary(){const p=position();return !!origin&&!getPlayer()?.walking&&at(activityPoint.position)&&
  Math.hypot(p.x-origin.x,p.z-origin.z)<=.015&&Math.abs(p.y-origin.y)<=.015&&canSee(activityPoint);}
 function update(dt){
  if(disposed)return;ensureReservation();
  if(meetingIntent){
   const selected=meetingIntent;
   if(!resolveIntent(selected)||!at(P.registration)||!canSee(REGISTRY)){meetingIntent=null;gardener.releaseMeeting();}
   else if(!getPlayer()?.walking&&gardener.requestMeeting()&&meetHost()){
    meetingIntent=null;
    if(selected.kind==='formal-apply')formal.apply();else if(selected.kind==='formal-review')formal.review();else if(selected.kind==='formal-resign')formal.resign();else if(selected.kind==='apply'||selected.kind==='resign')employment[selected.kind]();else if(selected.kind==='accept')accept();else claim();
    gardener.releaseMeeting();
   }
  }
  if(pending){const selected=pending;if(!resolveIntent(selected)||!at(selected.position))pending=null;else if(!getPlayer()?.walking){pending=null;begin(selected);}}
  if(activity){
   if(!stationary()||(activity!=='return'&&!formal.canWork(current.job))){activity=null;elapsed=0;origin=null;notify('已停下手上的动作；水壶与已完成的花畦不会重复结算');}
   else{
    const end=activity==='water'?SECONDS:TRANSFER;
    if(Number.isFinite(dt)&&dt>0)elapsed=Math.min(end,elapsed+Math.min(dt,.1));
    const p=getPlayer(),point=activity==='water'?target().playerWorkTarget:P.standTop;p.root.rotation.y=Math.atan2(point[0]-p.root.position.x,point[2]-p.root.position.z);
    if(elapsed>=end-1e-8){
     const action=activity,id=current.job.id;activity=null;origin=null;elapsed=0;
     if(action==='take'){if(gardener.takeCan(id))notify(current.job.completedBeds===2?'已取壶，请放回架上确认收工':'已领取原浇水壶，走到下一畦玫瑰根部浇水');}
     else if(action==='water'){
      const done=current.job.completedBeds+1;
      if(persist({...current,job:{...current.job,completedBeds:done}})){gardener.markWateredBed?.(id,done-1);notify(done===2?'两畦玫瑰浇好了，请归还水壶后当面验收，工资存银行':'第一畦浇好了，请到第二畦继续');}
     }else{
      const j=current.job,next=j.cancelled?{...current,job:null}:{...current,job:{...j,stage:j.completedBeds===2?'ready':'working'}};
      // Save a completed return before releasing the only can. On failure the
      // player keeps it and can retry; a ready receipt precedes bank credit.
      if(!j.cancelled&&j.completedBeds===2&&!formal.complete(j))return;
      if(persist(next)){const learned=j.completedBeds===2&&!j.cancelled&&!formal.pinned(j)?onCompleted(copy(next.job)):null;gardener.returnCan(id);notify((j.cancelled?'水壶已归位，这份活已取消':j.completedBeds===2?formal.pinned(j)?'水壶已归位，请到登记簿旁验收当班':'水壶已归位，请到登记簿旁验收，6 铜文工资自动存银行':'水壶已归位，已完成的花畦保留；可再领取继续')+skillXPReceipt(learned,'园艺'));}
     }
    }
   }
  }
  if(current.job?.stage==='ready'&&formal.pinned(current.job)&&['ready','paid'].includes(formal.duty(current.job)?.stage)){
   nextPayAt+=Math.max(0,Number.isFinite(dt)?dt:0);if(nextPayAt>=5){nextPayAt=0;finishFormalPay(formal.pay(current.job));}
  }
  ui?.refresh();
 }
 function playerPose(){
  if(!held()&&activity!=='take')return null;
  if(activity==='water')return {archery:{hands:[[-.16,1.04,.27],[.19,1.05+Math.sin(elapsed*.9)*.025,.37]]}};
  if(activity==='take'||activity==='return'){const p=position(),target=[P.standTop[0]+.14,P.standTop[1]+.365,P.standTop[2]-.22],scale=getPlayer().characterScale||1;return {archery:{hands:[null,[0,(target[1]-p.y)/scale,Math.hypot(target[0]-p.x,target[2]-p.z)/scale]]}};}
  return {archery:{hands:[null,[.30,.86,.17]]}};
 }
 function toolPose(){
  if(!held()&&activity!=='take')return null;
  return {actor:getPlayer(),tool:held()?'can':null,action:activity==='water'?'water':null,
   target:activity==='water'?target().playerWorkTarget:null,phase:elapsed,
   transfer:activity==='take'||activity==='return'?{tool:'can',pickup:activity==='take',ratio:Math.min(1,elapsed/TRANSFER)}:null};
 }
 const view=()=>({...copy(current),hired:hired(),formalHired:formal.hired(),formalRole:formal.role,formalState:formal.state(),formalJob:formal.pinned(current.job),formalExpired:formal.pinned(current.job)&&current.job.stage==='working'&&!formal.canWork(current.job),formalSalary:formal.salary,beginAvailability:formal.beginAvailability(),employment:employment?.state(),held:held(),activity,
  waitingForHost:!!meetingIntent,progress:elapsed/(activity==='water'?SECONDS:TRANSFER),wage:WAGE,seconds:SECONDS,
  target:copy(target()),loan:gardener.loanState(),loadError:loadError||copperLedger.loadError,lastError});
 const service={active,held,isActing:()=>!!activity||!!pending||!!meetingIntent,accept,claim,cancel,meetHost,stopActivity,update,intent,resolveIntent,executeIntent,view,state:view,
  snapshot:()=>({version:1,jobId:current.job?.id||null,completedBeds:current.job?.completedBeds||0,activity,pending:copy(pending),meetingIntent:copy(meetingIntent),elapsed,origin:copy(origin),activityPoint:copy(activityPoint),nextPayAt}),
  restore(s){if(s?.version!==1||s.jobId!==(current.job?.id||null)||s.completedBeds!==(current.job?.completedBeds||0))return false;activity=['take','water','return'].includes(s.activity)?s.activity:null;pending=copy(s.pending);meetingIntent=copy(s.meetingIntent);elapsed=Math.max(0,s.elapsed||0);origin=copy(s.origin);activityPoint=copy(s.activityPoint);nextPayAt=Math.max(0,s.nextPayAt||0);return true;},
  employment,formal,playerPose,toolPose,label:()=>meetingIntent?'等埃米尔收好工具':activity==='water'?`正在浇花 · ${Math.ceil(SECONDS-elapsed)} 秒`:activity==='take'?'拿起浇水壶':activity==='return'?'放回浇水壶':held()?'提着浇水壶':null,
  menuContext:()=>ui?.menuContext(),open:()=>ui?.open(),close:()=>ui?.close(),isOpen:()=>!!ui?.isOpen(),
  dispose({suspend=false}={}){if(disposed)return;if(!suspend)stopActivity();disposed=true;ui?.dispose();}};
 if(doc?.createElement&&doc.body)ui=createUI({doc,service,getPlayer,canSee,onIntent,onOpen});
 ensureReservation();return service;
}
function createUI({doc,service,getPlayer,canSee,onIntent,onOpen}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','园艺帮工 · 登记','fr-labor-badge'),dialog=make('dialog',null,'fr-labor-dialog ww-airy-theme ww-airy-panel'),style=make('style');
 badge.type='button';badge.setAttribute('aria-label','西苑园艺帮工');dialog.setAttribute('aria-label','西苑工作登记');
 style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.fr-labor-badge{position:fixed;left:max(18px,env(safe-area-inset-left));top:262px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:9px 13px;border:0;border-radius:3px;background:#e8f1e7;color:#416b6d;font-size:12px;box-shadow:0 3px 12px #173b3315}
.fr-labor-dialog.ww-airy-panel{position:fixed;inset:0;margin:auto;width:min(720px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(340px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f7f9ef,#edf5f1 72%,#eff0fa);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}
.fr-labor-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.fr-labor-dialog *{box-sizing:border-box}.fr-labor-dialog h2{font-family:inherit;font-weight:600;font-size:21px;line-height:1.3;letter-spacing:.08em;margin:0}.fr-labor-dialog h3{font-size:19px;line-height:1.3;margin:0 0 5px;font-weight:500}.fr-labor-dialog p{font-size:13px;line-height:1.5;margin:5px 0}.fr-labor-dialog button{font-family:inherit;min-height:44px;cursor:pointer;box-shadow:none}.fr-labor-dialog button:disabled{opacity:.5;cursor:default}.fr-labor-dialog .fr-labor-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#7b999b;font-size:26px}.fr-labor-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;border-bottom:1px solid #d5e5dc;padding-bottom:9px;margin-bottom:10px}.fr-labor-heading>span{font-size:12px;color:#759297;white-space:nowrap}
.fr-labor-content{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.45fr);gap:18px;overflow:hidden}.fr-labor-menu,.fr-labor-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.fr-labor-choices{display:grid;gap:8px}.fr-labor-dialog.ww-airy-theme .fr-labor-choices button{display:block;width:100%;min-height:65px;padding:9px 12px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff65;color:#61848a;font-size:14px}.fr-labor-dialog.ww-airy-theme .fr-labor-choices button[aria-pressed=true]{border-left-color:#84bdb0;background:linear-gradient(90deg,#dceee4,#e9f4eb70);color:#305f66}.fr-labor-choices strong{display:block;font-size:16px;font-weight:500;margin-bottom:4px}.fr-labor-choices span{display:block;font-size:12px;color:#7c9696}.fr-labor-detail{position:relative;padding:10px 15px;background:#fffefa80;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px}.fr-labor-kicker{font-size:11px!important;color:#83a0a0;margin:0 0 4px!important;letter-spacing:.08em}.fr-labor-value{display:flex;align-items:baseline;gap:6px;margin:7px 0;color:#5b7b94;font-size:12px}.fr-labor-value strong{font-size:29px;line-height:1;font-weight:500}.fr-labor-status{color:#557c7a}.fr-labor-note{font-size:12px!important;color:#819698}.fr-labor-error{color:#aa726b!important}.fr-labor-dialog .fr-labor-more{margin:3px 0 0;padding:0;border-top:1px solid #dfebe2;color:#789094}.fr-labor-more summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:12px;list-style:none}.fr-labor-more summary:after{content:'＋';margin-left:auto;color:#8aabaa}.fr-labor-more[open] summary:after{content:'−'}.fr-labor-more p{font-size:12px}.fr-labor-more button{display:block;width:100%;padding:6px 0;text-align:left;font-size:12px;border:0;border-radius:0;background:transparent;color:#827780}.fr-labor-actions{padding-top:7px;border-top:1px solid #d5e5dc}.fr-labor-dialog.ww-airy-theme .fr-labor-primary{width:100%;min-height:44px;font-size:14px;letter-spacing:.02em;padding:8px 14px}
@media(max-height:500px){.fr-labor-dialog.ww-airy-panel{padding:12px 18px 10px}.fr-labor-heading{height:30px;padding-bottom:5px;margin-bottom:7px}.fr-labor-dialog h2{font-size:18px}.fr-labor-dialog h3{font-size:17px}.fr-labor-detail{padding:8px 13px}.fr-labor-value{margin:5px 0}.fr-labor-value strong{font-size:26px}.fr-labor-actions{padding-top:5px}.fr-labor-badge{top:215px;font-size:10px;padding:8px 10px}}
@media(max-width:600px){.fr-labor-dialog.ww-airy-panel{height:min(540px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.fr-labor-heading{display:block}.fr-labor-heading>span{display:block;margin-top:3px}.fr-labor-content{display:block;overflow:auto}.fr-labor-menu,.fr-labor-detail{overflow:visible}.fr-labor-menu{margin-bottom:12px}.fr-labor-choices{grid-template-columns:1fr 1fr}.fr-labor-choices button{padding:8px}.fr-labor-choices strong{font-size:14px}.fr-labor-choices span{font-size:11px}}
`;
 (doc.head||doc.body).append(style);doc.body.append(badge,dialog);let menuState={available:false},signature='',selected='temporary',revision=0,detailsOpen=false,disposed=false;
 const nearby=(state=service.view())=>[REGISTRY,state.target].some(t=>near(getPlayer()?.root.position,t.position,2.4)&&canSee(t));
 const close=()=>{revision++;if(dialog.open)dialog.close();};
 const button=(text,fn,cls)=>{const e=make('button',text,cls);e.type='button';e.onclick=fn;return e;};
 const request=choice=>{if(!service.resolveIntent(choice)){refresh(true);return;}close();onIntent(choice);};
 const secondsLeft=s=>s.activity==='water'?Math.ceil((1-s.progress)*s.seconds):null;
 const stateKey=s=>JSON.stringify([selected,s.job,s.hired,s.activity,secondsLeft(s),s.held,s.waitingForHost,s.loadError,s.lastError,s.employment?.revision,s.employment?.loadError,s.formalState?.revision,s.formalState?.loadError,s.formalHired,getPlayer()?.ageYears,s.beginAvailability?.code,s.beginAvailability?.ok]);
 function refresh(force=false){
  const s=service.view(),near=nearby(s);menuState={available:near};badge.hidden=!near;badge.textContent=s.formalHired?(s.job?.stage==='ready'?'园艺正式班次 · 待验收':s.job?s.job.shiftKind==='continuous'?service.label()||'常任园艺 · 当班中':`常任园艺 · ${s.job.completedBeds}/2畦`:'常任园艺助理 · 每日班次'):s.activity==='water'?`浇花中 · ${secondsLeft(s)} 秒`:s.waitingForHost?'等埃米尔到登记簿旁':s.job?.stage==='ready'?`园艺工钱 · ${s.wage} 铜文`:s.job?`园艺活 · ${s.job.completedBeds}/2 畦${s.held?' · 持壶':''}`:s.hired?'园艺帮工 · 接活':'招工登记 · 园艺帮工';
  if(dialog.open&&!near){close();return;}if(!dialog.open&&!force)return;
  const key=stateKey(s);if(!force&&key===signature)return;signature=key;const rendered=++revision;dialog.replaceChildren();
  // A closed, replaced or superseded control cannot issue another navigation
  // request or cancel a newer work slip. Physical execution stays in service.
  const guard=fn=>()=>{if(disposed||!dialog.open||rendered!==revision)return;if(stateKey(service.view())!==key){refresh(true);return;}fn();};
  const x=button('×',guard(close),'fr-labor-close');x.setAttribute('aria-label','关闭园艺面板，保留进度');
  const {header,body,actions}=createAiryPanelParts(doc);header.className+=' fr-labor-heading';body.className+=' fr-labor-content';actions.className+=' fr-labor-actions';
  header.append(make('h2','西苑 · 工作登记'),make('span','埃米尔 · 工具架'));
  const menu=make('section',null,'fr-labor-menu'),choices=make('div',null,'fr-labor-choices'),detail=make('section',null,'fr-labor-detail');
  choices.setAttribute('aria-label','选择西苑工作');
  for(const [id,title,summary] of [['temporary','临时帮工',s.job?`手上这份 · ${s.job.completedBeds}/2 畦`:s.hired?'已登记 · 按次接活':`${s.wage} 铜文 / 份 · 免费登记`],['formal','长期职位',s.formalHired?'常任园艺助理 · 已任职':'常任园艺助理 · 查看条件']]){
   const b=button(null,guard(()=>{selected=id;detailsOpen=false;refresh(true);}));b.setAttribute('aria-pressed',String(selected===id));b.append(make('strong',title),make('span',summary));choices.append(b);
  }
  menu.append(choices,make('p','领壶 → 浇两畦 → 还壶 → 验收','fr-labor-note'));
  const more=make('details',null,'fr-labor-more');more.open=detailsOpen;more.addEventListener('toggle',()=>{if(rendered===revision)detailsOpen=more.open;});
  let choice,label,blocked=false;
  if(selected==='formal'){
   const age=getPlayer()?.ageYears,skill=s.formalState?.skills?.gardening,role=s.formalRole;
   detail.append(make('p','长期职位 · 本地登记','fr-labor-kicker'),make('h3','常任园艺助理'));
   const value=make('div',null,'fr-labor-value');value.append(make('strong',s.formalSalary),make('span','/ 日 · 存法国券账户'));detail.append(value);
   detail.append(make('p',`年龄 ${Number.isFinite(age)?Math.floor(age)+'岁':'未读取'} / ${role.minimumAgeYears}岁 · 园艺 ${Number.isFinite(skill)?skill+'点':'未读取'} / ${role.skillRequirements.gardening}点`,'fr-labor-status'));
   detail.append(make('p',s.formalState?.loadError?'职业记录暂时无法读取':s.formalHired?'已任职 · 查看实际岗位与班次':s.job?'先结清手上的活，再办理长期任职':'申请、审核与开班，在岗位手册中分别办理',s.formalState?.loadError?'fr-labor-error':'fr-labor-note'));
   more.append(make('summary','职责与日薪说明'),make('p',`${String(role.dutyWindow.startHour).padStart(2,'0')}:00–${String(role.dutyWindow.endHour).padStart(2,'0')}:00 开班，每天一班。查看原花畦与黄杨篱的维护状态，领取原壶或原剪工作并归还；另行交班，由埃米尔验收。`),make('p',`实际工时按 ${role.wage} 券折算，完整12小时另奖 ${role.preparationBonus} 券；正式班次不另发临工铜文。法国券到账后，可在本地音乐接待厅柜台取款。`));
   choice=service.intent('formal-view');label=s.formalHired?'查看岗位与班次':'查看职位与申请条件';
  }else{
   const j=s.job,ready=j?.stage==='ready';
   detail.append(make('p',j?'手上的浇花活':'临时工作 · 按份结算','fr-labor-kicker'),make('h3',j?'两畦玫瑰':s.hired?'园艺帮工 · 已登记':'园艺帮工'));
   const value=make('div',null,'fr-labor-value');value.append(make('strong',j?`${j.completedBeds} / 2`:String(s.wage)),make('span',j?`畦已完成 · 验收 ${s.wage} 铜文`:'铜文 / 份 · 验收后存银行'));detail.append(value);
   const status=s.loadError||s.employment?.loadError?'记录暂时无法读取，请保留存档':s.waitingForHost?'等埃米尔收好工具，到登记簿旁见面':s.activity==='water'?`正在浇花 · 还需 ${secondsLeft(s)} 秒`:s.activity==='take'?'正在拿起原浇水壶':s.activity==='return'?'正在放回原浇水壶':j?.cancelled?'已申请取消 · 先把手里的原壶归还':ready?'原壶已归还 · 工钱待当面验收':j?s.held?j.completedBeds===2?'两畦已完成 · 请归还原壶':`水壶在手 · 下一处：${s.target.name}`:'水壶在架上 · 领取后继续':s.hired?'登记已保存 · 可以接下一份活':'无需资历或技能 · 报名费 0 铜文';
   detail.append(make('p',status,s.loadError||s.employment?.loadError?'fr-labor-error':'fr-labor-status'));
   detail.append(make('p',j?'关闭保留进度；移动会停止当前浇水。':`每畦站稳浇水 ${s.seconds} 秒，完成后还壶验收。`,'fr-labor-note'));
   more.append(make('summary','工钱、成长与退出'),make('p',`${s.wage} 铜文验收后存银行，可在音乐接待厅柜台选择铜文提款。完整临工获得当前一级门槛的园艺 XP，每天最多 4 份有效成长。`),make('p','未完成就取消，没有工钱；持壶时须先归还。两畦完成后工钱保留，不能取消。'));
   if(!j&&s.hired){const resign=service.intent('resign');if(resign)more.append(button('取消临工登记',guard(()=>request(resign))));}
   if(j&&s.held&&j.completedBeds<2&&!j.cancelled){const back=service.intent('return');if(back)more.append(button('先还壶，保留已完成花畦',guard(()=>request(back))));}
   if(j?.stage==='working'&&!j.cancelled&&(j.completedBeds<2||s.formalExpired))more.append(button('取消这份活 · 无工钱',guard(()=>{if(service.cancel())close();else refresh(true);})));
   choice=service.intent(j?undefined:s.hired?'accept':'apply');label=s.waitingForHost?'等埃米尔到登记簿旁':s.activity?status:choice?.kind==='apply'?'当面登记临时帮工':choice?.kind==='claim'?`当面验收 · ${s.wage} 铜文存银行`:choice?.action||'记录暂不可用';
   blocked=!!(s.loadError||s.employment?.loadError||s.waitingForHost||s.activity);
  }
  detail.append(more);const primary=button(label,guard(()=>request(choice)),'fr-labor-primary ww-airy-action');primary.disabled=blocked||!choice;actions.append(primary);body.append(menu,detail);dialog.append(x,header,body,actions);
 }
 const open=()=>{if(disposed||!nearby())return;revision++;if(service.view().formalHired){close();service.formal.open();return;}onOpen();if(service.view().job)selected='temporary';refresh(true);if(!dialog.open)dialog.showModal();refresh(true);};badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
 return {menuContext:()=>disposed?null:menuState,open,close,refresh,isOpen:()=>dialog.open,dispose(){disposed=true;close();badge.remove();dialog.remove();style.remove();}};
}
