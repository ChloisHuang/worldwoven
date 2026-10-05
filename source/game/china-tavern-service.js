import {createChinaTavernPropertyUI} from './china-tavern-property-ui.js';
import {TAVERN_STEWARD_ROLE,TAVERN_HOST_ROLE,TAVERN_CHEF_ROLE} from './formal-careers.js';
const ROLES=[TAVERN_STEWARD_ROLE,TAVERN_HOST_ROLE,TAVERN_CHEF_ROLE],REG=[22.35,.215,11.7];
const copy=x=>JSON.parse(JSON.stringify(x));
const near=(p,point,r=.9)=>p&&Math.hypot(p.x-point[0],p.z-point[2])<=r&&Math.abs(p.y-point[1])<.4;

// Career registration, persistent attendance and the current selected task.
// Scene owns the people and dirty objects; the contract owns salary/reviews.
export function createChinaTavernService({meal,property=null,careers,getPlayer,getMounted=()=>null,getClock,host,getLegacyJob=()=>null,
  saved=null,world=null,saveState=()=>true,openRegistration=()=>{},onIntent=()=>{},notify=()=>{},canSee=()=>true,onOpen=()=>{},document:doc=globalThis.document}){
 const scene=meal.staffScene;let current=saved&&saved.version===1?copy(saved):{version:1,serial:0,job:null},selected=null,disposed=false,ui=null,propertyUI=null,attendance=0,lastError=null,waitingRegistration=null,retryScene=0;
 const heldRole=()=>ROLES.find(r=>careers.isHired(r.id));
 const roleFor=id=>ROLES.find(r=>r.id===id)||heldRole()||TAVERN_STEWARD_ROLE;
 const save=next=>{try{const result=saveState(copy(next));if(result===false||result?.then)return false;current=next;return true;}catch{return false;}};
 const atRegister=()=>!getMounted()&&near(getPlayer()?.root.position,REG)&&canSee({position:REG});
 const hostReady=()=>host&&!host.walking&&near(host.root.position,host.station.npcPosition,.18);
 const failure=(message,code='unavailable')=>{lastError=code;notify(message);return false;};
 if(current.job){const role=roleFor(current.job.formalRoleId),d=careers.state().lastDuty;
  if(d?.workReceiptId===current.job.receiptId&&d.stage==='working')scene.start({roleId:role.id,receiptId:current.job.receiptId,snapshot:world});
  else {scene.restoreWorld(world);if(d?.workReceiptId!==current.job.receiptId||!['inspection','ready','paid'].includes(d.stage))save({...current,job:null});}
 }else if(world&&!scene.snapshot())scene.restoreWorld(world);
 const beginAvailability=role=>careers.beginDutyAvailability(role.id,{receiptId:current.job?.receiptId});
 function accept(role=heldRole()){
  if(!role||!careers.isHired(role.id)||current.job||getLegacyJob())return failure('先结清手上的工作，再开始新班次');
  if(!atRegister()||!hostReady()||meal.view().order)return failure('请到登记案前等许安回案，再当面报到');
  const serial=current.serial+1,receiptId=`${role.workSource}-${serial}`;
  const result=careers.beginDuty({receiptId,shiftKind:'continuous'});if(!result.ok)return failure(result.code==='outside-arrival-window'?'新班次在06:00–18:00之间报到':'今天暂时不能开始这个班次',result.code);
  const job={id:receiptId,receiptId,formalRoleId:role.id,stage:'working',coveredSeconds:0,completedTasks:0};
  if(!save({version:1,serial,job}))return failure('报到记录保存失败，请重试');
  if(!scene.start({roleId:role.id,receiptId}))return failure('现场仍在交接，请等上一位同事交还岗位');
  selected=null;notify('已登记当日班次。先当面接班，再从真实待办中选择工作；登记和录用不会自动开工');return true;
 }
 function claim(){const job=current.job;if(!job||!atRegister()||!hostReady())return failure('请在登记案前等许安当面验收');
  const duty=careers.state().lastDuty;if(duty?.workReceiptId!==job.receiptId)return false;
  if(duty.stage==='inspection'&&!careers.laborEvent('inspected',{roleId:job.formalRoleId,receiptId:job.receiptId}).ok)return false;
  const paid=careers.state().lastDuty.stage==='paid'?{ok:true}:careers.settle();if(!paid.ok)return failure('工资尚未入账，完成记录会保留，请稍后再试');
  const wage=careers.state().lastDuty.wage;if(!save({...current,job:null}))return false;selected=null;notify(`许安：已按实际在岗工时及服务评价结算${wage}铜文，工资存入银行`);return true;
 }
 function intent(kind=null,roleId=null,choice=null){if(roleId===TAVERN_HOST_ROLE.id)return null;const role=roleFor(roleId),job=current.job,registered=careers.isHired(role.id);
  if(kind==='property'){if(!property)return null;return {id:'cn-tavern-property',provider:'china-tavern-service',kind:'property',name:'云来酒楼 · 产权柜台',npcName:'许安',action:'查看酒楼产权与经营账',position:REG.slice(),executionRadius:.9,interactionRadius:2.8,priority:45,intentKey:'yunlai-property-counter'};}
  kind||=job?job.stage==='inspection'?'claim':selected?'task':'work-view':careers.applicationResult?.(role.id)?.status==='pending'?'formal-review':'formal-view';
  if(kind==='view')kind='formal-view';
  if(kind==='accept'&&(!registered||job||getLegacyJob()||!beginAvailability(role).ok))return null;
  if(kind==='formal-apply'&&(registered||job||getLegacyJob()||careers.applicationResult?.(role.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&(!careers.reviewApplication||careers.applicationResult?.(role.id)?.status!=='pending'||job))return null;if(kind==='formal-resign'&&(!registered||job||getLegacyJob()))return null;
  if(['work-view','task','end-shift','claim'].includes(kind)&&!job)return null;
  if(kind==='claim'&&job.stage!=='inspection')return null;
  let action=({'formal-view':'查看酒楼职位与申请条件','formal-review':'当面确认职责并接受审核','formal-apply':`申请${role.name}`,'formal-resign':'办理本岗位离职',accept:'报到并开始今日班次','work-view':'选择当前待办',claim:'当面验收 · 按工时结算','end-shift':'交还岗位 · 结算已做工时'})[kind],position=REG,executionRadius=.9;
  const chosen=kind==='task'?choice||selected:null;
  if(chosen){const live=scene.choices().find(c=>key(c)===key(chosen));if(!live)return null;action=live.action;position=live.position;executionRadius=live.executionRadius;}
  if(kind==='work-view'||kind==='end-shift'){position=getPlayer()?.root.position.toArray()||REG;executionRadius=.4;}
  if(!action)return null;
  return {id:`cn-tavern-service-${role.id}-${kind}`,provider:'china-tavern-service',kind,roleId:role.id,name:'云来酒楼 · 工作登记',npcName:'许安',action,position:position.slice(),executionRadius,interactionRadius:2.8,priority:46,
   ...(chosen?{choice:copy(chosen)}:{}),...(kind==='formal-view'?{registration:{scope:'catalogue',roleId:role.id}}:{}),
   intentKey:[['task','work-view','end-shift'].includes(kind)?'-':careers.state().revision,job?.receiptId||'-',job?.stage||'-',kind,chosen?key(chosen):'-'].join(':')};
 }
 const key=c=>[c.kind,c.orderId,c.guestId,c.roomId,c.tableId,c.ticketId].join(':');
 function resolveIntent(old){const next=intent(old?.kind,old?.roleId,old?.choice);if(!next||old?.provider!==next.provider||old.id!==next.id||old.intentKey!==next.intentKey)return null;
  if(next.kind==='formal-view'&&old.registration){if(old.registration.roleId!==next.roleId||!['role','catalogue'].includes(old.registration.scope))return null;next.registration=copy(old.registration);}return next;}
 function executeIntent(old){const next=resolveIntent(old);if(!next||getMounted()||!near(getPlayer()?.root.position,next.position,next.executionRadius)||!canSee(next))return false;
  if(next.kind==='property')return propertyUI?.open()||false;
  const role=roleFor(next.roleId);
  if(next.kind==='formal-view'){openRegistration({country:'china',roleId:role.id,scope:next.registration.scope});return true;}
  if(['formal-apply','formal-review','formal-resign'].includes(next.kind)){
   if(!atRegister())return false;if(!hostReady()){waitingRegistration=copy(next);notify('已在登记案等候许安；他回案后会核对这次申请，离开登记处则取消等候');return true;}waitingRegistration=null;const result=next.kind==='formal-apply'?careers.apply(role.id,{ageYears:getPlayer()?.ageYears}):next.kind==='formal-review'?careers.reviewApplication(role.id,{ageYears:getPlayer()?.ageYears,applicationId:careers.applicationResult(role.id)?.id}):careers.resign();
   openRegistration({country:'china',roleId:role.id,scope:'role'});return !!result.ok;
  }
  if(next.kind==='accept'){if(!accept(role))return false;const first=scene.choices()[0];if(first){selected=first;onIntent(intent('task',role.id,first));}return true;}
  if(next.kind==='work-view'){ui?.open();return true;}
  if(next.kind==='end-shift'){
   if(!scene.beginReturn())return failure('先把手里的餐盘放回传菜台，或把收起的餐具洗净，再交班');
   selected=scene.choices()[0];if(selected)onIntent(intent('task',role.id,selected));return true;
  }
  if(next.kind==='claim')return claim();
  if(next.kind==='task'){selected=next.choice;const result=scene.execute(next.choice);if(result){selected=null;if(next.choice.kind==='choose-order'||['pickup','retrieve','return-tray'].includes(next.choice.kind))ui?.open();}return result;}
  return false;
 }
 const insideWorkplace=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>8&&p.z<21&&p.y>=0&&p.y<9;};
 function update(dt){if(disposed)return;if(waitingRegistration){if(!atRegister()||!resolveIntent(waitingRegistration))waitingRegistration=null;else if(hostReady()){const pending=waitingRegistration;waitingRegistration=null;executeIntent(pending);}}const job=current.job;
  if(job){let live=scene.snapshot();retryScene+=Math.max(0,dt);if(job.stage==='working'&&live?.receiptId!==job.receiptId&&retryScene>=2){retryScene=0;scene.start({roleId:job.formalRoleId,receiptId:job.receiptId});live=scene.snapshot();}
   if(live?.receiptId===job.receiptId&&live?.stage==='working'&&getClock().hour<18&&insideWorkplace())attendance+=Math.min(.1,Math.max(0,dt));
   if(attendance>=1||scene.finished()){
    const next={...current,job:{...job,coveredSeconds:job.coveredSeconds+attendance,completedTasks:live?.completedTasks||job.completedTasks}};
    if(save(next))attendance=0;
   }
   if(scene.finished()&&live?.receiptId===job.receiptId&&current.job.stage==='working'){
    const result=careers.laborEvent('completed',{roleId:job.formalRoleId,receiptId:job.receiptId,coveredSeconds:current.job.coveredSeconds,completedTasks:current.job.completedTasks});
    if(result.ok)save({...current,job:{...current.job,stage:'inspection'}});

   }
   if(selected&&!scene.choices().some(c=>key(c)===key(selected)))selected=null;
   if(current.job?.stage==='working'&&getClock().hour>=18&&scene.snapshot()?.stage==='working'&&scene.beginReturn()){selected=scene.choices()[0];notify('18:00到了，请交回当班物品收工；未完工作保留，岗位仍由你独任');if(selected)onIntent(intent('task',null,selected));}
  }ui?.refresh();propertyUI?.refresh();
 }
 const state=()=>{const live=scene.snapshot(),job=current.job?{...copy(current.job),completedOrders:live?.completedTasks||0,completedTasks:live?.completedTasks||0,completedTables:live?.tables.filter(t=>!t.dirty).length||0,continuous:true}:null;return {...copy(current),job,world:scene.state(),selected:selected?copy(selected):null,lastError};};
 const forRole=roleId=>({intent:kind=>intent(kind,roleId),resolveIntent,executeIntent,state,active:()=>!!current.job,formal:{beginAvailability:()=>beginAvailability(roleFor(roleId)),hired:()=>careers.isHired(roleId)},accept:()=>accept(roleFor(roleId))});
 const service={intent,resolveIntent,executeIntent,forRole,state,view:state,accept,claim,update,active:()=>!!current.job,formal:{beginAvailability:()=>beginAvailability(heldRole()||TAVERN_STEWARD_ROLE)},
  label:()=>current.job?selected?.action||scene.label():null,playerPose:()=>scene.playerPose(),playerAction:()=>scene.playerAction(),playerStation:()=>scene.playerStation(),stopActivity:()=>{waitingRegistration=null;scene.stopActivity();},open:()=>ui?.open(),close:()=>{ui?.close();propertyUI?.close();},isOpen:()=>!!(ui?.isOpen()||propertyUI?.isOpen()),
  snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,selected:selected?copy(selected):null,waitingRegistration:waitingRegistration?copy(waitingRegistration):null,attendance}),
  restore(s){if(!s||s.version!==1||s.receiptId!==(current.job?.receiptId||null)||!Number.isFinite(s.attendance)||s.attendance<0||s.attendance>=1.1)return false;selected=s.selected&&scene.choices().some(c=>key(c)===key(s.selected))?copy(s.selected):null;waitingRegistration=s.waitingRegistration&&resolveIntent(s.waitingRegistration)?copy(s.waitingRegistration):null;attendance=s.attendance;return true;},
  dispose(){attendance=0;disposed=true;ui?.dispose();propertyUI?.dispose();}};
 if(property&&doc?.createElement&&doc.body)propertyUI=createChinaTavernPropertyUI({property,document:doc,canOperate:()=>atRegister()&&hostReady(),isNearby:()=>atRegister(),notify,onOpen:()=>{ui?.close();onOpen();}});
 if(doc?.createElement&&doc.body)ui=createUI({doc,service,scene,onIntent,notify,onOpen,choose:c=>{selected=c;return intent('task',null,c);}});return service;
}
function createUI({doc,service,scene,onIntent,onOpen,choose}){
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;},dialog=make('dialog',null,'cn-service-dialog'),style=make('style');
 dialog.setAttribute('aria-label','酒楼当前客单与待办');style.textContent='.cn-service-dialog{position:fixed;inset:0;margin:auto;width:min(400px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:18px;border:0;border-radius:12px;background:#f3eddf;color:#4e4332;box-shadow:0 8px 28px #302b2320}.cn-service-dialog::backdrop{background:#31291f66}.cn-service-dialog h2{font-size:16px;margin:0 35px 12px 0}.cn-service-dialog p{font-size:12px;line-height:1.5}.cn-service-dialog button{appearance:none;min-height:44px;border:0;border-radius:6px;padding:10px 12px;background:#e8e1d1;color:#443924;box-shadow:none;text-align:left}.cn-service-dialog button:hover{background:#ded3bb}.cn-service-dialog button:active{background:#cdbb96}.cn-service-dialog button:focus-visible{outline:1px solid #967645;outline-offset:-2px}.cn-service-tasks{display:grid;gap:5px}.cn-service-order{padding:10px 12px;border:0;border-radius:6px;background:#e3dbc8;margin:8px 0;font-size:13px;white-space:pre-line}.cn-service-close{position:absolute;top:6px;right:6px;font-size:23px;background:transparent!important}.cn-service-footer{display:flex;gap:8px;margin-top:12px}';
 (doc.head||doc.body).append(style);doc.body.append(dialog);let signature='',generation=0;
 const close=()=>{generation++;if(dialog.open)dialog.close();};
 const button=(text,fn)=>{const b=make('button',text);b.type='button';const g=generation;b.onclick=()=>{if(dialog.open&&g===generation)fn();};return b;};
 function refresh(force=false){if(!dialog.open&&!force)return;const live=scene.state(),s=service.state(),choices=scene.choices(),key=JSON.stringify([s.job?.stage,live.stage,live.orders.map(o=>[o.id,o.stage,o.collected,o.reviews]),live.tables,live.rooms,choices,live.activity?.kind]);if(!force&&key===signature)return;signature=key;generation++;dialog.replaceChildren();
  const x=button('×',close);x.className='cn-service-close';x.setAttribute('aria-label','关闭待办并保留现场');dialog.append(x,make('h2','云来酒楼 · 当前待办'));
  if(!s.job){dialog.append(make('p','尚未报到。申请录用后，仍需单独选择开始今日班次。'));return;}
  if(live.stage==='working')dialog.append(make('p',`在岗 ${Math.floor(s.job.coveredSeconds*.7)} 分钟 · 酒楼账 ${live.till} 文`));
  if(live.selectedOrderId){const order=live.orders.find(o=>o.id===live.selectedOrderId);dialog.append(make('div',`${order.tableId==='west'?'西窗桌':'东窗桌'} · ${order.customerName}\n${order.dishId==='yunlai-green-noodles'?'🥬':'🍚'} ${order.dishName} ×1 · 待交付`,'cn-service-order'));}
  else if(!choices.length)dialog.append(make('p',live.activity?.action||'当前没有待办，可继续候班。'));
  const list=make('div',null,'cn-service-tasks');for(const c of choices)list.append(button(c.action,()=>{const intent=choose(c);close();if(intent)onIntent(intent);}));dialog.append(list);
  if(live.stage==='working'){const footer=make('div',null,'cn-service-footer');footer.append(button('交班 · 按实际工时结算',()=>{const intent=service.intent('end-shift');close();if(intent)onIntent(intent);}));dialog.append(footer);}
 }
 function open(){onOpen();refresh(true);if(!dialog.open)dialog.showModal();refresh(true);}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});return {open,close,refresh,isOpen:()=>!!dialog.open,dispose(){close();dialog.remove();style.remove();}};
}
