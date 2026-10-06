// The live labor controller owns tools, physical work and employer proximity.
// This bridge pins each new work slip to its pay source before it can start.
// An old unmarked slip always remains temporary, even after another job is held.
const MESSAGES={'application-pending':'申请已保存，请继续当面审核','no-pending-application':'没有待审申请','interview-rejected':'本次面谈未录用，结果已保存，下一模拟日可再申请','already-applied-today':'本岗位今天已提交过申请，请查看已保存结果，下一模拟日再来',
  'adult-required':'需年满18岁','age-range-required':'本台班招募年龄为18–40岁','art-required':'艺术需要1级，可在当地藏书处读艺术书目','ritual-required':'待客礼仪未达本岗位要求，可先读书练习',
  'care-required':'照护需要2级，可在藏书处读《照护问询与编号核对》，并完成药铺原单交付',
  'tavern-chef-days-required':'须在三个不同模拟日以正式酒楼厨师身份完成原客单备料、烹制与出菜',
  'clinic-experience-required':'至少完成一次药铺助手原单服务，核对同号纸包并当面交给原来客',
  'martial-required':'武艺需要1级，请到射圃完成安全习射练习',
  'cooking-required':'烹饪未达本岗位要求，可先在当地藏书处学习烹饪书目',
  'writing-required':'文书未达本岗位要求，可在当地读书或书案习字积累经验',
  'gardening-required':'园艺需要2级，可在当地读园艺书或做浇花临工积累经验',
  'already-employed':'你已有长期职位，结清并离职后才能转职','no-vacancy':'这个岗位暂无空缺',
  'outside-arrival-window':'请在06:00至18:00之间开始当天班次',
  'already-paid-today':'今天已领过正式日薪，下一模拟日再开班',
  'duty-missed':'本日当班已中断，下一模拟日再来','duty-active':'已有本日班次，请继续手上工作',
  'wage-ready':'先完成验收并结清已做好的工资','duty-expired':'当日未完成，先取消这份过期班次再重新开班',
  'invalid-shift-work':'当班工时尚未核对，请在岗位当面交班',
  'invalid-customer-review':'顾客评价未能核对，请重试',
  'save-failed':'记录未能保存，请稍后重试','bank-unavailable':'银行入账暂不可用，已完成工资会保留',
  'invalid-career-state':'职业存档暂时无法核对，请保留存档',
};
export function createFormalLaborContract({careers,role,getJob,getPlayer,meetHost,notify=()=>{},openRegistration=()=>{},workState=()=>careers?.workState?.()??careers?.state()}){
  const unit=role.currency==='japan'?'日本券':role.currency==='france'?'法国券':role.currency==='egypt'?'埃及券':'铜文';
  // Work polling needs only the current duty. Explicit state() remains complete.
  const hired=()=>!!careers?.isHired(role.id),state=()=>careers?.state();
  const pinned=job=>job?.formalRoleId===role.id;
  const duty=job=>{const d=workState()?.lastDuty;return pinned(job)&&d?.roleId===role.id&&d.workReceiptId===job.receiptId?d:null;};
  function result(r,text){if(!r?.ok)notify((r?.reasons||[r?.code]).map(c=>c==='care-required'?`照护需要${role.skillRequirements.care}级，可完成当地原客照护交付积累经验`:MESSAGES[c]||'这次办理未完成，请稍后重试').join('；'));else if(text)notify(text);return r;}
  function apply(){if(getJob())return result({ok:false,code:'wage-ready'}).ok;if(!meetHost())return false;
    const applied=result(careers.apply(role.id,{ageYears:getPlayer()?.ageYears}),`${role.employer}：申请已收下。请当面确认职责，再核验你的技能与空缺。`);
    openRegistration({country:role.country,roleId:role.id,scope:'role'});return !!applied.ok;}
  function review(){if(getJob()||!meetHost())return false;
    const application=careers.applicationResult(role.id);if(application?.status!=='pending')return false;
    const reviewed=result(careers.reviewApplication(role.id,{ageYears:getPlayer()?.ageYears,applicationId:application.id}),`${role.employer}：审核通过，已正式录用。班次请另行报到。`);
    openRegistration({country:role.country,roleId:role.id,scope:'role'});return !!reviewed.ok;}
  function resign(){if(getJob())return result({ok:false,code:'wage-ready'}).ok;if(!meetHost())return false;
    return !!result(careers.resign(),'长期岗位离职已登记，已有技能和评价保留。').ok;}
  function begin(receiptId,options={}){if(!hired())return {ok:true,formalRoleId:null};const r=result(careers.beginDuty({receiptId,...options}));return {...r,formalRoleId:r.ok?role.id:null};}
  function complete(job){if(!pinned(job))return true;return !!result(careers.laborEvent('completed',{roleId:role.id,receiptId:job.receiptId,coveredSeconds:job.coveredSeconds,completedTasks:job.completedTasks})).ok;}
  function inspect(job){if(!pinned(job)||!meetHost())return {ok:false};
    const r=result(careers.laborEvent('inspected',{roleId:role.id,receiptId:job.receiptId}));return r.ok?pay(job):r;}
  function pay(job){const d=duty(job);if(d?.stage==='paid')return {ok:true,replayed:true,wage:d.wage};
    return d?.stage==='ready'?result(careers.settle()):{ok:false};}
  function cancel(job){if(!pinned(job))return true;const d=duty(job);if(!d)return false;
    if(['inspection','ready','paid'].includes(d.stage)){result({ok:false,code:'wage-ready'});return false;}
    return !!result(careers.interruptDuty('cancelled')).ok;}
  function canWork(job){const d=duty(job);return !pinned(job)||!!d&&careers.canContinueLabor(job.receiptId);}
  const pendingReceipt=()=>{const d=workState()?.lastDuty;return hired()&&!getJob()&&d?.roleId===role.id&&d.stage==='working'?d.workReceiptId:null;};
  const beginAvailability=()=>hired()?careers.beginDutyAvailability(role.id,{receiptId:pendingReceipt()||undefined}):{ok:true};
  return {role,hired,state,workState,pinned,duty,pendingReceipt,apply,review,resign,begin,beginAvailability,complete,inspect,pay,cancel,canWork,
    open:(context={})=>openRegistration({country:role.country,roleId:role.id,scope:context.scope==='catalogue'?'catalogue':'role'}),
    unit,
    salary:`${role.wage}${role.preparationBonus?'–'+(role.wage+role.preparationBonus):''}${unit}`};
}
