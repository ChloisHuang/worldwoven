import {GARDEN_ASSISTANT_ROLE as ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {skillXPReceipt} from './skill-progress.js';
import {FRANCE_GARDENER as P} from './france-gardener-place.js';
const copy=x=>JSON.parse(JSON.stringify(x)),integer=n=>Number.isSafeInteger(n)&&n>=0;
const near=(p,q,r=.2)=>p&&Math.hypot(p.x-q[0],p.z-q[2])<=r&&Math.abs(p.y-q[1])<=.2;
const REGISTRY={name:'西苑工具架 · 埃米尔',position:P.registration},RACK={name:'西苑原工具架',position:P.playerApproach};
const DURATION={take:1.35,return:1.35,water:5,prune:6};
// This is the same admitted garden seat. Maintenance and tools live in the
// original gardener; this file only owns explicit shift attendance and input.
export function createFranceGardenerShift({gardener,careers,getPlayer,getMounted=()=>null,getClock,saveState,saved,getSerial=()=>0,
 copperLedger,canSee=()=>true,notify=()=>{},openRegistration=()=>{},onIntent=()=>{}}){
 let current={version:3,serial:0,job:null},loadError=null,waiting=null,pending=null,activity=null,phase=0,origin=null,attendance=0,disposed=false;
 const valid=j=>j===null||j&&j.id===j.receiptId&&/^fr-garden-labor-[1-9][0-9]*$/.test(j.id)&&j.formalRoleId===ROLE.id&&j.shiftKind==='continuous'&&
  ['working','ready'].includes(j.stage)&&integer(j.day)&&Number.isFinite(j.coveredSeconds)&&j.coveredSeconds>=0&&integer(j.completedTasks)&&Array.isArray(j.completedIds)&&j.completedIds.every(id=>typeof id==='string')&&[null,'cancel','end'].includes(j.closing);
 if(saved?.version===3){if(integer(saved.serial)&&valid(saved.job))current=copy(saved);else loadError='invalid-garden-shift';}
 const player=()=>getPlayer(),at=point=>!getMounted()&&near(player()?.root.position,point),meetHost=()=>at(P.registration)&&!player()?.walking&&canSee(REGISTRY)&&gardener.hostReady();
 const formal=createFormalLaborContract({careers,role:ROLE,getJob:()=>current.job,getPlayer,meetHost,notify,openRegistration});
 const fail=text=>{notify(text);return false;};
 const save=next=>{try{const r=saveState(copy(next));if(r===false||r?.then)return fail('园艺班次没有保存，请重试');current=next;return true;}catch{return fail('园艺班次没有保存，请重试');}};
 const maintenance=()=>gardener.maintenanceState(),lease=()=>{const q=maintenance()?.lease;return q?.owner===current.job?.id?q:null;};
 const held=()=>!!lease()?.borrowed,tool=()=>lease()?.kind==='prune'?'shears':'can';
 const task=()=>{const l=lease();return l?maintenance()[l.kind]:null;};
 const done=()=>{const t=task();return t&&(t.kind==='water'?t.completedBeds===2:t.pruned);};
 const allowed=()=>!disposed&&!loadError&&!maintenance()?.loadError&&!copperLedger?.loadError;
 const canWork=()=>allowed()&&current.job?.stage==='working'&&!current.job.closing&&formal.canWork(current.job)&&getClock().day===current.job.day&&getClock().hour<18;
 const atWork=()=>{const p=player()?.root.position;return p&&p.x>=-19&&p.x<=-14.8&&p.z>=11.7&&p.z<=22.1&&Math.abs(p.y)<=.2&&!getMounted();};
 function flush(){
  const j=current.job;if(!j)return true;
  const receipts=gardener.workReceipts(j.id).filter(r=>!j.completedIds.includes(r.id));
  for(const receipt of receipts){if(formal.duty(j)?.stage==='missed')continue;const r=careers.gardenMaintenanceReceipt(receipt);if(!r.ok)return false;if(!r.unchanged&&!r.replayed)notify(`埃米尔：${receipt.kind==='prune'?'黄杨新梢修齐了，原剪已归位':'两畦浇护完成，原壶已归位'}，这项工作合格。`+skillXPReceipt(r,'园艺'));}
  if(!attendance&&!receipts.length)return true;
  if(!save({...current,job:{...j,coveredSeconds:j.coveredSeconds+attendance,completedTasks:j.completedTasks+receipts.length,completedIds:[...j.completedIds,...receipts.map(r=>r.id)]}}))return false;
  attendance=0;return true;
 }
 function accept(){
  if(!allowed()||current.job||!formal.hired()||!meetHost())return false;
  const resume=formal.pendingReceipt(),serial=resume?Number(resume.split('-').at(-1)):Math.max(current.serial,getSerial(),Number(careers.state().lastDuty?.workReceiptId?.split('-').at(-1))||0)+1;
  const id=resume||`fr-garden-labor-${serial}`;
  if(!formal.begin(id,{shiftKind:'continuous'}).ok)return false;
  if(!save({version:3,serial,job:{id,receiptId:id,formalRoleId:ROLE.id,shiftKind:'continuous',day:getClock().day,stage:'working',coveredSeconds:0,completedTasks:0,completedIds:[],closing:null}}))return false;
  gardener.setDutyOwner?.(id);notify('已开班。查看原花畦和黄杨篱，选择待做工作；还工具后继续当班，另行交班按实际工时结薪。');return true;
 }
 function stopActivity(){waiting=null;pending=null;activity=null;phase=0;origin=null;gardener.releaseMeeting();}
 function cancel(){
  if(!allowed()||current.job?.stage!=='working')return false;
  stopActivity();if(!save({...current,job:{...current.job,closing:'cancel'}}))return false;
  if(held()){notify('取消已登记，请先把原工具带回架上');onIntent(intent('return'));return true;}
  return closeCancelled();
 }
 function closeCancelled(){
  if(held()||!flush())return false;const j=current.job;if(!j)return false;
  if(lease()&&!gardener.releaseTask(j.id))return false;
  if(!formal.cancel(j))return false;
  if(!save({...current,job:null}))return false;gardener.setDutyOwner?.(null);notify('本日园艺班次已中断；已做好的维护和评价保留');return true;
 }
 function endShift(){
  if(!allowed()||current.job?.stage!=='working'||!meetHost())return false;
  if(held())return fail('请先把原工具放回架上，再来交班');
  if(!flush()||!save({...current,job:{...current.job,closing:'end'}}))return false;
  if(lease()&&!gardener.releaseTask(current.job.id))return false;
  if(!formal.complete(current.job))return false;
  if(!save({...current,job:{...current.job,stage:'ready'}}))return false;gardener.setDutyOwner?.(null);
  notify('本班工时与维护评价已封存，请埃米尔当面验收');return true;
 }
 function claim(){
  if(!allowed()||current.job?.stage!=='ready'||!meetHost())return false;
  const result=formal.inspect(current.job);if(!result.ok||result.cleanupPending)return false;
  if(!save({...current,job:null}))return false;notify(`埃米尔：交班验收完成，${result.wage}法国券已存银行`);return true;
 }
 function target(){
  if(!lease())return REGISTRY;if(!held()||done()||current.job?.closing||!canWork())return RACK;
  if(lease().kind==='prune')return {name:'原西苑黄杨篱',position:P.hedge.approach,playerWorkTarget:P.hedge.target};
  const index=task().wateredMask&1?1:0,b=P.beds[index];return {name:`第${index+1}畦玫瑰`,position:b.approach,playerWorkTarget:b.target};
 }
 function label(){
  if(waiting)return '等埃米尔归好原工具';
  if(activity)return activity.kind==='prune'?`修齐黄杨新梢 · ${Math.ceil(6-phase)}秒`:activity.kind==='water'?`浇护原花畦 · ${Math.ceil(5-phase)}秒`:activity.kind==='take'?`拿起原${tool()==='shears'?'园艺剪':'浇水壶'}`:'放回原工具';
  if(held())return current.job?.closing?'取消中 · 请归还原工具':done()?'本项已完成 · 请还原工具':tool()==='shears'?'持原剪 · 去修黄杨篱':'持原壶 · 去待浇花畦';
  return current.job?.stage==='ready'?'园艺班次待当面验收':current.job?lease()?'原工具已留好 · 到架边领取':!atWork()?'离开西苑 · 工时暂停':'西苑当班 · 选择待做维护':null;
 }
 function taskChoices(){
  if(current.job?.stage!=='working'||lease())return [];
  return gardener.taskChoices(current.job.id).map(q=>({kind:'choose-'+q.kind,action:q.label,detail:q.reason||'',available:canWork()&&q.available}));
 }
 function intent(kind){
  if(!allowed())return null;const j=current.job,l=lease();
  kind||=j?j.stage==='ready'?'claim':held()?done()||j.closing||!canWork()?'return':l.kind==='prune'?'prune':'water':l?'take':getClock().hour>=18?'end-shift':'wait':'formal-view';
  if(kind==='view')kind='formal-view';if(kind==='work')kind=intent()?.kind;
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&j)return null;
  if(kind==='formal-apply'&&formal.hired()||kind==='formal-review'&&(formal.hired()||careers.applicationResult(ROLE.id)?.status!=='pending')||kind==='formal-resign'&&!formal.hired()||kind==='accept'&&(!formal.hired()||!formal.beginAvailability().ok))return null;
  if(kind==='claim'&&j?.stage!=='ready'||['wait','end-shift','cancel'].includes(kind)&&j?.stage!=='working')return null;
  if(kind.startsWith('choose-')&&!taskChoices().some(q=>q.kind===kind&&q.available))return null;
  if(kind==='take'&&(!l||held()||!canWork())||kind==='return'&&!held()||['water','prune'].includes(kind)&&(!held()||done()||!canWork()||(kind==='prune')!==(l.kind==='prune')))return null;
  const point=['take','return'].includes(kind)?RACK:['water','prune'].includes(kind)?target():REGISTRY;
  const action=({'formal-view':'查看园艺岗位与当前工作','formal-apply':'提交园艺助理申请','formal-review':'当面确认园艺职责并审核','formal-resign':'办理园艺离职',accept:'开班 · 开始今日园艺工作',claim:'当面验收 · 工资存法国券银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本日班次','choose-water':'选择待浇原花畦','choose-prune':'选择待修原黄杨篱',wait:taskChoices().some(q=>q.available)?'查看两畦与黄杨篱当前工作':'原地维护已完成或工具占用 · 查看状态',take:`领取原${l?.kind==='prune'?'园艺剪':'浇水壶'}`,return:`归还原${l?.kind==='prune'?'园艺剪':'浇水壶'}`,water:'亲手浇护这畦 · 5秒',prune:'沿篱面修齐新梢 · 6秒'})[kind];
  if(!action)return null;
  return {...copy(point),id:'fr-garden-labor-'+kind,provider:'france-gardener-labor',kind,action,npcName:'埃米尔',priority:47,interactionRadius:2.4,executionRadius:.16,
   ...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),intentKey:[formal.workState().revision,j?.id||'-',j?.stage||'-',j?.closing||'-',l?.taskId||'-',held(),task()?.completedBeds||0,task()?.pruned||false,kind,kind.startsWith('choose-')?gardener.taskChoices(j.id).find(q=>'choose-'+q.kind===kind)?.taskId:'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);if(!next||next.provider!==old.provider||next.id!==old.id||next.intentKey!==old.intentKey)return null;return next.kind==='formal-view'&&old.registration?{...next,registration:old.registration}:next;}
 function executeIntent(old){
  const next=resolveIntent(old);if(!next||!at(next.position)||!canSee(next))return false;
  if(['formal-view','wait'].includes(next.kind)){formal.open(next.registration);return true;}
  if(next.kind==='cancel')return cancel();
  if(next.kind.startsWith('choose-')){if(!gardener.reserveTask(current.job.id,next.kind.slice(7),current.job.day))return fail('工具正被使用，请稍候');notify('已留好原工具，请到架边领取');return true;}
  if(['take','return','water','prune'].includes(next.kind)){if(activity||pending)return false;pending=next;return true;}
  if(waiting)return false;waiting=next;gardener.requestMeeting();return true;
 }
 function update(dt=0){
  if(disposed||loadError)return;
  gardener.setDutyOwner?.(canWork()&&atWork()?current.job.id:null);
  if(waiting){const q=waiting;if(!resolveIntent(q)||!at(P.registration)||!canSee(REGISTRY)){waiting=null;gardener.releaseMeeting();}else if(!player().walking&&gardener.requestMeeting()&&meetHost()){waiting=null;({accept,claim,'end-shift':endShift,'formal-apply':formal.apply,'formal-review':formal.review,'formal-resign':formal.resign})[q.kind]?.();gardener.releaseMeeting();}}
  let j=current.job;if(!j)return;
  const d=formal.duty(j);
  if(j.stage==='working'&&['inspection','ready','paid'].includes(d?.stage)){stopActivity();save({...current,job:{...j,stage:'ready',closing:'end'}});return;}
  if(j.stage==='working'&&canWork()&&atWork())attendance+=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
  if(attendance>=1||gardener.workReceipts(j.id).some(r=>!j.completedIds.includes(r.id)))flush();
  if(current.job?.closing==='cancel'&&!held()){closeCancelled();return;}
  if(pending){const q=resolveIntent(pending);if(!q||!at(q.position)||!canSee(q))pending=null;else if(!player().walking){pending=null;activity=q;origin={...player().root.position};phase=0;}}
  if(activity){
   const q=activity,p=player().root.position;if(!resolveIntent(q)||!at(q.position)||!canSee(q)||player().walking||Math.hypot(p.x-origin.x,p.z-origin.z)>.015){activity=null;phase=0;origin=null;return;}
   phase=Math.min(DURATION[q.kind],phase+Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0)));
   const aim=q.playerWorkTarget||P.standTop;player().root.rotation.y=Math.atan2(aim[0]-p.x,aim[2]-p.z);
   if(phase>=DURATION[q.kind]-1e-8){activity=null;phase=0;origin=null;
    if(q.kind==='take'){if(gardener.takeTaskTool(j.id))notify('原工具已拿稳，请到对应花畦或篱边工作');}
    else if(q.kind==='return'){if(gardener.returnTaskTool(j.id)){flush();notify('原工具已归架，班次仍在继续');if(current.job?.closing==='cancel')closeCancelled();}}
    else if(gardener.completeTaskStep(j.id))notify(done()?'这项维护完成，请把原工具归架':'第一畦完成，请继续第二畦');
   }
  }
 }
 function playerPose(){
  if(!held()&&activity?.kind!=='take')return null;
  if(activity?.kind==='water')return {archery:{hands:[[-.16,1.04,.27],[.19,1.05+Math.sin(phase*.9)*.025,.37]]}};
  if(activity?.kind==='prune'){const spread=.13+(Math.sin(phase*5)+1)*.035;return {archery:{hands:[[-spread,.74,.21],[spread,.74,.21]]}};}
  if(['take','return'].includes(activity?.kind)){const isCan=tool()==='can',p=player().root.position,aim=[P.standTop[0]+(isCan?.14:.32),isCan?P.standTop[1]+.365:1.12,P.standTop[2]+(isCan?-.22:.30)],scale=player().characterScale||1;return {archery:{hands:[null,[0,(aim[1]-p.y)/scale,Math.hypot(aim[0]-p.x,aim[2]-p.z)/scale]]}};}
  return {archery:{hands:[null,[.30,.86,.17]]}};
 }
 function toolPose(){if(!held()&&activity?.kind!=='take')return null;const kind=activity?.kind;return {actor:player(),tool:held()?tool():null,action:['water','prune'].includes(kind)?kind:null,target:activity?.playerWorkTarget,phase,transfer:['take','return'].includes(kind)?{tool:tool(),pickup:kind==='take',ratio:phase/1.35}:null};}
 const readView=formalState=>({...copy(current),job:current.job?{...copy(current.job),coveredSeconds:current.job.coveredSeconds+attendance}:null,hired:formal.hired(),formalHired:formal.hired(),formalRole:ROLE,formalState,formalJob:!!current.job,formalExpired:!!current.job&&!formal.canWork(current.job),formalSalary:formal.salary,beginAvailability:formal.beginAvailability(),held:held(),activity:activity?.kind||null,waitingForHost:!!waiting,progress:activity?phase/DURATION[activity.kind]:0,seconds:activity?.kind==='prune'?6:5,target:copy(target()),loan:gardener.loanState(),maintenance:maintenance(),loadError:loadError||maintenance()?.loadError,taskChoices:taskChoices()});
 // The live badge uses the work projection; explicit view/state keep complete career diagnostics.
 const view=()=>readView(formal.state()),displayState=()=>readView(formal.workState());
 return {formal,view,state:view,displayState,accept,claim,cancel,endShift,intent,resolveIntent,executeIntent,update,stopActivity,meetHost,atRegistration:()=>at(P.registration),taskChoices,held,active:()=>!!current.job,isActing:()=>!!activity||!!pending||!!waiting,playerPose,toolPose,label,
  snapshot:()=>({version:2,jobId:current.job?.id||null,coveredSeconds:current.job?.coveredSeconds||0,attendance,activity:copy(activity),pending:copy(pending),waiting:copy(waiting),phase,origin:copy(origin)}),
  restore(s){if(s?.version!==2||s.jobId!==(current.job?.id||null))return false;attendance=s.coveredSeconds===(current.job?.coveredSeconds||0)&&Number.isFinite(s.attendance)&&s.attendance>=0&&s.attendance<=12*60/.7?s.attendance:0;activity=s.activity&&resolveIntent(s.activity);pending=s.pending&&resolveIntent(s.pending);waiting=s.waiting&&resolveIntent(s.waiting);phase=activity&&Number.isFinite(s.phase)?Math.max(0,Math.min(DURATION[activity.kind],s.phase)):0;origin=activity?copy(s.origin):null;return true;},
  invalid:()=>!!loadError,dispose(){disposed=true;waiting=pending=activity=null;gardener.setDutyOwner?.(null);}};
}
