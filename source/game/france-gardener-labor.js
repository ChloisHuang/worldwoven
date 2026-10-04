import {FRANCE_GARDENER as P} from './france-gardener-place.js';
const WAGE=6,SECONDS=5,TRANSFER=1.35,copy=x=>JSON.parse(JSON.stringify(x));
const REGISTRY={name:'西苑工具架 · 园艺帮工登记',position:P.registration};
const RACK={name:'原浇水壶 · 工具架',position:P.playerApproach};
const near=(p,a,r=.2)=>!!p&&Math.hypot(p.x-a[0],p.z-a[2])<=r&&Math.abs(p.y-a[1])<=.2;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
function restore(saved){
 if(saved==null)return {version:1,serial:0,job:null};
 if(saved.version!==1||!integer(saved.serial))throw Error('invalid-saved-state');
 const j=saved.job;
 if(j!=null&&(!j||j.id!==`fr-garden-labor-${saved.serial}`||j.receiptId!==j.id||saved.serial<1||
  !['working','ready'].includes(j.stage)||!integer(j.completedBeds)||j.completedBeds>2||
  j.stage==='ready'&&j.completedBeds!==2||typeof j.cancelled!=='boolean'||j.cancelled&&j.completedBeds===2))throw Error('invalid-saved-state');
 // Tools return to the rack when a region unloads. Completed beds remain on
 // the work slip; the player must take/return the real can again before pay.
 return {version:1,serial:saved.serial,job:j&&!j.cancelled?copy(j):null};
}
export function createFranceGardenerLabor({gardener,employment,getPlayer,getMounted=()=>null,
 copperLedger,saved,saveState,notify=()=>{},onIntent=()=>{},canSee=()=>true,onOpen=()=>{},
 document:doc=globalThis.document}={}){
 if(!gardener||!copperLedger||typeof getPlayer!=='function'||typeof saveState!=='function')throw TypeError('garden labor dependencies required');
 let current,loadError=null;try{current=restore(saved);}catch{current={version:1,serial:0,job:null};loadError='invalid-saved-state';}
 let disposed=false,saving=false,paying=false,lastError=null,activity=null,pending=null,meetingIntent=null,elapsed=0,origin=null,activityPoint=null,ui=null;
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
  if(!employment?.isHired())return fail('not-employed','请先当面申请园艺帮工');
  if(!meetHost())return fail('host-unavailable');
  const serial=Math.max(current.serial+1,copperLedger.state().nextTransaction);if(!integer(serial)||serial<1)return fail('job-limit');
  const id=`fr-garden-labor-${serial}`;
  if(!gardener.reserveTools(id))return fail('tools-busy','埃米尔还在收好工具，请稍候');
  if(!persist({version:1,serial,job:{id,receiptId:id,stage:'working',completedBeds:0,cancelled:false}})){gardener.releaseTools(id);return false;}
  notify('埃米尔：水壶和两畦玫瑰留给你。每畦浇 5 秒，归还水壶后领 6 铜文。');return true;
 }
 function claim(){
  if(!permitted()||current.job?.stage!=='ready')return fail('work-incomplete');
  if(!meetHost())return fail('host-unavailable');
  paying=true;let result;
  try{result=copperLedger.earn(WAGE,current.job.receiptId);}catch{return fail('payment-failed','工钱尚未入账，稍后可重试');}finally{paying=false;}
  if(!result?.ok)return fail(result?.code||'payment-failed','工钱尚未入账，稍后可重试');
  if(!persist({...current,job:null})){notify('6 铜文已入账；收工记录待确认，再来不会重复领钱');return true;}
  notify(result.replayed?'这份工钱已经入账，收工记录已确认':'埃米尔：两畦浇好，水壶也归位了。6 铜文收好。');return true;
 }
 function cancel(){
  if(!permitted()||!current.job)return false;
  if(current.job.stage==='ready'||current.job.completedBeds===2)return fail('wage-ready','两畦已经做好；归还水壶后领取工钱，这份工钱会保留');
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
  const j=current.job,hired=employment?.isHired(),registration=employment?.state();
  kind||=j?j.stage==='ready'?'claim':held()?j.cancelled||j.completedBeds===2?'return':'water':'take':hired?'accept':'view';
  if(disposed||!['view','apply','resign','accept','claim','take','water','return'].includes(kind))return null;
  if(kind!=='view'&&!permitted())return null;
  if(['apply','resign','accept'].includes(kind)&&registration?.loadError)return null;
  if(kind==='apply'&&(hired||j)||kind==='resign'&&(!hired||j)||kind==='accept'&&(!hired||j)||
   kind==='claim'&&j?.stage!=='ready'||['take','water','return'].includes(kind)&&(!hired||j?.stage!=='working')||
   kind==='take'&&held()||kind==='water'&&(!held()||j.cancelled||j.completedBeds===2)||kind==='return'&&!held())return null;
  const point=kind==='water'?target():['take','return'].includes(kind)?RACK:REGISTRY;
  return {...copy(point),id:`fr-garden-labor-${kind}`,provider:'france-gardener-labor',kind,npcName:'埃米尔',
   action:{view:'查看园艺帮工职位',apply:'申请园艺帮工',resign:'办理园艺离职',accept:'接下浇花活',claim:'领取 6 铜文',take:'领取浇水壶',water:'亲手浇花 · 5 秒',return:'归还浇水壶'}[kind],
   intentKey:[registration?.revision||0,j?.id||'-',j?.stage||'-',j?.completedBeds||0,j?.cancelled||false,held(),kind].join(':'),
   interactionRadius:2.4,executionRadius:.16,priority:kind==='view'?1:45};
 }
 function resolveIntent(selected){const next=intent(selected?.kind);return next&&selected?.provider===next.provider&&selected.id===next.id&&selected.intentKey===next.intentKey?next:null;}
 function executeIntent(selected){
  const next=resolveIntent(selected);if(!next||!at(next.position)||!canSee(next))return false;
  if(next.kind==='view'){ui?.open();return true;}
  if(['apply','resign','accept','claim'].includes(next.kind)){
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
    if(selected.kind==='apply'||selected.kind==='resign')employment[selected.kind]();else if(selected.kind==='accept')accept();else claim();
    gardener.releaseMeeting();
   }
  }
  if(pending){const selected=pending;if(!resolveIntent(selected)||!at(selected.position))pending=null;else if(!getPlayer()?.walking){pending=null;begin(selected);}}
  if(activity){
   if(!stationary()){activity=null;elapsed=0;origin=null;notify('已停下手上的动作；水壶与已完成的花畦不会重复结算');}
   else{
    const end=activity==='water'?SECONDS:TRANSFER;
    if(Number.isFinite(dt)&&dt>0)elapsed=Math.min(end,elapsed+Math.min(dt,.1));
    const p=getPlayer(),point=activity==='water'?target().playerWorkTarget:P.standTop;p.root.rotation.y=Math.atan2(point[0]-p.root.position.x,point[2]-p.root.position.z);
    if(elapsed>=end-1e-8){
     const action=activity,id=current.job.id;activity=null;origin=null;elapsed=0;
     if(action==='take'){if(gardener.takeCan(id))notify(current.job.completedBeds===2?'已取壶，请放回架上确认收工':'已领取原浇水壶，走到下一畦玫瑰根部浇水');}
     else if(action==='water'){
      const done=current.job.completedBeds+1;
      if(persist({...current,job:{...current.job,completedBeds:done}}))notify(done===2?'两畦玫瑰浇好了，请归还水壶后领工钱':'第一畦浇好了，请到第二畦继续');
     }else{
      const j=current.job,next=j.cancelled?{...current,job:null}:{...current,job:{...j,stage:j.completedBeds===2?'ready':'working'}};
      // Save a completed return before releasing the only can. On failure the
      // player keeps it and can retry; a ready receipt precedes ledger.earn.
      if(persist(next)){gardener.returnCan(id);notify(j.cancelled?'水壶已归位，这份活已取消':j.completedBeds===2?'水壶已归位，请到登记簿旁领 6 铜文':'水壶已归位，已完成的花畦保留；可再领取继续');}
     }
    }
   }
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
 const view=()=>({...copy(current),hired:!!employment?.isHired(),employment:employment?.state(),held:held(),activity,
  waitingForHost:!!meetingIntent,progress:elapsed/(activity==='water'?SECONDS:TRANSFER),wage:WAGE,seconds:SECONDS,
  target:copy(target()),loan:gardener.loanState(),loadError:loadError||copperLedger.loadError,lastError});
 const service={active,held,isActing:()=>!!activity||!!pending||!!meetingIntent,accept,claim,cancel,meetHost,stopActivity,update,intent,resolveIntent,executeIntent,view,state:view,
  employment,playerPose,toolPose,label:()=>meetingIntent?'等埃米尔收好工具':activity==='water'?`正在浇花 · ${Math.ceil(SECONDS-elapsed)} 秒`:activity==='take'?'拿起浇水壶':activity==='return'?'放回浇水壶':held()?'提着浇水壶':null,
  open:()=>ui?.open(),close:()=>ui?.close(),isOpen:()=>!!ui?.isOpen(),
  dispose(){if(disposed)return;stopActivity();disposed=true;ui?.dispose();}};
 if(doc?.createElement&&doc.body)ui=createUI({doc,service,getPlayer,canSee,onIntent,onOpen});
 ensureReservation();return service;
}
function createUI({doc,service,getPlayer,canSee,onIntent,onOpen}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const badge=make('button','园艺帮工 · 登记','fr-labor-badge'),dialog=make('dialog',null,'fr-labor-dialog'),style=make('style');
 badge.type='button';badge.setAttribute('aria-label','西苑园艺帮工');dialog.setAttribute('aria-label','园艺帮工与工钱');
 style.textContent='.fr-labor-badge{position:fixed;left:max(18px,env(safe-area-inset-left));top:262px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:10px 14px;border:1px solid #8ca789;border-radius:12px;background:#466556;color:#fff6de;font-size:12px}.fr-labor-dialog{position:fixed;inset:0;margin:auto;width:min(380px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #93a890;border-radius:16px;background:#f1eedf;color:#384d40}.fr-labor-dialog::backdrop{background:#26392a66}.fr-labor-dialog h2{margin:0 28px 12px 0;font-size:22px}.fr-labor-dialog p{font-size:13px;line-height:1.6}.fr-labor-dialog button{min-height:44px;padding:10px 13px;border-radius:8px;background:#d6dfcd;color:#384d40}.fr-labor-dialog button:disabled{opacity:.5}.fr-labor-dialog button:focus-visible,.fr-labor-badge:focus-visible{outline:3px solid #647e70;outline-offset:2px}.fr-labor-actions{display:flex;flex-wrap:wrap;gap:9px}.fr-labor-close{position:absolute;right:7px;top:7px;font-size:24px}@media(max-height:550px){.fr-labor-badge{top:215px;font-size:10px;padding:8px 10px}.fr-labor-dialog{padding:16px}}';
 (doc.head||doc.body).append(style);doc.body.append(badge,dialog);let signature='';
 const nearby=()=>[REGISTRY,service.view().target].some(t=>near(getPlayer()?.root.position,t.position,2.4)&&canSee(t));
 const close=()=>{if(dialog.open)dialog.close();};
 const button=(text,fn)=>{const e=make('button',text);e.type='button';e.onclick=fn;return e;};
 const request=choice=>{close();if(service.resolveIntent(choice))onIntent(choice);};
 function refresh(force=false){
  const s=service.view();badge.hidden=!nearby();badge.textContent=s.activity==='water'?`浇花中 · ${Math.ceil((1-s.progress)*SECONDS)} 秒`:s.waitingForHost?'等埃米尔到登记簿旁':s.job?.stage==='ready'?'园艺工钱 · 6 铜文':s.job?`园艺活 · ${s.job.completedBeds}/2 畦${s.held?' · 持壶':''}`:s.hired?'园艺帮工 · 接活':'招工登记 · 园艺帮工';
  if(dialog.open&&!nearby()){close();return;}if(!dialog.open&&!force)return;
  const key=JSON.stringify([s.job,s.hired,s.activity,s.held,s.waitingForHost,s.loadError,s.lastError,s.employment?.revision]);if(!force&&key===signature)return;signature=key;dialog.replaceChildren();
  const x=button('×',close);x.className='fr-labor-close';x.setAttribute('aria-label','关闭园艺面板，保留进度');dialog.append(x,make('h2','西苑 · 园艺帮工登记'));
  dialog.append(make('p','职责：亲手领取架上的浇水壶，在两畦玫瑰各站稳浇水 5 秒，再归还原壶。整份工钱 6 铜文，可重复接活。'),make('p','门槛：无需资历、技能或报名费。录用后才可接活；结清工钱后可离职或重新申请。'));
  const actions=make('div',null,'fr-labor-actions');
  if(s.loadError||s.employment?.loadError)dialog.append(make('p','记录暂时无法读取，请保留存档后再试。'));
  else{
   dialog.append(make('p',s.job?.stage==='ready'?'两畦和归还已记妥，工钱会保留。到登记簿旁等埃米尔当面结算。':s.job?`已浇好 ${s.job.completedBeds}/2 畦。${s.held?'水壶在你手里，离开前请归还。':'水壶在架上，先领取再继续。'}`:s.hired?'职业身份：西苑园艺帮工 · 已录用':'招募中 · 尚未录用'));
   const kinds=s.job?[service.intent()?.kind,...(s.held&&s.job.completedBeds<2?['return']:[])]:s.hired?['accept','resign']:['apply'];
   for(const kind of new Set(kinds)){const choice=service.intent(kind);if(choice)actions.append(button(choice.action,()=>request(choice)));}
   if(s.job?.stage==='working'&&s.job.completedBeds<2)actions.append(button('取消这份活 · 无工钱',()=>{if(service.cancel())close();}));
  }
  dialog.append(actions,make('p','埃米尔忙时会先收好原工具，再沿路过来。移动会停止浇水计时；已完成花畦保留。铜文仅为游戏币。'));
 }
 const open=()=>{if(!nearby())return;onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);};badge.onclick=open;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
 return {open,close,refresh,isOpen:()=>dialog.open,dispose(){close();badge.remove();dialog.remove();style.remove();}};
}
